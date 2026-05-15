import { Navigate } from "react-router-dom";
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
