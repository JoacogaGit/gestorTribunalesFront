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

const CALLOUTS = [
  ["Situación de libertad", "Si cambiás un imputado a Detenido, la causa aparece también en la pestaña Detenidos."],
  ["Fecha de detención", "Al cargarla se calcula automáticamente el vencimiento de Prisión Preventiva (2 años)."],
  ["Eventos con fecha", "Cualquier evento con fecha aparece en el calendario y en tu Google Calendar (si lo vinculaste)."],
  ["Estado de la causa", "Si la pasás a Recurso, desaparece de Trámite. Si la marcás Terminada, va al final."],
  ["Subestado", "Categorizá el estado de trámite (Para indagar, Indagado…). Es solo visual, no cambia dónde aparece."],
];

const calloutsHtml = `
  <p class="iustrack-tour-lead">Este es el corazón de IusTrack. Cada modificación que hacés acá impacta en toda la app. Algunos ejemplos:</p>
  <ul class="iustrack-tour-callouts">
    ${CALLOUTS.map(([t, d]) => `<li><span class="iustrack-tour-arrow">→</span><span><strong>${t}:</strong> ${d}</span></li>`).join("")}
  </ul>
  <p class="iustrack-tour-hint">Tomate unos segundos para leerlo, es el paso más importante.</p>
`;

interface Props {
  onNavigate: (view: string) => void;
  onOpenSidebar?: (open: boolean) => void;
  isMobile?: boolean;
  /** Si el usuario pertenece a más de una vocalía, se muestra el paso del selector. */
  multiVocalia?: boolean;
  /** Solo los admin ven Papelera en el sidebar. */
  esAdmin?: boolean;
  /** Vista del primer tablero de anotaciones (si existe), para mostrarlo en vivo. */
  tableroView?: string | null;
  /** Oficina tipo estudio jurídico: recorrido distinto. */
  esEstudio?: boolean;
}

function construirPasosEstudio({ esAdmin, tableroView }: Props): Paso[] {
  const pasos: Paso[] = [
    {
      view: "dashboard",
      target: '[data-tour="kpis"]',
      titulo: "Dashboard del estudio",
      texto: "Acá ves <strong>todas las causas del estudio</strong> en una sola lista, con estadísticas arriba que podés ocultar cuando quieras más espacio.",
    },
    {
      target: '[data-tour="sidebar"]',
      titulo: "Tus listas de causas",
      texto: "Fueros, Delitos, Instrucción, Elevadas a juicio, Recurridas, Detenidos y SJP. Cada una filtra tus causas por fuero, delito, estado procesal o situación de libertad.",
      abrirSidebar: true,
    },
    {
      view: "dashboard",
      target: '[data-tour="nueva-causa"]',
      titulo: "Cargar una causa",
      texto: "Al crear una causa completás los campos propios del estudio: <strong>fuero</strong>, <strong>rol del estudio</strong>, <strong>estado procesal</strong>, <strong>juez</strong>, <strong>fiscal</strong> y <strong>damnificado</strong>.",
    },
    {
      view: "calendario",
      target: '[data-tour="main"]',
      titulo: "El calendario: el corazón del sistema",
      texto:
        `<p class="iustrack-tour-lead">Este es el diferencial de IusTrack.</p>
         <ul class="iustrack-tour-callouts">
           <li><span class="iustrack-tour-arrow">→</span><span><strong>Automático:</strong> todo vencimiento o evento que cargues en una causa aparece acá solo.</span></li>
           <li><span class="iustrack-tour-arrow">→</span><span><strong>Todo conectado:</strong> listas y anotaciones también se vinculan al calendario.</span></li>
           <li><span class="iustrack-tour-arrow">→</span><span><strong>Resultado:</strong> no se te pasa ningún vencimiento ni fecha clave.</span></li>
         </ul>`,
    },
    {
      view: "calendario",
      target: '[data-tour="google-calendar"]',
      titulo: "Y además, en tu Google Calendar",
      texto: "Vinculá tu cuenta de Google y los eventos se sincronizan solos, con recordatorios automáticos.",
    },
    {
      view: tableroView ?? "dashboard",
      target: tableroView ? '[data-tour="main"]' : '[data-tour="anotaciones"]',
      titulo: "Anotaciones (kanban)",
      texto:
        "Tu pizarra de pendientes: tableros → listas → columnas con tarjetas arrastrables. Las columnas <strong>compartidas</strong> van al calendario de todo el equipo; las <strong>personales</strong>, solo al tuyo.",
      abrirSidebar: !tableroView,
    },
    {
      target: '[data-tour="listas"]',
      titulo: "Categorías y listas personalizadas",
      texto: "Armá tus propias listas (Prioritarias, Para revisar…) y categorías de eventos para ordenar el trabajo del estudio a tu manera.",
      abrirSidebar: true,
    },
  ];

  if (esAdmin) {
    pasos.push({
      target: '[data-tour="nav-miembros"]',
      titulo: "Miembros del estudio",
      texto: "Invitá a las personas de tu estudio por email y asignales un rol: administrador, miembro o lector.",
      abrirSidebar: true,
    });
  }

  pasos.push(
    {
      view: "migrar",
      target: '[data-tour="main"]',
      titulo: "Migrar causas existentes",
      texto: "¿Ya tenés tus causas en Excel, Word o PDF? La IA te las importa en minutos.",
    },
    {
      target: '[data-tour="ayuda"]',
      titulo: "Ayuda cuando quieras",
      texto: "Tocá el signo de pregunta en cualquier momento para volver a ver este recorrido.",
    }
  );

  return pasos;
}

