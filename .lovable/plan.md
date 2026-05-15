
# Plan

## TAREA 1 — Anotaciones y eventos en el panel de causa

### 1.1 Hook nuevo: `src/hooks/useEventosCausa.ts`
- Recibe `causaId` (puede ser `null`).
- Query a `eventos` filtrando por `causa_id`, seleccionando todos los campos.
- Devuelve `{ eventos, loading, error, refetch }`.
- Separa internamente en `conFecha` (fecha_hora ≠ null, asc) y `sinFecha` (fecha_hora null, ordenado por created_at desc) — o devuelve crudo y la UI separa.

### 1.2 Hook nuevo: `src/hooks/useEventoMutations.ts`
- `crearEvento({ causa_id, titulo, descripcion, tipo_evento, fecha_hora })`
- `actualizarEvento(id, patch)`
- `borrarEvento(id)`
- Cada operación devuelve `{ ok, error? }` y maneja `saving` interno.
- Si se carga `fecha`, se persiste como `YYYY-MM-DDT00:00:00` (TIMESTAMPTZ); si no, `null`.

### 1.3 Componente nuevo: `src/components/forms/EventoFormInline.tsx`
- Sub-formulario (sección expandible inline dentro del dialog, NO modal anidado).
- Campos: Título (required), Tipo de evento (text libre, opcional, sin dropdown), Fecha (input `type="date"`, opcional, vaciable), Descripción (textarea opcional).
- Props: `mode` ("crear"|"editar"), `initialValue`, `onSubmit`, `onCancel`, `saving`.

### 1.4 Componente nuevo: `src/components/forms/AnotacionesSection.tsx`
- Se monta dentro de `CausaFormDialog` solo en `mode === "editar"` y con `causaId` válido.
- Header: título "Anotaciones y eventos" + botón "+ Agregar anotación" que toggleya `EventoFormInline` en modo crear.
- Bloque A — "Eventos con fecha":
  - Lista ordenada asc por `fecha_hora`.
  - Cada item: título, badge con `tipo_evento` (si existe), fecha `DD/MM/AAAA` con clases del semáforo (`getSemaforoBg` + `getSemaforoText` de `eventoMapper`), descripción si tiene.
  - Acciones: lápiz (abre `EventoFormInline` en editar inline reemplazando el item), basura (abre `AlertDialog` de confirmación).
  - Empty: texto sutil gris "Sin eventos con fecha".
- Bloque B — "Anotaciones sin fecha":
  - Lista ordenada por `created_at` desc.
  - Cada item: título, badge tipo, descripción, `created_at` chico.
  - Mismas acciones; empty: "Sin anotaciones sueltas".
- Tras mutación exitosa: `toast.success`, refetch local + invocar `onMutated` que llega del padre.

### 1.5 Integración en `CausaFormDialog.tsx`
- Importar `AnotacionesSection`.
- Agregar nueva `<section>` después de Imputados y antes del bloque de error/acciones, condicionada a `mode === "editar" && causaId`.
- Pasarle `causaId` y un callback `onMutated` que invoque el `onMutated` del dialog (el padre ya invalida el listado de causas; el calendario se sincroniza por re-mount o refetch propio — ver 1.6).

### 1.6 Sincronización con calendario y dashboard
- El calendario (`useCalendarioEventos`) y el dashboard KPI (`useDashboardKpis`) se montan en otra vista y refetchean al cambiar de tab. Para que reflejen al instante mientras el usuario sigue en el mismo render:
  - Crear `src/lib/eventosBus.ts` minúsculo: un `EventTarget` global `eventosBus` con helpers `emitEventosChanged()` y `useEventosChanged(cb)` (hook que suscribe en `useEffect`).
  - `useEventoMutations` emite `eventosChanged` tras cada operación exitosa.
  - `useCalendarioEventos` y `useDashboardKpis` se suscriben y llaman a su `refetch` interno.
- Esto evita acoplar el form con esos hooks y mantiene el patrón existente.

