import { useState } from "react";
import AuthScreen from "@/components/AuthScreen";
import VocaliaSelector from "@/components/VocaliaSelector";
import VocaliaWorkspace from "@/components/VocaliaWorkspace";
import ThemeToggle from "@/components/ThemeToggle";
import { VocaliaProvider, useVocaliaActual } from "@/context/VocaliaContext";

export interface CurrentUser {
  name: string;
  email: string;
}

function IndexInner() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const { vocalia, setVocalia, clearVocalia } = useVocaliaActual();

  const showFloatingToggle = !user || !vocalia;
  const handleLogout = () => { setUser(null); clearVocalia(); };

  return (
    <>
      {showFloatingToggle && (
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>
      )}
      {!user ? (
        <AuthScreen onAuth={(u) => setUser(u)} />
      ) : !vocalia ? (
        <VocaliaSelector onSelect={setVocalia} onLogout={handleLogout} />
      ) : (
        <VocaliaWorkspace
          onBack={clearVocalia}
          user={user}
          onLogout={handleLogout}
          onUpdateUser={(u) => setUser(u)}
        />
      )}
    </>
  );
}

export default function Index() {
  return (
    <VocaliaProvider>
      <IndexInner />
    </VocaliaProvider>
  );
}
