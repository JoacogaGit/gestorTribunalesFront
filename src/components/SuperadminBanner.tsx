import { AlertTriangle, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSuperadminMode } from "@/context/SuperadminModeContext";
import { useVocaliaActual } from "@/context/VocaliaContext";

/**
 * Banner persistente que indica que el usuario está operando en modo superadmin
 * sobre un tribunal ajeno. Se muestra en todas las pantallas mientras el modo esté activo.
 */
export default function SuperadminBanner() {
  const { mode, exit } = useSuperadminMode();
  const { clearVocalia } = useVocaliaActual();
  const navigate = useNavigate();

  if (!mode) return null;

  const handleExit = () => {
    clearVocalia();
    exit();
    navigate("/superadmin", { replace: true });
  };

  return (
    <div className="sticky top-0 z-[60] w-full bg-amber-400 text-amber-950 border-b border-amber-600/50 shadow-md">
      <div className="max-w-[1400px] mx-auto px-4 py-2 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <p className="text-xs md:text-sm font-medium flex-1 leading-tight">
          <span className="font-semibold">Modo Superadmin:</span> estás viendo el tribunal{" "}
          <span className="font-bold">{mode.tribunalNombre}</span> como superadmin. Cualquier acción
          que hagas quedará registrada como tuya.
        </p>
        <button
          onClick={handleExit}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-950 text-amber-50 hover:bg-amber-900 transition-colors text-xs font-semibold"
        >
          <LogOut className="w-3.5 h-3.5" />
          Salir del modo superadmin
        </button>
      </div>
    </div>
  );
}
