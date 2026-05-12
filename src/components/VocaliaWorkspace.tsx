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
import { Filter, X, Inbox, RefreshCw } from "lucide-react";
import { useCausasPorEstado } from "@/hooks/useCausasPorEstado";
import { useCausasConSujetoEn } from "@/hooks/useCausasConSujetoEn";
import { useDetenidos } from "@/hooks/useDetenidos";
import { useDashboardKpis } from "@/hooks/useDashboardKpis";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface RemoteListSectionProps {
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  emptyTitle: string;
  emptyMessage?: string;
  onRetry: () => void;
  children: React.ReactNode;
}

function RemoteListSection({ loading, error, isEmpty, emptyTitle, emptyMessage, onRetry, children }: RemoteListSectionProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudieron cargar los datos</AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span className="text-xs">{error}</span>
          <Button size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center mb-4">
          <Inbox className="w-6 h-6 text-muted-foreground" />
        </div>
        <h3 className="font-display text-lg font-semibold text-foreground">{emptyTitle}</h3>
        {emptyMessage && (
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">{emptyMessage}</p>
        )}
        <Button size="sm" variant="outline" className="mt-4" onClick={onRetry}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Recargar
        </Button>
      </div>
    );
  }
  return <>{children}</>;
}

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

  // Pestañas conectadas a Supabase (sin filtro de vocalía por ahora).
  const tramiteRemote = useCausasPorEstado("tramite");
  const recursosRemote = useCausasPorEstado("recurso");
  const terminadasRemote = useCausasPorEstado("terminada");
  const rebeldesRemote = useCausasConSujetoEn("rebelde");
  const sjpRemote = useCausasConSujetoEn("probation");
  const detenidosRemote = useDetenidos();
  const dashboardKpis = useDashboardKpis();
  const remoteNoop = () => toast.info("La edición se conectará a Supabase en el próximo paso");

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
        <div className="flex items-end justify-between mb-8 gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80 mb-1">Vocalía {vocalia}</span>
            <h1 className="text-3xl font-display font-bold text-foreground title-underline">{title}</h1>
            <span className="text-xs text-muted-foreground mt-3">
              {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
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

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex flex-col flex-1 min-h-0"
          >
            {view === "dashboard" && (
              <div className="space-y-8 flex flex-col flex-1 min-h-0">
                <KpiCards kpis={dashboardKpis.kpis} loading={dashboardKpis.loading} error={dashboardKpis.error} onRetry={dashboardKpis.refetch} />
                <div className="flex items-center gap-2 flex-wrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-card/80 border border-border/60 rounded-full shadow-soft transition-colors">
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

            {view === "tramite" && (
              <RemoteListSection
                loading={tramiteRemote.loading}
                error={tramiteRemote.error}
                isEmpty={tramiteRemote.causas.length === 0}
                emptyTitle="No hay causas en trámite"
                emptyMessage='Cuando se carguen causas con estado "trámite" en la base, van a aparecer acá.'
                onRetry={tramiteRemote.refetch}
              >
                <CausasTable
                  causas={tramiteRemote.causas}
                  title="Causas en Trámite"
                  listKey="tramite"
                  vocalia={vocalia}
                  allCausas={tramiteRemote.causas}
                  onUpdateCausa={remoteNoop}
                  onDeleteCausa={remoteNoop}
                  onCreateCausa={remoteNoop}
                  onChangeEstado={remoteNoop}
                />
              </RemoteListSection>
            )}
            {view === "detenidos" && (
              <RemoteListSection
                loading={detenidosRemote.loading}
                error={detenidosRemote.error}
                isEmpty={detenidosRemote.causas.length === 0}
                emptyTitle="Sin detenidos"
                emptyMessage="No hay sujetos con situación de libertad 'detenido' en la base."
                onRetry={detenidosRemote.refetch}
              >
                <DetenidosList
                  causas={detenidosRemote.causas}
                  vocalia={vocalia}
                  onUpdateCausa={remoteNoop}
                  onDeleteCausa={remoteNoop}
                />
              </RemoteListSection>
            )}
            {view === "rebeldes" && (
              <RemoteListSection
                loading={rebeldesRemote.loading}
                error={rebeldesRemote.error}
                isEmpty={rebeldesRemote.causas.length === 0}
                emptyTitle="Sin causas en esta categoría"
                emptyMessage="No hay causas con sujetos en situación de rebeldía."
                onRetry={rebeldesRemote.refetch}
              >
                <CausasTable
                  causas={rebeldesRemote.causas}
                  title="Rebeldes / Paraderos"
                  listKey="rebeldes"
                  vocalia={vocalia}
                  allCausas={rebeldesRemote.causas}
                  onUpdateCausa={remoteNoop}
                  onDeleteCausa={remoteNoop}
                  onCreateCausa={remoteNoop}
                  onChangeEstado={remoteNoop}
                />
              </RemoteListSection>
            )}
            {view === "sjp" && (
              <RemoteListSection
                loading={sjpRemote.loading}
                error={sjpRemote.error}
                isEmpty={sjpRemote.causas.length === 0}
                emptyTitle="Sin causas en esta categoría"
                emptyMessage="No hay causas con sujetos en probation."
                onRetry={sjpRemote.refetch}
              >
                <CausasTable
                  causas={sjpRemote.causas}
                  title="SJP en Trámite"
                  listKey="sjp"
                  vocalia={vocalia}
                  allCausas={sjpRemote.causas}
                  onUpdateCausa={remoteNoop}
                  onDeleteCausa={remoteNoop}
                  onCreateCausa={remoteNoop}
                  onChangeEstado={remoteNoop}
                />
              </RemoteListSection>
            )}
            {view === "recursos" && (
              <RemoteListSection
                loading={recursosRemote.loading}
                error={recursosRemote.error}
                isEmpty={recursosRemote.causas.length === 0}
                emptyTitle="Sin causas en esta categoría"
                emptyMessage="No hay causas con estado 'recurso'."
                onRetry={recursosRemote.refetch}
              >
                <CausasTable
                  causas={recursosRemote.causas}
                  title="Recursos"
                  listKey="recursos"
                  vocalia={vocalia}
                  allCausas={recursosRemote.causas}
                  onUpdateCausa={remoteNoop}
                  onDeleteCausa={remoteNoop}
                  onCreateCausa={remoteNoop}
                  onChangeEstado={remoteNoop}
                />
              </RemoteListSection>
            )}
            {view === "terminadas" && (
              <RemoteListSection
                loading={terminadasRemote.loading}
                error={terminadasRemote.error}
                isEmpty={terminadasRemote.causas.length === 0}
                emptyTitle="Sin causas en esta categoría"
                emptyMessage="No hay causas con estado 'terminada'."
                onRetry={terminadasRemote.refetch}
              >
                <CausasTable
                  causas={terminadasRemote.causas}
                  title="Causas Terminadas"
                  listKey="terminadas"
                  vocalia={vocalia}
                  allCausas={terminadasRemote.causas}
                  onUpdateCausa={remoteNoop}
                  onDeleteCausa={remoteNoop}
                  onCreateCausa={remoteNoop}
                  onChangeEstado={remoteNoop}
                />
              </RemoteListSection>
            )}
            {view === "calendario" && <CalendarioAlertas />}

            {view.startsWith("custom-") && (
              <CausasTable causas={causas} title={customBoards.find((b) => b.id === view)?.label || "Tablero"} listKey={view} {...commonProps} onImportCausa={importToList(view)} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
