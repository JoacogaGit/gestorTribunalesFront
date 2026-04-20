import { useState } from "react";
import AuthScreen from "@/components/AuthScreen";
import VocaliaSelector from "@/components/VocaliaSelector";
import VocaliaWorkspace from "@/components/VocaliaWorkspace";

export interface CurrentUser {
  name: string;
  email: string;
}

export default function Index() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [vocalia, setVocalia] = useState<number | null>(null);

  if (!user) {
    return <AuthScreen onAuth={(u) => setUser(u)} />;
  }

  if (!vocalia) {
    return <VocaliaSelector onSelect={setVocalia} />;
  }

  return (
    <VocaliaWorkspace
      vocalia={vocalia}
      onBack={() => setVocalia(null)}
      user={user}
      onLogout={() => { setUser(null); setVocalia(null); }}
      onUpdateUser={(u) => setUser(u)}
    />
  );
}
