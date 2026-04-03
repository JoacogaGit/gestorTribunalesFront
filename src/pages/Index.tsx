import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import KpiCards from "@/components/KpiCards";
import KanbanBoard from "@/components/KanbanBoard";
import DetenidosPanel from "@/components/DetenidosPanel";
import CalendarioVencimientos from "@/components/CalendarioVencimientos";

type View = "dashboard" | "kanban" | "detenidos" | "calendario";

const titles: Record<View, string> = {
  dashboard: "Panel General",
  kanban: "Tablero de Causas",
  detenidos: "Causas con Detenidos",
  calendario: "Calendario de Vencimientos",
};

export default function Index() {
  const [view, setView] = useState<View>("dashboard");

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar active={view} onNavigate={(id) => setView(id as View)} />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <h1 className="text-2xl font-display font-bold text-foreground mb-6">{titles[view]}</h1>

        {view === "dashboard" && (
          <div className="space-y-8">
            <KpiCards />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <h2 className="text-lg font-display font-semibold text-foreground mb-4">Tablero Kanban</h2>
                <KanbanBoard />
              </div>
              <div>
                <h2 className="text-lg font-display font-semibold text-foreground mb-4">Próximos Vencimientos</h2>
                <CalendarioVencimientos />
              </div>
            </div>
          </div>
        )}

        {view === "kanban" && <KanbanBoard />}
        {view === "detenidos" && <DetenidosPanel />}
        {view === "calendario" && <CalendarioVencimientos />}
      </main>
    </div>
  );
}
