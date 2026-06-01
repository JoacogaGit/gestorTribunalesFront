# Plan: Mejoras mínimas al sistema de migración por IA

Cinco cambios acotados, sin tocar la arquitectura (sin Edge Functions nuevas, sin reescribir lotes, sin modificar el SYSTEM_PROMPT ni `migracion_pendientes`).

## Cambio 0 — Centrar verticalmente la pantalla de bienvenida
**Archivo:** `src/components/WizardMigracion.tsx` (PASO 1 de subida).
- Reemplazar el contenedor `<div className="px-4 py-6">` por uno con `min-h-[calc(100vh-12rem)] flex flex-col justify-center`, manteniendo `max-w-2xl mx-auto` y el centrado horizontal.
- Reducir `mb-8` del header a `mb-6` para que entren cómodos header + chips + drop zone + cómo-funciona sin scroll en 1080px.

## Cambio 1 — Verificación anti-duplicado en `cargarEnBD`
**Archivo:** `src/hooks/useMigracion.ts`.
1. Antes del loop, una única query a `causas` filtrando por `vocalia_id` y `borrado_en is null`, trayendo `expediente_nro, caratula`.
2. Construir `Set` de claves normalizadas `${trim+lowercase(expediente_nro)}||${trim+lowercase(caratula||"")}`.
3. Por cada `CausaIA`: si la clave está → pushear a `omitidas[]` y `continue`; si no → insertar (igual que hoy) y agregar la clave al set para evitar duplicados intra-batch.
4. Tipo de retorno OK pasa a incluir `omitidas: { expediente_nro, caratula|null }[]`.

**Archivo:** `src/components/WizardMigracion.tsx` (`handleCargar` + PASO 4 éxito):
- Guardar `omitidas` en estado y mostrarlas en la card de éxito: "Se cargaron X causas nuevas. Se omitieron Y porque ya existían en {vocalía}." con lista colapsable (nº + carátula).

## Cambio 2 — Aviso obligatorio antes de iniciar la migración
**Archivo:** `src/components/WizardMigracion.tsx`.
- Nuevo estado `confirmacionPendiente: { archivo, lotes } | null`.
- `handleFile` (caso 1 pestaña) y `handleProcesarSeleccion` setean `confirmacionPendiente` en lugar de llamar a `ejecutarLotes` directo.
- Nueva pantalla intermedia con ícono `AlertTriangle`, los 4 bullets pedidos, checkbox "Entendido" y botón "Comenzar migración" deshabilitado hasta marcar el checkbox. Botón secundario "Cancelar" → `handleDescartar`.
- Al confirmar → `ejecutarLotes(archivo, lotes)` y limpiar el estado.
- No se muestra al retomar (`handleRetomar` ya no procesa lotes).

## Cambio 3 — Barra de progreso global persistente
- Extender `MigracionStatus` con un campo derivado para mostrar lote actual (ya tiene `totalLotes`, `lotesOk`, `lotesError`).
- **Nuevo:** `src/components/migracion/MigracionFloatingBanner.tsx` — banner fijo arriba con `<Progress />`, texto "Procesando lote X de Y. **NO cierres esta pestaña.**" y botón "Ver migración".
- **`src/components/VocaliaWorkspace.tsx`:** renderizar el banner cuando `migracionStatus?.procesando && view !== "migrar"`, con `onVerMigracion={() => setView("migrar")}`.
- **`src/components/migracion/ProgresoLotes.tsx`:** reforzar el copy del aviso a "NO cierres esta pestaña hasta que termine".

## Cambio 4 — Detección de pestaña en background (warning a consola)
**Archivo:** `src/components/WizardMigracion.tsx`.
- `useEffect` activo cuando `procesando === true`: listener `visibilitychange` que, si `document.hidden`, dispara `setTimeout` de 30 s con `console.warn(...)`. Se cancela al volver a visible o al terminar. Sin UI, sin abortar nada.

## Archivos tocados
```
src/hooks/useMigracion.ts                              (cargarEnBD + tipo retorno)
src/components/WizardMigracion.tsx                     (centrado, confirmación, omitidas, visibility)
src/components/migracion/ProgresoLotes.tsx             (copy)
src/components/migracion/MigracionFloatingBanner.tsx   (NUEVO)
src/components/VocaliaWorkspace.tsx                    (render banner global)
```

Sin cambios de BD, sin tocar la edge function `procesar-migracion`, sin tocar `migracion_pendientes`, sin tocar clasificación verde/amarillo/rojo, sin tocar el resume desde localStorage.

## Ya implementado (no se rehace)
- Resume desde `localStorage` (`pendingResume` en `WizardMigracion`).
- Plumbing de `MigracionStatus` hacia `VocaliaWorkspace` (solo falta consumirlo).
- Barra de progreso interna del wizard (`ProgresoLotes`).
