import { mockCausas } from "@/data/mockCausas";
import CausaCard from "./CausaCard";
import CausaDetail from "./CausaDetail";
import { useState } from "react";
import { Causa } from "@/data/mockCausas";

const detenidos = mockCausas.filter((c) => c.estadoLibertad === "Detenido");

export default function DetenidosPanel() {
  const [selected, setSelected] = useState<Causa | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {detenidos.map((c) => (
          <CausaCard key={c.id} causa={c} onClick={() => setSelected(c)} />
        ))}
      </div>
      {selected && <CausaDetail causa={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