function construirPasos(props: Props): Paso[] {
  if (props.esEstudio) return construirPasosEstudio(props);
  const { multiVocalia, esAdmin, tableroView } = props;

  const pasos: Paso[] = [
    {
      target: '[data-tour="sidebar"]',
      titulo: "Tu menú principal",
      texto: "Desde acá entrás a todas las secciones de el espacio. Es tu punto de partida.",
      abrirSidebar: true,
    },
  ];

  if (multiVocalia) {
    pasos.push({
      target: '[data-tour="espacio-selector"]',
      titulo: "Cambiar entre espacios",
      texto: "Si sos miembro de varias espacios, cambiá entre ellas desde acá. Cada espacio tiene sus propias causas, calendarios y anotaciones.",
      abrirSidebar: true,
    });
  }

  pasos.push(
    {
      target: '[data-tour="tema"]',
      titulo: "Modo claro / oscuro",
      texto: "Podés usar la app en modo claro o oscuro, según prefieras. Tu preferencia se guarda automáticamente.",
      demo: demoTema,
    },
    {
      view: "dashboard",
      target: '[data-tour="kpis"]',
      titulo: "Dashboard",
      texto: "Un resumen rápido de tu espacio: detenidos, juicios, prescripciones y más, siempre a la vista.",
    },
    {
      view: "tramite",
      target: '[data-tour="nueva-causa"]',
      titulo: "Causas en Trámite",
      texto: "Todas tus causas activas. Con este botón creás una nueva: expediente, carátula, imputados, fechas y vencimientos, todo en un solo formulario.",
    },
    {
      view: "tramite",
      target: '[data-tour="main"]',
      titulo: "El panel de edición de una causa",
      texto: calloutsHtml,
    },
    {
      view: "tramite",
      target: '[data-tour="buscador"]',
      titulo: "Buscador y filtros",
      texto: "Podés buscar por carátula, expediente o imputado. Y filtrar por subestado, categoría o cualquier campo. Los resultados se actualizan al instante.",
      demo: demoBuscador,
    },
    {
      target: '[data-tour="listas"]',
      titulo: "Listas personalizadas",
      texto: "Creá tus propias listas de causas: Prioritarias, Para revisar, Casos difíciles… Las causas se agregan sin cambiar de estado: es una vista tuya (personal o compartida con el espacio). Con “Crear nueva lista” arrancás.",
      abrirSidebar: true,
    },
    {
      view: "detenidos",
      target: '[data-tour="main"]',
      titulo: "Detenidos, SJP y Rebeldes",
      texto: "Estas listas se arman solas: las causas aparecen según la situación de sus imputados.",
    },
    {
      view: "calendario",
      target: '[data-tour="main"]',
      titulo: "Calendario / Alertas",
      texto: "Vencimientos, audiencias y eventos en un solo lugar, con colores según urgencia.",
    },
    {
      view: "calendario",
      target: '[data-tour="google-calendar"]',
      titulo: "Y además, en tu Google Calendar",
      texto: "Desde el mismo calendario vinculás tu cuenta de Google y los eventos se sincronizan solos, con recordatorios automáticos.",
    },
    {
      view: "migrar",
      target: '[data-tour="main"]',
      titulo: "Migrar causas",
      texto: "¿Ya tenés una planilla de Excel? La IA te la importa en minutos.",
    },
    {
      view: tableroView ?? "dashboard",
      target: tableroView ? '[data-tour="main"]' : '[data-tour="anotaciones"]',
      titulo: "Anotaciones",
      texto:
        "Tu pizarra para organizar pendientes. Podés crear <strong>anotaciones</strong> → dentro de cada anotación, <strong>listas</strong> → dentro de cada lista, <strong>columnas con tarjetas arrastrables</strong>. Podés compartir anotaciones o listas con tu oficina, o mantenerlas personales.",
      abrirSidebar: !tableroView,
    },
    {
      target: '[data-tour="nueva-anotacion"]',
      titulo: "Crear una anotación",
      texto: "Con “Nueva anotación” creás un tablero. Adentro sumás listas y, dentro de cada lista, columnas kanban con tarjetas que arrastrás de una a otra.",
      abrirSidebar: true,
    },
    {
      view: "dashboard",
      target: '[data-tour="notificaciones"]',
      titulo: "Notificaciones push",
      texto: "Activá las alertas al celular y no se te escapa ningún vencimiento.",
    },
  );

  if (esAdmin) {
    pasos.push({
      target: '[data-tour="nav-papelera"]',
      titulo: "Papelera",
      texto: "Si borrás una causa por error, no te preocupes: va a la Papelera y podés restaurarla durante <strong>30 días</strong>. Después de ese plazo se elimina definitivamente.",
      abrirSidebar: true,
    });
  }

  pasos.push(
    {
      target: '[data-tour="usermenu"]',
      titulo: "Abandonar oficina",
      texto: "Si en algún momento querés salir de esta oficina, podés hacerlo desde tu menú de usuario. Si sos único admin, tenés que designar a alguien más antes.",
    },
    {
      target: '[data-tour="ayuda"]',
      titulo: "Ayuda cuando quieras",
      texto: "Tocá el signo de pregunta en cualquier momento para volver a ver este recorrido.",
    }
  );

  return pasos;
}

export default function TutorialTour({ onNavigate, onOpenSidebar, isMobile, multiVocalia, esAdmin, tableroView }: Props) {
  const { user } = useAuth();
  const [fase, setFase] = useState<"idle" | "bienvenida" | "recorrido" | "final">("idle");
  const driverRef = useRef<Driver | null>(null);
  const idxRef = useRef(0);
  const pasosRef = useRef<Paso[]>([]);
  const [total, setTotal] = useState(construirPasos({ onNavigate, multiVocalia, esAdmin, tableroView }).length + 2);

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
    const pasos = construirPasos({ onNavigate, multiVocalia, esAdmin, tableroView });
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
  }, [prepararPaso, terminar, onNavigate, multiVocalia, esAdmin, tableroView]);

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
                Te muestro en un minuto cómo se maneja tu espacio: causas, vencimientos, agenda y anotaciones.
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
