import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppSidebar, { CustomBoard } from "@/components/AppSidebar";
import KpiCards from "@/components/KpiCards";
import KpiCardsEstudio from "@/components/KpiCardsEstudio";
import CausasTable from "@/components/CausasTable";
import DetenidosList from "@/components/DetenidosList";
import CalendarioAlertas from "@/components/CalendarioAlertas";
import UserMenu from "@/components/UserMenu";
import NotificationBell from "@/components/NotificationBell";
import PushReminderBanner from "@/components/PushReminderBanner";
import ThemeToggle from "@/components/ThemeToggle";
import RefreshButton from "@/components/RefreshButton";
import SuperadminLink from "@/components/SuperadminLink";
import EmptyState from "@/components/EmptyState";
import CausaFormDialog from "@/components/forms/CausaFormDialog";

import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Filter, X, Scale, RefreshCw, CheckCircle2, HelpCircle, Eye, EyeOff, Plus } from "lucide-react";
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
import { useTribunal } from "@/hooks/useTribunal";
import { useTipoOficina } from "@/hooks/useTipoOficina";
import { supabase } from "@/integrations/supabase/client";
import { useRolTribunal } from "@/hooks/useRolTribunal";
import MiembrosTribunal from "@/components/MiembrosTribunal";
import AbandonarTribunal, { AbandonarTribunalHandle } from "@/components/AbandonarTribunal";
import Papelera from "@/components/Papelera";
import type { MigracionStatus } from "@/components/WizardMigracion";
import PendientesRevision from "@/components/migracion/PendientesRevision";
import MigracionFloatingBanner from "@/components/migracion/MigracionFloatingBanner";
import CategoriasManager from "@/components/CategoriasManager";
import TutorialTour, { lanzarTutorial } from "@/components/TutorialTour";
import SubestadosManager from "@/components/SubestadosManager";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useListasPersonalizadas } from "@/hooks/useListasPersonalizadas";
import CrearListaDialog from "@/components/listas/CrearListaDialog";
import ListaPersonalizadaView from "@/components/listas/ListaPersonalizadaView";
import { useTableros } from "@/hooks/useTableros";
import CrearTableroDialog from "@/components/tableros/CrearTableroDialog";
import TableroView from "@/components/tableros/TableroView";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, Scale as ScaleIcon } from "lucide-react";

import ZoomControl from "@/components/ZoomControl";
import ResponsableFilterButton from "@/components/ResponsableFilterButton";
import ExportarListasButton from "@/components/ExportarListasButton";
import { useResponsableFilter } from "@/hooks/useResponsableFilter";
import AgrupadasView from "@/components/estudio/AgrupadasView";
import { EP_INSTRUCCION, EP_ELEVADAS, EP_RECURRIDAS } from "@/lib/estadosProcesales";
import { useEventosProximos30d } from "@/hooks/useEventosProximos30d";
import { useEstadisticasCustom } from "@/hooks/useEstadisticasCustom";
import { buscarCampo, cumpleEstadistica } from "@/lib/estadisticasCustom";
import KpiCardsCustom from "@/components/estadisticas/KpiCardsCustom";
import NuevaEstadisticaDialog from "@/components/estadisticas/NuevaEstadisticaDialog";
import { parseLocalTime } from "@/lib/parseDate";
import type { Causa } from "@/data/mockCausas";


const WizardMigracion = lazy(() => import("@/components/WizardMigracion"));

interface RemoteListSectionProps {
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  emptyTitle: string;
  emptyMessage?: string;
  onRetry: () => void;
  onCreateCausa?: () => void;
  children: React.ReactNode;
}

function RemoteListSection({ loading, error, isEmpty, emptyTitle, emptyMessage, onRetry, onCreateCausa, children }: RemoteListSectionProps) {
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
      <div className="flex-1 flex flex-col min-h-0">
        <EmptyState
          icon={Scale}
          title={emptyTitle}
          subtitle={emptyMessage}
          actionLabel={onCreateCausa ? "+ Crear primera causa" : undefined}
          onAction={onCreateCausa}
        />
      </div>
    );
  }
  return <div className="flex-1 min-h-0 flex flex-col">{children}</div>;
}

type View = string;

/** Vistas donde aplica el filtro por responsable. */
const VISTAS_CON_FILTRO: string[] = [
  "dashboard", "tramite", "detenidos", "rebeldes", "sjp", "recursos", "delegadas", "terminadas",
  "calendario", "fueros", "delitos", "instruccion", "elevadas", "recurridas",
];

