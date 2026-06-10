## Causa raíz

En `VocaliaWorkspace.tsx` el `<main>` es `flex flex-col h-screen`. Dentro tiene dos hijos que pelean por el espacio cuando `view === "migrar"`:

1. El `motion.div` del `<AnimatePresence>` (línea 361) con `className="flex flex-col flex-1 min-h-0"` — queda **vacío** cuando estamos en `migrar` (ninguna rama `view === "..."` matchea adentro), pero sigue ocupando `flex-1`.
2. El contenedor del wizard (línea 596) también con `flex-1 min-h-0 overflow-y-auto`.

Resultado: dos `flex-1` repartiendo el alto → el wizard arranca a mitad de pantalla, y el `scrollTop = 0` ya está en el tope (no hay scroll que mover). Por eso el contenido se ve "centrado abajo" aunque el scroll esté arriba de todo.

## Fix

En `src/components/VocaliaWorkspace.tsx`:

- Cuando `view === "migrar"`, no renderizar el `motion.div` del `AnimatePresence` (o renderizarlo con `className="hidden"` para preservar transiciones). Así el contenedor del wizard ocupa todo el alto y su contenido (`pt-8` del PASO 1) queda arriba.
- Quitar el `ref` callback de reset de scroll: deja de ser necesario (al no haber espacio sobrante el contenido ya arranca arriba). Si se prefiere conservarlo por seguridad, dejarlo intacto — no molesta.

No tocar `WizardMigracion.tsx` ni nada más: el PASO 1 ya tiene el padding correcto.

## Verificación

Abrir "Migrar causas" → el bloque "Bienvenido a la migración asistida" debe quedar justo debajo del header de la página, sin franja vacía arriba.