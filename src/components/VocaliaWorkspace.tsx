import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppSidebar, { CustomBoard } from "@/components/AppSidebar";
import KpiCards from "@/components/KpiCards";
import CausasTable from "@/components/CausasTable";
import DetenidosList from "@/components/DetenidosList";
import CalendarioAlertas from "@/components/CalendarioAlertas";
import UserMenu from "@/components/UserMenu";
import ThemeToggle from "@/components/ThemeToggle";
import RefreshButton from "@/components/RefreshButton";

import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Filter, X, Inbox, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { useCausasPorEstado } from "@/hooks/useCausasPorEstado";
import { useCausasConSujetoEn } from "@/hooks/useCausasConSujetoEn";
import { useDetenidos } from "@/hooks/useDetenidos";
import { useDashboardKpis } from "@/hooks/useDashboardKpis";
import { useCausasDashboard } from "@/hooks/useCausasDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useVocaliaActual, VocaliaActual } from "@/context/VocaliaContext";
import { useVocalias } from "@/hooks/useVocalias";
import { supabase } from "@/integrations/supabase/client";
import { useRolTribunal } from "@/hooks/useRolTribunal";
import MiembrosTribunal from "@/components/MiembrosTribunal";
import Papelera from "@/components/Papelera";
import WizardMigracion, { MigracionStatus } from "@/components/WizardMigracion";
import ZoomControl from "@/components/ZoomControl";
import { Loader2, CheckCircle2 } from "lucide-react";

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
  onBack: () => void;
  user: { name: string; email: string };
  onLogout: () => void;
  onUpdateUser: (u: { name: string; email: string }) => void;
}

type DashboardFilter = "all" | "tramite" | "detenidos" | "rebeldes" | "sjp" | "recursos";

const dashFilterLabels: Record<DashboardFilter, string> = {
  all: "Todas (trámite + recurso)",
  tramite: "En trámite",
  detenidos: "Con detenidos",
  rebeldes: "Rebeldes",
  sjp: "SJP / Probation",
  recursos: "Recursos",
};

