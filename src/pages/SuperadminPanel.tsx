import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Shield, Search, Building2, Users, Folder, Calendar, ArrowRight, Loader2, RefreshCw, AlertTriangle, ArrowLeft, Trash2, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { useEsSuperadmin } from "@/hooks/useEsSuperadmin";
import { useTribunalesGlobal } from "@/hooks/useSuperadminData";
import { useSuperadminMode } from "@/context/SuperadminModeContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function SuperadminPanel() {
  const { user, loading: authLoading } = useAuth();
  const { esSuperadmin, loading: rolLoading } = useEsSuperadmin();
  const { data, loading, error, refetch } = useTribunalesGlobal();
  const { exit } = useSuperadminMode();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  // Al entrar al panel salimos de cualquier modo activo (vista del panel raíz)
  // No mostramos banner aquí.

  const activos = useMemo(() => data.filter((t) => !t.eliminado_en), [data]);
  const papelera = useMemo(() => data.filter((t) => !!t.eliminado_en), [data]);

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return activos;
    return activos.filter((t) => t.nombre.toLowerCase().includes(term));
  }, [activos, q]);

  const restaurar = async (id: string, nombre: string) => {
    const { error } = await supabase.rpc("restaurar_tribunal", { p_tribunal_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success(`${nombre} restaurado`);
    refetch();
  };

  if (authLoading || rolLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!esSuperadmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Acceso denegado</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>No tenés permisos para acceder a esta sección.</p>
            <Button size="sm" onClick={() => navigate("/", { replace: true })}>Volver al inicio</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const entrar = (id: string, nombre: string) => {
    exit(); // limpiar cualquier modo previo
    navigate(`/superadmin/tribunal/${id}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-indigo-500/20 bg-gradient-to-b from-indigo-500/5 to-transparent">
        <div className="max-w-[1200px] mx-auto px-6 py-5 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Volver al workspace
          </Button>
          <div className="flex items-center gap-2.5 ml-2">
            <div className="w-9 h-9 rounded-md bg-indigo-500/15 flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-500 dark:text-indigo-300" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold leading-tight">Panel Superadmin</h1>
              <p className="text-[11px] text-muted-foreground">Administración global del sistema</p>
            </div>
          </div>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-display font-bold tracking-tight">Tribunales del sistema</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Vista global de todos los tribunales del sistema. Usar con responsabilidad.
          </p>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar tribunal por nombre…"
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">
            {filtrados.length} {filtrados.length === 1 ? "tribunal" : "tribunales"}
          </span>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>No se pudieron cargar los tribunales</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            {q ? "Ningún tribunal coincide con la búsqueda." : "No hay tribunales en el sistema."}
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium">Tribunal</th>
                  <th className="text-center px-3 py-2.5 font-medium">Vocalías</th>
                  <th className="text-center px-3 py-2.5 font-medium">Miembros</th>
                  <th className="text-center px-3 py-2.5 font-medium">Causas</th>
                  <th className="text-left px-3 py-2.5 font-medium">Creado</th>
                  <th className="text-right px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((t) => (
                  <tr key={t.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{t.nombre}</span>
                      </div>
                    </td>
                    <td className="text-center px-3 py-3 tabular-nums">{t.vocalias_count}</td>
                    <td className="text-center px-3 py-3 tabular-nums">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Users className="w-3.5 h-3.5" /> {t.miembros_count}
                      </span>
                    </td>
                    <td className="text-center px-3 py-3 tabular-nums">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Folder className="w-3.5 h-3.5" /> {t.causas_count}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {t.created_at ? new Date(t.created_at).toLocaleDateString("es-AR") : "—"}
                      </span>
                    </td>
                    <td className="text-right px-4 py-3">
                      <Button
                        size="sm"
                        onClick={() => entrar(t.id, t.nombre)}
                        className="gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white"
                      >
                        Entrar como superadmin <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
