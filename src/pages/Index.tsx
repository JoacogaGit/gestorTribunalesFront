import { useState } from "react";
import VocaliaSelector from "@/components/VocaliaSelector";
import VocaliaWorkspace from "@/components/VocaliaWorkspace";

export default function Index() {
  const [vocalia, setVocalia] = useState<number | null>(null);

  if (!vocalia) {
    return <VocaliaSelector onSelect={setVocalia} />;
  }

  return <VocaliaWorkspace vocalia={vocalia} onBack={() => setVocalia(null)} />;
}