interface Props {
  onBack: () => void;
  user: { name: string; email: string };
  onLogout: () => void;
  onUpdateUser: (u: { name: string; email: string }) => void;
}

type DashboardBaseFilter = "all" | "tramite" | "detenidos" | "rebeldes" | "sjp" | "recursos" | "instruccion" | "elevadas" | "recurridas" | "eventos30d";
/** Además de los filtros base, admite `custom:<id>` de estadísticas personalizadas. */
type DashboardFilter = DashboardBaseFilter | string;

const dashFilterLabels: Record<DashboardBaseFilter, string> = {
  all: "Todas (trámite + recurso)",
  tramite: "En trámite",
  detenidos: "Con detenidos",
  rebeldes: "Rebeldes",
  sjp: "SJP / Probation",
  recursos: "Recursos",
  instruccion: "En instrucción",
  elevadas: "Elevadas a juicio",
  recurridas: "Recurridas",
  eventos30d: "Eventos en los próximos 30 días",
};

/** Columna que se prioriza (3er lugar) en la tabla según el filtro activo del dashboard. */
const COLUMNA_PRIORITARIA: Partial<Record<DashboardBaseFilter, string>> = {
  detenidos: "libertad",
  rebeldes: "libertad",
  sjp: "libertad",
  tramite: "subestado",
  recursos: "estado",
  instruccion: "estado",
  elevadas: "estado",
  recurridas: "estado",
  eventos30d: "eventosConFecha",
};

const FILTROS_JUDICIAL: DashboardBaseFilter[] = ["all", "tramite", "detenidos", "rebeldes", "sjp", "recursos", "eventos30d"];

