import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Keep a created space on password failure so retry never creates duplicates. */
export function useCrearEspacio() {
  const pendiente = useRef<{ id: string; nombre: string; tribunal_id: string } | null>(null);
  const reset = () => { pendiente.current = null; };
  const crear = async (tribunalId: string, nombre: string, password: string | null) => {
    const limpio = nombre.trim();
    if (!limpio) throw new Error("Ingresá un nombre");
    if (password !== null && !password.trim()) throw new Error("Ingresá una contraseña");
    if (!pendiente.current) {
      const { data, error } = await supabase.from("vocalias")
        .insert({ tribunal_id: tribunalId, nombre: limpio }).select("id,nombre,tribunal_id").single();
      if (error || !data) throw new Error(error?.message || "No se pudo crear el espacio");
      pendiente.current = data;
    }
    const espacio = pendiente.current;
    if (password !== null) {
      const { error } = await supabase.rpc("definir_password_vocalia", { p_vocalia_id: espacio.id, p_password: password.trim() });
      if (error) throw new Error("El espacio se creó, pero no se pudo guardar la contraseña. Reintentá antes de continuar.");
    }
    reset();
    return espacio;
  };
  return { crear, reset };
}