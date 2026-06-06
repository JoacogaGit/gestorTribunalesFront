import { useState } from "react";
import { Scale, Building2, KeyRound, Ticket, LogOut, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import BienvenidaTribunal from "@/components/BienvenidaTribunal";

interface Props {
  onCreated: () => void;
}

type ModoTribunal = "lista_unica" | "vocalias_separadas";
type Mode = "menu" | "crear" | "modo" | "codigo" | "token" | "vocalia" | "bienvenida";

export default function WelcomeNoTribunal({ onCreated }: Props) {
  const { logout } = useAuth();
  const [mode, setMode] = useState<Mode>("menu");
  const [loading, setLoading] = useState(false);

  // crear tribunal
  const [tribunalNombre, setTribunalNombre] = useState("");
  const [tribunalId, setTribunalId] = useState<string | null>(null);
  const [vocaliaNombre, setVocaliaNombre] = useState("Vocalía 1");

  // unirse
  const [codigo, setCodigo] = useState("");
  const [token, setToken] = useState("");

  const handleContinuarACrear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tribunalNombre.trim()) return;
    setMode("modo");
  };

  const handleElegirModo = async (modoElegido: ModoTribunal) => {
    setLoading(true);
    const { data, error } = await supabase.rpc("crear_tribunal", { p_nombre: tribunalNombre.trim() });
    if (error || !data) {
      setLoading(false);
      toast.error(error?.message || "No se pudo crear el tribunal.");
      return;
    }
    const newTribunalId = data as string;

    // Persistir el modo elegido
    const { error: updErr } = await supabase
      .from("tribunales")
      .update({ modo: modoElegido })
      .eq("id", newTribunalId);
    if (updErr) {
      setLoading(false);
      toast.error("Tribunal creado pero no se pudo guardar el modo.");
      return;
    }

    setTribunalId(newTribunalId);

    if (modoElegido === "lista_unica") {
      // Crear vocalía "General" oculta y saltar el paso de vocalía
      const { error: vErr } = await supabase
        .from("vocalias")
        .insert({ tribunal_id: newTribunalId, nombre: "General" });
      setLoading(false);
      if (vErr) { toast.error("No se pudo inicializar el tribunal."); return; }
      toast.success("Tribunal creado");
      setMode("bienvenida");
    } else {
      setLoading(false);
      toast.success("Tribunal creado");
      setMode("vocalia");
    }
  };

  const handleCrearVocalia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tribunalId || !vocaliaNombre.trim()) return;
    setLoading(true);
    const { error } = await supabase
      .from("vocalias")
      .insert({ tribunal_id: tribunalId, nombre: vocaliaNombre.trim() });
    setLoading(false);
    if (error) { toast.error("No se pudo crear la vocalía."); return; }
    toast.success("Vocalía creada");
    setMode("bienvenida");
  };

  const handleUnirseCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.rpc("unirse_por_codigo", { p_codigo: codigo.trim() });
    setLoading(false);
    if (error) { toast.error("Código inválido."); return; }
    toast.success("Te uniste al tribunal");
    onCreated();
  };

  const handleAceptarToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.rpc("aceptar_invitacion", { p_token: token.trim() });
    setLoading(false);
    if (error) { toast.error("Invitación inválida o expirada."); return; }
    toast.success("Invitación aceptada");
    onCreated();
  };

  if (mode === "bienvenida") {
    return (
      <BienvenidaTribunal
        onMigrar={() => {
          if (typeof window !== "undefined") {
            sessionStorage.setItem("justrack:open-migrar", "1");
          }
          onCreated();
        }}
        onEmpezarDesdeCero={onCreated}
      />
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-surface" />
      <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-primary/10 blur-3xl -z-10" />
      <div className="absolute -bottom-40 -right-32 w-[520px] h-[520px] rounded-full bg-gold/15 blur-3xl -z-10" />

      <div className="w-full max-w-2xl animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-gold flex items-center justify-center shadow-glow">
              <Scale className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">JusTrack</h1>
          </div>
          <p className="text-muted-foreground">Bienvenido. Para empezar, elegí una opción.</p>
        </div>

        <div className="elevated-card rounded-2xl p-8 animate-scale-in">
          {mode === "menu" && (
            <div className="grid md:grid-cols-2 gap-4">
              <button onClick={() => setMode("crear")}
                className="text-left p-6 rounded-xl border border-border hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 transition-all">
                <Building2 className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-display font-semibold text-foreground mb-1">Crear mi tribunal</h3>
                <p className="text-sm text-muted-foreground">Sos el primer usuario y querés armar tu propio tribunal.</p>
              </button>
              <button onClick={() => setMode("codigo")}
                className="text-left p-6 rounded-xl border border-border hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 transition-all">
                <KeyRound className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-display font-semibold text-foreground mb-1">Unirme con código</h3>
                <p className="text-sm text-muted-foreground">Tenés un código de 8 caracteres compartido por un admin.</p>
              </button>
              <button onClick={() => setMode("token")}
                className="md:col-span-2 text-left p-4 rounded-xl border border-dashed border-border hover:border-primary/60 transition-all flex items-center gap-3">
                <Ticket className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Tengo un token de invitación</span>
              </button>
            </div>
          )}

          {mode === "crear" && (
            <form onSubmit={handleContinuarACrear} className="space-y-4">
              <h3 className="font-display font-semibold text-foreground">Crear tribunal</h3>
              <div className="space-y-1.5">
                <Label htmlFor="tnombre">Nombre del tribunal</Label>
                <Input id="tnombre" value={tribunalNombre} onChange={(e) => setTribunalNombre(e.target.value)}
                  className="h-11" placeholder="Tribunal Oral en lo Criminal Federal Nº 1" required autoFocus />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setMode("menu")} disabled={loading}>Cancelar</Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  Continuar
                </Button>
              </div>
            </form>
          )}

          {mode === "modo" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display font-semibold text-foreground">¿Cómo trabaja este tribunal?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Elegí la forma en la que querés organizar las causas. Después podés cambiarla desde configuración.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleElegirModo("vocalias_separadas")}
                  className="text-left p-5 rounded-xl border border-border hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 transition-all disabled:opacity-50"
                >
                  <div className="text-2xl mb-2">🏛️</div>
                  <h4 className="font-display font-semibold text-foreground mb-1">Con vocalías u oficinas separadas</h4>
                  <p className="text-xs text-muted-foreground">
                    Cada vocalía tiene sus propias causas. Ideal para tribunales colegiados, estudios con varios abogados.
                  </p>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleElegirModo("lista_unica")}
                  className="text-left p-5 rounded-xl border border-border hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 transition-all disabled:opacity-50"
                >
                  <div className="text-2xl mb-2">📋</div>
                  <h4 className="font-display font-semibold text-foreground mb-1">Como lista única</h4>
                  <p className="text-xs text-muted-foreground">
                    Todas las causas en un solo lugar. Ideal para juzgados unipersonales, defensorías, estudios chicos.
                  </p>
                </button>
              </div>
              <div className="flex justify-start">
                <Button type="button" variant="ghost" size="sm" onClick={() => setMode("crear")} disabled={loading}>
                  <ArrowLeft className="w-4 h-4 mr-1.5" /> Volver
                </Button>
              </div>
              {loading && (
                <div className="flex items-center justify-center text-xs text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Creando tribunal…
                </div>
              )}
            </div>
          )}

          {mode === "vocalia" && (
            <form onSubmit={handleCrearVocalia} className="space-y-4">
              <div>
                <h3 className="font-display font-semibold text-foreground">Tu primera vocalía</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Tu tribunal está creado. Para empezar, creá tu primera vocalía. Después podés agregar más.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vnombre">Nombre de la vocalía</Label>
                <Input id="vnombre" value={vocaliaNombre} onChange={(e) => setVocaliaNombre(e.target.value)}
                  className="h-11" placeholder="Vocalía 1" required />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Crear vocalía
              </Button>
            </form>
          )}

          {mode === "codigo" && (
            <form onSubmit={handleUnirseCodigo} className="space-y-4">
              <h3 className="font-display font-semibold text-foreground">Unirme con código</h3>
              <div className="space-y-1.5">
                <Label htmlFor="codigo">Código del tribunal</Label>
                <Input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  className="h-11 font-mono tracking-widest uppercase" maxLength={8} placeholder="ABCD1234" required />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setMode("menu")} disabled={loading}>Volver</Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Unirme
                </Button>
              </div>
            </form>
          )}

          {mode === "token" && (
            <form onSubmit={handleAceptarToken} className="space-y-4">
              <h3 className="font-display font-semibold text-foreground">Aceptar invitación</h3>
              <div className="space-y-1.5">
                <Label htmlFor="token">Token</Label>
                <Input id="token" value={token} onChange={(e) => setToken(e.target.value)}
                  className="h-11 font-mono" placeholder="Pegá tu token de invitación" required />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setMode("menu")} disabled={loading}>Volver</Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Aceptar invitación
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="w-4 h-4 mr-1.5" /> Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}
