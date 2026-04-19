import { useState } from "react";
import AppSidebar, { CustomBoard } from "@/components/AppSidebar";
import KpiCards from "@/components/KpiCards";
import CausasTable from "@/components/CausasTable";
import DetenidosList from "@/components/DetenidosList";
import CalendarioAlertas from "@/components/CalendarioAlertas";
import { mockCausas, Causa } from "@/data/mockCausas";
import { toast } from "sonner";

type View = string;

interface Props {
  vocalia: number;
  onBack: () => void;
}

export default function VocaliaWorkspace({ vocalia, onBack }: Props) {
  const [view, setView] = useState<View>("dashboard");
  const [customBoards, setCustomBoards] = useState<CustomBoard[]>([]);
  const [causas, setCausas] = useState<Causa[]>(() => mockCausas.filter((c) => c.vocalia === vocalia));

  const updateCausa = (updated: Causa) => {
    setCausas((prev) => {
      if (prev.some((c) => c.id === updated.id)) {
        return prev.map((c) => (c.id === updated.id ? updated : c));
      }
      return [...prev, updated];
    });
  };

  const deleteCausa = (id: string) => {
    setCausas((prev) => prev.filter((c) => c.id !== id));
    toast.success("Causa eliminada");
  };

  const createCausa = (nueva: Causa) => {
    setCausas((prev) => [...prev, { ...nueva, vocalia }]);
  };

  // Importar (mover) una causa a esta lista — ajusta su estado para que entre en el filtro.
  const importToList = (listId: string) => (c: Causa) => {
    let patched: Causa = { ...c };
    switch (listId) {
      case "tramite":
        patched.estadoCausa = patched.estadoCausa === "En juicio" ? "En juicio" : "En trámite";
        patched.imputados = patched.imputados.map((i) => i.estadoLibertad === "Rebelde" || i.estadoLibertad === "SJP" ? { ...i, estadoLibertad: "Excarcelado" } : i);
        patched.probation = undefined;
        break;
      case "rebeldes":
        patched.imputados = patched.imputados.map((i, idx) => idx === 0 ? { ...i, estadoLibertad: "Rebelde" } : i);
        break;
      case "sjp":
        patched.imputados = patched.imputados.map((i, idx) => idx === 0 ? { ...i, estadoLibertad: "SJP" } : i);
        break;
      case "recursos":
        patched.estadoCausa = "Casación";
        break;
    }
    updateCausa(patched);
    toast.success(`Causa ${c.numero} movida`);
  };

  const causasEnTramite = causas.filter(
    (c) =>
      (c.estadoCausa === "En trámite" || c.estadoCausa === "En juicio") &&
      !c.imputados.some((i) => i.estadoLibertad === "Rebelde") &&
      !c.imputados.some((i) => i.estadoLibertad === "SJP") &&
      !["Casación", "Queja en Corte", "REX"].includes(c.estadoCausa) &&
      !c.probation
  );

  const causasRebeldes = causas.filter((c) => c.imputados.some((i) => i.estadoLibertad === "Rebelde"));
  const causasSJP = causas.filter((c) => c.imputados.some((i) => i.estadoLibertad === "SJP") || !!c.probation);
  const causasRecursos = causas.filter((c) => ["Casación", "Queja en Corte", "REX"].includes(c.estadoCausa));

  const addBoard = () => {
    if (customBoards.length >= 2) return;
    const id = `custom-${Date.now()}`;
    setCustomBoards([...customBoards, { id, label: `Tablero ${customBoards.length + 1}` }]);
    setView(id);
  };

  const removeBoard = (id: string) => {
    setCustomBoards(customBoards.filter((b) => b.id !== id));
    if (view === id) setView("dashboard");
  };

  const renameBoard = (id: string, name: string) => {
    setCustomBoards(customBoards.map((b) => (b.id === id ? { ...b, label: name } : b)));
  };

  const defaultTitles: Record<string, string> = {
    dashboard: `Panel General — Vocalía ${vocalia}`,
    tramite: "Causas en Trámite",
    detenidos: "Detenidos",
    rebeldes: "Rebeldes / Paraderos",
    sjp: "SJP en Trámite",
    recursos: "Recursos (Casación / Queja / REX)",
    calendario: "Calendario y Alertas",
  };

  const title = defaultTitles[view] || customBoards.find((b) => b.id === view)?.label || "Tablero";

  const commonProps = {
    vocalia,
    onUpdateCausa: updateCausa,
    onDeleteCausa: deleteCausa,
    onCreateCausa: createCausa,
    allCausas: causas,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        active={view}
        onNavigate={setView}
        customBoards={customBoards}
        onAddBoard={addBoard}
        onRemoveBoard={removeBoard}
        onRenameBoard={renameBoard}
        vocalia={vocalia}
        onBack={onBack}
      />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <h1 className="text-2xl font-display font-bold text-foreground mb-6">{title}</h1>

        {view === "dashboard" && (
          <div className="space-y-8">
            <KpiCards causas={causas} />
            <CausasTable causas={causasEnTramite} title="Causas en Trámite" listKey="tramite" {...commonProps} onImportCausa={importToList("tramite")} />
          </div>
        )}

        {view === "tramite" && <CausasTable causas={causasEnTramite} title="Causas en Trámite" listKey="tramite" {...commonProps} onImportCausa={importToList("tramite")} />}
        {view === "detenidos" && <DetenidosList causas={causas} vocalia={vocalia} onUpdateCausa={updateCausa} onDeleteCausa={deleteCausa} onCreateCausa={createCausa} />}
        {view === "rebeldes" && <CausasTable causas={causasRebeldes} title="Rebeldes / Paraderos" listKey="rebeldes" {...commonProps} onImportCausa={importToList("rebeldes")} />}
        {view === "sjp" && <CausasTable causas={causasSJP} title="SJP en Trámite" listKey="sjp" {...commonProps} onImportCausa={importToList("sjp")} />}
        {view === "recursos" && <CausasTable causas={causasRecursos} title="Recursos" listKey="recursos" {...commonProps} onImportCausa={importToList("recursos")} />}
        {view === "calendario" && <CalendarioAlertas causas={causas} />}

        {view.startsWith("custom-") && (
          <CausasTable causas={causas} title={customBoards.find((b) => b.id === view)?.label || "Tablero"} listKey={view} {...commonProps} />
        )}
      </main>
    </div>
  );
}
