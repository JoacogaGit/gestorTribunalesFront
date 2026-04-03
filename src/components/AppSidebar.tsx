import { LayoutDashboard, Users, Calendar, Scale, AlertTriangle, Shield, Pause } from "lucide-react";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tramite", label: "Causas en Trámite", icon: Scale },
  { id: "detenidos", label: "Detenidos", icon: Shield },
  { id: "rebeldes", label: "Rebeldes", icon: AlertTriangle },
  { id: "sjp", label: "SJP en Trámite", icon: Pause },
  { id: "recursos", label: "Recursos", icon: Users },
  { id: "calendario", label: "Vencimientos", icon: Calendar },
];

export default function AppSidebar({ active, onNavigate }: { active: string; onNavigate: (id: string) => void }) {
  return (
    <aside className="w-56 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col min-h-screen">
      <div className="px-5 py-6 flex items-center gap-2">
        <Scale className="w-6 h-6 text-sidebar-primary" />
        <span className="font-display text-lg font-bold text-sidebar-primary-foreground tracking-tight">JusTrack</span>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
              active === item.id
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
            }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="px-5 py-4 text-[11px] text-sidebar-foreground/40">
        TOCC 26 · Prototipo v1
      </div>
    </aside>
  );
}
