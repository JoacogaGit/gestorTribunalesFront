export type RolMiembroValor = "admin" | "miembro" | "lector";

export const ROLES_MIEMBRO: { value: RolMiembroValor; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "miembro", label: "Miembro" },
  { value: "lector", label: "Lector" },
];

interface MembresiaRol { id: string; tribunal_id: string; rol: RolMiembroValor }

/** Devuelve el motivo por el que no se puede cambiar el rol, o null si se puede. */
export function puedeCambiarRolMiembro(todas: MembresiaRol[], m: MembresiaRol, nuevo: RolMiembroValor): string | null {
  if (m.rol === "admin" && nuevo !== "admin") {
    const admins = todas.filter((x) => x.tribunal_id === m.tribunal_id && x.rol === "admin").length;
    if (admins <= 1) return "Cada oficina necesita al menos un administrador. Nombrá otro antes de cambiar este.";
  }
  return null;
}
