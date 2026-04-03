import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";
import KpiCards from "@/components/KpiCards";
import CausasTable from "@/components/CausasTable";
import CalendarioVencimientos from "@/components/CalendarioVencimientos";
import { mockCausas } from "@/data/mockCausas";

type View = "dashboard" | "tramite" | "detenidos" | "rebeldes" | "sjp" | "recursos" | "calendario";

const titles: Record<View, string> = {
  dashboard: "Panel General",
  tramite: "Causas en Trámite",
  detenidos: "Causas con Detenidos",
  rebeldes: "Rebeldes / Paraderos",
  sjp: "SJP en Trámite",
  recursos: "Recursos (Casación / Queja / REX)",
  calendario: "Calendario de Vencimientos",
};

// Causas "en trámite" = En trámite o En juicio (excluye rebeldes, SJP, recursos)
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
            <CausasTable causas={causasEnTramite} title="Causas en Trámite" />
          </div>
        )}

        {view === "tramite" && <CausasTable causas={causasEnTramite} />}
        {view === "detenidos" && <CausasTable causas={causasDetenidos} />}
        {view === "rebeldes" && <CausasTable causas={causasRebeldes} />}
        {view === "sjp" && <CausasTable causas={causasSJP} />}
        {view === "recursos" && <CausasTable causas={causasRecursos} />}
        {view === "calendario" && <CalendarioVencimientos />}
      </main>
    </div>
  );
}
