import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, ShieldCheck, UserCog } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { puedeCambiarRolMiembro, ROLES_MIEMBRO, type RolMiembroValor } from "@/lib/rolesSuperadmin";

type RolGlobal = "superadmin" | "usuario";

interface Usuario {
  id: string;
  nombre: string | null;
  email: string | null;
  rol_global: RolGlobal;
}

interface Membresia {
  id: string;
  tribunal_id: string;
  usuario_id: string;
  rol: RolMiembroValor;
}

interface Props {
  /** Nombres de las oficinas (id → nombre). */
  oficinas: Map<string, string>;
}

/** Panel del superadmin para asignar o cambiar roles de los usuarios. */
export default function SuperadminRoles({ oficinas }: Props) {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [membresias, setMembresias] = useState<Membresia[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [guardando, setGuardando] = useState<string | null>(null);
  const [cambioGlobal, setCambioGlobal] = useState<{ usuario: Usuario; rol: RolGlobal } | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const [pRes, mRes] = await Promise.all([
      supabase.from("perfiles").select("id, nombre_completo, email, rol_global").order("nombre_completo"),
      supabase.from("miembros_tribunal").select("id, tribunal_id, usuario_id, rol"),
    ]);
    setLoading(false);
    if (pRes.error || mRes.error) {
      toast.error(pRes.error?.message ?? mRes.error?.message ?? "No se pudieron cargar los usuarios");
      return;
    }
    setUsuarios((pRes.data ?? []).map((p) => ({
      id: p.id,
      nombre: p.nombre_completo,
      email: p.email,
      rol_global: (p.rol_global ?? "usuario") as RolGlobal,
    })));
    setMembresias((mRes.data ?? []).map((m) => ({ ...m, rol: (m.rol ?? "miembro") as RolMiembroValor })));
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return usuarios;
    return usuarios.filter((u) => `${u.nombre ?? ""} ${u.email ?? ""}`.toLowerCase().includes(t));
  }, [usuarios, q]);

  const membresiasDe = (uid: string) => membresias.filter((m) => m.usuario_id === uid);

  const aplicarCambioGlobal = async () => {
    if (!cambioGlobal) return;
    const { usuario, rol } = cambioGlobal;
    setGuardando(usuario.id);
    const { error } = await supabase.rpc("superadmin_cambiar_rol_global", { p_usuario_id: usuario.id, p_rol: rol });
    setGuardando(null);
    setCambioGlobal(null);
    if (error) { toast.error(error.message); return; }
    setUsuarios((prev) => prev.map((u) => (u.id === usuario.id ? { ...u, rol_global: rol } : u)));
    toast.success(`${usuario.nombre || usuario.email} ahora es ${rol === "superadmin" ? "superadmin" : "usuario común"}`);
  };

  const cambiarRolMiembro = async (m: Membresia, rol: RolMiembroValor) => {
    if (rol === m.rol) return;
    const motivo = puedeCambiarRolMiembro(membresias, m, rol);
    if (motivo) { toast.error(motivo); return; }
    setGuardando(m.id);
    const { data, error } = await supabase.from("miembros_tribunal").update({ rol }).eq("id", m.id).select("id");
    setGuardando(null);
    if (error || !data || data.length === 0) { toast.error(error?.message ?? "No se pudo cambiar el rol"); return; }
    setMembresias((prev) => prev.map((x) => (x.id === m.id ? { ...x, rol } : x)));
    toast.success("Rol actualizado");
  };

  return (
    <section className="mt-12">
      <div className="flex items-center gap-2 mb-1">
        <UserCog className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-lg font-display font-bold tracking-tight">Usuarios y roles</h2>
        <span className="text-xs text-muted-foreground ml-2">{filtrados.length} usuario{filtrados.length === 1 ? "" : "s"}</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Asigná o cambiá el rol de cada usuario: en todo el sistema (superadmin) y dentro de cada oficina (administrador, miembro o lector).
      </p>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o email…" className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={cargar} disabled={loading} className="gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Usuario</th>
                <th className="text-left px-3 py-2.5 font-medium w-44">Rol en el sistema</th>
                <th className="text-left px-3 py-2.5 font-medium">Rol en cada oficina</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => {
                const propias = membresiasDe(u.id);
                return (
                  <tr key={u.id} className="border-t border-border align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium flex items-center gap-1.5">
                        {u.nombre || "(sin nombre)"}
                        {u.id === user?.id && <Badge variant="secondary" className="text-[10px]">Vos</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Select
                        value={u.rol_global}
                        onValueChange={(v) => { if (v !== u.rol_global) setCambioGlobal({ usuario: u, rol: v as RolGlobal }); }}
                        disabled={guardando === u.id}
                      >
                        <SelectTrigger className="h-9 text-xs" aria-label={`Rol en el sistema de ${u.nombre || u.email}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="usuario">Usuario</SelectItem>
                          <SelectItem value="superadmin">Superadmin</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-3">
                      {propias.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No pertenece a ninguna oficina</span>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {propias.map((m) => (
                            <div key={m.id} className="flex items-center gap-2">
                              <span className="flex-1 min-w-0 truncate text-xs">{oficinas.get(m.tribunal_id) ?? "Oficina"}</span>
                              <Select value={m.rol} onValueChange={(v) => cambiarRolMiembro(m, v as RolMiembroValor)} disabled={guardando === m.id}>
                                <SelectTrigger className="h-8 w-40 text-xs" aria-label={`Rol en ${oficinas.get(m.tribunal_id) ?? "la oficina"}`}><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {ROLES_MIEMBRO.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtrados.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-muted-foreground">No hay usuarios que coincidan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={!!cambioGlobal} onOpenChange={(o) => { if (!o) setCambioGlobal(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> Cambiar rol en el sistema
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cambioGlobal?.rol === "superadmin"
                ? `${cambioGlobal?.usuario.nombre || cambioGlobal?.usuario.email} va a poder ver y administrar todas las oficinas del sistema.`
                : cambioGlobal?.usuario.id === user?.id
                  ? "Vas a dejar de ser superadmin y perderás el acceso a este panel."
                  : `${cambioGlobal?.usuario.nombre || cambioGlobal?.usuario.email} deja de ser superadmin.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={aplicarCambioGlobal}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
