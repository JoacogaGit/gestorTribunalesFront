import { useCallback, useEffect, useRef, useState } from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Scale, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export const TUTORIAL_EVENT = "iustrack:tutorial";

/** Dispara el recorrido desde cualquier parte de la app. */
export function lanzarTutorial() {
  window.dispatchEvent(new CustomEvent(TUTORIAL_EVENT));
}

interface Paso {
  /** Vista de la app a la que hay que navegar antes de mostrar el paso. */
  view?: string;
  /** Selector del elemento a iluminar. Si no existe, el popover queda centrado. */
  target?: string;
  titulo: string;
  /** HTML permitido. */
  texto: string;
  /** Abre el sidebar (drawer) en móvil para este paso. */
  abrirSidebar?: boolean;
  /** Mini demo animada que corre al llegar al paso. */
  demo?: () => Promise<void>;
  side?: "top" | "bottom" | "left" | "right";
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Escribe en un input controlado por React disparando el evento nativo. */
function setInputValue(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

async function demoBuscador() {
  const el = document.querySelector<HTMLInputElement>('[data-tour="buscador"]');
  if (!el) return;
  const texto = "Pérez";
  for (let i = 1; i <= texto.length; i++) {
    setInputValue(el, texto.slice(0, i));
    await esperar(220);
  }
  await esperar(1600);
  for (let i = texto.length - 1; i >= 0; i--) {
    setInputValue(el, texto.slice(0, i));
    await esperar(90);
  }
}

async function demoTema() {
  const btn = document.querySelector<HTMLButtonElement>('[data-tour="tema"]');
  if (!btn) return;
  await esperar(600);
  btn.click();
  await esperar(1400);
  btn.click();
}

interface Props {
  onNavigate: (view: string) => void;
  onOpenSidebar?: (open: boolean) => void;
  isMobile?: boolean;
  /** Si el usuario pertenece a más de un espacio, se muestra el paso del selector. */
  multiVocalia?: boolean;
  /** Solo los admin ven Papelera y Miembros en el menú. */
  esAdmin?: boolean;
  /** Vista del primer tablero de anotaciones (si existe), para mostrarlo en vivo. */
  tableroView?: string | null;
  /** Oficina tipo estudio jurídico: recorrido distinto. */
  esEstudio?: boolean;
}

/** Muestra/oculta las estadísticas del dashboard en vivo. */
async function demoToggleKpis() {
  const btn = document.querySelector<HTMLButtonElement>('[data-tour="toggle-kpis"]');
  if (!btn) return;
  await esperar(900);
  btn.click();
  await esperar(1500);
  btn.click();
}

/** Abre el formulario de causa para recorrerlo en vivo. */
async function demoAbrirFormulario() {
  if (document.querySelector('[data-tour="form-causa"]')) return;
  const btn = document.querySelector<HTMLButtonElement>('[data-tour="nueva-causa"]');
  if (!btn) return;
  await esperar(400);
  btn.click();
  await esperar(700);
}

/** Cierra el formulario si quedó abierto. */
function cerrarFormulario() {
  const dlg = document.querySelector('[data-tour="form-causa"]');
  if (!dlg) return;
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
}

const bullets = (items: [string, string][]) =>
  `<ul class="iustrack-tour-callouts">${items
    .map(([t, d]) => `<li><span class="iustrack-tour-arrow">→</span><span><strong>${t}:</strong> ${d}</span></li>`)
    .join("")}</ul>`;

function construirPasos(props: Props): Paso[] {
  const { esEstudio, esAdmin, multiVocalia, tableroView } = props;
  const vistaLista = esEstudio ? "dashboard" : "tramite";
  const responsable = esEstudio ? "empleado a cargo" : "despachante";

  const pasos: Paso[] = [];

  // 1 — Modalidad de la oficina
  pasos.push({
    view: "dashboard",
    target: '[data-tour="sidebar"]',
    titulo: esEstudio ? "Tu oficina: Estudio Jurídico" : "Tu oficina: Dependencia Judicial",
    texto: esEstudio
      ? `<p class="iustrack-tour-lead">IusTrack ordena todas las causas del estudio y sus fechas importantes en un solo lugar.</p>
         ${bullets([
           ["Modalidad Estudio", "pensada para abogados: fuero, rol del estudio, juez, fiscal y estado procesal."],
           ["La otra modalidad", "Dependencia Judicial, pensada para tribunales y fiscalías (trámite, recursos, despachantes)."],
         ])}
         <p class="iustrack-tour-hint">Este menú de la izquierda es tu punto de partida.</p>`
      : `<p class="iustrack-tour-lead">IusTrack ordena todas las causas de la dependencia y sus vencimientos en un solo lugar.</p>
         ${bullets([
           ["Modalidad Dependencia Judicial", "pensada para tribunales y fiscalías: trámite, recursos, subestados y despachantes."],
           ["La otra modalidad", "Estudio Jurídico, para abogados particulares (fueros, rol del estudio, estado procesal)."],
         ])}
         <p class="iustrack-tour-hint">Este menú de la izquierda es tu punto de partida.</p>`,
    abrirSidebar: true,
  });

  if (multiVocalia) {
    pasos.push({
      target: '[data-tour="vocalia-selector"]',
      titulo: "Cambiar de espacio",
      texto: "Si trabajás en más de un espacio, cambiás desde acá. Cada espacio tiene sus propias causas, calendario y anotaciones.",
      abrirSidebar: true,
    });
  }

  // 2 — Migrar
  pasos.push({
    view: "migrar",
    target: '[data-tour="main"]',
    titulo: "Traé tus causas ya cargadas",
    texto:
      `<p class="iustrack-tour-lead">No hace falta cargar todo a mano.</p>
       ${bullets([
         ["Subís tu archivo", "Excel, Word o PDF (también el formato Lex100 del Poder Judicial)."],
         ["La inteligencia artificial lo lee", "y arma las causas con expediente, carátula, personas y fechas."],
         ["Revisás antes de guardar", "aparece una pantalla con todo lo detectado para corregir lo que quieras."],
       ])}`,
  });

  // 3 — Dashboard + estadísticas
  pasos.push(
    {
      view: "dashboard",
      target: '[data-tour="kpis"]',
      titulo: "Tu tablero de resumen",
      texto:
        `<p class="iustrack-tour-lead">Estas tarjetas cuentan tus causas por criterio.</p>
         ${bullets([
           ["Son botones", "tocá una tarjeta y la lista de abajo queda filtrada solo con esas causas."],
           ["Se destacan", "la tarjeta elegida se ilumina y la columna relacionada se mueve al frente."],
         ])}`,
    },
    {
      view: "dashboard",
      target: '[data-tour="nueva-estadistica"]',
      titulo: "Creá tus propias estadísticas",
      texto: esEstudio
        ? "Con este botón armás una tarjeta a tu medida: por fuero, estado procesal, rol del estudio, situación de libertad o vencimientos y eventos próximos (elegís los días). Le ponés nombre y color."
        : "Con este botón armás una tarjeta a tu medida: por estado de la causa, subestado, situación de libertad o vencimientos y eventos próximos (elegís los días). Le ponés nombre y color.",
    },
    {
      view: "dashboard",
      target: '[data-tour="toggle-kpis"]',
      titulo: "Ocultar o mostrar las estadísticas",
      texto: "Si querés más espacio para la lista de causas, escondés las tarjetas con un toque. Mirá:",
      demo: demoToggleKpis,
    },
  );

  // 4 — Buscador
  pasos.push({
    view: vistaLista,
    target: '[data-tour="buscador"]',
    titulo: "Buscar una causa",
    texto: "Escribís cualquier dato y la lista se filtra al instante: número de expediente, carátula o nombre de una persona. Mirá cómo funciona:",
    demo: demoBuscador,
  });

  // 5 — Listas del menú
  pasos.push({
    target: '[data-tour="sidebar"]',
    titulo: "Las listas del menú",
    texto: esEstudio
      ? `<p class="iustrack-tour-lead">Cada lista arma sola su contenido según los datos de tus causas:</p>
         ${bullets([
           ["Fueros", "las causas agrupadas por fuero."],
           ["Delitos", "agrupadas por el delito cargado."],
           ["Instrucción", "las que están en etapa de investigación."],
           ["Elevadas a juicio", "las que ya pasaron a juicio."],
           ["Recurridas", "las que están en casación, tribunal superior o corte."],
           ["Detenidos", "las que tienen alguna persona detenida."],
           ["SJP", "las que tienen suspensión de juicio a prueba en trámite."],
         ])}`
      : `<p class="iustrack-tour-lead">Cada lista arma sola su contenido según los datos de tus causas:</p>
         ${bullets([
           ["Trámite", "las causas activas del día a día."],
           ["Detenidos", "las que tienen alguna persona detenida."],
           ["Rebeldes", "las que tienen alguna persona declarada rebelde."],
           ["SJP en trámite", "las que tienen suspensión de juicio a prueba."],
           ["Recursos", "las que están con casación, queja u otro recurso."],
           ["Delegadas", "las delegadas a otra dependencia."],
           ["Terminadas", "las finalizadas, guardadas al final."],
         ])}`,
    abrirSidebar: true,
  });

  // 6 — Formulario de causa (se abre en vivo)
  pasos.push(
    {
      view: vistaLista,
      target: '[data-tour="nueva-causa"]',
      titulo: "Cargar una causa nueva",
      texto: "Con este botón se abre el formulario de la causa. Vamos a abrirlo para verlo por dentro:",
      demo: demoAbrirFormulario,
    },
    {
      target: '[data-tour="form-datos"]',
      titulo: "Los datos de la causa",
      texto: esEstudio
        ? bullets([
            ["Expediente y carátula", "los datos que identifican la causa."],
            ["Fuero", "penal, civil, laboral, etc."],
            ["Rol del estudio", "si actuás como defensa, querella o denunciante."],
            ["Damnificado", "la persona afectada."],
            ["Juez, fiscal y fiscalía", "quiénes intervienen."],
            ["Estado procesal", "en qué etapa está (investigación, juicio, casación…)."],
          ])
        : bullets([
            ["Expediente y carátula", "los datos que identifican la causa."],
            ["Estado", "trámite, recurso, delegada o terminada: define en qué lista aparece."],
            ["Subestado", "el detalle del trámite (para indagar, indagado, para fijar juicio…)."],
            ["Tipo de recurso", "casación, queja, apelación y demás."],
            ["Despachante", "quién tiene la causa a cargo."],
          ]),
      side: "left",
    },
    {
      target: '[data-tour="form-imputados"]',
      titulo: "Las personas de la causa",
      texto:
        `<p class="iustrack-tour-lead">Una causa puede tener varias personas imputadas. Cada una lleva sus propios datos:</p>
         ${bullets([
           ["Situación", "libre, detenida, rebelde, con probation o condenada. Según esto la causa entra en las listas correspondientes."],
           ["Vencimientos", "prisión preventiva (se calcula solo desde la fecha de detención), pena y suspensión de juicio a prueba."],
           ["Prescripciones", "las fechas de prescripción con su descripción."],
         ])}`,
      side: "left",
    },
    {
      target: '[data-tour="form-causa"]',
      titulo: "Fechas y notas de la causa",
      texto:
        `${bullets([
          ["Eventos con fecha", "audiencias, plazos, lo que sea: aparecen automáticamente en el calendario."],
          ["Notas sin fecha", "anotaciones sueltas que quedan guardadas en la causa."],
        ])}
        <p class="iustrack-tour-hint">Desde la lista también podés duplicar una causa, pintarle un color de fila y ordenar u ocultar columnas.</p>`,
      side: "left",
    },
  );

  // 9 — Calendario
  pasos.push(
    {
      view: "calendario",
      target: '[data-tour="main"]',
      titulo: "El calendario: el corazón de IusTrack",
      texto:
        `<p class="iustrack-tour-lead">Todo lo que cargás con fecha llega solo hasta acá.</p>
         ${bullets([
           ["Colores por cercanía", "rojo lo urgente, amarillo lo que se viene, verde lo lejano."],
           ["Todo junto", "vencimientos, audiencias, eventos y tarjetas de anotaciones en una sola vista."],
         ])}`,
    },
    {
      view: "calendario",
      target: '[data-tour="google-calendar"]',
      titulo: "Y también en tu Google Calendar",
      texto:
        `<p class="iustrack-tour-lead">Vinculás tu cuenta de Google una vez y listo.</p>
         ${bullets([
           ["Se sincroniza solo", "cada vencimiento y evento se copia a tu agenda de Google."],
           ["Te avisa", "recordatorios automáticos 3 días antes, 1 día antes y 1 hora antes."],
           ["El resultado", "no se te pasa ningún vencimiento. Este es el diferencial de IusTrack."],
         ])}`,
    },
  );

  // 10 — Anotaciones
  pasos.push({
    view: tableroView ?? "dashboard",
    target: tableroView ? '[data-tour="main"]' : '[data-tour="anotaciones"]',
    titulo: "Anotaciones: tus pendientes en columnas",
    texto:
      `<p class="iustrack-tour-lead">Un tablero de notas organizado en columnas, con tarjetas que arrastrás de una columna a otra.</p>
       ${bullets([
         ["Columna compartida", "las tarjetas con fecha van al calendario de todo el equipo."],
         ["Columna personal", "las tarjetas con fecha van solo a tu calendario."],
       ])}`,
    abrirSidebar: !tableroView,
  });

  // 11 — Categorías
  pasos.push({
    target: '[data-tour="nav-categorias"]',
    titulo: "Categorías propias",
    texto: "Creás categorías tuyas (por ejemplo “Pericia pendiente” o “Para revisar”) que quedan disponibles en todas las causas. Si les ponés fecha, también aparecen en el calendario.",
    abrirSidebar: true,
  });

  // 12 — Filtro por responsable
  pasos.push({
    view: vistaLista,
    target: '[data-tour="filtro-responsable"]',
    titulo: `Ver las causas de cada ${responsable}`,
    texto: `Con este botón elegís uno o varios responsables y la lista muestra solo sus causas. En esta modalidad el responsable es el <strong>${responsable}</strong>.`,
  });

  // 13 — Exportar
  pasos.push({
    view: vistaLista,
    target: '[data-tour="exportar-excel"]',
    titulo: "Descargar todo en Excel",
    texto: "Este botón baja un archivo de Excel con todas tus listas: una hoja por cada lista, lista para imprimir o compartir.",
  });

  // 14 — Miembros y roles
  pasos.push({
    target: esAdmin ? '[data-tour="nav-miembros"]' : '[data-tour="sidebar"]',
    titulo: "Tu equipo y los permisos",
    texto:
      `<p class="iustrack-tour-lead">Invitás a tus compañeros por email o con un código de acceso.</p>
       ${bullets([
         ["Administrador", "maneja todo: personas, causas y configuración."],
         ["Miembro", "crea y edita causas."],
         ["Lector", "solo puede mirar, no modifica nada."],
       ])}`,
    abrirSidebar: true,
  });

  if (esAdmin) {
    pasos.push({
      target: '[data-tour="nav-papelera"]',
      titulo: "Si borrás algo por error",
      texto: "Las causas eliminadas van a la Papelera y podés recuperarlas durante <strong>30 días</strong>.",
      abrirSidebar: true,
    });
  }

  // 15 — Cierre
  pasos.push({
    target: '[data-tour="ayuda"]',
    titulo: "Siempre tenés ayuda a mano",
    texto: "Tocá el signo de pregunta para volver a ver este recorrido cuando quieras. También podés reiniciarlo desde el menú de tu foto de perfil, arriba a la derecha.",
  });

  return pasos;
}

export default function TutorialTour({ onNavigate, onOpenSidebar, isMobile, multiVocalia, esAdmin, tableroView, esEstudio }: Props) {
  const { user } = useAuth();
  const [fase, setFase] = useState<"idle" | "bienvenida" | "recorrido" | "final">("idle");
  const driverRef = useRef<Driver | null>(null);
  const idxRef = useRef(0);
  const pasosRef = useRef<Paso[]>([]);
  const [total, setTotal] = useState(construirPasos({ onNavigate, multiVocalia, esAdmin, tableroView, esEstudio }).length + 2);

  const marcarCompletado = useCallback(async () => {
    try {
      localStorage.setItem("iustrack:tutorial_completado", "1");
    } catch { /* noop */ }
    if (!user) return;
    const { error } = await supabase
      .from("perfiles")
      .update({ tutorial_completado: true })
      .eq("id", user.id);
    if (error) console.error("[tutorial] no se pudo guardar tutorial_completado", error);
  }, [user]);

  // Auto-arranque la primera vez
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      let visto = false;
      try { visto = localStorage.getItem("iustrack:tutorial_completado") === "1"; } catch { /* noop */ }
      if (visto) return;
      const { data } = await supabase
        .from("perfiles")
        .select("tutorial_completado")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data?.tutorial_completado) {
        try { localStorage.setItem("iustrack:tutorial_completado", "1"); } catch { /* noop */ }
        return;
      }
      if (data && data.tutorial_completado === false) setFase("bienvenida");
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Disparo manual
  useEffect(() => {
    const handler = () => setFase("bienvenida");
    window.addEventListener(TUTORIAL_EVENT, handler);
    return () => window.removeEventListener(TUTORIAL_EVENT, handler);
  }, []);


  const prepararPaso = useCallback(
    async (i: number) => {
      const paso = pasosRef.current[i];
      if (!paso) return;
      if (paso.view) onNavigate(paso.view);
      if (isMobile) onOpenSidebar?.(!!paso.abrirSidebar);
      await esperar(paso.view || paso.abrirSidebar ? 500 : 180);
    },
    [isMobile, onNavigate, onOpenSidebar]
  );

  const terminar = useCallback(
    (celebrar: boolean) => {
      driverRef.current?.destroy();
      driverRef.current = null;
      if (isMobile) onOpenSidebar?.(false);
      if (celebrar) setFase("final");
      else { setFase("idle"); void marcarCompletado(); }
    },
    [isMobile, marcarCompletado, onOpenSidebar]
  );

  const arrancarRecorrido = useCallback(async () => {
    const pasos = construirPasos({ onNavigate, multiVocalia, esAdmin, tableroView, esEstudio });
    pasosRef.current = pasos;
    const TOTAL = pasos.length + 2;
    setTotal(TOTAL);
    setFase("recorrido");
    idxRef.current = 0;
    await prepararPaso(0);

    const d = driver({
      allowClose: false,
      animate: true,
      overlayColor: "hsl(222 47% 6% / 0.82)",
      stagePadding: 6,
      stageRadius: 10,
      popoverClass: "iustrack-tour",
      nextBtnText: "Siguiente →",
      prevBtnText: "Atrás",
      doneBtnText: "Terminar",
      showButtons: ["next", "previous"],
      steps: pasos.map((p, i) => ({
        element: p.target,
        popover: {
          title: p.titulo,
          description: `${p.texto}<div class="iustrack-tour-progress"><span style="width:${
            ((i + 2) / TOTAL) * 100
          }%"></span></div><div class="iustrack-tour-count">Paso ${i + 2} de ${TOTAL}</div>`,
          side: (p.side ?? "bottom") as "bottom",
          align: "start" as const,
        },
      })),
      onHighlighted: () => {
        const paso = pasosRef.current[idxRef.current];
        if (paso?.demo) void paso.demo();
      },
      onNextClick: async () => {
        const next = idxRef.current + 1;
        if (next >= pasos.length) { terminar(true); return; }
        await prepararPaso(next);
        idxRef.current = next;
        d.moveNext();
      },
      onPrevClick: async () => {
        const prev = idxRef.current - 1;
        if (prev < 0) return;
        await prepararPaso(prev);
        idxRef.current = prev;
        d.movePrevious();
      },
      onDestroyed: () => { driverRef.current = null; },
    });

    driverRef.current = d;
    d.drive();
  }, [prepararPaso, terminar, onNavigate, multiVocalia, esAdmin, tableroView, esEstudio]);

  useEffect(() => () => { driverRef.current?.destroy(); }, []);

  return (
    <>
      {/* Botón "Saltar tutorial" siempre visible durante el recorrido */}
      {fase === "recorrido" && (
        <button
          type="button"
          onClick={() => terminar(false)}
          className="fixed top-4 right-4 z-[10000] rounded-full bg-background/90 px-4 py-2 text-xs font-medium text-foreground shadow-elevated border border-border hover:bg-muted transition-colors animate-fade-in"
        >
          Saltar tutorial
        </button>
      )}

      {/* Paso 1 — Bienvenida */}
      <Dialog open={fase === "bienvenida"} onOpenChange={(o) => { if (!o && fase === "bienvenida") terminar(false); }}>
        <DialogContent className="sm:max-w-md text-center animate-scale-in">
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-gold shadow-soft">
              <Scale className="h-8 w-8 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Bienvenido a IusTrack</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {esEstudio
                  ? "Te muestro en un minuto cómo se maneja tu estudio jurídico: causas, vencimientos, agenda y anotaciones, todo conectado."
                  : "Te muestro en un minuto cómo se maneja tu espacio: causas, vencimientos, agenda y anotaciones."}
              </p>
            </div>
            <div className="w-full">
              <div className="iustrack-tour-progress"><span style={{ width: `${(1 / total) * 100}%` }} /></div>
              <p className="mt-1 text-[11px] text-muted-foreground">Paso 1 de {total}</p>
            </div>
            <div className="flex w-full gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => terminar(false)}>Saltar tutorial</Button>
              <Button className="flex-1" onClick={arrancarRecorrido}>Empezar recorrido</Button>
            </div>
            <button
              type="button"
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
              onClick={() => terminar(false)}
            >
              No volver a mostrar automáticamente
            </button>
            <p className="text-[11px] text-muted-foreground">
              Siempre podés volver a verlo desde tu menú de usuario.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Paso final — Cierre con confeti */}
      <Dialog open={fase === "final"} onOpenChange={(o) => { if (!o) { setFase("idle"); void marcarCompletado(); } }}>
        <DialogContent className="sm:max-w-md overflow-hidden text-center animate-scale-in">
          <div className="pointer-events-none absolute inset-0">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className="iustrack-confetti"
                style={{
                  left: `${(i * 4.1) % 100}%`,
                  animationDelay: `${(i % 8) * 0.18}s`,
                  background: ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--alert-ok))", "hsl(var(--alert-info))"][i % 4],
                }}
              />
            ))}
          </div>
          <div className="relative flex flex-col items-center gap-4 py-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PartyPopper className="h-8 w-8" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">¡Listo!</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Ya podés empezar a usar IusTrack. Si querés volver a ver el recorrido, entrá a tu perfil → “Ver tutorial de nuevo”.
              </p>
            </div>
            <div className="w-full">
              <div className="iustrack-tour-progress"><span style={{ width: "100%" }} /></div>
              <p className="mt-1 text-[11px] text-muted-foreground">Paso {total} de {total}</p>
            </div>
            <Button className="w-full" onClick={() => { setFase("idle"); void marcarCompletado(); }}>
              Empezar a usar IusTrack
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
