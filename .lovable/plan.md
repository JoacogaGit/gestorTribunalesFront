# Migración por pestañas (fix WORKER_RESOURCE_LIMIT)

## Objetivo
Evitar que la edge function `procesar-migracion` se quede sin recursos cuando el Excel tiene muchas filas o muchas pestañas. La solución es invocarla **una vez por pestaña** desde el frontend y deduplicar los resultados localmente.

## Nuevo flujo del wizard

```
[1 Subida] → [2 Selección de pestañas*] → [3 Procesamiento pestaña x pestaña] → [4 Revisión] → [5 Éxito]
                       *se saltea si hay 1 sola pestaña
```

## Cambios

### A) Edge function `supabase/functions/procesar-migracion/index.ts`
- El payload pasa a aceptar **una sola pestaña** además del archivo: nuevo campo opcional `pestana` (`{ nombre, contenido }`) que tiene prioridad sobre `archivo.pestanas`.
- Si viene `pestana`, se arma un `ArchivoParseado` con esa única pestaña antes de enviar a Claude.
- Se ajusta el `userMsg` para avisar a Claude que está procesando una pestaña específica (`Procesando pestaña "<nombre>" del archivo <nombreArchivo> (tipo <tipo>).`).
- Sin cambios en el system prompt ni en la validación de membresía.
- Mantener compatibilidad hacia atrás: si no viene `pestana`, sigue funcionando como hoy.

### B) Hook `src/hooks/useMigracion.ts`
- Nueva función `procesarPorPestanas(vocaliaId, vocaliaNombre, archivo, opciones)` que:
  - Recibe la lista de pestañas seleccionadas (nombres) y un callback `onProgress(pestana, indice, total, estado: "procesando" | "ok" | "error")`.
  - Itera **secuencialmente** llamando a la edge function una vez por pestaña con el payload reducido.
  - Acumula `ResultadoIADirecto[]` por pestaña exitosa y `{ pestana, error }[]` por las fallidas.
  - No corta el bucle si una pestaña falla.
  - Devuelve `{ resultadosPorPestana, fallidas }`.
- Nueva función `reintentarPestanas(...)` (alias del mismo método con subset) para reintentos puntuales.
- `procesar` original se mantiene para el caso "archivo de una sola pestaña / mapeo asistido".

### C) Helper nuevo `src/lib/deduplicarCausas.ts`
- Función `deduplicarCausas(resultados: { pestana: string; resultado: ResultadoIADirecto }[]) : ResultadoIADirecto`.
- Reglas:
  - Clave de merge: `expediente_nro` normalizado (trim + lower; si está vacío, no se mergea).
  - **Jerarquía `estado_causa`**: `terminada` > `recurso` > `tramite`.
  - **Jerarquía `situacion_libertad` (a nivel sujeto)**: `condenado` > `detenido` > `rebelde` > `probation` > `libre`.
  - Match de sujetos dentro de una causa por `nombre_completo` normalizado; se fusionan campos.
  - Para cada campo escalar: gana el valor no nulo; si ambos tienen valor distinto, gana el del registro con **más campos completos** (mayor cantidad de propiedades no nulas).
  - `observaciones`: se concatenan con separador ` | ` quitando duplicados exactos.
  - Eventos: dedupe por `(titulo + fecha_hora)`; los distintos se mantienen.
  - `origen_pestanas`: array con los nombres de las pestañas que aportaron a esa causa.
  - `confianza`: se recalcula al peor color presente entre las fuentes (rojo > amarillo > verde).
- Recalcula `resumen` y concatena `filas_rojas` y `pestanas_procesadas`.

### D) `src/components/WizardMigracion.tsx`
- Nuevos estados:
  - `pestanasDetectadas: { nombre: string; filas: number }[]`
  - `seleccionPestanas: Record<string, boolean>` (todas en true por defecto)
  - `progreso: { pestana: string; estado: "pendiente" | "procesando" | "ok" | "error"; error?: string }[]`
  - `pestanasFallidas: string[]`
- **Paso 1 (subida)**: tras `parseMigracionFile`, si hay >1 pestaña → ir a **Paso 2 (selección)**. Si hay 1 sola, llamar directo a `procesarPorPestanas` con esa única pestaña.
- **Paso 2 (selección de pestañas)**: pantalla nueva, listado con checkboxes (nombre + nº de filas), botones "Seleccionar todas / ninguna" y "Procesar pestañas seleccionadas".
- **Paso 3 (procesamiento)**: lista visual con íconos por pestaña (`Loader2` / `CheckCircle2` / `XCircle`), texto "Procesando 'X' (n de N)…". Al finalizar:
  - Si hay resultados OK → ejecutar `deduplicarCausas` y pasar a **Paso 4 (revisión)** ya existente.
  - Si hay fallidas → mostrar banner con botón "Reintentar pestañas fallidas" (vuelve a llamar a `procesarPorPestanas` solo con ese subset y mergea con los previos).
- **Paso 4 (revisión)**: igual que hoy; muestra `origen_pestanas` como badges adicionales en cada causa cuando vienen de >1 pestaña.
- Si la respuesta de alguna pestaña es `mapeo_asistido_requerido`, se trata esa pestaña como fallida con mensaje explicativo (no soportamos mapeo asistido por pestaña en esta iteración).

### E) Casos borde
- DOCX / TXT / CSV: tienen 1 sola pestaña → saltean el paso de selección, mismo comportamiento de hoy pero pasando por el nuevo flujo (una sola llamada).
- Pestañas vacías (0 filas no vacías): se filtran del listado y no se mandan.
- Si todas las pestañas fallan: mostrar error global con botón "Reintentar todo".

## Archivos tocados
- `supabase/functions/procesar-migracion/index.ts` — aceptar `pestana` y ajustar `userMsg`.
- `src/hooks/useMigracion.ts` — `procesarPorPestanas`, `reintentarPestanas`.
- `src/lib/deduplicarCausas.ts` — **nuevo**.
- `src/components/WizardMigracion.tsx` — pasos 2 y 3 nuevos, integración con dedupe y reintentos.

## Fuera de alcance
- Streaming / `EdgeRuntime.waitUntil`.
- Procesamiento paralelo (a propósito, secuencial).
- Mapeo asistido por pestaña (queda como mejora futura).
