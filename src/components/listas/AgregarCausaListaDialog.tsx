import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Loader2, Scale, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TabKey = "tramite" | "detenidos" | "sjp" | "rebeldes" | "recursos" | "terminadas";

const TABS: { key: TabKey; label: string }[] = [
  { key: "tramite", label: "Trámite" },
  { key: "detenidos", label: "Detenidos" },
  { key: "sjp", label: "SJP" },
  { key: "rebeldes", label: "Rebeldes" },
  { key: "recursos", label: "Recursos" },
  { key: "terminadas", label: "Terminadas" },
];

interface CausaItem {
  id: string;
  caratula: string;
  expediente_nro: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vocaliaId: string;
  causasYaEnListaIds: Set<string>;
  onAgregar: (causaId: string) => Promise<void>;
}

export default function AgregarCausaListaDialog({ open, onOpenChange, vocaliaId, causasYaEnListaIds, onAgregar }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [tab, setTab] = useState<TabKey | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [causas, setCausas] = useState<CausaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [agregandoId, setAgregandoId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep(1); setTab(null); setBusqueda(""); setCausas([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !tab) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      let query = supabase
        .from("causas")
        .select("id, caratula, expediente_nro, sujetos(situacion_libertad, borrado_en)")
        .eq("vocalia_id", vocaliaId)
        .is("borrado_en", null);

      if (tab === "tramite") query = query.eq("estado_causa", "tramite");
      else if (tab === "recursos") query = query.eq("estado_causa", "recurso");
      else if (tab === "terminadas") query = query.eq("estado_causa", "terminada");
      // detenidos / sjp / rebeldes: filtramos por situación del sujeto en cliente

      const { data, error } = await query.order("created_at", { ascending: false }).limit(500);
      if (cancelled) return;
      if (error) {
        toast.error("No se pudieron cargar las causas");
        setCausas([]);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let rows = (data as any[]) ?? [];
        if (tab === "detenidos" || tab === "sjp" || tab === "rebeldes") {
          const need = tab === "detenidos" ? "detenido" : tab === "sjp" ? "probation" : "rebelde";
          rows = rows.filter((r) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (r.sujetos as any[] | null ?? [])
              .filter((s) => s.borrado_en == null)
              .some((s) => s.situacion_libertad === need)
          );
        }
        setCausas(rows.map((r) => ({ id: r.id, caratula: r.caratula, numero_expediente: r.numero_expediente })));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, tab, vocaliaId]);

  const filtered = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return causas;
    return causas.filter((c) =>
      c.caratula.toLowerCase().includes(q) ||
      (c.numero_expediente ?? "").toLowerCase().includes(q)
    );
  }, [causas, busqueda]);

  const handleAgregar = async (id: string) => {
    setAgregandoId(id);
    try {
      await onAgregar(id);
      toast.success("Causa agregada a la lista");
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast.error((e as any)?.message ?? "No se pudo agregar la causa");
    } finally {
      setAgregandoId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agregar causa a la lista</DialogTitle>
          <DialogDescription>
            {step === 1 ? "Elegí desde qué pestaña traer la causa." : "Buscá y seleccioná la causa a agregar."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setStep(2); }}
                className="flex items-center gap-2 px-4 py-3 rounded-md border border-border hover:bg-accent/40 hover:border-primary/40 transition-colors text-sm font-medium"
              >
                <Scale className="w-4 h-4 text-muted-foreground" />
                {t.label}
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-1">
                <ArrowLeft className="w-4 h-4" /> Cambiar pestaña
              </Button>
              <span className="text-xs text-muted-foreground">
                Pestaña: <strong>{TABS.find((t) => t.key === tab)?.label}</strong>
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por carátula o expediente..."
                className="pl-8"
                autoFocus
              />
            </div>
            <div className="max-h-80 overflow-y-auto border border-border rounded-md divide-y divide-border">
              {loading ? (
                <div className="p-6 flex items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cargando causas...
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground text-center">
                  No hay causas que coincidan.
                </div>
              ) : (
                filtered.map((c) => {
                  const yaEsta = causasYaEnListaIds.has(c.id);
                  return (
                    <div key={c.id} className="flex items-center justify-between p-3 hover:bg-accent/20">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{c.caratula}</div>
                        {c.numero_expediente && (
                          <div className="text-xs text-muted-foreground truncate">{c.numero_expediente}</div>
                        )}
                      </div>
                      {yaEsta ? (
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Ya está
                        </span>
                      ) : (
                        <Button size="sm" disabled={agregandoId === c.id} onClick={() => handleAgregar(c.id)}>
                          {agregandoId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Agregar"}
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
