import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { calcularVencimiento, hoyArgentina, TipoDias } from "@/lib/plazos";
import { formatLocalDate } from "@/lib/parseDate";
import type { EventoInput } from "@/hooks/useEventoMutations";

let cacheInhabiles: Set<string> | null = null;

interface Props { saving?: boolean; onCancel: () => void; onSubmit: (v: EventoInput) => void }

export default function PlazoFormInline({ saving, onCancel, onSubmit }: Props) {
  const [titulo, setTitulo] = useState("");
  const [dias, setDias] = useState("");
  const [tipo, setTipo] = useState<TipoDias>("habiles");
  const [inicio, setInicio] = useState(hoyArgentina());
  const [inhabiles, setInhabiles] = useState<Set<string> | null>(cacheInhabiles);

  useEffect(() => {
    if (cacheInhabiles) return;
    supabase.from("dias_inhabiles").select("fecha").then(({ data }) => {
      cacheInhabiles = new Set((data ?? []).map((r) => String(r.fecha).slice(0, 10)));
      setInhabiles(cacheInhabiles);
    });
  }, []);

  const n = parseInt(dias, 10);
  const valido = titulo.trim() && n > 0 && /^\d{4}-\d{2}-\d{2}$/.test(inicio);
  const venc = useMemo(
    () => (valido && (tipo === "corridos" || inhabiles) ? calcularVencimiento(inicio, n, tipo, inhabiles ?? new Set()) : null),
    [valido, inicio, n, tipo, inhabiles],
  );

  return (
    <form
      className="rounded-md border border-border bg-card p-3 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!venc) return;
        onSubmit({
          titulo: titulo.trim(), tipo_evento: "Plazo",
          descripcion: `Plazo de ${n} días ${tipo === "habiles" ? "hábiles" : "corridos"} desde ${formatLocalDate(inicio)}`,
          fecha: venc, categoria_personalizada_id: null,
        });
      }}
    >
      <div className="space-y-1"><Label>Título</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Vence traslado" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1"><Label>Cantidad de días</Label><Input type="number" min={1} value={dias} onChange={(e) => setDias(e.target.value)} /></div>
        <div className="space-y-1"><Label>Desde</Label><Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
      </div>
      <div className="flex gap-2">
        {(["habiles", "corridos"] as TipoDias[]).map((t) => (
          <Button key={t} type="button" size="sm" variant={tipo === t ? "default" : "outline"} onClick={() => setTipo(t)}>
            {t === "habiles" ? "Días hábiles" : "Días corridos"}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {venc ? <>Vence el <strong className="text-foreground">{formatLocalDate(venc)}</strong></> : tipo === "habiles" && !inhabiles && valido ? "Calculando…" : "Completá título y días para ver el vencimiento."}
      </p>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={!venc || saving}>{saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}Guardar plazo</Button>
      </div>
    </form>
  );
}
