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

/** Escribe de a poco un texto en un input, como si lo tipeara una persona. */
async function tipear(el: HTMLInputElement | null, texto: string, ms = 60) {
  if (!el) return;
  el.focus();
  for (let i = 1; i <= texto.length; i++) {
    setInputValue(el, texto.slice(0, i));
    await esperar(ms);
  }
}

/** Busca el input que está debajo de una etiqueta con ese texto. */
function inputPorEtiqueta(scope: Element, etiqueta: string): HTMLInputElement | null {
  const labels = Array.from(scope.querySelectorAll("label"));
  const lab = labels.find((l) => (l.textContent ?? "").toLowerCase().includes(etiqueta.toLowerCase()));
  return (lab?.parentElement?.querySelector("input") as HTMLInputElement) ?? null;
}

/** Completa en vivo los primeros campos de la causa, como ejemplo. */
async function demoCompletarCausa() {
  await demoAbrirFormulario();
  const scope = document.querySelector('[data-tour="form-datos"]');
  if (!scope) return;
  await esperar(400);
  await tipear(inputPorEtiqueta(scope, "Expediente"), "12345/2026", 70);
  await esperar(400);
  await tipear(inputPorEtiqueta(scope, "Carátula"), "Pérez, Juan s/ estafa", 45);
  await esperar(300);
  const desp = inputPorEtiqueta(scope, "Despachante") ?? inputPorEtiqueta(scope, "Empleado");
  if (desp) await tipear(desp, "MCB", 180);
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

  // 2 — Panel lateral: el centro de mando
  pasos.push({
    view: "dashboard",
    target: '[data-tour="sidebar"]',
    titulo: "Todo se maneja desde acá",
    texto:
      `<p class="iustrack-tour-lead">Este panel de la izquierda es tu centro de mando: desde acá entrás a todas las secciones de IusTrack.</p>
       ${bullets([
         ["Cada pestaña es una vista", "listas de causas, calendario, anotaciones y configuración."],
         ["Tranquilo", "a lo largo de este recorrido vamos a ir descubriendo, una por una, qué hace cada pestaña."],
       ])}`,
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

  // 3 — Migrar (con la pantalla real visible)
  pasos.push({
    view: "migrar",
    target: '[data-tour="main"]',
    titulo: "Traé tus causas ya cargadas",
    texto:
      `<p class="iustrack-tour-lead">Esta es la pantalla de migración: no hace falta cargar todo a mano.</p>
       ${bullets([
         ["Subís tu archivo", "Excel, Word o PDF, incluido el formato Lex100 del Poder Judicial."],
         ["Se lee solo", "IusTrack arma las causas con expediente, carátula, personas y fechas."],
         ["Revisás antes de guardar", "ves todo lo detectado y corregís lo que quieras. Nada se guarda sin tu visto bueno."],
       ])}`,
  });

  // 4 — Las listas del menú
  pasos.push({
    view: "dashboard",
    target: '[data-tour="sidebar"]',
    titulo: "Las listas de causas",
    texto: esEstudio
      ? `<p class="iustrack-tour-lead">Cada lista se arma sola según los datos que cargues:</p>
         ${bullets([
           ["Fueros", "las causas agrupadas por fuero."],
           ["Delitos", "agrupadas por el delito cargado."],
           ["Instrucción", "las que están en investigación."],
           ["Elevadas a juicio", "las que ya pasaron a juicio."],
           ["Recurridas", "casación, tribunal superior o corte."],
           ["Detenidos", "las que tienen una persona detenida."],
           ["SJP", "suspensión de juicio a prueba en trámite."],
         ])}`
      : `<p class="iustrack-tour-lead">Cada lista se arma sola según los datos que cargues:</p>
         ${bullets([
           ["Trámite", "las causas activas del día a día."],
           ["Detenidos", "las que tienen una persona detenida."],
           ["Rebeldes", "las que tienen una persona declarada rebelde."],
           ["SJP en trámite", "suspensión de juicio a prueba."],
           ["Recursos", "casación, queja u otro recurso."],
           ["Delegadas", "las delegadas a otra dependencia."],
           ["Terminadas", "las finalizadas, guardadas al final."],
         ])}`,
    abrirSidebar: true,
  });

  // 5 — Dashboard: primero en general, después las estadísticas
  pasos.push(
    {
      view: "dashboard",
      target: '[data-tour="main"]',
      titulo: "El Dashboard: tu resumen del día",
      texto:
        `<p class="iustrack-tour-lead">Es la pantalla principal: arriba el resumen en tarjetas y abajo la lista de causas.</p>
         <p class="iustrack-tour-hint">De un vistazo sabés cómo viene tu trabajo.</p>`,
    },
    {
      view: "dashboard",
      target: '[data-tour="kpis"]',
      titulo: "Las estadísticas, en detalle",
      texto:
        `<p class="iustrack-tour-lead">Cada tarjeta cuenta tus causas según un criterio.</p>
         ${bullets([
           ["Son botones", "tocá una tarjeta y la lista de abajo queda filtrada con esas causas."],
           ["Se destacan", "la tarjeta elegida se ilumina y su columna pasa al frente."],
         ])}`,
    },
    {
      view: "dashboard",
      target: '[data-tour="nueva-estadistica"]',
      titulo: "Creá tus propias estadísticas",
      texto: esEstudio
        ? "Armá una tarjeta a tu medida: por fuero, estado procesal, rol del estudio, situación de libertad o vencimientos y eventos próximos (elegís los días). Le ponés nombre y color."
        : "Armá una tarjeta a tu medida: por estado de la causa, subestado, situación de libertad o vencimientos y eventos próximos (elegís los días). Le ponés nombre y color.",
    },
    {
      view: "dashboard",
      target: '[data-tour="toggle-kpis"]',
      titulo: "Ocultar o mostrar las estadísticas",
      texto: "Si querés más lugar para la lista de causas, escondés las tarjetas con un toque. Mirá:",
      demo: demoToggleKpis,
    },
  );

  // 6 — Causas en trámite / la lista de trabajo
  pasos.push(
    {
      view: vistaLista,
      target: '[data-tour="main"]',
      titulo: esEstudio ? "Tu lista de causas" : "Causas en trámite",
      texto:
        `<p class="iustrack-tour-lead">Acá vive tu día a día: todas las causas en una tabla clara.</p>
         ${bullets([
           ["Ordenás", "tocando el título de cada columna."],
           ["Buscás", "escribiendo cualquier dato: expediente, carátula o nombre."],
         ])}`,
      demo: demoBuscador,
    },
    {
      view: vistaLista,
      target: '[data-tour="columnas"]',
      titulo: "Elegí qué datos ver",
      texto:
        `${bullets([
          ["Ocultar o mostrar", "desde este botón elegís qué columnas querés ver en la lista."],
          ["Mover de lugar", "arrastrás el título de una columna y la acomodás donde te sirva."],
        ])}
        <p class="iustrack-tour-hint">Tu acomodo queda guardado para la próxima vez.</p>`,
    },
    {
      target: '[data-tour="crear-lista"]',
      titulo: "Creá listas nuevas",
      texto: "Además de las listas que ya vienen, podés crear listas propias y meter en ellas las causas que quieras (por ejemplo “Urgentes de esta semana”).",
      abrirSidebar: true,
    },
  );

  // 7 — Crear una causa, con demostración en vivo
  pasos.push(
    {
      view: vistaLista,
      target: '[data-tour="nueva-causa"]',
      titulo: "Cargar una causa nueva",
      texto: "Con este botón se abre el formulario. Vamos a completarlo juntos, mirá:",
      demo: demoCompletarCausa,
    },
    {
      target: '[data-tour="form-datos"]',
      titulo: "Los datos de la causa",
      texto: esEstudio
        ? bullets([
            ["Expediente y carátula", "identifican la causa."],
            ["Fuero", "penal, civil, laboral, etc."],
            ["Rol del estudio", "defensa, querella o denunciante."],
            ["Juez, fiscal y fiscalía", "quiénes intervienen."],
            ["Estado procesal", "en qué etapa está."],
          ])
        : bullets([
            ["Expediente y carátula", "identifican la causa."],
            ["Estado", "trámite, recurso, delegada o terminada."],
            ["Subestado", "el detalle del trámite (para indagar, para fijar juicio…)."],
            ["Tipo de recurso", "casación, queja, apelación y demás."],
            ["Despachante", "quién tiene la causa a cargo."],
          ]),
      side: "left",
    },
    {
      target: '[data-tour="form-causa"]',
      titulo: "Eventos, notas y edición",
      texto:
        `${bullets([
          ["Al crear la causa", "podés agregarle un evento con fecha (audiencia, plazo, lo que sea) y viaja solo al calendario."],
          ["Notas sin fecha", "anotaciones sueltas que quedan guardadas en la causa."],
          ["Editar cuando quieras", "abrís la causa desde la lista y cambiás cualquier dato."],
        ])}
        <p class="iustrack-tour-hint">Importante: al cambiar los datos, la causa se mueve sola a las listas que le corresponden. Si marcás una persona detenida, aparece en Detenidos; si la pasás a terminada, sale de trámite.</p>`,
      side: "left",
    },
    {
      target: '[data-tour="form-imputados"]',
      titulo: "Las personas de la causa",
      texto:
        `<p class="iustrack-tour-lead">Una causa puede tener varias personas imputadas, cada una con sus datos:</p>
         ${bullets([
           ["Situación", "libre, detenida, rebelde, con probation o condenada."],
           ["Vencimientos", "prisión preventiva (se calcula sola desde la fecha de detención), pena y suspensión de juicio a prueba."],
           ["Prescripciones", "las fechas de prescripción con su descripción."],
         ])}`,
      side: "left",
    },
  );

  // 9 — Calendario (con el menú a la vista) + Google Calendar
  pasos.push(
    {
      view: "calendario",
      target: '[data-tour="nav-calendario"]',
      titulo: "El Calendario, desde el menú",
      texto: "Esta es la pestaña Calendario / Alertas: acá se junta todo lo que tiene fecha.",
      abrirSidebar: true,
    },
    {
      view: "calendario",
      target: '[data-tour="main"]',
      titulo: "Un semáforo con tus fechas",
      texto:
        `<p class="iustrack-tour-lead">Todo lo que cargás con fecha llega solo hasta acá.</p>
         ${bullets([
           ["Rojo", "urgente, es ya."],
           ["Amarillo", "se viene en los próximos días."],
           ["Verde", "todavía hay tiempo."],
           ["Todo junto", "vencimientos, audiencias, eventos y tarjetas de anotaciones en una sola vista."],
         ])}`,
    },
    {
      view: "calendario",
      target: '[data-tour="google-calendar"]',
      titulo: "Conectalo con tu Google Calendar",
      texto:
        `<p class="iustrack-tour-lead">Vinculás tu cuenta de Google una sola vez y listo.</p>
         ${bullets([
           ["Se sincroniza solo", "cada vencimiento y evento se copia a tu agenda de Google."],
           ["Te avisa a tiempo", "recordatorios automáticos 3 días antes, 1 día antes y 1 hora antes."],
           ["El resultado", "nunca más se te pasa un vencimiento. Este es el diferencial de IusTrack."],
         ])}`,
    },
  );

  // 10 — Anotaciones
  pasos.push({
    view: tableroView ?? "dashboard",
    target: tableroView ? '[data-tour="main"]' : '[data-tour="anotaciones"]',
    titulo: "Anotaciones: tus pendientes en columnas",
    texto:
      `<p class="iustrack-tour-lead">Un tablero de notas en columnas, con tarjetas que arrastrás con el dedo o el mouse de una columna a otra (por ejemplo: “Para hacer” → “Hecho”).</p>
       ${bullets([
         ["Crear tarjeta", "le ponés título, detalle y, si querés, una fecha."],
         ["Columna compartida", "las tarjetas con fecha van al calendario de todo el equipo."],
         ["Columna personal", "las tarjetas con fecha van solo a tu calendario."],
       ])}`,
    abrirSidebar: !tableroView,
  });

  // 11 — Categorías
  pasos.push({
    view: "categorias",
    target: '[data-tour="nav-categorias"]',
    titulo: "Categorías propias",
    texto: "Creás categorías tuyas (por ejemplo “Pericia pendiente” o “Para revisar”) y quedan disponibles en todas las causas. Si les ponés fecha, también aparecen en el calendario.",
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
      `<p class="iustrack-tour-lead">Invitás a tus compañeros por email o pasándoles un código de acceso.</p>
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
    texto:
      `${bullets([
        ["El signo de pregunta (?)", "en cada sección te explica esa pantalla en detalle."],
        ["Volver a ver el recorrido", "desde el menú de tu foto de perfil, arriba a la derecha."],
      ])}
      <p class="iustrack-tour-lead" style="margin-top:0.6rem">Empezá ahora: migrá tus causas o creá la primera.</p>`,
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
      // Cierra el formulario de causa si el paso ya no lo necesita.
      if (!paso.target?.startsWith('[data-tour="form')) {
        cerrarFormulario();
        await esperar(150);
      }
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
      cerrarFormulario();
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
        <DialogContent className="sm:max-w-2xl text-center animate-scale-in">
          <div className="flex flex-col items-center gap-5 py-3">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-gold shadow-soft">
              <Scale className="h-10 w-10 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                Bienvenido a IusTrack
              </h2>
              <p className="mt-4 text-xl sm:text-2xl font-medium text-foreground leading-snug">
                Nunca más se te va a pasar un vencimiento.
              </p>
              <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
                {esEstudio
                  ? "Desde hoy, todas las causas del estudio, sus fechas y sus pendientes van a estar ordenados en un solo lugar, y IusTrack te va a avisar a tiempo. Menos papeles sueltos, menos preocupaciones, más tranquilidad."
                  : "Desde hoy, todas las causas, sus vencimientos y sus pendientes van a estar ordenados en un solo lugar, y IusTrack te va a avisar a tiempo. Menos papeles sueltos, menos preocupaciones, más tranquilidad."}
              </p>
              <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
                Te acompaño paso a paso, con calma. En unos minutos vas a manejarlo todo.
              </p>
            </div>
            <div className="w-full">
              <div className="iustrack-tour-progress"><span style={{ width: `${(1 / total) * 100}%` }} /></div>
              <p className="mt-1.5 text-sm text-muted-foreground">Paso 1 de {total}</p>
            </div>
            <div className="flex w-full flex-col sm:flex-row gap-3">
              <Button variant="ghost" size="lg" className="flex-1 text-base h-12" onClick={() => terminar(false)}>Saltar tutorial</Button>
              <Button size="lg" className="flex-1 text-base h-12" onClick={arrancarRecorrido}>Empezar recorrido</Button>
            </div>
            <button
              type="button"
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
              onClick={() => terminar(false)}
            >
              No volver a mostrar automáticamente
            </button>
            <p className="text-sm text-muted-foreground">
              Siempre podés volver a verlo desde tu menú de usuario.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Paso final — Cierre con confeti */}
      <Dialog open={fase === "final"} onOpenChange={(o) => { if (!o) { setFase("idle"); void marcarCompletado(); } }}>
        <DialogContent className="sm:max-w-2xl overflow-hidden text-center animate-scale-in">
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
          <div className="relative flex flex-col items-center gap-5 py-3">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PartyPopper className="h-10 w-10" />
            </div>
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">¡Listo!</h2>
              <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
                Empezá ahora: migrá tus causas o creá la primera. Si querés volver a ver el recorrido, entrá al menú de tu foto de perfil → “Ver tutorial de nuevo”.
              </p>
            </div>
            <div className="w-full">
              <div className="iustrack-tour-progress"><span style={{ width: "100%" }} /></div>
              <p className="mt-1.5 text-sm text-muted-foreground">Paso {total} de {total}</p>
            </div>
            <Button size="lg" className="w-full text-base h-12" onClick={() => { setFase("idle"); void marcarCompletado(); }}>
              Empezar a usar IusTrack
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