export default function VocaliaWorkspace({ onBack, user, onLogout, onUpdateUser }: Props) {
  const { vocalia, setVocalia } = useVocaliaActual();
  const vocaliaId = vocalia?.id ?? null;
  const vocaliaNombre = vocalia?.nombre ?? "—";
  const tribunalId = vocalia?.tribunalId ?? null;

  const VIEW_LS_KEY = vocaliaId ? `justrack_vista_activa_${vocaliaId}` : null;
  const readSavedView = (): View => {
    if (typeof window === "undefined" || !VIEW_LS_KEY) return "dashboard";
    return localStorage.getItem(VIEW_LS_KEY) || "dashboard";
  };
  const [view, setViewState] = useState<View>(readSavedView);
  const setView = (v: View) => {
    setViewState(v);
    if (VIEW_LS_KEY) {
      try { localStorage.setItem(VIEW_LS_KEY, v); } catch { /* ignore */ }
    }
  };
  // Cuando cambia la vocalía, cargar la última vista guardada para esa vocalía.
  useEffect(() => {
    if (!VIEW_LS_KEY) return;
    const saved = localStorage.getItem(VIEW_LS_KEY) || "dashboard";
    setViewState(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocaliaId]);
  const [customBoards, setCustomBoards] = useState<CustomBoard[]>([]);
  const [dashFilter, setDashFilter] = useState<DashboardFilter>("all");
  const [pendingOpenCausaId, setPendingOpenCausaId] = useState<string | null>(null);

  const navigateToCausa = async (causaId: string) => {
    const { data, error } = await supabase
      .from("causas")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select("id, vocalia_id, estado_causa, vocalias(id, nombre, tribunal_id)" as any)
      .eq("id", causaId)
      .single();
    if (error || !data) {
      toast.error("No se pudo abrir la causa vinculada.");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = data as any;
    if (d.vocalia_id !== vocaliaId) {
      setVocalia({
        id: d.vocalia_id,
        nombre: d.vocalias?.nombre ?? "—",
        tribunalId: d.vocalias?.tribunal_id ?? tribunalId ?? "",
      });
    }
    const targetView =
      d.estado_causa === "tramite" ? "tramite"
      : d.estado_causa === "recurso" ? "recursos"
      : d.estado_causa === "terminada" ? "terminadas"
      : "tramite";
    setView(targetView);
    setPendingOpenCausaId(causaId);
  };

  const consumePending = () => setPendingOpenCausaId(null);


  // Vocalías del tribunal para el switcher en el sidebar.
  const { vocalias: todasVocalias } = useVocalias();
  const vocaliasTribunal = tribunalId ? todasVocalias.filter((v) => v.tribunal_id === tribunalId) : [];

  const tramiteRemote = useCausasPorEstado("tramite", vocaliaId, { excluirSituaciones: ["rebelde", "probation"] });
  const recursosRemote = useCausasPorEstado("recurso", vocaliaId);
  const terminadasRemote = useCausasPorEstado("terminada", vocaliaId);
  const rebeldesRemote = useCausasConSujetoEn("rebelde", vocaliaId);
  const sjpRemote = useCausasConSujetoEn("probation", vocaliaId);
  const detenidosRemote = useDetenidos(vocaliaId);
  const dashboardKpis = useDashboardKpis(vocaliaId);
  const dashCausasRemote = useCausasDashboard(vocaliaId);
  const remoteNoop = () => toast.info("La edición se conectará a Supabase en el próximo paso");

  const dashCausas = (() => {
    const all = dashCausasRemote.causas;
    switch (dashFilter) {
      case "tramite": return all.filter((c) =>
        (c.estadoCausa === "En trámite" || c.estadoCausa === "En juicio") &&
        !c.imputados.some((i) => i.estadoLibertad === "Rebelde" || i.estadoLibertad === "SJP"));
      case "detenidos": return all.filter((c) => c.imputados.some((i) => i.estadoLibertad === "Detenido"));
      case "rebeldes": return all.filter((c) => c.imputados.some((i) => i.estadoLibertad === "Rebelde"));
      case "sjp": return all.filter((c) => c.imputados.some((i) => i.estadoLibertad === "SJP"));
      case "recursos": return all.filter((c) => ["Casación", "Queja en Corte", "REX"].includes(c.estadoCausa));
      default: return all;
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

  const handleSwitchVocalia = (v: { id: string; nombre: string; tribunal_id: string }) => {
    setVocalia({ id: v.id, nombre: v.nombre, tribunalId: v.tribunal_id });
  };

  const { esAdmin } = useRolTribunal(tribunalId);

  // Si un no-admin intenta entrar a "miembros" o "papelera", redirigir.
  useEffect(() => {
    if ((view === "miembros" || view === "papelera") && !esAdmin) {
      toast.error("No tenés permisos para ver esta sección");
      setView("dashboard");
    }
  }, [view, esAdmin]);

  // Si venimos de la bienvenida con flag de migrar, abrimos el wizard una sola vez.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("justrack:open-migrar") === "1") {
      sessionStorage.removeItem("justrack:open-migrar");
      setView("migrar");
    }
  }, []);

  const defaultTitles: Record<string, string> = {
    dashboard: `Panel General — ${vocaliaNombre}`,
    tramite: "Causas en Trámite",
    detenidos: "Detenidos",
    rebeldes: "Rebeldes / Paraderos",
    sjp: "SJP en Trámite",
    recursos: "Recursos (Casación / Queja / REX)",
    terminadas: "Causas Terminadas",
    calendario: "Calendario y Alertas",
    miembros: "Miembros del tribunal",
    papelera: "Papelera",
    migrar: "Migrar causas",
  };

  const title = defaultTitles[view] || customBoards.find((b) => b.id === view)?.label || "Tablero";

  const remoteTableCommon = {
    onUpdateCausa: remoteNoop,
    onDeleteCausa: remoteNoop,
    onCreateCausa: remoteNoop,
    onChangeEstado: remoteNoop,
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
        vocaliaNombre={vocaliaNombre}
        vocaliasTribunal={vocaliasTribunal}
        currentVocaliaId={vocaliaId}
        onSwitchVocalia={handleSwitchVocalia}
        onBack={onBack}
        esAdmin={esAdmin}
      />
      <main className="flex-1 p-6 lg:p-8 overflow-hidden flex flex-col h-screen">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80 mb-1">{vocaliaNombre}</span>
            <h1 className="text-3xl font-display font-bold text-foreground title-underline">{title}</h1>
            <span className="text-xs text-muted-foreground mt-3">
              {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(() => {
              const map: Record<string, { refetch: () => void; loading: boolean } | undefined> = {
                dashboard: { refetch: () => { dashboardKpis.refetch(); dashCausasRemote.refetch(); }, loading: dashboardKpis.loading || dashCausasRemote.loading },
                tramite: { refetch: tramiteRemote.refetch, loading: tramiteRemote.loading },
                detenidos: { refetch: detenidosRemote.refetch, loading: detenidosRemote.loading },
                rebeldes: { refetch: rebeldesRemote.refetch, loading: rebeldesRemote.loading },
                sjp: { refetch: sjpRemote.refetch, loading: sjpRemote.loading },
                recursos: { refetch: recursosRemote.refetch, loading: recursosRemote.loading },
                terminadas: { refetch: terminadasRemote.refetch, loading: terminadasRemote.loading },
              };
              const cur = map[view];
              if (!cur) return null;
              const listViews = ["tramite", "detenidos", "rebeldes", "sjp", "recursos", "terminadas"];
              return (
                <>
                  {listViews.includes(view) && <ZoomControl />}
                  <RefreshButton onRefresh={cur.refetch} loading={cur.loading} />
                </>
              );
            })()}
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
                    <DropdownMenuContent align="start" className="w-56">
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
                <RemoteListSection
                  loading={dashCausasRemote.loading}
                  error={dashCausasRemote.error}
                  isEmpty={dashCausas.length === 0}
                  emptyTitle="Sin causas en esta vocalía"
                  emptyMessage="Cuando se carguen causas activas (en trámite o con recurso), van a aparecer acá."
                  onRetry={dashCausasRemote.refetch}
                >
                  <CausasTable
                    causas={dashCausas}
                    title={`Causas — ${dashFilterLabels[dashFilter]}`}
                    listKey="todas"
                    allCausas={dashCausasRemote.causas}
                    onMutated={dashCausasRemote.refetch}
                    onNavigateToConexa={navigateToCausa}
                  openCausaId={pendingOpenCausaId}
                  onOpenedCausa={consumePending}
                  {...remoteTableCommon}
                  />
                </RemoteListSection>
              </div>
            )}

            {view === "tramite" && (
              <RemoteListSection
                loading={tramiteRemote.loading}
                error={tramiteRemote.error}
                isEmpty={tramiteRemote.causas.length === 0}
                emptyTitle="Sin causas en esta categoría"
                emptyMessage='Cuando se carguen causas con estado "trámite" en esta vocalía, van a aparecer acá.'
                onRetry={tramiteRemote.refetch}
              >
                <CausasTable
                  causas={tramiteRemote.causas}
                  title="Causas en Trámite"
                  listKey="tramite"
                  allCausas={tramiteRemote.causas}
                  onMutated={tramiteRemote.refetch}
                  onNavigateToConexa={navigateToCausa}
                  openCausaId={pendingOpenCausaId}
                  onOpenedCausa={consumePending}
                  {...remoteTableCommon}
                />
              </RemoteListSection>
            )}
            {view === "detenidos" && (
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <RemoteListSection
                  loading={detenidosRemote.loading}
                  error={detenidosRemote.error}
                  isEmpty={detenidosRemote.causas.length === 0}
                  emptyTitle="Sin detenidos"
                  emptyMessage="No hay sujetos en situación 'detenido' en esta vocalía."
                  onRetry={detenidosRemote.refetch}
                >
                  <DetenidosList
                    causas={detenidosRemote.causas}
                    onUpdateCausa={remoteNoop}
                    onDeleteCausa={remoteNoop}
                    onCreateCausa={remoteNoop}
                    onMutated={detenidosRemote.refetch}
                  />
                </RemoteListSection>
              </div>
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
                  allCausas={rebeldesRemote.causas}
                  onMutated={rebeldesRemote.refetch}
                  onNavigateToConexa={navigateToCausa}
                  openCausaId={pendingOpenCausaId}
                  onOpenedCausa={consumePending}
                  {...remoteTableCommon}
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
                  allCausas={sjpRemote.causas}
                  onMutated={sjpRemote.refetch}
                  onNavigateToConexa={navigateToCausa}
                  openCausaId={pendingOpenCausaId}
                  onOpenedCausa={consumePending}
                  {...remoteTableCommon}
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
                  allCausas={recursosRemote.causas}
                  onMutated={recursosRemote.refetch}
                  onNavigateToConexa={navigateToCausa}
                  openCausaId={pendingOpenCausaId}
                  onOpenedCausa={consumePending}
                  {...remoteTableCommon}
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
                  allCausas={terminadasRemote.causas}
                  onMutated={terminadasRemote.refetch}
                  onNavigateToConexa={navigateToCausa}
                  openCausaId={pendingOpenCausaId}
                  onOpenedCausa={consumePending}
                  {...remoteTableCommon}
                />
              </RemoteListSection>
            )}
            {view === "calendario" && <CalendarioAlertas vocaliaId={vocaliaId} />}
            {view === "miembros" && esAdmin && tribunalId && (
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <MiembrosTribunal tribunalId={tribunalId} />
              </div>
            )}
            {view === "miembros" && !esAdmin && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-muted-foreground">No tenés permisos para ver esta sección.</p>
              </div>
            )}
            {view === "papelera" && esAdmin && vocaliaId && <Papelera vocaliaId={vocaliaId} />}
            {view === "papelera" && !esAdmin && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-muted-foreground">No tenés permisos para ver esta sección.</p>
              </div>
            )}
            {view === "migrar" && (
              <div className="flex-1 min-h-0 overflow-y-auto -mx-6 lg:-mx-8 px-6 lg:px-8">
                <WizardMigracion
                  vocaliaId={vocaliaId}
                  vocaliaNombre={vocaliaNombre}
                  onDone={() => setView("dashboard")}
                />
              </div>
            )}

            {view.startsWith("custom-") && (
              <CausasTable
                causas={[]}
                title={customBoards.find((b) => b.id === view)?.label || "Tablero"}
                listKey={view}
                allCausas={[]}
                {...remoteTableCommon}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
