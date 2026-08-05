import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListChecks, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useSubestadosTramite } from "@/hooks/useSubestadosTramite";
import { useSoloLectura } from "@/hooks/useSoloLectura";

interface Props {
  vocaliaId: string;
}

export default function SubestadosManager({ vocaliaId }: Props) {
  const { subestados, loading, crear, renombrar, borrar } = useSubestadosTramite(vocaliaId);
  const soloLectura = useSoloLectura();
  const [nuevo, setNuevo] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <header className="flex items-center gap-2 mb-1">
        <ListChecks className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-display font-semibold text-foreground">Subestados de trámite</h3>
      </header>
      <p className="text-xs text-muted-foreground mb-4">
        Subdivisiones del estado "Trámite" para esta espacio. Se pueden asignar a cada causa desde su ficha.
      </p>

      {loading ? (
        <p className="text-xs text-muted-foreground">Cargando…</p>
      ) : (
        <ul className="space-y-2">
          {subestados.map((se) => (
            <li key={se.id} className="flex items-center gap-2 rounded-md border border-border/70 px-3 py-2">
              {editId === se.id ? (
                <>
                  <Input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { renombrar(se.id, draft); setEditId(null); }
                      if (e.key === "Escape") setEditId(null);
                    }}
                    className="h-9 flex-1"
                  />
                  <button className="p-1.5 text-primary" onClick={() => { renombrar(se.id, draft); setEditId(null); }} aria-label="Guardar">
                    <Check className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-muted-foreground" onClick={() => setEditId(null)} aria-label="Cancelar">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-foreground truncate">{se.nombre}</span>
                  {!soloLectura && (
                    <>
                      <button
                        className="p-1.5 text-muted-foreground hover:text-foreground"
                        onClick={() => { setDraft(se.nombre); setEditId(se.id); }}
                        aria-label="Renombrar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="p-1.5 text-muted-foreground hover:text-alert-urgent"
                        onClick={() => borrar(se.id)}
                        aria-label="Borrar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </>
              )}
            </li>
          ))}
          {subestados.length === 0 && (
            <li className="text-xs text-muted-foreground">Todavía no hay subestados.</li>
          )}
        </ul>
      )}

      {!soloLectura && (
        <div className="flex gap-2 mt-4">
          <Input
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && nuevo.trim()) { crear(nuevo); setNuevo(""); } }}
            placeholder="Nuevo subestado (ej. Elevado)"
            className="flex-1"
          />
          <Button onClick={() => { if (nuevo.trim()) { crear(nuevo); setNuevo(""); } }} disabled={!nuevo.trim()}>
            <Plus className="w-4 h-4 mr-1" /> Agregar
          </Button>
        </div>
      )}
    </section>
  );
}
