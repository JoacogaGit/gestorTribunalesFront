import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppSidebar, { CustomBoard } from "@/components/AppSidebar";
import KpiCards from "@/components/KpiCards";
import CausasTable from "@/components/CausasTable";
import DetenidosList from "@/components/DetenidosList";
import CalendarioAlertas from "@/components/CalendarioAlertas";
import UserMenu from "@/components/UserMenu";
import ThemeToggle from "@/components/ThemeToggle";
import WelcomeModal from "@/components/WelcomeModal";
import { mockCausas, Causa, EstadoCausa } from "@/data/mockCausas";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Filter, X } from "lucide-react";

type View = string;

interface Props {
  vocalia: number;
  onBack: () => void;
  user: { name: string; email: string };
  onLogout: () => void;
  onUpdateUser: (u: { name: string; email: string }) => void;
}

type DashboardFilter = "all" | "tramite" | "detenidos" | "rebeldes" | "sjp" | "recursos" | "terminadas";

const dashFilterLabels: Record<DashboardFilter, string> = {
  all: "Todas",
  tramite: "En trámite",
  detenidos: "Con detenidos",
  rebeldes: "Rebeldes",
  sjp: "SJP / Probation",
  recursos: "Recursos",
  terminadas: "Terminadas",
};

export default function VocaliaWorkspace({ vocalia, onBack, user, onLogout, onUpdateUser }: Props) {
  const [view, setView] = useState<View>("dashboard");
  const [customBoards, setCustomBoards] = useState<CustomBoard[]>([]);

  // Las cuentas marcadas como "nuevas" (flag justrack-new-user) arrancan vacías.
  // El resto sigue viendo los datos de muestra.
  const isNewUser = typeof window !== "undefined" && localStorage.getItem("justrack-new-user") === "1";
  const [causas, setCausas] = useState<Causa[]>(() =>
    isNewUser ? [] : mockCausas.filter((c) => c.vocalia === vocalia)
  );
  const [dashFilter, setDashFilter] = useState<DashboardFilter>("all");

  // Modal de bienvenida: se muestra automáticamente la primera vez que un
  // usuario nuevo entra a una vocalía vacía. Queda siempre disponible desde
  // el sidebar para reabrirlo más adelante.
  const welcomeKey = `justrack-welcome-seen-${user.email}`;
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  useEffect(() => {
    const seen = localStorage.getItem(welcomeKey) === "1";
    if (!seen && causas.length === 0) {
      setWelcomeOpen(true);
      localStorage.setItem(welcomeKey, "1");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImportCausas = (importadas: Causa[]) => {
    setCausas((prev) => [...prev, ...importadas.map((c) => ({ ...c, vocalia }))]);
  };

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

  const changeEstado = (c: Causa, nuevoEstado: EstadoCausa) => {
    updateCausa({ ...c, estadoCausa: nuevoEstado });
  };

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
      case "terminadas":
        patched.estadoCausa = "Terminada";
        break;
    }
    updateCausa(patched);
    toast.success(`Causa ${c.numero} movida`);
  };

  const isTramite = (c: Causa) =>
    (c.estadoCausa === "En trámite" || c.estadoCausa === "En juicio") &&
    !c.imputados.some((i) => i.estadoLibertad === "Rebelde") &&
    !c.imputados.some((i) => i.estadoLibertad === "SJP") &&
    !["Casación", "Queja en Corte", "REX", "Terminada"].includes(c.estadoCausa) &&
    !c.probation;

  const causasEnTramite = causas.filter(isTramite);
  const causasRebeldes = causas.filter((c) => c.imputados.some((i) => i.estadoLibertad === "Rebelde"));
  const causasSJP = causas.filter((c) => c.imputados.some((i) => i.estadoLibertad === "SJP") || !!c.probation);
  const causasRecursos = causas.filter((c) => ["Casación", "Queja en Corte", "REX"].includes(c.estadoCausa));
  const causasTerminadas = causas.filter((c) => c.estadoCausa === "Terminada");
  const causasConDetenidos = causas.filter((c) => c.imputados.some((i) => i.estadoLibertad === "Detenido"));

  const dashCausas = (() => {
    switch (dashFilter) {
      case "tramite": return causasEnTramite;
      case "detenidos": return causasConDetenidos;
      case "rebeldes": return causasRebeldes;
      case "sjp": return causasSJP;
      case "recursos": return causasRecursos;
      case "terminadas": return causasTerminadas;
      default: return causas;
    }
  })();

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
    terminadas: "Causas Terminadas",
    calendario: "Calendario y Alertas",
  };

  const title = defaultTitles[view] || customBoards.find((b) => b.id === view)?.label || "Tablero";

  const commonProps = {
    vocalia,
    onUpdateCausa: updateCausa,
    onDeleteCausa: deleteCausa,
    onCreateCausa: createCausa,
    onChangeEstado: changeEstado,
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
        onOpenWelcome={() => setWelcomeOpen(true)}
      />
      <WelcomeModal
        open={welcomeOpen}
        onClose={() => setWelcomeOpen(false)}
        vocalia={vocalia}
        onImport={handleImportCausas}
      />
      <main className="flex-1 p-6 lg:p-8 overflow-hidden flex flex-col h-screen">
        <div className="flex items-center justify-between mb-6 gap-4">
          <h1 className="text-2xl font-display font-bold text-foreground">{title}</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu
              email={user.email}
              name={user.name}
              onLogout={onLogout}
              onUpdateProfile={onUpdateUser}
            />
          </div>
        </div>

        {view === "dashboard" && (
          <div className="space-y-8 flex flex-col flex-1 min-h-0">
            <KpiCards causas={causas} />
            <div className="flex items-center gap-2 flex-wrap">
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-muted/40 rounded-md">
                  <Filter className="w-3.5 h-3.5" />
                  Filtrar: <span className="text-foreground font-semibold">{dashFilterLabels[dashFilter]}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuLabel className="text-xs">Filtrar por lista</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(Object.keys(dashFilterLabels) as DashboardFilter[]).map((f) => (
                    <DropdownMenuItem
                      key={f}
                      onSelect={() => setDashFilter(f)}
                      className={`text-xs ${dashFilter === f ? "bg-primary/10 text-primary" : ""}`}
                    >
                      {dashFilterLabels[f]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {dashFilter !== "all" && (
                <button
                  onClick={() => setDashFilter("all")}
                  className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Quitar filtro
                </button>
              )}
              <span className="text-xs text-muted-foreground ml-auto">{dashCausas.length} causas</span>
            </div>
            <CausasTable causas={dashCausas} title={`Causas — ${dashFilterLabels[dashFilter]}`} listKey="todas" {...commonProps} onImportCausa={importToList("tramite")} />
          </div>
        )}

        {view === "tramite" && <CausasTable causas={causasEnTramite} title="Causas en Trámite" listKey="tramite" {...commonProps} onImportCausa={importToList("tramite")} />}
        {view === "detenidos" && <DetenidosList causas={causas} vocalia={vocalia} onUpdateCausa={updateCausa} onDeleteCausa={deleteCausa} onCreateCausa={createCausa} />}
        {view === "rebeldes" && <CausasTable causas={causasRebeldes} title="Rebeldes / Paraderos" listKey="rebeldes" {...commonProps} onImportCausa={importToList("rebeldes")} />}
        {view === "sjp" && <CausasTable causas={causasSJP} title="SJP en Trámite" listKey="sjp" {...commonProps} onImportCausa={importToList("sjp")} />}
        {view === "recursos" && <CausasTable causas={causasRecursos} title="Recursos" listKey="recursos" {...commonProps} onImportCausa={importToList("recursos")} />}
        {view === "terminadas" && <CausasTable causas={causasTerminadas} title="Causas Terminadas" listKey="terminadas" {...commonProps} onImportCausa={importToList("terminadas")} />}
        {view === "calendario" && <CalendarioAlertas causas={causas} />}

        {view.startsWith("custom-") && (
          <CausasTable causas={causas} title={customBoards.find((b) => b.id === view)?.label || "Tablero"} listKey={view} {...commonProps} onImportCausa={importToList(view)} />
        )}
      </main>
    </div>
  );
}
