import { useEffect, useMemo, useState } from "react";
import { LayoutDashboard, Users, Calendar, Scale, AlertTriangle, Shield, Pause, Plus, X, Pencil, Check, ArrowLeft, Archive, ChevronDown, UserCog, Trash2, PanelLeftClose, PanelLeftOpen, Sparkles, Tag, FolderOpen, Lock, Landmark, Gavel, Search, Zap, BarChart3, Settings2 } from "lucide-react";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { VocaliaRow } from "@/hooks/useVocalias";
import type { ModoTribunal } from "@/hooks/useTribunal";
import type { ListaPersonalizada } from "@/hooks/useListasPersonalizadas";
import type { Tablero } from "@/hooks/useTableros";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const navBeforeTerminadas = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tramite", label: "Causas en Trámite", icon: Scale },
  { id: "detenidos", label: "Detenidos", icon: Shield },
  { id: "rebeldes", label: "Rebeldes", icon: AlertTriangle },
  { id: "sjp", label: "SJP en Trámite", icon: Pause },
  { id: "recursos", label: "Recursos", icon: Users },
  { id: "delegadas", label: "Delegadas", icon: FolderOpen },
  { id: "art196bis", label: "196bis / NN", icon: Lock },
  { id: "flagrancia", label: "Flagrancia", icon: Zap },
];
const terminadasItem = { id: "terminadas", label: "Causas Terminadas", icon: Archive };
const navAfterLists = [
  { id: "calendario", label: "Calendario / Alertas", icon: Calendar },
  { id: "categorias", label: "Categorías", icon: Tag },
];
const navEstudio = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "fueros", label: "Fueros", icon: Landmark },
  { id: "delitos", label: "Delitos", icon: Gavel },
  { id: "instruccion", label: "Instrucción", icon: Search },
  { id: "elevadas", label: "Elevadas a juicio", icon: Scale },
  { id: "recurridas", label: "Recurridas", icon: Users },
  { id: "detenidos", label: "Detenidos", icon: Shield },
  { id: "sjp", label: "SJP", icon: Pause },
  { id: "delegadas", label: "Delegadas", icon: FolderOpen },
  { id: "art196bis", label: "196bis / NN", icon: Lock },
  { id: "flagrancia", label: "Flagrancia", icon: Zap },
];
const navFinal = [
  { id: "metricas", label: "Estadísticas y relevamientos", icon: BarChart3 },
  { id: "migrar", label: "Migrar causas", icon: Sparkles },
];


export interface CustomBoard {
  id: string;
  label: string;
}

interface Props {
  active: string;
  onNavigate: (id: string) => void;
  customBoards: CustomBoard[];
  onAddBoard: () => void;
  onRemoveBoard: (id: string) => void;
  onRenameBoard: (id: string, name: string) => void;
  vocaliaNombre: string;
  vocaliasTribunal: VocaliaRow[];
  currentVocaliaId: string | null;
  onSwitchVocalia: (v: VocaliaRow) => void;
  onBack: () => void;
  esAdmin?: boolean;
  modoTribunal?: ModoTribunal;
  listasPersonalizadas?: ListaPersonalizada[];
  onCreateLista?: () => void;
  tableros?: Tablero[];
  onCreateTablero?: () => void;
  onDeleteTablero?: (id: string) => void;
  esEstudio?: boolean;
  userStorageKey: string;
}


