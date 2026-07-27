import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { combineARToISO, toARDateString, toARTimeString } from "@/lib/parseDate";
import type { TableroTarjeta, TarjetaInput } from "@/hooks/useTablero";

interface CausaOption { id: string; expediente_nro: string; caratula: string | null }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vocaliaId: string | null;
  tarjeta?: TableroTarjeta | null;
  onSave: (input: TarjetaInput) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

export default function TarjetaFormDialog({ open, onOpenChange, vocaliaId, tarjeta, onSave, onDelete }: Props) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [causaId, setCausaId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [causas, setCausas] = useState<CausaOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitulo(tarjeta?.titulo ?? "");
    setDescripcion(tarjeta?.descripcion ?? "");
    setFecha(tarjeta?.fecha_hora ? toARDateString(tarjeta.fecha_hora) : "");
    setHora(tarjeta?.fecha_hora ? toARTimeString(tarjeta.fecha_hora) : "");
    setHoraFin(tarjeta?.fecha_hora_fin ? toARTimeString(tarjeta.fecha_hora_fin) : "");
    setCausaId(tarjeta?.causa_id ?? null);
    setBusqueda("");
  }, [open, tarjeta]);

  useEffect(() => {
    if (!open || !vocaliaId) return;
    supabase
      .from("causas")
      .select("id, expediente_nro, caratula")
      .eq("vocalia_id", vocaliaId)
      .is("borrado_en", null)
      .order("expediente_nro", { ascending: true })
      .limit(500)
      .then(({ data }) => setCausas((data ?? []) as CausaOption[]));
  }, [open, vocaliaId]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return causas.slice(0, 20);
    return causas
      .filter((c) => c.expediente_nro.toLowerCase().includes(q) || (c.caratula ?? "").toLowerCase().includes(q))
      .slice(0, 20);
  }, [causas, busqueda]);

  const causaSel = causas.find((c) => c.id === causaId) ?? null;

  const handleSave = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      const fechaHora = fecha
        ? (hora ? combineARToISO(fecha, hora) : new Date(`${fecha}T00:00:00.000Z`).toISOString())
        : null;
      const fechaHoraFin = fecha && hora && horaFin ? combineARToISO(fecha, horaFin) : null;
      await onSave({
        titulo,
        descripcion: descripcion || null,
        fecha_hora: fechaHora,
        fecha_hora_fin: fechaHoraFin,
        causa_id: causaId,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display">{tarjeta ? "Editar tarjeta" : "Nueva tarjeta"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tj-titulo">Título *</Label>
            <Input id="tj-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tj-desc">Descripción</Label>
            <Textarea id="tj-desc" rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="tj-fecha">Fecha</Label>
              <Input id="tj-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tj-hora">Hora</Label>
              <Input id="tj-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} disabled={!fecha} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tj-hora-fin">Hasta</Label>
              <Input id="tj-hora-fin" type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} disabled={!hora} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tj-causa">Causa asociada (opcional)</Label>
            {causaSel ? (
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
                <span className="text-xs font-mono text-primary">{causaSel.expediente_nro}</span>
                <span className="text-xs text-muted-foreground truncate flex-1">{causaSel.caratula ?? "—"}</span>
                <Button size="sm" variant="ghost" onClick={() => setCausaId(null)}>Quitar</Button>
              </div>
            ) : (
              <>
                <Input
                  id="tj-causa"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por expediente o carátula…"
                />
                {filtradas.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-md border border-border divide-y divide-border/60">
                    {filtradas.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCausaId(c.id)}
                        className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors"
                      >
                        <span className="text-xs font-mono text-primary">{c.expediente_nro}</span>
                        <span className="block text-xs text-muted-foreground truncate">{c.caratula ?? "—"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            {tarjeta && onDelete && (
              <Button
                variant="outline"
                className="text-alert-urgent"
                onClick={async () => { await onDelete(); onOpenChange(false); }}
              >
                Borrar
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button className="flex-1" onClick={handleSave} disabled={!titulo.trim() || saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
