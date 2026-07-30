import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, FolderOpen, CalendarDays, StickyNote, Users } from "lucide-react";

interface Paso {
  icon: React.ElementType;
  titulo: string;
  texto: string;
}

const PASOS: Paso[] = [
  {
    icon: LayoutDashboard,
    titulo: "Bienvenido a IusTrack",
    texto: "IusTrack organiza el trabajo de la vocalía: causas, imputados, vencimientos y agenda, todo en un solo lugar. Este recorrido rápido te muestra lo esencial.",
  },
  {
    icon: FolderOpen,
    titulo: "Causas y estados",
    texto: "Cada causa vive en un estado: Trámite, Recurso o Terminada. Dentro de Trámite podés usar subestados propios de la vocalía (Para indagar, Indagado, Procesado…). Hacé clic derecho sobre una fila para editar, duplicar, destacar con color o borrar.",
  },
  {
    icon: CalendarDays,
    titulo: "Vencimientos y calendario",
    texto: "Prescripciones, prisión preventiva, pena y SJP se muestran con colores según su proximidad. En Calendario / Alertas podés ver todo por día y vincular tu Google Calendar para recibir los eventos con recordatorios.",
  },
  {
    icon: StickyNote,
    titulo: "Anotaciones y listas",
    texto: "Las Anotaciones son tableros tipo Kanban con listas personales o compartidas con la vocalía. Además, podés crear hasta 2 listas personalizadas para agrupar causas como carpetas de acomodo.",
  },
  {
    icon: Users,
    titulo: "Equipo y roles",
    texto: "Invitá compañeros al tribunal como Admin, Miembro o Lector. El rol Lector solo permite ver la información: no puede crear, editar ni borrar nada.",
  },
];

interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** Tutorial de bienvenida. Sin props se auto-muestra una única vez por usuario. */
export default function TutorialModal({ open: openProp, onOpenChange }: Props) {
  const { user } = useAuth();
  const controlado = openProp !== undefined;
  const [openAuto, setOpenAuto] = useState(false);
  const [paso, setPaso] = useState(0);

  const open = controlado ? !!openProp : openAuto;
  const setOpen = (v: boolean) => {
    if (controlado) onOpenChange?.(v);
    else setOpenAuto(v);
    if (!v) setPaso(0);
  };

  useEffect(() => {
    if (controlado || !user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("perfiles")
        .select("tutorial_completado")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled && data && data.tutorial_completado === false) setOpenAuto(true);
    })();
    return () => { cancelled = true; };
  }, [user, controlado]);

  const marcarCompletado = async () => {
    if (user) {
      await supabase.from("perfiles").update({ tutorial_completado: true }).eq("id", user.id);
    }
    setOpen(false);
  };

  const actual = PASOS[paso];
  const Icon = actual.icon;
  const ultimo = paso === PASOS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) marcarCompletado(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <DialogTitle className="text-left">{actual.titulo}</DialogTitle>
          </div>
          <DialogDescription className="pt-3 text-left text-sm leading-relaxed">
            {actual.texto}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-1.5 py-2">
          {PASOS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === paso ? "w-6 bg-primary" : "w-1.5 bg-muted"}`}
            />
          ))}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" size="sm" onClick={marcarCompletado}>
            {ultimo ? "Cerrar" : "Saltar"}
          </Button>
          <div className="flex gap-2">
            {paso > 0 && (
              <Button variant="outline" size="sm" onClick={() => setPaso((p) => p - 1)}>Atrás</Button>
            )}
            <Button size="sm" onClick={() => (ultimo ? marcarCompletado() : setPaso((p) => p + 1))}>
              {ultimo ? "Empezar" : "Siguiente"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