export default function AppSidebar({
  active, onNavigate, customBoards, onAddBoard, onRemoveBoard, onRenameBoard,
  vocaliaNombre, vocaliasTribunal, currentVocaliaId, onSwitchVocalia, onBack, esAdmin,
  modoTribunal = "vocalias_separadas",
  listasPersonalizadas = [], onCreateLista,
  tableros = [], onCreateTablero, onDeleteTablero, esEstudio = false,
  userStorageKey,

}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const metricasActivas = active === "metricas";
  const visibilityStorageKey = `iustrack_sidebar_hidden_${userStorageKey}`;
  const readHiddenItems = () => {
    if (typeof window === "undefined") return new Set<string>();
    try {
      return new Set<string>(JSON.parse(localStorage.getItem(visibilityStorageKey) || "[]"));
    } catch {
      return new Set<string>();
    }
  };
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(readHiddenItems);

  useEffect(() => {
    setHiddenItems(readHiddenItems());
    // La clave cambia únicamente cuando cambia el usuario autenticado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibilityStorageKey]);

  const configurableItems = useMemo(() => {
    const base = (esEstudio ? navEstudio : navBeforeTerminadas).filter((item) => item.id !== "dashboard");
    return [
      ...base,
      terminadasItem,
      ...listasPersonalizadas.map((lista) => ({ id: `lista-${lista.id}`, label: lista.nombre, icon: FolderOpen })),
    ];
  }, [esEstudio, listasPersonalizadas]);

  const isVisible = (id: string) => !hiddenItems.has(id);
  const toggleVisibility = (id: string) => {
    setHiddenItems((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem(visibilityStorageKey, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
    if (active === id) onNavigate("dashboard");
  };

  const startEdit = (id: string, current: string) => {
    setEditingId(id);
    setEditValue(current);
  };

  const confirmEdit = (id: string) => {
    if (editValue.trim()) onRenameBoard(id, editValue.trim());
    setEditingId(null);
  };

  const otrasVocalias = vocaliasTribunal.filter((v) => v.id !== currentVocaliaId);

  const adminItems = [
    { id: "miembros", label: "Miembros de la oficina", icon: UserCog },
    { id: "papelera", label: "Papelera", icon: Trash2 },
  ];

  const renderNavButton = (item: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }) => {
    const isActive = active === item.id;
    const btn = (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        data-tour={`nav-${item.id}`}
        className={`relative w-full flex items-center ${collapsed ? "justify-center px-0" : "gap-3 px-3"} py-2.5 rounded-md text-sm font-medium transition-all ${
          isActive
            ? metricasActivas ? "bg-metrics-accent text-metrics-foreground shadow-soft" : "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
            : metricasActivas ? "text-metrics-muted hover:bg-metrics-card hover:text-metrics-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        }`}
        aria-label={item.label}
      >
        {isActive && <span className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r ${metricasActivas ? "bg-metrics-gold" : "bg-gradient-gold"}`} />}
        <item.icon className={`w-4 h-4 shrink-0 ${isActive ? metricasActivas ? "text-metrics-gold" : "text-sidebar-primary" : ""}`} />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </button>
    );
    if (!collapsed) return btn;
    return (
      <Tooltip key={item.id} delayDuration={150}>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <aside data-tour="sidebar" className={`${collapsed ? "w-16" : "w-56"} shrink-0 ${metricasActivas ? "bg-metrics-background text-metrics-foreground border-metrics-border" : "bg-gradient-sidebar text-sidebar-foreground border-sidebar-border"} flex flex-col min-h-screen border-r shadow-elevated transition-[width,background-color] duration-200`}>
        <div className={`${collapsed ? "px-2" : "px-5"} py-6`}>
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2"} mb-3`}>
            <div className="w-9 h-9 rounded-lg bg-gradient-gold flex items-center justify-center shadow-soft shrink-0">
              <Scale className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight">
                <span className="font-display text-lg font-bold text-sidebar-accent-foreground tracking-tight">IusTrack</span>
                <span className="text-[9px] uppercase tracking-[0.18em] text-sidebar-primary/80">Gestión Judicial</span>
              </div>
            )}
          </div>

          {!collapsed && modoTribunal === "lista_unica" && (
            <DropdownMenu>
              <DropdownMenuTrigger data-tour="vocalia-selector" className="flex items-center gap-1.5 text-xs text-sidebar-foreground/70 hover:text-sidebar-primary transition-colors w-full text-left">
                <span className="truncate flex-1">{vocaliaNombre}</span>
                <ChevronDown className="w-3 h-3 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onSelect={onBack} className="text-xs">
                  <ArrowLeft className="w-3 h-3 mr-1.5" /> Volver al selector
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!collapsed && modoTribunal !== "lista_unica" && (
            <DropdownMenu>
              <DropdownMenuTrigger data-tour="vocalia-selector" className="flex items-center gap-1.5 text-xs text-sidebar-foreground/70 hover:text-sidebar-primary transition-colors w-full text-left">
                <span className="truncate flex-1">{vocaliaNombre}</span>
                <ChevronDown className="w-3 h-3 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-xs">Cambiar de espacio</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {otrasVocalias.length === 0 && (
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    No hay otros espacios
                  </DropdownMenuItem>
                )}
                {otrasVocalias.map((v) => (
                  <DropdownMenuItem key={v.id} onSelect={() => onSwitchVocalia(v)} className="text-xs">
                    {v.nombre}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onBack} className="text-xs">
                  <ArrowLeft className="w-3 h-3 mr-1.5" /> Volver al selector
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <button
            onClick={() => setCollapsed((c) => !c)}
            className={`mt-3 w-full flex items-center ${collapsed ? "justify-center" : "justify-end"} text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors`}
            aria-label={collapsed ? "Expandir panel" : "Contraer panel"}
            title={collapsed ? "Expandir panel" : "Contraer panel"}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        <nav className={`flex-1 ${collapsed ? "px-2" : "px-3"} space-y-1 overflow-y-auto`}>
          {(esEstudio ? navEstudio : navBeforeTerminadas).filter((item) => isVisible(item.id)).map(renderNavButton)}

          {isVisible(terminadasItem.id) && renderNavButton(terminadasItem)}

          {/* Listas personalizadas: inmediatamente después de Flagrancia y Terminadas. */}
          <div data-tour="listas" className="space-y-1">
            {!collapsed && (listasPersonalizadas.length > 0 || onCreateLista) && (
              <div className="flex items-center justify-between pt-3 pb-1 pr-1">
                <span className="px-3 text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold">Listas</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-sidebar-foreground/55 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      aria-label="Personalizar listas visibles"
                      title="Personalizar listas"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" collisionPadding={12} className="w-64 max-h-[min(75vh,560px)] overflow-y-auto overscroll-contain">
                    <DropdownMenuLabel className="text-xs">Personalizar listas</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {configurableItems.map((item) => (
                      <DropdownMenuCheckboxItem
                        key={item.id}
                        checked={isVisible(item.id)}
                        onSelect={(event) => event.preventDefault()}
                        onCheckedChange={() => toggleVisibility(item.id)}
                        className="text-xs"
                      >
                        {item.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
            {!collapsed && onCreateLista && listasPersonalizadas.length < 2 && (
              <button
                onClick={onCreateLista}
                data-tour="crear-lista"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/30 transition-colors border border-dashed border-sidebar-border/50"
              >
                <Plus className="w-3.5 h-3.5" />
                Crear nueva lista
              </button>
            )}
            {listasPersonalizadas.filter((lista) => isVisible(`lista-${lista.id}`)).map((lista) => {
              const id = `lista-${lista.id}`;
              const isActive = active === id;
              const btn = (
                <button
                  key={id}
                  onClick={() => onNavigate(id)}
                  className={`relative w-full flex items-center ${collapsed ? "justify-center px-0" : "gap-3 px-3"} py-2.5 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  }`}
                  aria-label={lista.nombre}
                >
                  {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-gradient-gold" />}
                  <FolderOpen className={`w-4 h-4 shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
                  {!collapsed && (
                    <>
                      <span className="truncate flex-1 text-left">{lista.nombre}</span>
                      <span className="text-[10px] text-sidebar-foreground/50 tabular-nums">{lista.count}</span>
                    </>
                  )}
                </button>
              );
              if (!collapsed) return btn;
              return (
                <Tooltip key={id} delayDuration={150}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right">{lista.nombre} ({lista.count})</TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {collapsed && (
            <DropdownMenu>
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-full text-sidebar-foreground/70" aria-label="Personalizar listas visibles">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">Personalizar listas</TooltipContent>
              </Tooltip>
              <DropdownMenuContent side="right" align="start" collisionPadding={12} className="w-64 max-h-[min(75vh,560px)] overflow-y-auto overscroll-contain">
                <DropdownMenuLabel className="text-xs">Personalizar listas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {configurableItems.map((item) => (
                  <DropdownMenuCheckboxItem key={item.id} checked={isVisible(item.id)} onSelect={(event) => event.preventDefault()} onCheckedChange={() => toggleVisibility(item.id)} className="text-xs">
                    {item.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Anotaciones (tableros) */}
          {!collapsed && (tableros.length > 0 || onCreateTablero) && (
            <div className="pt-3 pb-1" data-tour="anotaciones">
              <span className="px-3 text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold">Anotaciones</span>
            </div>
          )}
          {tableros.map((tb) => {
            const id = `tablero-${tb.id}`;
            const isActive = active === id;
            const btn = (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`relative w-full flex items-center ${collapsed ? "justify-center px-0" : "gap-3 px-3"} py-2.5 rounded-md text-sm font-medium transition-all ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`}
                aria-label={tb.nombre}
              >
                {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-gradient-gold" />}
                <LayoutDashboard className={`w-4 h-4 shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
                {!collapsed && (
                  <>
                    <span className="truncate flex-1 text-left">{tb.nombre}</span>
                  </>
                )}
              </button>
            );
            if (!collapsed) {
              if (!onDeleteTablero) return btn;
              return (
                <div key={id} className="flex items-center group">
                  <div className="flex-1 min-w-0">{btn}</div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Eliminar ${tb.nombre}`}
                        title="Eliminar anotación"
                        className="p-1 opacity-0 group-hover:opacity-100 text-alert-urgent/60 hover:text-alert-urgent transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" className="w-64 space-y-3">
                      <p className="text-xs text-foreground">
                        ¿Eliminar la anotación <span className="font-semibold">{tb.nombre}</span>? Se borran sus listas, columnas y tarjetas.
                      </p>
                      <button
                        type="button"
                        onClick={() => onDeleteTablero(tb.id)}
                        className="w-full rounded-md bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
                      >
                        Confirmar
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
              );
            }
            return (
              <Tooltip key={id} delayDuration={150}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="right">{tb.nombre}</TooltipContent>
              </Tooltip>
            );
          })}
          {!collapsed && onCreateTablero && (
            <button
              onClick={onCreateTablero}
              data-tour="nueva-anotacion"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/30 transition-colors border border-dashed border-sidebar-border/50"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva anotación
            </button>
          )}
          {navAfterLists.map(renderNavButton)}



          {navFinal.map(renderNavButton)}
          {esAdmin && adminItems.map(renderNavButton)}


          {!collapsed && customBoards.length > 0 && (
            <div className="pt-4 pb-1">
              <span className="px-3 text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold">Vistas guardadas</span>

            </div>
          )}

          {!collapsed && customBoards.map((board) => (
            <div key={board.id} className="flex items-center group">
              {editingId === board.id ? (
                <div className="flex items-center gap-1 flex-1 px-2">
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmEdit(board.id)}
                    className="flex-1 bg-sidebar-accent/50 text-sidebar-foreground text-sm px-2 py-1.5 rounded-md outline-none border border-sidebar-border"
                    autoFocus
                  />
                  <button onClick={() => confirmEdit(board.id)} className="p-1 text-alert-ok hover:text-alert-ok/80">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => onNavigate(board.id)}
                    className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                      active === board.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Scale className="w-4 h-4" />
                    {board.label}
                  </button>
                  <button onClick={() => startEdit(board.id, board.label)} className="p-1 opacity-0 group-hover:opacity-100 text-sidebar-foreground/50 hover:text-sidebar-foreground">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button onClick={() => onRemoveBoard(board.id)} className="p-1 opacity-0 group-hover:opacity-100 text-alert-urgent/60 hover:text-alert-urgent">
                    <X className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          ))}

          {!collapsed && customBoards.length < 2 && (
            <button
              onClick={onAddBoard}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/30 transition-colors mt-2 border border-dashed border-sidebar-border/50"
            >
              <Plus className="w-4 h-4" />
              Nuevo tablero
            </button>
          )}
        </nav>

        {!collapsed && (
          <div className="px-5 py-4 text-[11px] text-sidebar-foreground/40 border-t border-sidebar-border/60">
            TOCC 26 · Prototipo v3
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
