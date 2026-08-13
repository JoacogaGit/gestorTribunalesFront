import { useMemo, useState } from "react";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { Causa } from "@/data/mockCausas";
import CausasTable from "@/components/CausasTable";
import EmptyState from "@/components/EmptyState";

interface Props {
  causas: Causa[];
  /** "fuero" agrupa por causa.fuero; "delito" agrupa por cada delito de los sujetos. */
  criterio: "fuero" | "delito";
  onMutated?: () => void;
  onNavigateToConexa?: (id: string) => void;
}

const SIN = "Sin especificar";

function caratula(c: Causa) {
  return c.caratulaOverride || c.imputados.map((i) => i.nombre).join(", ") || c.numero;
}

export default function AgrupadasView({ causas, criterio, onMutated, onNavigateToConexa }: Props) {
  const [seleccion, setSeleccion] = useState<string | null>(null);

  const grupos = useMemo(() => {
    const map = new Map<string, Causa[]>();
    for (const c of causas) {
      const claves = criterio === "fuero"
        ? [(c.fuero || "").trim() || SIN]
        : (c.delitos && c.delitos.length > 0 ? c.delitos : [SIN]);
      for (const k of claves) {
        const arr = map.get(k) ?? [];
        arr.push(c);
        map.set(k, arr);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [causas, criterio]);

  if (seleccion) {
    const lista = grupos.find(([k]) => k === seleccion)?.[1] ?? [];
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <button
          onClick={() => setSeleccion(null)}
          className="self-start mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a {criterio === "fuero" ? "fueros" : "delitos"}
        </button>
        <CausasTable
          causas={lista}
          title={`${criterio === "fuero" ? "Fuero" : "Delito"}: ${seleccion}`}
          listKey={`estudio-${criterio}-${seleccion}`}
          allCausas={lista}
          onMutated={onMutated}
          onNavigateToConexa={onNavigateToConexa}
          onUpdateCausa={() => {}}
          onDeleteCausa={() => {}}
          onCreateCausa={() => {}}
          onChangeEstado={() => {}}
        />
      </div>
    );
  }

  if (grupos.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title={criterio === "fuero" ? "Todavía no hay causas con fuero cargado" : "Todavía no hay delitos cargados"}
        subtitle="Completá el dato en las causas para verlas agrupadas acá."
      />
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pr-1">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {grupos.map(([nombre, lista]) => (
          <button
            key={nombre}
            onClick={() => setSeleccion(nombre)}
            className="text-left rounded-xl border border-border/60 bg-card/80 shadow-soft hover:shadow-elevated hover:border-primary/40 transition-all p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-display text-sm font-semibold text-foreground leading-snug break-words">{nombre}</span>
              <span className="shrink-0 text-[11px] tabular-nums rounded-full px-2 py-0.5 bg-primary/10 text-primary font-semibold">
                {lista.length}
              </span>
            </div>
            <ul className="space-y-1">
              {lista.slice(0, 4).map((c) => (
                <li key={c.id} className="text-[11px] text-muted-foreground truncate">
                  {caratula(c)}
                  {criterio === "fuero" && c.delitos && c.delitos.length > 0 && (
                    <span className="text-muted-foreground/70"> — {c.delitos[0]}</span>
                  )}
                </li>
              ))}
            </ul>
            {lista.length > 4 && (
              <span className="text-[11px] text-primary font-medium">+ {lista.length - 4} más</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
