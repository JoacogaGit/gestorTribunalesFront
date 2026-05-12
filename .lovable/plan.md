## Objetivo

Conectar las pestañas restantes de listado a Supabase replicando el patrón hook + mapper que ya usamos en "Causas en Trámite". Eliminar todos los datos mock de esas pestañas y manejar loading / error / vacío de forma uniforme.

## Alcance

- **Sí toco**: las ramas `view === "detenidos" | "rebeldes" | "sjp" | "recursos" | "terminadas"` dentro de `VocaliaWorkspace.tsx`, hooks nuevos, y un pequeño retoque al mapper para mapear estado de causa.
- **No toco**: Dashboard, Calendario, pestaña Trámite (ya está), auth, RLS, schema, vocalía selector, mocks (los dejo para que Dashboard/Calendario sigan funcionando hasta que migremos esos también).

## Cambios

### 1. Refactor del mapper `src/lib/causaMapper.ts`

- Agregar mapeo del enum `estado_causa` → texto UI (`tramite` → "En trámite", `recurso` + `tipo_recurso` → "Casación" / "REX" / "Queja en Corte", `terminada` → "Terminada"). Hoy queda fijo en `"En trámite"`.
- Pasar `tipo_recurso` al `Causa` para que la tabla pueda mostrarlo si tiene una columna específica (si el tipo `Causa` no lo tiene, lo agrego como `tipoRecurso?: string` opcional, no rompedor).

### 2. Hooks nuevos en `src/hooks/`

- **`useCausasPorEstado(estado: 'tramite' | 'recurso' | 'terminada')`** — genérico, hace `causas.select("*, sujetos(*)").eq("estado_causa", estado).order("created_at", desc)`. Devuelve `{causas, loading, error, refetch}`.
  - Refactor: `useCausasTramite` pasa a ser un wrapper de una línea sobre este hook (o se elimina y se usa el genérico directamente desde la rama `tramite`). Esto NO cambia el comportamiento de Trámite.
- **`useCausasConSujetoEn(situacion: 'rebelde' | 'probation')`** — trae causas que tengan al menos un sujeto en esa situación. Implementación: `causas.select("*, sujetos!inner(*)").eq("sujetos.situacion_libertad", situacion)`. El `!inner` filtra causas sin match. Devuelve la misma forma.
  - Nota técnica: el `!inner` con filtro sobre la tabla anidada solo trae los sujetos que matchean. Para que la fila de la causa muestre TODOS sus imputados (rebeldes y no rebeldes juntos, como pide el requisito de "Libertad" en Rebeldes), hago un segundo paso: una vez obtenidos los `causa.id`, hago `causas.select("*, sujetos(*)").in("id", ids)` para traer la lista completa de sujetos por causa. Dos queries, simple, sin tocar RLS.
- **`useDetenidos()`** — trae sujetos detenidos con su causa: `sujetos.select("*, causas(*)").eq("situacion_libertad", "detenido").order("created_at", desc)`. Devuelve `{rows: DetenidoRow[], loading, error, refetch}` donde `DetenidoRow = { imputado: Imputado, causa: Causa }` (la forma que ya consume `DetenidosList`). El mapeo arma cada fila usando `mapSujeto` + `dbCausaToUI` con un único sujeto embebido.

### 3. `src/components/DetenidosList.tsx`

- Cambiar la firma: en vez de recibir `causas: Causa[]` y derivar las filas localmente, recibir `rows: DetenidoRow[]` directamente (o seguir aceptando causas pero opcional). Para minimizar cambios, **mantengo la firma actual** y desde `VocaliaWorkspace` le paso un array de causas reconstruido a partir de `rows` (cada causa con un solo imputado detenido). La tabla ya itera sujetos detenidos dentro de cada causa, así que funciona tal cual.
- Ocultar el botón "Nueva causa con detenido" cuando los datos vienen de Supabase (paso `onCreateCausa={undefined}` en esa rama). La edición/borrado quedan como no-ops con toast, igual que en Trámite.

### 4. `src/components/VocaliaWorkspace.tsx`

Para cada una de las 5 ramas (`detenidos`, `rebeldes`, `sjp`, `recursos`, `terminadas`):

- Llamar al hook correspondiente.
- Renderizar los 4 estados con el mismo bloque que usa Trámite hoy: **loading** (skeleton), **error** (Alert + Reintentar), **vacío** (mensaje "Sin causas en esta categoría" / "Sin detenidos") y **OK** (la tabla con datos reales).
- Para evitar duplicar el JSX 5 veces, extraer un componente local `<RemoteListSection>` (o helper) que reciba `{loading, error, isEmpty, emptyTitle, emptyMessage, onRetry, children}` y renderice los 4 estados. Usado por las 6 ramas (incluyendo Trámite, refactorizada).
- Callbacks `onUpdateCausa` / `onDeleteCausa` / `onCreateCausa` / `onChangeEstado` → no-op con el mismo toast "La edición se conectará a Supabase en el próximo paso" (ya usado en Trámite).

### 5. Mocks

No los elimino del archivo `mockCausas.ts` (Dashboard y Calendario los siguen usando). Sí dejan de usarse en las 5 pestañas migradas.

## Resumen de archivos

- ✏️  `src/lib/causaMapper.ts` — mapear `estado_causa` y `tipo_recurso`.
- ➕ `src/hooks/useCausasPorEstado.ts` (nuevo)
- ➕ `src/hooks/useCausasConSujetoEn.ts` (nuevo)
- ➕ `src/hooks/useDetenidos.ts` (nuevo)
- ✏️  `src/hooks/useCausasTramite.ts` — pasa a ser wrapper de `useCausasPorEstado('tramite')` (o se elimina; lo más limpio es dejarlo como wrapper de 1 línea para no tocar el import en Workspace).
- ✏️  `src/components/VocaliaWorkspace.tsx` — reemplazar las 5 ramas por hooks + componente `RemoteListSection`.
- ✏️  `src/data/mockCausas.ts` — agregar `tipoRecurso?: string` opcional al tipo `Causa` si no existe (chequeo al implementar).

## Notas técnicas

- Como las RLS exigen `es_miembro_de_vocalia(...)` y aún no hay auth conectada, las queries pueden devolver `[]` aunque haya datos. Está bien — caerán al estado "vacío". Cuando conectemos auth, se llenan solas.
- El requisito "una fila por detenido" se mantiene: `DetenidosList` ya genera una fila por imputado detenido. Pasándole causas con un único sujeto cada una, sale exactamente eso.
- En Rebeldes, para que se vea cuál imputado es el rebelde con todos sus co-imputados visibles, traemos la causa completa (todos los sujetos) — la columna "Libertad" del `CausasTable` ya muestra el estado de cada uno.
- No se filtra por vocalía en ningún hook (a propósito).
