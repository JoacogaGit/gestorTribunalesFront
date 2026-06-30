import { useState } from "react";
import { ChevronDown, ChevronRight, Smartphone } from "lucide-react";

export default function PushInstrucciones() {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-left w-full font-medium hover:text-foreground text-muted-foreground"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <Smartphone className="w-3.5 h-3.5" />
        ¿Cómo recibir notificaciones en el celular?
      </button>
      {open && (
        <div className="mt-2 space-y-2 pl-5 text-muted-foreground">
          <div>
            <div className="font-semibold text-foreground">Android (Chrome)</div>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Abrí el menú (⋮) arriba a la derecha.</li>
              <li>Tocá "Agregar a pantalla de inicio" o "Instalar app".</li>
              <li>Confirmá. Abrí IusTrack desde el ícono y activá la campana.</li>
            </ol>
          </div>
          <div>
            <div className="font-semibold text-foreground">iPhone (Safari, iOS 16.4+)</div>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Tocá el botón compartir (↑) en la barra inferior.</li>
              <li>Elegí "Agregar a pantalla de inicio".</li>
              <li>Abrí IusTrack desde el ícono y activá la campana.</li>
            </ol>
          </div>
          <p className="italic">En iPhone las notificaciones push sólo funcionan abriendo la app desde el ícono agregado.</p>
        </div>
      )}
    </div>
  );
}
