import { useState } from "react";
import { LayoutDashboard, Users, Calendar, Scale, AlertTriangle, Shield, Pause, Plus, X, Pencil, Check, ArrowLeft, Archive, ChevronDown, UserCog } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { VocaliaRow } from "@/hooks/useVocalias";

const defaultNavItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tramite", label: "Causas en Trámite", icon: Scale },
  { id: "detenidos", label: "Detenidos", icon: Shield },
  { id: "rebeldes", label: "Rebeldes", icon: AlertTriangle },
  { id: "sjp", label: "SJP en Trámite", icon: Pause },
  { id: "recursos", label: "Recursos", icon: Users },
  { id: "terminadas", label: "Causas Terminadas", icon: Archive },
  { id: "calendario", label: "Calendario / Alertas", icon: Calendar },
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
}

export default function AppSidebar({
  active, onNavigate, customBoards, onAddBoard, onRemoveBoard, onRenameBoard,
  vocaliaNombre, vocaliasTribunal, currentVocaliaId, onSwitchVocalia, onBack,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (id: string, current: string) => {
    setEditingId(id);
    setEditValue(current);
  };

  const confirmEdit = (id: string) => {
    if (editValue.trim()) onRenameBoard(id, editValue.trim());
    setEditingId(null);
  };

  const otrasVocalias = vocaliasTribunal.filter((v) => v.id !== currentVocaliaId);

  return (
    <aside className="w-56 shrink-0 bg-gradient-sidebar text-sidebar-foreground flex flex-col min-h-screen border-r border-sidebar-border shadow-elevated">
      <div className="px-5 py-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-gold flex items-center justify-center shadow-soft">
            <Scale className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-lg font-bold text-sidebar-accent-foreground tracking-tight">JusTrack</span>
            <span className="text-[9px] uppercase tracking-[0.18em] text-sidebar-primary/80">Gestión Judicial</span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 text-xs text-sidebar-foreground/70 hover:text-sidebar-primary transition-colors w-full text-left">
            <span className="truncate flex-1">{vocaliaNombre}</span>
            <ChevronDown className="w-3 h-3 shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-xs">Cambiar de vocalía</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {otrasVocalias.length === 0 && (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                No hay otras vocalías
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
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {defaultNavItems.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              }`}
            >
              {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-gradient-gold" />}
              <item.icon className={`w-4 h-4 ${isActive ? "text-sidebar-primary" : ""}`} />
              {item.label}
            </button>
          );
        })}

        {customBoards.length > 0 && (
          <div className="pt-4 pb-1">
            <span className="px-3 text-[10px] uppercase tracking-wider text-sidebar-foreground/40 font-semibold">Tableros</span>
          </div>
        )}

        {customBoards.map((board) => (
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

        {customBoards.length < 2 && (
          <button
            onClick={onAddBoard}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/30 transition-colors mt-2 border border-dashed border-sidebar-border/50"
          >
            <Plus className="w-4 h-4" />
            Nuevo tablero
          </button>
        )}
      </nav>

      <div className="px-5 py-4 text-[11px] text-sidebar-foreground/40 border-t border-sidebar-border/60">
        TOCC 26 · Prototipo v3
      </div>
    </aside>
  );
}
