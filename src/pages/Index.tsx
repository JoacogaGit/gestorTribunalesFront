import { useState } from "react";
import AuthScreen from "@/components/AuthScreen";
import VocaliaSelector from "@/components/VocaliaSelector";
import VocaliaWorkspace from "@/components/VocaliaWorkspace";

export default function Index() {
  const [authed, setAuthed] = useState(false);
  const [vocalia, setVocalia] = useState<number | null>(null);

  if (!authed) {
    return <AuthScreen onAuth={() => setAuthed(true)} />;
  }

  if (!vocalia) {
    return <VocaliaSelector onSelect={setVocalia} />;
  }

  return <VocaliaWorkspace vocalia={vocalia} onBack={() => setVocalia(null)} />;
}
