import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { useCausasSearch } from "@/hooks/useCausasSearch";
import { useVocaliaActual } from "@/context/VocaliaContext";
import { Loader2, X } from "lucide-react";

interface Value {
  id: string | null;
  texto: string;
}

interface Props {
  value: Value;
  onChange: (v: Value) => void;
  excludeCausaId?: string | null;
}

export default function CausaConexaInput({ value, onChange, excludeCausaId }: Props) {
  const { vocalia } = useVocaliaActual();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { results, loading } = useCausasSearch(value.texto, vocalia?.tribunalId ?? null, excludeCausaId);

  // Cerrar al click afuera
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const showDropdown = open && (loading || results.length > 0);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={value.texto}
          onChange={(e) => {
            // Cualquier edición rompe el match.
            onChange({ id: null, texto: e.target.value });
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
          placeholder="N° de expediente o referencia"
          className={value.id ? "pr-16 border-sky-400/60" : "pr-8"}
        />
        {value.id && (
          <span
            className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-medium text-sky-500 pointer-events-none"
            title="Vinculada a otra causa"
          >
            ● vinc.
          </span>
        )}
        {value.texto && (
          <button
            type="button"
            onClick={() => { onChange({ id: null, texto: "" }); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            title="Limpiar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {showDropdown && (
        <div className="absolute z-50 mt-1 left-0 right-0 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
          {loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" /> Buscando…
            </div>
          )}
          {!loading && results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onChange({ id: r.id, texto: r.expediente_nro });
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 hover:bg-accent flex flex-col gap-0.5 border-b border-border/40 last:border-b-0"
            >
              <span className="font-mono text-xs text-primary">{r.expediente_nro}</span>
              <span className="text-xs text-foreground truncate">{r.caratula || "(sin carátula)"}</span>
              <span className="text-[10px] text-muted-foreground">{r.vocalia.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
