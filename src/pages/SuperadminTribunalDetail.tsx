import { useEffect } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Calendar, KeyRound, Loader2, Users, Scale, ArrowRight, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import SuperadminBanner from "@/components/SuperadminBanner";
import { useAuth } from "@/context/AuthContext";
import { useEsSuperadmin } from "@/hooks/useEsSuperadmin";
import { useTribunalDetalleSuperadmin } from "@/hooks/useSuperadminData";
import { useSuperadminMode } from "@/context/SuperadminModeContext";
import { useVocaliaActual } from "@/context/VocaliaContext";

export default function SuperadminTribunalDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { esSuperadmin, loading: rolLoading } = useEsSuperadmin();
  const { data, loading, error } = useTribunalDetalleSuperadmin(id);
  const { enter } = useSuperadminMode();
  const { setVocalia } = useVocaliaActual();
  const navigate = useNavigate();

  // Activar modo superadmin con el tribunal apenas cargan los datos
  useEffect(() => {
    if (data?.tribunal) {
      enter({ tribunalId: data.tribunal.id, tribunalNombre: data.tribunal.nombre });
    }
  }, [data?.tribunal, enter]);

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

  const entrarVocalia = (vocaliaId: string, vocaliaNombre: string) => {
    if (!data?.tribunal) return;
    // mantenemos el modo superadmin activo, seteamos vocalía y vamos al workspace
    setVocalia({ id: vocaliaId, nombre: vocaliaNombre, tribunalId: data.tribunal.id });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SuperadminBanner />

      <header className="border-b border-border">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/superadmin")} className="gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Volver al panel
          </Button>
          <div className="flex items-center gap-2 ml-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-indigo-500" />
            Vista superadmin del tribunal
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8 space-y-8">
        {loading && (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {data && (
          <>
            {/* Datos generales */}
            <section className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-display font-bold tracking-tight">{data.tribunal.nombre}</h1>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5" />
                      Código:{" "}
                      <code className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">
                        {data.tribunal.codigo_acceso ?? "—"}
                      </code>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Creado el{" "}
                      {data.tribunal.created_at
                        ? new Date(data.tribunal.created_at).toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Vocalías */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Vocalías ({data.vocalias.length})
              </h2>
              {data.vocalias.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 border border-dashed border-border rounded-lg text-center">
                  Este tribunal no tiene vocalías.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.vocalias.map((v) => (
                    <div
                      key={v.id}
                      className="rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors flex flex-col"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Scale className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold truncate">{v.nombre}</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                        <div className="rounded-md bg-muted/40 px-2 py-1.5">
                          <div className="text-muted-foreground">Causas</div>
                          <div className="font-semibold text-base tabular-nums">{v.causas_count}</div>
                        </div>
                        <div className="rounded-md bg-muted/40 px-2 py-1.5">
                          <div className="text-muted-foreground">Próx. eventos</div>
                          <div className="font-semibold text-base tabular-nums">{v.eventos_proximos}</div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-auto gap-1.5"
                        onClick={() => entrarVocalia(v.id, v.nombre)}
                      >
                        Operar en esta vocalía <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Miembros */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Miembros ({data.miembros.length})
              </h2>
              {data.miembros.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 border border-dashed border-border rounded-lg text-center">
                  No hay miembros registrados en este tribunal.
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-medium">Nombre</th>
                        <th className="text-left px-3 py-2.5 font-medium">Email</th>
                        <th className="text-left px-3 py-2.5 font-medium">Rol</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.miembros.map((m) => (
                        <tr key={m.id} className="border-t border-border">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-muted-foreground" />
                              {m.nombre ?? <span className="text-muted-foreground italic">sin nombre</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{m.email ?? "—"}</td>
                          <td className="px-3 py-2.5">
                            <Badge variant={m.rol === "admin" ? "default" : "secondary"} className="capitalize">
                              {m.rol}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
