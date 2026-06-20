# Fix de procesar-migracion-job: Gemini + logging robusto

## Contexto del bug

`procesar-migracion-job/index.ts` tiene su propia función `callAnthropic` interna (líneas 95-119) que sigue usando Claude/Anthropic. No fue migrada cuando se migró `procesar-migracion`. Además, si `procesarLote()` lanza una excepción no controlada (timeout abrupto, OOM, error de red al actualizar la DB, etc.), el `try/catch` exterior la captura pero marca el job entero como `error` y corta todo el procesamiento — sin loguear stack, sin continuar con los lotes restantes.

## Cambios en `supabase/functions/procesar-migracion-job/index.ts`

### 1. Reemplazar `callAnthropic` por `callGemini`

Replicar exactamente el patrón ya implementado en `procesar-migracion`:

- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`
- Body: `contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + userMsg }] }]` con `generationConfig: { responseMimeType: "application/json", temperature: 0 }`.
- Timeout: **55s** (dentro del límite de 60s de la invocación) — antes era 180s, inviable en una Edge Function.
- Extraer texto desde `data.candidates[0].content.parts[0].text` y parsear con `extractJson`.
- Devolver el mismo shape `{ ok: true; json } | { ok: false; code; status?; detail? }` para no tocar el resto.

### 2. Acortar `SYSTEM_PROMPT`

Copiar el SYSTEM_PROMPT ya optimizado de `procesar-migracion` (sin ejemplos input→output, con las 8 reglas + esquema JSON + clasificación). Es el mismo que ya está corriendo en producción para el flujo síncrono.

### 3. Cambiar secret

Reemplazar `Deno.env.get("ANTHROPIC_API_KEY")` por `Deno.env.get("GEMINI_API_KEY")` y el mensaje de error `no_api_key`. `GEMINI_API_KEY` ya está configurado.

### 4. Ajustar constantes de timing

Con timeout de 55s por intento y 2 intentos por lote, un lote tarda máximo ~110s. Por lo tanto:

- `TIMEOUT_LOTE_MS = 55_000` (era 180_000)
- `MAX_RUN_MS = 200_000` (era 370_000) — margen para 1 lote + chaining, lejos del wall-clock límite
- `MAX_LOTES_PER_RUN = 1` (se mantiene; el chaining cubre el resto)

### 5. Logging detallado dentro de `callGemini`

Después del `fetch` a Gemini, loguear:

```ts
console.log("procesar-migracion-job:gemini_response", {
  job_id, nro_lote,
  status: res.status,
  body_preview: rawText.slice(0, 500),
});
```

(Pasar `job_id` y `nro_lote` como parámetros opcionales a `callGemini` para poder loguearlos.)

### 6. Try-catch robusto por lote en el loop

Envolver el cuerpo del `while` en su propio try-catch para que un crash de un lote NO mate la corrida entera:

```ts
while (pendientes.length > 0 && processedThisRun < MAX_LOTES_PER_RUN && (Date.now() - tStart) < MAX_RUN_MS) {
  const lote = pendientes[0];
  console.log("procesar-migracion-job:lote_start", { job_id: jobId, pestana: lote.pestana, nro_lote: lote.nro_lote, total_lotes: lote.total_lotes, filas: lote.filas });
  try {
    const r = await procesarLote(jobId, archivoMeta, lote);
    pendientes.shift();
    if (r.ok) {
      lotesProcesados++;
      // ...acumular resultado y filas_rojas...
    } else {
      lotesFallidos++;
      console.log("procesar-migracion-job:lote_error", { job_id: jobId, nro_lote: lote.nro_lote, error: r.error });
    }
  } catch (err) {
    // Crash inesperado dentro del lote: marcar como fallido y CONTINUAR
    pendientes.shift();
    lotesFallidos++;
    const e = err as Error;
    console.error("lote_crash", {
      job_id: jobId,
      nro_lote: lote.nro_lote,
      pestana: lote.pestana,
      error: e?.message ?? String(err),
      stack: e?.stack,
    });
  }
  processedThisRun++;
  // Persistir progreso (también en try-catch para que un fallo de DB no mate el loop)
  try {
    await admin.from("migraciones_jobs").update({ lotes_procesados, lotes_fallidos, lotes_pendientes: pendientes, resultados, filas_rojas: filasRojasAcum }).eq("id", jobId);
  } catch (dbErr) {
    console.error("procesar-migracion-job:db_update_error", { job_id: jobId, msg: (dbErr as Error)?.message, stack: (dbErr as Error)?.stack });
  }
}
```

El try-catch exterior existente se mantiene como red de seguridad final.

### 7. Borrar jobs trabados

Migración SQL para limpiar:

```sql
DELETE FROM public.migraciones_jobs WHERE estado IN ('procesando', 'pendiente');
```

## Lo que NO se toca

- `procesar-migracion/index.ts` (ya está en Gemini).
- `validarResponse()`, `extractJson()` — se mantienen idénticos.
- `src/lib/dividirEnLotes.ts` (TAMANO_LOTE queda en 8).
- Frontend (`WizardMigracion`, polling, hooks).
- `normalizarCausa.ts`, Google Calendar sync, `cargarEnBD`.
- Estructura del chaining (fire-and-forget con service-role).

## Verificación posterior

Después del deploy, mirar `supabase--edge_function_logs` de `procesar-migracion-job` durante una migración real para confirmar que aparecen los `gemini_response` con status 200 y que, ante cualquier error, se loguea `lote_crash` con stack en vez de `Shutdown` silencioso.