/** true si la causa tiene algún vencimiento propio dentro de los próximos 30 días. */
function tieneVencimientoProximo(c: Causa): boolean {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const desde = hoy.getTime();
  const hasta = desde + 30 * 24 * 60 * 60 * 1000;
  const fechas: (string | undefined)[] = [
    c.fechaPrescripcion,
    c.fechaVencimientoPP,
    c.probation?.vencimiento,
    ...(c.fechasPrescripcionExtra || []).map((f) => f.fecha),
    ...c.imputados.map((i) => i.fechaVencimientoPena),
  ];
  return fechas.some((f) => {
    if (!f) return false;
    const t = parseLocalTime(f);
    return t >= desde && t <= hasta;
  });
}
const FILTROS_ESTUDIO: DashboardBaseFilter[] = ["all", "instruccion", "elevadas", "recurridas", "detenidos"];

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
  const [migracionStatus, setMigracionStatus] = useState<MigracionStatus | null>(null);
  const [showCreateCausa, setShowCreateCausa] = useState(false);
  const [showNuevaEstadistica, setShowNuevaEstadistica] = useState(false);
  const [showCreateLista, setShowCreateLista] = useState(false);
  const [showCreateTablero, setShowCreateTablero] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const abandonarRef = useRef<AbandonarTribunalHandle>(null);

  const listasHook = useListasPersonalizadas(vocaliaId);
  const tablerosHook = useTableros(vocaliaId);


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
      : d.estado_causa === "delegada" ? "delegadas"
      : "tramite";
    setView(targetView);
    setPendingOpenCausaId(causaId);
  };

  const consumePending = () => setPendingOpenCausaId(null);


  // Vocalías del tribunal para el switcher en el sidebar.
  const { vocalias: todasVocalias } = useVocalias();
  const { tribunal } = useTribunal(tribunalId);
  const modoTribunal = tribunal?.modo ?? "vocalias_separadas";
  const isListaUnica = modoTribunal === "lista_unica";
  const vocaliasTribunal = tribunalId ? todasVocalias.filter((v) => v.tribunal_id === tribunalId) : [];
  // En modo lista_unica mostramos el nombre del tribunal en el sidebar en lugar de la vocalía oculta "General".
  const sidebarLabel = isListaUnica ? (tribunal?.nombre ?? vocaliaNombre) : vocaliaNombre;

  const tramiteRemote = useCausasPorEstado("tramite", vocaliaId, { excluirSituaciones: ["rebelde", "probation"] });
  const recursosRemote = useCausasPorEstado("recurso", vocaliaId);
  const terminadasRemote = useCausasPorEstado("terminada", vocaliaId);
  const delegadasRemote = useCausasPorEstado("delegada", vocaliaId);
  const rebeldesRemote = useCausasConSujetoEn("rebelde", vocaliaId);
  const sjpRemote = useCausasConSujetoEn("probation", vocaliaId);
  const detenidosRemote = useDetenidos(vocaliaId);
  const { esEstudio } = useTipoOficina(tribunalId);
  const responsableFiltro = useResponsableFilter(vocaliaId, esEstudio);
  const dashboardKpis = useDashboardKpis(vocaliaId);
  const dashCausasRemote = useCausasDashboard(vocaliaId, esEstudio);
  const eventos30d = useEventosProximos30d(vocaliaId);
  const [mostrarKpis, setMostrarKpis] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("iustrack_dash_kpis") !== "0";
  });
  const toggleKpis = () => {
    setMostrarKpis((prev) => {
      const next = !prev;
      try { localStorage.setItem("iustrack_dash_kpis", next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  };
  const remoteNoop = () => toast.info("La edición se conectará a Supabase en el próximo paso");

  const estadisticasCustom = useEstadisticasCustom(vocaliaId);
  const estadisticaActiva = dashFilter.startsWith("custom:")
    ? estadisticasCustom.estadisticas.find((e) => e.id === dashFilter.slice(7)) ?? null
    : null;
  const campoActivo = estadisticaActiva ? buscarCampo(esEstudio, estadisticaActiva.campo) : null;

  const dashCausas = (() => {
    const all = responsableFiltro.filtrar(dashCausasRemote.causas);
    if (estadisticaActiva) return all.filter((c) => cumpleEstadistica(c, campoActivo, estadisticaActiva.valor));
    switch (dashFilter) {
      case "tramite": return all.filter((c) =>
        (c.estadoCausa === "En trámite" || c.estadoCausa === "En juicio") &&
        !c.imputados.some((i) => i.estadoLibertad === "Rebelde" || i.estadoLibertad === "SJP"));
      case "detenidos": return all.filter((c) => c.imputados.some((i) => i.estadoLibertad === "Detenido"));
      case "rebeldes": return all.filter((c) => c.imputados.some((i) => i.estadoLibertad === "Rebelde"));
      case "sjp": return all.filter((c) => c.imputados.some((i) => i.estadoLibertad === "SJP"));
      case "recursos": return all.filter((c) => ["Casación", "Queja en Corte", "REX", "Apelación", "TSJ"].includes(c.estadoCausa));
      case "instruccion": return all.filter((c) => EP_INSTRUCCION.includes((c.estadoProcesal || "").trim()));
      case "elevadas": return all.filter((c) => EP_ELEVADAS.includes((c.estadoProcesal || "").trim()));
      case "recurridas": return all.filter((c) => EP_RECURRIDAS.includes((c.estadoProcesal || "").trim()));
      case "eventos30d": return all.filter((c) => eventos30d.ids.has(c.id) || tieneVencimientoProximo(c));
      default: return all;
    }
  })();

  const labelFiltro = (f: DashboardFilter) =>
    f.startsWith("custom:")
      ? (estadisticasCustom.estadisticas.find((e) => e.id === f.slice(7))?.nombre ?? "Estadística")
      : dashFilterLabels[f as DashboardBaseFilter];

  const columnaPrioritaria = estadisticaActiva
    ? campoActivo?.columna ?? null
    : COLUMNA_PRIORITARIA[dashFilter as DashboardBaseFilter] ?? null;

  const eliminarEstadistica = async (id: string) => {
    const { error } = await estadisticasCustom.eliminar(id);
    if (error) { toast.error(error); return; }
    if (dashFilter === `custom:${id}`) setDashFilter("all");
    toast.success("Estadística eliminada");
  };

  const causasEventos30dCount = responsableFiltro
    .filtrar(dashCausasRemote.causas)
    .filter((c) => eventos30d.ids.has(c.id) || tieneVencimientoProximo(c)).length;

  const porEstadoProcesal = (estados: string[]) =>
    responsableFiltro.filtrar(dashCausasRemote.causas).filter((c) => estados.includes((c.estadoProcesal || "").trim()));

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
    recursos: "Recursos (Casación / Queja / REX / Apelación / TSJ)",
    delegadas: "Causas Delegadas",
    terminadas: "Causas Terminadas",
    calendario: "Calendario y Alertas",
    categorias: "Categorías personalizadas",
    miembros: "Miembros de la oficina",
    papelera: "Papelera",
    migrar: "Migrar causas",
    fueros: "Fueros",
    delitos: "Delitos",
    instruccion: "Instrucción",
    elevadas: "Elevadas a juicio",
    recurridas: "Recurridas",
  };

  const listaActiva = view.startsWith("lista-")
    ? listasHook.listas.find((l) => `lista-${l.id}` === view) ?? null
    : null;
  const tableroActivo = view.startsWith("tablero-")
    ? tablerosHook.tableros.find((t) => `tablero-${t.id}` === view) ?? null
    : null;
  const title = defaultTitles[view]
    || (listaActiva ? `Lista: ${listaActiva.nombre}` : null)
    || (tableroActivo ? tableroActivo.nombre : null)
    || customBoards.find((b) => b.id === view)?.label
    || "Anotación";

  const remoteTableCommon = {
    onUpdateCausa: remoteNoop,
    onDeleteCausa: remoteNoop,
    onCreateCausa: remoteNoop,
    onChangeEstado: remoteNoop,
  };

  const handleNavigate = (v: string) => { setView(v); setSidebarOpen(false); };

  const sidebar = (
    <AppSidebar
      active={view}
      onNavigate={handleNavigate}
      customBoards={customBoards}
      onAddBoard={addBoard}
      onRemoveBoard={removeBoard}
      onRenameBoard={renameBoard}
      vocaliaNombre={sidebarLabel}
      vocaliasTribunal={vocaliasTribunal}
      currentVocaliaId={vocaliaId}
      onSwitchVocalia={handleSwitchVocalia}
      onBack={onBack}
      esAdmin={esAdmin}
      modoTribunal={modoTribunal}
      listasPersonalizadas={listasHook.listas}
      onCreateLista={() => {
        if (listasHook.listas.length >= 2) {
          toast.error("Llegaste al límite de 2 listas personalizadas para este espacio");
          return;
        }
        setShowCreateLista(true);
      }}
      tableros={tablerosHook.tableros}
      onCreateTablero={() => setShowCreateTablero(true)}
      esEstudio={esEstudio}
    />
  );

  return (
    <div className="flex min-h-screen bg-background">
      <TutorialTour
        onNavigate={(v) => setView(v as View)}
        onOpenSidebar={setSidebarOpen}
        isMobile={isMobile}
        multiVocalia={vocaliasTribunal.length > 1}
        esAdmin={esAdmin}
        tableroView={tablerosHook.tableros[0] ? `tablero-${tablerosHook.tableros[0].id}` : null}
        esEstudio={esEstudio}
      />
      {!isMobile && sidebar}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-64 p-0 border-sidebar-border overflow-y-auto">
            {sidebar}
          </SheetContent>
        </Sheet>
      )}
      <main className={`flex-1 px-4 py-4 md:p-6 lg:p-8 flex flex-col ${isMobile ? "min-h-screen w-full" : "h-screen overflow-hidden"}`}>
        {isMobile ? (
          <>
            <div className="flex items-center justify-between gap-2 mb-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Abrir menú"
                className="flex h-11 w-11 items-center justify-center rounded-md text-foreground hover:bg-muted/60 transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-tour="ayuda"
                  onClick={lanzarTutorial}
                  aria-label="Ver tutorial"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-gold">
                  <ScaleIcon className="h-4 w-4 text-sidebar-primary-foreground" />
                </div>
                <span className="font-display text-base font-bold text-foreground">IusTrack</span>
              </div>
              <UserMenu
                email={user.email}
                name={user.name}
                onLogout={onLogout}
                onUpdateProfile={onUpdateUser}
                onAbandonarTribunal={tribunalId ? () => abandonarRef.current?.start() : undefined}
                compact
                extraItems={
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <ThemeToggle />
                    <NotificationBell />
                    <SuperadminLink variant="compact" />
                  </div>
                }

              />
            </div>
            <div className="mb-4">
              <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80">{sidebarLabel}</span>
              <h1 className="text-xl font-display font-bold text-foreground">{title}</h1>
              {(VISTAS_CON_FILTRO.includes(view) || view.startsWith("lista-")) && (
                <div className="mt-2 flex items-center gap-2">
                  <ResponsableFilterButton filtro={responsableFiltro} />
                  <ExportarListasButton vocaliaId={vocaliaId} nombreOficina={sidebarLabel} esEstudio={esEstudio} />
                </div>
              )}
            </div>
          </>
        ) : (
        <div className="flex items-end justify-between mb-8 gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/80 mb-1">{sidebarLabel}</span>
            <h1 className="text-3xl font-display font-bold text-foreground title-underline">{title}</h1>
            <span className="text-xs text-muted-foreground mt-3">
              {new Date().toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {migracionStatus?.activa && view !== "migrar" && !migracionStatus.procesando && (
              <button
                type="button"
                onClick={() => setView("migrar")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                title="Ir a la migración"
              >
                <CheckCircle2 className="w-3 h-3" />
                {migracionStatus.hasExito ? "Migración lista" : "Migración pendiente"}
              </button>
            )}

            {(VISTAS_CON_FILTRO.includes(view) || view.startsWith("lista-")) && (
              <>
                <ResponsableFilterButton filtro={responsableFiltro} />
                <ExportarListasButton vocaliaId={vocaliaId} nombreOficina={sidebarLabel} esEstudio={esEstudio} />
              </>
            )}

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
            <button
              type="button"
              data-tour="ayuda"
              onClick={lanzarTutorial}
              aria-label="Ver tutorial"
              title="Ver tutorial"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <SuperadminLink variant="compact" />
            <ThemeToggle />
            <NotificationBell />
            <UserMenu
              email={user.email}
              name={user.name}
              onLogout={onLogout}
              onUpdateProfile={onUpdateUser}
              onAbandonarTribunal={tribunalId ? () => abandonarRef.current?.start() : undefined}
            />
          </div>
        </div>
        )}


        {tribunalId && (
          <AbandonarTribunal
            ref={abandonarRef}
            tribunalId={tribunalId}
            hideSection
            onAbandoned={() => { setVocalia(null); onBack(); }}
          />
        )}

        {migracionStatus && view !== "migrar" && (
          <MigracionFloatingBanner
            status={migracionStatus}
            vocaliaNombre={vocaliaNombre}
            onVerMigracion={() => setView("migrar")}
          />
        )}

        <PushReminderBanner />

        <AnimatePresence mode="wait">


          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            data-tour="main"
            className={view === "migrar" ? "hidden" : `flex flex-col ${isMobile ? "" : "flex-1 min-h-0"}`}
          >
            {view === "dashboard" && (
              <div className={`space-y-3 flex flex-col ${isMobile ? "" : "flex-1 min-h-0 overflow-hidden pr-1 [&>*:not(:last-child)]:shrink-0"}`}>
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setShowNuevaEstadistica(true)} className="text-xs text-muted-foreground">
                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Nueva estadística
                  </Button>
                  <Button size="sm" variant="ghost" onClick={toggleKpis} className="text-xs text-muted-foreground">
                    {mostrarKpis ? <EyeOff className="w-3.5 h-3.5 mr-1.5" /> : <Eye className="w-3.5 h-3.5 mr-1.5" />}
                    {mostrarKpis ? "Ocultar estadísticas" : "Mostrar estadísticas"}
                  </Button>
                </div>
                <AnimatePresence initial={false}>
                  {mostrarKpis && (
                    <motion.div
                      key="kpis"
                      initial={{ opacity: 0, height: 0, y: -8 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -8 }}
                      transition={{ duration: 0.28, ease: "easeInOut" }}
                      className="overflow-hidden shrink-0 space-y-4"
                    >
                      {esEstudio
                        ? <KpiCardsEstudio
                            causas={responsableFiltro.filtrar(dashCausasRemote.causas)}
                            loading={dashCausasRemote.loading}
                            activeFilter={dashFilter}
                            onSelectFilter={(f) => setDashFilter(f as DashboardFilter)}
                          />
                        : <KpiCards
                            kpis={{ ...dashboardKpis.kpis, eventos30d: causasEventos30dCount }}
                            loading={dashboardKpis.loading}
                            error={dashboardKpis.error}
                            onRetry={dashboardKpis.refetch}
                            activeFilter={dashFilter}
                            onSelectFilter={(f) => setDashFilter(f as DashboardFilter)}
                          />}
                      <KpiCardsCustom
                        estadisticas={estadisticasCustom.estadisticas}
                        causas={responsableFiltro.filtrar(dashCausasRemote.causas)}
                        esEstudio={esEstudio}
                        activeFilter={dashFilter}
                        onSelectFilter={(f) => setDashFilter(f)}
                        onEliminar={eliminarEstadistica}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex items-center gap-2 flex-wrap">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-card/80 border border-border/60 rounded-full shadow-soft transition-colors">
                      <Filter className="w-3.5 h-3.5" />
                      Filtrar: <span className="text-foreground font-semibold">{labelFiltro(dashFilter)}</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel className="text-xs">Filtrar por lista</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {(esEstudio ? FILTROS_ESTUDIO : FILTROS_JUDICIAL).map((f) => (
                        <DropdownMenuItem
                          key={f}
                          onSelect={() => setDashFilter(f)}
                          className={`text-xs ${dashFilter === f ? "bg-primary/10 text-primary" : ""}`}
                        >
                          {dashFilterLabels[f]}
                        </DropdownMenuItem>
                      ))}
                      {estadisticasCustom.estadisticas.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs">Personalizadas</DropdownMenuLabel>
                          {estadisticasCustom.estadisticas.map((e) => (
                            <DropdownMenuItem
                              key={e.id}
                              onSelect={() => setDashFilter(`custom:${e.id}`)}
                              className={`text-xs ${dashFilter === `custom:${e.id}` ? "bg-primary/10 text-primary" : ""}`}
                            >
                              {e.nombre}
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {dashFilter !== "all" && (
                    <button
                      onClick={() => setDashFilter("all")}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
                    >
                      {labelFiltro(dashFilter)}
                      <X className="w-3 h-3" /> Quitar filtro
                    </button>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">{dashCausas.length} causas</span>
                </div>
                <RemoteListSection
                  loading={dashCausasRemote.loading}
                  error={dashCausasRemote.error}
                  isEmpty={dashCausas.length === 0}
                  emptyTitle="Todavía no hay causas cargadas en este espacio"
                  emptyMessage="Empezá creando la primera causa para gestionarla acá."
                  onRetry={dashCausasRemote.refetch}
                  onCreateCausa={() => setShowCreateCausa(true)}
                >
                  <CausasTable
                    causas={dashCausas}
                    title={esEstudio && dashFilter === "all" ? "Todas las causas del estudio" : `Causas — ${labelFiltro(dashFilter)}`}
                    listKey="todas"
                    allCausas={dashCausas}
                    onMutated={dashCausasRemote.refetch}
                    onNavigateToConexa={navigateToCausa}
                  openCausaId={pendingOpenCausaId}
                  onOpenedCausa={consumePending}
                  priorityColumnKey={columnaPrioritaria}
                  {...remoteTableCommon}
                  />
                </RemoteListSection>
              </div>
            )}

            {view === "tramite" && (
              <RemoteListSection
                loading={tramiteRemote.loading}
                error={tramiteRemote.error}
                isEmpty={responsableFiltro.filtrar(tramiteRemote.causas).length === 0}
                emptyTitle="Todavía no hay causas en trámite"
                emptyMessage="Empezá creando la primera causa para gestionarla acá."
                onRetry={tramiteRemote.refetch}
                onCreateCausa={() => setShowCreateCausa(true)}
              >
                <CausasTable
                  causas={responsableFiltro.filtrar(tramiteRemote.causas)}
                  title="Causas en Trámite"
                  listKey="tramite"
                  allCausas={responsableFiltro.filtrar(tramiteRemote.causas)}
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
                  isEmpty={responsableFiltro.filtrar(detenidosRemote.causas).length === 0}
                  emptyTitle="Todavía no hay detenidos en este espacio"
                  emptyMessage="Empezá creando la primera causa con un detenido."
                  onRetry={detenidosRemote.refetch}
                  onCreateCausa={() => setShowCreateCausa(true)}
                >
                  <DetenidosList
                    causas={responsableFiltro.filtrar(detenidosRemote.causas)}
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
                isEmpty={responsableFiltro.filtrar(rebeldesRemote.causas).length === 0}
                emptyTitle="Todavía no hay rebeldes en este espacio"
                emptyMessage="Empezá creando la primera causa para gestionarla acá."
                onRetry={rebeldesRemote.refetch}
                onCreateCausa={() => setShowCreateCausa(true)}
              >
                <CausasTable
                  causas={responsableFiltro.filtrar(rebeldesRemote.causas)}
                  title="Rebeldes / Paraderos"
                  listKey="rebeldes"
                  allCausas={responsableFiltro.filtrar(rebeldesRemote.causas)}
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
                isEmpty={responsableFiltro.filtrar(sjpRemote.causas).length === 0}
                emptyTitle="Todavía no hay causas con SJP"
                emptyMessage="Empezá creando la primera causa para gestionarla acá."
                onRetry={sjpRemote.refetch}
                onCreateCausa={() => setShowCreateCausa(true)}
              >
                <CausasTable
                  causas={responsableFiltro.filtrar(sjpRemote.causas)}
                  title="SJP en Trámite"
                  listKey="sjp"
                  allCausas={responsableFiltro.filtrar(sjpRemote.causas)}
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
                isEmpty={responsableFiltro.filtrar(recursosRemote.causas).length === 0}
                emptyTitle="Todavía no hay causas con recurso"
                emptyMessage="Empezá creando la primera causa para gestionarla acá."
                onRetry={recursosRemote.refetch}
                onCreateCausa={() => setShowCreateCausa(true)}
              >
                <CausasTable
                  causas={responsableFiltro.filtrar(recursosRemote.causas)}
                  title="Recursos"
                  listKey="recursos"
                  allCausas={responsableFiltro.filtrar(recursosRemote.causas)}
                  onMutated={recursosRemote.refetch}
                  onNavigateToConexa={navigateToCausa}
                  openCausaId={pendingOpenCausaId}
                  onOpenedCausa={consumePending}
                  {...remoteTableCommon}
                />
              </RemoteListSection>
            )}
            {view === "delegadas" && !esEstudio && (
              <RemoteListSection
                loading={delegadasRemote.loading}
                error={delegadasRemote.error}
                isEmpty={responsableFiltro.filtrar(delegadasRemote.causas).length === 0}
                emptyTitle="Todavía no hay causas delegadas"
                emptyMessage="Cambiá el estado de una causa a “Delegada” para verla acá."
                onRetry={delegadasRemote.refetch}
              >
                <CausasTable
                  causas={responsableFiltro.filtrar(delegadasRemote.causas)}
                  title="Causas Delegadas"
                  listKey="delegadas"
                  allCausas={responsableFiltro.filtrar(delegadasRemote.causas)}
                  onMutated={delegadasRemote.refetch}
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
                isEmpty={responsableFiltro.filtrar(terminadasRemote.causas).length === 0}
                emptyTitle="Todavía no hay causas terminadas"
                emptyMessage="Las causas terminadas aparecerán acá cuando cambies el estado de una causa existente."
                onRetry={terminadasRemote.refetch}
              >
                <CausasTable
                  causas={responsableFiltro.filtrar(terminadasRemote.causas)}
                  title="Causas Terminadas"
                  listKey="terminadas"
                  allCausas={responsableFiltro.filtrar(terminadasRemote.causas)}
                  onMutated={terminadasRemote.refetch}
                  onNavigateToConexa={navigateToCausa}
                  openCausaId={pendingOpenCausaId}
                  onOpenedCausa={consumePending}
                  {...remoteTableCommon}
                />
              </RemoteListSection>
            )}
            {esEstudio && (view === "fueros" || view === "delitos") && (
              <RemoteListSection
                loading={dashCausasRemote.loading}
                error={dashCausasRemote.error}
                isEmpty={dashCausas.length === 0}
                emptyTitle="Todavía no hay causas cargadas en este espacio"
                onRetry={dashCausasRemote.refetch}
                onCreateCausa={() => setShowCreateCausa(true)}
              >
                <AgrupadasView
                  key={view}
                  causas={dashCausas}
                  criterio={view === "fueros" ? "fuero" : "delito"}
                  onMutated={dashCausasRemote.refetch}
                  onNavigateToConexa={navigateToCausa}
                />
              </RemoteListSection>
            )}
            {esEstudio && (view === "instruccion" || view === "elevadas" || view === "recurridas") && (() => {
              const conf = view === "instruccion"
                ? { estados: EP_INSTRUCCION, title: "Instrucción" }
                : view === "elevadas"
                  ? { estados: EP_ELEVADAS, title: "Elevadas a juicio" }
                  : { estados: EP_RECURRIDAS, title: "Recurridas" };
              const lista = porEstadoProcesal(conf.estados);
              return (
                <RemoteListSection
                  loading={dashCausasRemote.loading}
                  error={dashCausasRemote.error}
                  isEmpty={lista.length === 0}
                  emptyTitle={`Todavía no hay causas en ${conf.title.toLowerCase()}`}
                  emptyMessage="Cargá el estado procesal en las causas para verlas acá."
                  onRetry={dashCausasRemote.refetch}
                  onCreateCausa={() => setShowCreateCausa(true)}
                >
                  <CausasTable
                    causas={lista}
                    title={conf.title}
                    listKey={view}
                    allCausas={lista}
                    onMutated={dashCausasRemote.refetch}
                    onNavigateToConexa={navigateToCausa}
                    openCausaId={pendingOpenCausaId}
                    onOpenedCausa={consumePending}
                    {...remoteTableCommon}
                  />
                </RemoteListSection>
              );
            })()}
            {view === "calendario" && <CalendarioAlertas vocaliaId={vocaliaId} onOpenCausa={navigateToCausa} causaIdsPermitidos={responsableFiltro.causaIdsPermitidos} />}
            {view === "categorias" && vocaliaId && (
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-6">
                <CategoriasManager vocaliaId={vocaliaId} />
                <SubestadosManager vocaliaId={vocaliaId} />
              </div>
            )}
            {view === "miembros" && esAdmin && tribunalId && (
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                <MiembrosTribunal tribunalId={tribunalId} onAbandoned={onBack} />
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
            {/* La vista "migrar" se renderiza siempre montada fuera de AnimatePresence
                para que la migración siga corriendo aunque el usuario cambie de vista. */}

            {view.startsWith("custom-") && (
              <CausasTable
                causas={[]}
                title={customBoards.find((b) => b.id === view)?.label || "Tablero"}
                listKey={view}
                allCausas={[]}
                {...remoteTableCommon}
              />
            )}
            {listaActiva && vocaliaId && (
              <ListaPersonalizadaView
                key={listaActiva.id}
                lista={listaActiva}
                vocaliaId={vocaliaId}
                onListaBorrada={() => { listasHook.refetch(); setView("dashboard"); }}
                onNavigateToConexa={navigateToCausa}
                filtrarCausas={responsableFiltro.filtrar}
              />
            )}
            {tableroActivo && (
              <TableroView key={tableroActivo.id} tablero={tableroActivo} vocaliaId={vocaliaId} />
            )}

          </motion.div>
        </AnimatePresence>

        {/* Wizard de migración SIEMPRE montado mientras haya vocalía seleccionada.
            Se oculta visualmente cuando la vista activa no es "migrar", pero su
            estado interno y los lotes en curso se preservan. */}
        {vocaliaId && (
          <div
            ref={(el) => {
              if (el && view === "migrar") {
                // Reset scroll to top whenever the migrar view becomes active.
                requestAnimationFrame(() => { el.scrollTop = 0; });
              }
            }}
            key={view === "migrar" ? "migrar-visible" : "migrar-hidden"}
            className={
              view === "migrar"
                ? "flex-1 min-h-0 overflow-y-auto -mx-6 lg:-mx-8 px-6 lg:px-8"
                : "hidden"
            }
            aria-hidden={view !== "migrar"}
          >
            {view === "migrar" && <PendientesRevision vocaliaId={vocaliaId} />}
            <ErrorBoundary
              scope="local"
              title="Error en la migración"
              message="Hubo un problema en el asistente de migración. Tus lotes procesados están guardados — podés reintentar sin perderlos."
            >
              <Suspense fallback={<Skeleton className="h-64 w-full" />}>
                <WizardMigracion
                  vocaliaId={vocaliaId}
                  vocaliaNombre={vocaliaNombre}
                  onDone={() => setView("dashboard")}
                  onStatusChange={setMigracionStatus}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}
      </main>
      <CausaFormDialog
        open={showCreateCausa}
        onOpenChange={setShowCreateCausa}
        mode="crear"
        onMutated={() => {
          dashCausasRemote.refetch();
          tramiteRemote.refetch();
          detenidosRemote.refetch();
          rebeldesRemote.refetch();
          sjpRemote.refetch();
          recursosRemote.refetch();
          terminadasRemote.refetch();
          delegadasRemote.refetch();
          dashboardKpis.refetch();
        }}
      />
      <NuevaEstadisticaDialog
        open={showNuevaEstadistica}
        onOpenChange={setShowNuevaEstadistica}
        esEstudio={esEstudio}
        causas={dashCausasRemote.causas}
        onCrear={estadisticasCustom.crear}
      />
      <CrearListaDialog
        open={showCreateLista}
        onOpenChange={setShowCreateLista}
        onCrear={async (nombre) => {
          const id = await listasHook.crearLista(nombre);
          if (id) setView(`lista-${id}`);
        }}
      />
      <CrearTableroDialog
        open={showCreateTablero}
        onOpenChange={setShowCreateTablero}
        onCrear={async (nombre) => {
          const id = await tablerosHook.crearTablero(nombre);
          if (id) setView(`tablero-${id}`);
        }}
      />

    </div>
  );
}
