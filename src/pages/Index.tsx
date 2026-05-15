import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import VocaliaSelector from "@/components/VocaliaSelector";
import VocaliaWorkspace from "@/components/VocaliaWorkspace";
import WelcomeNoTribunal from "@/components/WelcomeNoTribunal";
import ThemeToggle from "@/components/ThemeToggle";
import { useVocaliaActual } from "@/context/VocaliaContext";
import { useAuth } from "@/context/AuthContext";
import { useMembresias } from "@/hooks/useMembresias";

export default function Index() {
  const { user, loading: authLoading, logout } = useAuth();
  const { vocalia, setVocalia, clearVocalia } = useVocaliaActual();
  const { count, loading: memLoading, refetch } = useMembresias();
  const navigate = useNavigate();

  // Si hay un token de invitación pendiente y el usuario ya está logueado, redirigir.
  useEffect(() => {
    if (!user) return;
    const t = localStorage.getItem("pending_invitation_token");
    if (t) { localStorage.removeItem("pending_invitation_token"); navigate(`/invitacion/${t}`, { replace: true }); }
  }, [user, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const showFloatingToggle = !vocalia;
  const handleLogout = () => { clearVocalia(); logout(); };

  if (memLoading || count === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (count === 0) {
    return (
      <>
        <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>
        <WelcomeNoTribunal onCreated={refetch} />
      </>
    );
  }

  return (
    <>
      {showFloatingToggle && (
        <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>
      )}
      {!vocalia ? (
        <VocaliaSelector onSelect={setVocalia} onLogout={handleLogout} />
      ) : (
        <VocaliaWorkspace
          onBack={clearVocalia}
          user={{ name: user.nombre, email: user.email }}
          onLogout={handleLogout}
          onUpdateUser={() => { /* perfil se gestiona en Supabase */ }}
        />
      )}
    </>
  );
}
