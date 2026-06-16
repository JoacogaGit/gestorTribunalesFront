import { useState } from "react";
import { User, LogOut, UserCircle2, Mail, Settings, DoorOpen } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  email: string;
  name: string;
  onLogout: () => void;
  onUpdateProfile?: (data: { name: string; email: string }) => void;
  /** Si está presente, muestra "Abandonar tribunal" en el menú. Lo dispara cualquier miembro (admin o no). */
  onAbandonarTribunal?: () => void;
}

export default function UserMenu({ email, name, onLogout, onUpdateProfile, onAbandonarTribunal }: Props) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftEmail, setDraftEmail] = useState(email);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "U";

  const saveProfile = () => {
    onUpdateProfile?.({ name: draftName, email: draftEmail });
    toast.success("Perfil actualizado");
    setProfileOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="group flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-muted/60 transition-colors">
          <div className="relative w-9 h-9 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center text-xs font-semibold shadow-soft ring-2 ring-transparent group-hover:ring-gold/50 transition-all">
            {initials}
          </div>
          <div className="hidden md:flex flex-col items-start leading-tight pr-2">
            <span className="text-xs font-semibold text-foreground">{name}</span>
            <span className="text-[10px] text-muted-foreground">{email}</span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm">{name}</span>
            <span className="text-[11px] text-muted-foreground font-normal">{email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => { setDraftName(name); setDraftEmail(email); setProfileOpen(true); }} className="gap-2">
            <UserCircle2 className="w-4 h-4" /> Mi perfil
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => toast.info("Próximamente")} className="gap-2">
            <Settings className="w-4 h-4" /> Preferencias
          </DropdownMenuItem>
          {onAbandonarTribunal && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onAbandonarTribunal} className="gap-2">
                <DoorOpen className="w-4 h-4" /> Abandonar tribunal
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onLogout} className="gap-2 text-alert-urgent focus:text-alert-urgent">
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <User className="w-5 h-5" /> Mi perfil
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center text-lg font-semibold">
                {initials}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{draftName}</p>
                <p className="text-xs text-muted-foreground">{draftEmail}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Nombre</Label>
              <Input id="profile-name" value={draftName} onChange={(e) => setDraftName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="profile-email" type="email" value={draftEmail} onChange={(e) => setDraftEmail(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setProfileOpen(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={saveProfile}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={gcalOpen} onOpenChange={setGcalOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <User className="w-5 h-5" /> Configuración
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <GoogleCalendarSection />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
