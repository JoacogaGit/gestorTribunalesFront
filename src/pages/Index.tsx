import { useState } from "react";
import AuthScreen from "@/components/AuthScreen";
import VocaliaSelector from "@/components/VocaliaSelector";
import VocaliaWorkspace from "@/components/VocaliaWorkspace";
import ThemeToggle from "@/components/ThemeToggle";

export interface CurrentUser {
  name: string;
  email: string;
}

export default function Index() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [vocalia, setVocalia] = useState<number | null>(null);

  // Theme toggle floats top-right on auth/selector screens.
  // Inside the workspace, the toggle lives next to the user menu in the header.
  const showFloatingToggle = !user || !vocalia;

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
        <VocaliaSelector onSelect={setVocalia} />
      ) : (
        <VocaliaWorkspace
          vocalia={vocalia}
          onBack={() => setVocalia(null)}
          user={user}
          onLogout={() => { setUser(null); setVocalia(null); }}
          onUpdateUser={(u) => setUser(u)}
        />
      )}
    </>
  );
}