### 1.7 Filtro de calendario respetado
- Las anotaciones con fecha entran como tipo `"evento"` (mapper actual) → ya son alcanzadas por el toggle "Eventos manuales" de `CalendarioAlertas`. Sin cambios adicionales.
- Las sin fecha son excluidas naturalmente por el filtro `not("fecha_hora", "is", null)` del hook del calendario.

---

## TAREA 2 — Botón de refresh en listas

### 2.1 Componente nuevo: `src/components/RefreshButton.tsx`
- Props: `onRefresh: () => void | Promise<void>`, `loading?: boolean`, `className?`.
- Render: `Button` ghost icon-only con `RefreshCw` de lucide.
- Mientras `loading` (interno o externo) → `disabled` + clase `animate-spin` en el icono.
- Tooltip "Actualizar lista" usando `Tooltip`/`TooltipContent` de shadcn.

### 2.2 Integraciones
- **`VocaliaWorkspace.tsx`**:
  - Cada bloque `RemoteListSection` ya recibe `onRetry`. Agregar el `RefreshButton` en el header del workspace (al lado de `ThemeToggle`) que dispare el `refetch` de la vista activa (mapa `view → refetch`). Alternativa: inyectarlo dentro de cada `CausasTable`/`DetenidosList` header — preferimos centralizarlo en el header del workspace porque ya conoce qué hook está activo.
  - Para el dashboard, refetchear KPIs + lista (`dashboardKpis.refetch()` + `dashCausasRemote.refetch()`).
  - Para calendario, llamar `useCalendarioEventos.refetch` (necesita exponerlo via prop o ref). Solución simple: pasar a `CalendarioAlertas` un `headerExtra` o que `CalendarioAlertas` reciba un `registerRefetch` callback al mount.
- **`CalendarioAlertas.tsx`**: agregar `RefreshButton` al lado del input de búsqueda en el header derecho.
- **`VocaliaSelector.tsx`**: agregar `RefreshButton` arriba a la derecha del grid (al lado del botón "Volver al inicio de sesión") que dispara `refetch` del hook `useVocalias`.

### 2.3 Estado de loading
- `RefreshButton` muestra spin si el hook está `loading`. Para no parpadear con el `loading` inicial vs. refetch, exponer `refetching` opcional o derivarlo del propio `loading` cuando hay datos previos.

---

## Detalle técnico — formato de fecha

- Input HTML `type="date"` devuelve `YYYY-MM-DD`. Para guardar en TIMESTAMPTZ usamos `new Date(\`${value}T00:00:00\`).toISOString()` (hora local del navegador → UTC). Para mostrar usamos `new Date(fecha_hora).toLocaleDateString("es-AR")`. Coherente con el resto de la app.

## Archivos a crear

- `src/hooks/useEventosCausa.ts`
- `src/hooks/useEventoMutations.ts`
- `src/lib/eventosBus.ts`
- `src/components/forms/EventoFormInline.tsx`
- `src/components/forms/AnotacionesSection.tsx`
- `src/components/RefreshButton.tsx`

## Archivos a editar

- `src/components/forms/CausaFormDialog.tsx` — montar `AnotacionesSection` en modo editar.
- `src/components/VocaliaWorkspace.tsx` — `RefreshButton` en header + cableado de refetch por vista.
- `src/components/CalendarioAlertas.tsx` — `RefreshButton` + suscripción al bus.
- `src/components/VocaliaSelector.tsx` — `RefreshButton`.
- `src/hooks/useCalendarioEventos.ts` y `src/hooks/useDashboardKpis.ts` — suscribirse a `eventosBus` para refetch automático.

## Reglas respetadas

- No tocar auth, RLS ni esquema.
- Patrón hook + (ya existente) eventoMapper reutilizado para semáforo.
- Toda mutación → toast + refetch local + emit bus.
- Anotaciones sin fecha invisibles para el calendario por construcción.
- Anotaciones con fecha respetan el toggle "Eventos manuales".
