# Plan: 8 mejoras

## 1) Bienvenida de migración + banner de filas rojas
- En `WizardMigracion.tsx`, reescribir el bloque inicial (cuando no hay archivo cargado): título cálido ("Migrá tus causas a JusTrack"), pasos numerados (1. Subí planilla → 2. La IA procesa → 3. Revisás y corregís → 4. Cargás a la base), badges con formatos aceptados (.xlsx, .xls, .csv, .docx, .txt).
- Tras `exito` con `resultado.filas_rojas.length > 0` (o `pendientes` en DB > 0), mostrar banner amarillo/naranja muy visible (bg-orange-500/20 + border-l-4 orange-500, icono triangle) con texto y botón "Ver pendientes" que hace `scrollIntoView` al bloque `PendientesRevision` (ref nuevo).

## 2) Nueva escala de semáforo
- En `src/lib/eventoMapper.ts`, reemplazar `getSemaforoBucket` + helpers por 6 buckets:
  - ≤4d (incluye vencidos): bg-red-600 text-white (rojo potente)
  - 5–10d: bg-red-400
  - 11–20d: bg-orange-500 text-white
  - 21–30d: bg-orange-300
  - 31–60d: bg-yellow-400
  - 60+d: bg-green-500
- Mantener API (`getSemaforoBg`, `getSemaforoDot`, `getSemaforoText`) para no romper llamadas. Aplica automáticamente en calendario, dashboard y columnas de listas.

## 3) Modal de visualización de evento + eventos pasados legibles
- Nuevo componente `src/components/EventoDetailDialog.tsx`: muestra título, descripción completa (no truncada), fecha/hora, tipo, causa (link → "Ir a la causa"), botones Editar / Borrar / Ir a la causa. Editar abre `EventoFormInline` en modo edición (reutilizar); borrar usa `useEventoMutations`.
- `CalendarioAlertas.tsx`:
  - Reemplazar `onOpenCausa` por `onOpenEvento`; clic en evento abre el modal en vez de saltar a la causa.
  - Eventos pasados: quitar `line-through` del título, quitar `truncate` de la descripción (o reemplazar por `line-clamp-2` con expand), mantener opacidad menor + chip "PASADO" con ícono Clock en gris.
  - Para alertas (PP/Pena/Prescripción) sin evento real, el modal usa los datos de sujeto y solo ofrece "Ir a la causa".
- `VocaliaWorkspace.tsx`: cablear el nuevo handler.

## 4) Campo `link_externo` en causas
- **SQL para correr manualmente** (no se ejecuta desde acá):
  ```sql
  ALTER TABLE causas ADD COLUMN IF NOT EXISTS link_externo TEXT;
  ```
- Regenerar tipos tras correrlo. Actualizar:
  - `causaMapper.ts` (DbCausa + dbCausaToUI) y `mockCausas.ts` (`linkExterno?: string`).
  - `useCausaMutations.ts`: incluir `link_externo` en `CausaInput` e insert/update.
  - `CausaFormDialog.tsx`: input "Link externo (Lex100, expediente digital, etc.)" con placeholder `https://...` y validación básica de URL.
  - `CausasTable.tsx` + `DetenidosList.tsx`: ícono `ExternalLink` junto al número de causa si hay link; `onClick` con `stopPropagation` y `window.open(link, '_blank', 'noopener')`.
  - `CausaDetail` / panel: mostrar link clickeable.

## 5) Botón "Guardar cambios" arriba sticky
- En `CausaFormDialog.tsx`, agregar header sticky (`sticky top-0 z-10 bg-background border-b`) dentro del `DialogContent` con título + botón "Guardar cambios" (mismo handler que el de abajo, mismo estado `loading`).

## 6) Nuevo imputado primero
- En `CausaFormDialog.tsx`: al agregar sujeto, `setSujetos(prev => [nuevo, ...prev])`.
- En consultas que traen sujetos (causaMapper / hooks `useCausasPorEstado`, `useCausasDashboard`, `useDetenidos`, etc.): ordenar `sujetos` por `created_at desc` (vía `.order('created_at', { ascending: false, foreignTable: 'sujetos' })` o sort en cliente dentro del mapper).

