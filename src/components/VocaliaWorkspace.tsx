import { useState } from "react";
import AppSidebar, { CustomBoard } from "@/components/AppSidebar";
import KpiCards from "@/components/KpiCards";
import CausasTable from "@/components/CausasTable";
import DetenidosList from "@/components/DetenidosList";
import CalendarioAlertas from "@/components/CalendarioAlertas";
import { mockCausas, Causa } from "@/data/mockCausas";

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
    setCausas((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const deleteCausa = (id: string) => {
    setCausas((prev) => prev.filter((c) => c.id !== id));
  };

  const causasEnTramite = causas.filter(
    (c) =>
      (c.estadoCausa === "En trámite" || c.estadoCausa === "En juicio") &&
      !c.imputados.some((i) => i.estadoLibertad === "Rebelde") &&
      !c.imputados.some((i) => i.estadoLibertad === "SJP") &&
      !["Casación", "Queja en Corte", "REX"].includes(c.estadoCausa) &&
      !c.probation
  );

  const causasRebeldes = causas.filter((c) =>
    c.imputados.some((i) => i.estadoLibertad === "Rebelde")
  );
  const causasSJP = causas.filter((c) =>
    c.imputados.some((i) => i.estadoLibertad === "SJP") || !!c.probation
  );
  const causasRecursos = causas.filter((c) =>
    ["Casación", "Queja en Corte", "REX"].includes(c.estadoCausa)
  );

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
            <CausasTable causas={causasEnTramite} title="Causas en Trámite" onUpdateCausa={updateCausa} />
          </div>
        )}

        {view === "tramite" && <CausasTable causas={causasEnTramite} title="Causas en Trámite" onUpdateCausa={updateCausa} />}
        {view === "detenidos" && <DetenidosList causas={causas} onUpdateCausa={updateCausa} />}
        {view === "rebeldes" && <CausasTable causas={causasRebeldes} title="Rebeldes / Paraderos" onUpdateCausa={updateCausa} />}
        {view === "sjp" && <CausasTable causas={causasSJP} title="SJP en Trámite" onUpdateCausa={updateCausa} />}
        {view === "recursos" && <CausasTable causas={causasRecursos} title="Recursos" onUpdateCausa={updateCausa} />}
        {view === "calendario" && <CalendarioAlertas causas={causas} />}

        {view.startsWith("custom-") && (
          <CausasTable causas={causas} title={customBoards.find((b) => b.id === view)?.label || "Tablero"} onUpdateCausa={updateCausa} />
        )}
      </main>
    </div>
  );
}
