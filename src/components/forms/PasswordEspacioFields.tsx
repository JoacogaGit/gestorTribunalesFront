import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function PasswordEspacioFields({ enabled, password, onEnabledChange, onPasswordChange, disabled = false }: {
  enabled: boolean;
  password: string;
  onEnabledChange: (value: boolean) => void;
  onPasswordChange: (value: string) => void;
  disabled?: boolean;
}) {
  return <div className="space-y-3">
    <Label className="flex items-center justify-between gap-3">
      ¿Querés ponerle contraseña al espacio?
      <Switch checked={enabled} onCheckedChange={onEnabledChange} disabled={disabled} />
    </Label>
    <p className="text-sm text-muted-foreground">Quienes no sean administradores necesitarán la contraseña para unirse al espacio y para entrar. Después podés cambiarla o quitarla desde el ícono de llave.</p>
    {enabled && <Label className="block space-y-1.5">
      <span>Contraseña del nuevo espacio</span>
      <Input type="password" autoComplete="new-password" value={password} onChange={(e) => onPasswordChange(e.target.value)} disabled={disabled} required maxLength={200} />
    </Label>}
  </div>;
}