## 7) Orden por defecto `created_at DESC` en todas las listas
- Revisar y unificar en: `useCausasPorEstado.ts`, `useCausasSearch.ts`, `useCausasDashboard.ts`, `useDetenidos.ts`, `useCausasConSujetoEn.ts`. Cambiar `.order('expediente_nro')` (o lo que haya) por `.order('created_at', { ascending: false })`.
- En `CausasTable.tsx` y `DetenidosList.tsx`, el sort por click de columna sigue funcionando arriba del orden base; default visual = "más reciente primero" y el contador `#` arranca en 1 para la más nueva.

## 8) Múltiples fechas de prescripción
La tabla `prescripciones` ya existe con RLS. Cambios de código:

A) **Hook nuevo** `src/hooks/usePrescripciones.ts`: CRUD por `sujeto_id` (list, add, update, delete). Y `src/lib/prescripcionMapper.ts` para shape UI.

B) **CausaFormDialog**: dentro de cada sujeto, sección "Fechas de prescripción" con filas `{fecha, descripcion}` + botón "+ Agregar fecha". Al guardar el sujeto: sincronizar (insert/update/delete) contra `prescripciones`. Fallback: si el sujeto tiene `prescripcion_fecha` y no tiene filas en `prescripciones`, mostrarla como primera entrada editable y al guardar migrarla a la tabla nueva (manteniendo el campo viejo intacto por compatibilidad).

C) **Listas (`CausasTable`, `DetenidosList`)**: columna Prescripción muestra la fecha más próxima; si hay ≥2, agregar badge `+N`. Click en el badge expande popover/tooltip con todas las fechas + descripciones. Requiere traer prescripciones en la query (join o fetch adicional vía nuevo hook agregado al `useCausasPorEstado`).

D) **Calendario** (`useCalendarioEventos.ts` + `eventoMapper.ts`):
   - Agregar query a `prescripciones` (join con `sujetos!inner` → `causas!inner` para filtrar por vocalía y estado activo).
   - Mapper que genera un `CalendarEvento` por fila con título `"Prescripción - <nombre> (<descripcion>)"`.
   - Seguir leyendo `sujetos.prescripcion_fecha` solo si NO hay registros en `prescripciones` para ese sujeto (evita duplicados).

E) **Migración IA** (`supabase/functions/procesar-migracion/index.ts` + `useMigracion.ts`):
   - Prompt: pedir `prescripciones: [{fecha, descripcion}]` por sujeto en lugar de string único; instrucción de separar múltiples fechas/delitos.
   - JSON schema: cambiar `prescripcion_fecha` → `prescripciones` array; mantener compatibilidad si la IA devuelve la forma vieja.
   - `useMigracion.cargarEnBD`: tras insertar cada sujeto, insertar bulk en `prescripciones` con su `sujeto_id`. Limpieza en rollback.
   - UI de revisión en `WizardMigracion`: mostrar las fechas como chips editables (mínimo: contador "N fechas de prescripción").

## Reglas globales
- Tokens semánticos siempre que sea posible. Donde el usuario pide hex literal de Tailwind (rojo/naranja/amarillo/verde del semáforo), usar esos colores tal cual.
- Mobile-friendly: sticky header del modal y modal de evento responsivos.
- No tocar otros schemas. Solo el `ALTER` del punto 4 va al usuario para correr manualmente.

## Notas técnicas
- Tipos: los cambios de tabla (`link_externo`) requieren regenerar `src/integrations/supabase/types.ts` después del ALTER. Mientras tanto se castea `as any` puntualmente.
- Orden de implementación sugerido: 2 (rápido, base visual) → 5 → 6 → 7 → 1 → 3 → 4 (espera SQL) → 8 (más grande).
