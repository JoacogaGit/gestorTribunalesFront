## Refactor: Migración server-side con jobs persistentes

### Objetivo
Mover el procesamiento de lotes de migración del navegador a una Edge Function que corre server-side, persistiendo estado en `migraciones_jobs`. El usuario podrá cerrar la pestaña y la migración continúa.

---

### 1. Base de datos (migración)

Crear tabla `migraciones_jobs`:
- `id`, `vocalia_id` (FK vocalias), `usuario_id` (FK auth.users)
- `archivo_nombre`, `estado` (pendiente|procesando|revision|completado|error)
- `total_lotes`, `lotes_procesados`, `lotes_fallidos`
- `resultados` JSONB (acumulado por lote), `filas_rojas` JSONB
- `error_mensaje`, `created_at`, `updated_at`
- Índice `(vocalia_id, usuario_id, estado)`

RLS:
- SELECT/INSERT/UPDATE: `usuario_id = auth.uid()` o `es_superadmin()`
- DELETE: solo dueño
- GRANTs estándar a `authenticated` y `service_role`

Trigger `updated_at`.

### 2. Edge Function `procesar-migracion-job`

Recibe: `{ job_id }` (los lotes ya están en `migraciones_jobs.resultados._pending` o en una columna separada).

**Decisión:** agregar columna `lotes_pendientes JSONB` para guardar los lotes a procesar (array de `{pestana, contenido, nro_lote, total_lotes, filas}`), y `archivo_meta JSONB` con `{tipo, nombre}`.

Flujo:
1. Marcar `estado='procesando'`
2. Bucle por lotes pendientes (en orden). Por cada lote:
   - Llamar internamente a la lógica de `procesar-migracion` (un lote) — reutilizar el mismo módulo o invocar la función con `supabase.functions.invoke`.
   - 1 reintento si falla validación. Si sigue, `lotes_fallidos++`.
   - `lotes_procesados++` y push resultado a `resultados`.
   - Marcar lote como hecho dentro de `lotes_pendientes` (o ir consumiéndolos).
3. Chaining: cada N=8 lotes (o si quedan <60s de timeout), self-invoke con `fetch` al mismo endpoint usando el service role key, y retornar.
4. Al terminar sin pendientes: `estado='revision'`.
5. Si hay throw global: `estado='error'`, `error_mensaje`.

Auth: `verify_jwt = true` para la invocación inicial; el self-invoke usa service role.

### 3. Frontend `WizardMigracion`

PASO 1 (subir archivo) — sin cambios: parseo y `construirLotes` en cliente.

PASO 2 (procesamiento) — reescrito:
- Al confirmar: `INSERT` en `migraciones_jobs` con los lotes en `lotes_pendientes`, estado `pendiente`.
- `supabase.functions.invoke('procesar-migracion-job', { body: { job_id } })` — fire-and-forget (no esperamos la respuesta).
- Polling cada 3s a `migraciones_jobs` (filtrado por `id`).
- Mostrar progreso `lotes_procesados / total_lotes`. Banner flotante existente sigue funcionando.
- Cuando `estado='revision'`: hidratar `resultadosOk` desde `resultados` y pasar a PASO 3.
- Cuando `estado='error'`: mostrar error + opción de retomar / descartar.

Eliminar `ejecutarLotes` / `procesarUnLote` del cliente (mantener `procesarUnLote` en el hook por compat, pero el wizard no lo usa).

PASO 3 (revisión) — sin cambios funcionales, los datos vienen del job.

PASO 4 (cargar BD) — sin cambios; al terminar `cargarEnBD`, hacer `UPDATE estado='completado'` en el job.

### 4. Detección de jobs en curso

En `WizardMigracion` al montar (y al cambiar de vocalía):
- Query `migraciones_jobs WHERE usuario_id=auth.uid() AND vocalia_id=actual AND estado IN ('pendiente','procesando','revision') ORDER BY created_at DESC LIMIT 1`.
- Si existe:
  - `procesando|pendiente` → mostrar UI de progreso (polling).
  - `revision` → saltar a PASO 3 con `resultados` hidratados.
- Bloquear "Subir archivo nuevo" hasta que el job actual se complete/descarte.
- Botón "Descartar job" → UPDATE estado='error' con razón "cancelado por usuario" (o DELETE).

### 5. Limpieza localStorage

- Mantener `lsKey` como fallback de lectura (para jobs viejos sin migrar), pero al iniciar uno nuevo no escribir.
- Priorizar DB.

### Lo que NO cambia
- `supabase/functions/procesar-migracion/index.ts` (un lote) — se reutiliza.
- `SYSTEM_PROMPT` IA.
- `cargarEnBD` en cliente.
- `ErrorBoundary`, Google Calendar, parseo de archivo, división en lotes.

### Detalles técnicos
- Self-invoke usa `fetch(SUPABASE_URL + '/functions/v1/procesar-migracion-job', { headers: { Authorization: 'Bearer ' + SERVICE_ROLE } })` sin `await` antes de `return` para no bloquear el timeout (`EdgeRuntime.waitUntil` no aplica aquí; usamos fetch + return inmediato).
- Para invocar `procesar-migracion` desde dentro de `procesar-migracion-job`, usamos `supabase.functions.invoke` con service role para no perder tiempo en re-importar lógica.
- `lotes_pendientes` se actualiza tras cada lote para que un re-arranque (chaining) sepa qué falta.
