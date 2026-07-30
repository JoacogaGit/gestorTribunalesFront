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
  texto: string;
  /** Abre el sidebar (drawer) en móvil para este paso. */
  abrirSidebar?: boolean;
}

const PASOS: Paso[] = [
  {
    target: '[data-tour="sidebar"]',
    titulo: "Tu menú principal",
    texto: "Desde acá entrás a todas las secciones de la vocalía. Es tu punto de partida.",
    abrirSidebar: true,
  },
  {
    view: "dashboard",
    target: '[data-tour="kpis"]',
    titulo: "Dashboard",
    texto: "Un resumen rápido de tu vocalía: detenidos, juicios, prescripciones y más, siempre a la vista.",
  },
  {
    view: "tramite",
    target: '[data-tour="nueva-causa"]',
    titulo: "Causas en Trámite",
    texto: "Todas tus causas activas. Con este botón creás una nueva en segundos.",
  },
  {
    view: "tramite",
    target: '[data-tour="nueva-causa"]',
    titulo: "Así se crea una causa",
    texto: "Al tocarlo se abre la ficha: expediente, carátula, imputados, fechas y vencimientos. Todo en un solo formulario.",
  },
  {
    view: "tramite",
    target: '[data-tour="buscador"]',
    titulo: "Buscá y filtrá",
    texto: "Filtrá por subestado o categoría, o buscá por número de expediente o carátula.",
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
    view: "migrar",
    target: '[data-tour="main"]',
    titulo: "Migrar causas",
    texto: "¿Ya tenés una planilla de Excel? La IA te la importa en minutos.",
  },
  {
    view: "dashboard",
    target: '[data-tour="sidebar"]',
    titulo: "Anotaciones",
    texto: "Tu espacio tipo Trello para organizar pendientes. Las podés compartir con la vocalía o dejarlas privadas.",
    abrirSidebar: true,
  },
  {
    view: "dashboard",
    target: '[data-tour="notificaciones"]',
    titulo: "Notificaciones push",
    texto: "Activá las alertas al celular y no se te escapa ningún vencimiento.",
  },
  {
    view: "calendario",
    target: '[data-tour="google-calendar"]',
    titulo: "Google Calendar",
    texto: "Vinculá tu cuenta y recibí los recordatorios directo en tu agenda de Google.",
  },
  {
    view: "dashboard",
    target: '[data-tour="ayuda"]',
    titulo: "Ayuda cuando quieras",
    texto: "Tocá el signo de pregunta en cualquier momento para volver a ver este recorrido.",
  },
];

const TOTAL = PASOS.length + 2; // bienvenida + pasos + cierre

interface Props {
  onNavigate: (view: string) => void;
  onOpenSidebar?: (open: boolean) => void;
  isMobile?: boolean;
}

export default function TutorialTour({ onNavigate, onOpenSidebar, isMobile }: Props) {
  const { user } = useAuth();
  const [fase, setFase] = useState<"idle" | "bienvenida" | "recorrido" | "final">("idle");
  const driverRef = useRef<Driver | null>(null);
  const idxRef = useRef(0);

  const marcarCompletado = useCallback(async () => {
    if (user) await supabase.from("perfiles").update({ tutorial_completado: true }).eq("id", user.id);
  }, [user]);

  // Auto-arranque la primera vez
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("perfiles")
        .select("tutorial_completado")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled && data && data.tutorial_completado === false) setFase("bienvenida");
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
      const paso = PASOS[i];
      if (!paso) return;
      if (paso.view) onNavigate(paso.view);
      if (isMobile) onOpenSidebar?.(!!paso.abrirSidebar);
      await new Promise((r) => setTimeout(r, paso.view || paso.abrirSidebar ? 450 : 150));
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
      steps: PASOS.map((p, i) => ({
        element: p.target,
        popover: {
          title: p.titulo,
          description: `${p.texto}<div class="iustrack-tour-progress"><span style="width:${
            ((i + 2) / TOTAL) * 100
          }%"></span></div><div class="iustrack-tour-count">Paso ${i + 2} de ${TOTAL}</div>`,
          side: "bottom" as const,
          align: "start" as const,
        },
      })),
      onNextClick: async () => {
        const next = idxRef.current + 1;
        if (next >= PASOS.length) { terminar(true); return; }
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
  }, [prepararPaso, terminar]);

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
      <Dialog open={fase === "bienvenida"} onOpenChange={(o) => { if (!o) terminar(false); }}>
        <DialogContent className="sm:max-w-md text-center animate-scale-in">
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-gold shadow-soft">
              <Scale className="h-8 w-8 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Bienvenido a IusTrack</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Te muestro en un minuto cómo se maneja tu vocalía: causas, vencimientos, agenda y anotaciones.
              </p>
            </div>
            <div className="w-full">
              <div className="iustrack-tour-progress"><span style={{ width: `${(1 / TOTAL) * 100}%` }} /></div>
              <p className="mt-1 text-[11px] text-muted-foreground">Paso 1 de {TOTAL}</p>
            </div>
            <div className="flex w-full gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => terminar(false)}>Saltar tutorial</Button>
              <Button className="flex-1" onClick={arrancarRecorrido}>Empezar recorrido</Button>
            </div>
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
              <p className="mt-1 text-[11px] text-muted-foreground">Paso {TOTAL} de {TOTAL}</p>
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
