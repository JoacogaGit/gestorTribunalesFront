import { useState } from "react";
import AppSidebar, { CustomBoard } from "@/components/AppSidebar";
import KpiCards from "@/components/KpiCards";
import CausasTable from "@/components/CausasTable";
import CalendarioVencimientos from "@/components/CalendarioVencimientos";
import AlertasPanel from "@/components/AlertasPanel";
import { mockCausas } from "@/data/mockCausas";

type View = string;

const causasEnTramite = mockCausas.filter(
  (c) =>
    (c.estadoCausa === "En trámite" || c.estadoCausa === "En juicio") &&
    c.estadoLibertad !== "Rebelde" &&
    c.estadoLibertad !== "SJP" &&
    !["Casación", "Queja en Corte", "REX"].includes(c.estadoCausa)
);

const causasDetenidos = mockCausas.filter((c) => c.estadoLibertad === "Detenido");
const causasRebeldes = mockCausas.filter((c) => c.estadoLibertad === "Rebelde");
const causasSJP = mockCausas.filter((c) => c.estadoLibertad === "SJP" || !!c.probation);
const causasRecursos = mockCausas.filter((c) =>
  ["Casación", "Queja en Corte", "REX"].includes(c.estadoCausa)
);

const defaultTitles: Record<string, string> = {
  dashboard: "Panel General",
  tramite: "Causas en Trámite",
  detenidos: "Causas con Detenidos",
  rebeldes: "Rebeldes / Paraderos",
  sjp: "SJP en Trámite",
  recursos: "Recursos (Casación / Queja / REX)",
  alertas: "Centro de Alertas",
  calendario: "Calendario de Vencimientos",
};

export default function Index() {
  const [view, setView] = useState<View>("dashboard");
  const [customBoards, setCustomBoards] = useState<CustomBoard[]>([]);

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

  const title = defaultTitles[view] || customBoards.find((b) => b.id === view)?.label || "Tablero";

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        active={view}
        onNavigate={(id) => setView(id)}
        customBoards={customBoards}
        onAddBoard={addBoard}
        onRemoveBoard={removeBoard}
        onRenameBoard={renameBoard}
      />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <h1 className="text-2xl font-display font-bold text-foreground mb-6">{title}</h1>

        {view === "dashboard" && (
          <div className="space-y-8">
            <KpiCards />
            <CausasTable causas={causasEnTramite} title="Causas en Trámite" />
          </div>
        )}

        {view === "tramite" && <CausasTable causas={causasEnTramite} title="Causas en Trámite" />}
        {view === "detenidos" && <CausasTable causas={causasDetenidos} title="Causas con Detenidos" />}
        {view === "rebeldes" && <CausasTable causas={causasRebeldes} title="Rebeldes / Paraderos" />}
        {view === "sjp" && <CausasTable causas={causasSJP} title="SJP en Trámite" />}
        {view === "recursos" && <CausasTable causas={causasRecursos} title="Recursos" />}
        {view === "alertas" && <AlertasPanel />}
        {view === "calendario" && <CalendarioVencimientos />}

        {view.startsWith("custom-") && (
          <CausasTable causas={mockCausas} title={customBoards.find((b) => b.id === view)?.label || "Tablero"} />
        )}
      </main>
    </div>
  );
}
