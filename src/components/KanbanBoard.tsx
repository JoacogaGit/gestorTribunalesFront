import { useState } from "react";
import { mockCausas, EstadoCausa, Causa } from "@/data/mockCausas";
import CausaCard from "./CausaCard";
import CausaDetail from "./CausaDetail";

const columns: { estado: EstadoCausa; label: string; accent: string }[] = [
  { estado: "En trámite", label: "En Trámite", accent: "border-t-accent" },
  { estado: "En juicio", label: "En Juicio", accent: "border-t-alert-info" },
  { estado: "Casación", label: "Casación", accent: "border-t-alert-warning" },
  { estado: "Queja en Corte", label: "Queja en Corte", accent: "border-t-alert-urgent" },
  { estado: "Terminada", label: "Terminada", accent: "border-t-alert-ok" },
];

export default function KanbanBoard() {
  const [selected, setSelected] = useState<Causa | null>(null);

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const causas = mockCausas.filter((c) => c.estadoCausa === col.estado);
          return (
            <div key={col.estado} className={`min-w-[280px] flex-1 rounded-lg bg-surface-sunken border-t-4 ${col.accent} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground font-sans">{col.label}</h3>
                <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {causas.length}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {causas.map((c) => (
                  <CausaCard key={c.id} causa={c} onClick={() => setSelected(c)} />
                ))}
                {causas.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">Sin causas</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {selected && <CausaDetail causa={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
