# Plan: Causas conexas con vínculo + UX (borrar y sin imputados)

## Tarea 1 — Causas conexas con autocomplete y navegación cross-vocalía

### A. Mapper y tipos

**`src/lib/causaMapper.ts`** — extender `DbCausa` con `causa_conexa_id` (ya está en DB pero no en el tipo local), y propagarlo a la `Causa` UI:
- Agregar a `Causa` (en `src/data/mockCausas.ts`) dos campos opcionales: `causaConexaId?: string | null` y `causaConexaTexto?: string | null`. Mantener `causasConexas?: string[]` por compatibilidad — se popula desde `causa_conexa_texto` para no romper la columna actual.
- En `dbCausaToUI` setear ambos campos nuevos.

### B. Hook `src/hooks/useCausasSearch.ts` (nuevo)

```text
useCausasSearch(query, tribunalId, excludeCausaId?) →
  { results: Array<{ id, expediente_nro, caratula, vocalia: { id, nombre } }>,
    loading }
```

- Debounce interno 250ms con `setTimeout`/cleanup.
- Cuando `query.trim().length >= 1`, ejecuta:
  ```ts
  supabase.from("causas")
    .select("id, expediente_nro, caratula, vocalias!inner(id, nombre, tribunal_id)")
    .eq("vocalias.tribunal_id", tribunalId)
    .ilike("expediente_nro", `%${query}%`)
    .neq("id", excludeCausaId ?? "00000000-...")
    .limit(5);
  ```
- Si `query` vacío → results vacío.

### C. Componente `src/components/forms/CausaConexaInput.tsx` (nuevo)

- Reemplaza el `<Input>` actual de "Causa conexa" en `CausaFormDialog`.
- Props: `value: { id: string|null, texto: string }`, `onChange(next)`, `excludeCausaId?: string`.
- Saca `tribunalId` de `useVocaliaActual()`.
- Render: `<Input>` + dropdown popover/list (renderizado inline debajo del input cuando hay foco y resultados; estilizado como command list con shadcn `Popover` + `Command`, sin necesidad de `CommandDialog`). Cada item muestra:
  - `expediente_nro` (mono, primary)
  - `carátula` (text-foreground truncado)
  - `vocalía` (xs muted)
- Click en item → `onChange({ id, texto: expediente_nro })` + cerrar dropdown.
- Tipear sin elegir → `onChange({ id: null, texto: e.target.value })`.
- Botón "X" para limpiar → `onChange({ id: null, texto: "" })`.
- ESC cierra dropdown.

### D. Integración en `CausaFormDialog`

- Agregar al state `causa` el campo `causa_conexa_id: string | null`.
- En el bloque "Datos complementarios" reemplazar el input por `<CausaConexaInput value={{id, texto}} onChange={...} excludeCausaId={causaId}/>`.
- En `buildPayload`: si `causa_conexa_texto` está vacío, ambos quedan null (ya pasa con `nullify`); además forzar `causa_conexa_id = null` si texto está vacío.
- Persistencia: `useCausaMutations` ya hace `insert/update` con spread, pero `CausaInput` no incluye `causa_conexa_id`. Agregarlo al type `CausaInput` en `useCausaMutations.ts`.

### E. Visualización en `CausasTable` y navegación

- En la celda "N° Causa" (líneas 80–116), reemplazar la lógica actual del punto azul (que usa `c.causasConexas[]` como texto) por:
  ```tsx
  if (c.causaConexaId) → punto azul clickeable
  else if (c.causaConexaTexto) → punto azul no clickeable, tooltip con el texto
  ```
- El click del punto azul (con `e.stopPropagation()`) llama un nuevo prop opcional `onNavigateToConexa?: (id: string) => void` que recibe `CausasTable` y lo encadena.

### F. Navegación cross-vocalía en `VocaliaWorkspace`

- Nueva función `navigateToCausa(causaId)`:
  1. `const { data } = await supabase.from("causas").select("id, vocalia_id, estado_causa, vocalias(id, nombre, tribunal_id)").eq("id", causaId).single();`
  2. Si `vocalia_id !== vocalia.id`: `setVocalia({ id, nombre, tribunalId })`.
  3. Mapear `estado_causa` → vista del sidebar:
     - `tramite` → `"tramite"`
     - `recurso` → `"recursos"`
     - `terminada` → `"terminadas"`
  4. `setView(vista)`.
  5. Setear un nuevo state `pendingOpenCausaId` para que la tabla destino abra el detalle.
- Pasar `onNavigateToConexa={navigateToCausa}` y `openCausaId={pendingOpenCausaId}` a cada `CausasTable`.
- Dentro de `CausasTable`, un `useEffect` que cuando `openCausaId` está en `causas` setea `selected` y llama `onConsumeOpen?.()` para limpiar el pending en el padre.

## Tarea 2 — Click derecho "Borrar causa"

`CausasTable.tsx` líneas 524–534 ya tienen un `ContextMenuItem` "Eliminar causa…" pero hoy solo abre el detalle. Cambios:

- Importar `useCausaMutations` + `AlertDialog` (ya importado).
- Nuevo state `confirmDelete: Causa | null`.
- El item del context menu pasa a `onSelect={() => setConfirmDelete(c)}`.
- Renderizar al final del componente un `<AlertDialog>` con copy: "¿Estás seguro? Esto borrará la causa, todos sus imputados y todos sus eventos asociados. Esta acción no se puede deshacer." + botones Cancelar / "Sí, borrar".
- Confirmar → `await muts.borrarCausa(c.id)` → toast + `onMutated?.()`.
- Aplica a todas las pestañas porque `CausasTable` se reusa.
- `DetenidosList`: revisar si tiene `ContextMenu` propio; si no, agregarlo análogamente reutilizando un nuevo helper compartido o duplicando el bloque (pequeño, ~25 líneas).

`shadcn/ui` `ContextMenu` ya previene el menú nativo del navegador.

## Tarea 3 — Permitir crear causa sin imputados

En `CausaFormDialog.tsx`:

- En `validate()` (líneas 169–178): quitar el `for` que exige `nombre_completo` para todos.
- Nueva lógica antes de submit:
  - `nonEmpty` = sujetos con cualquier campo no vacío.
  - `incomplete` = sujetos sin `nombre_completo.trim()` pero con algún otro campo cargado.
  - Si hay sujetos completamente vacíos → ofrecerlos para descartar (un solo `AlertDialog` con copy: "Hay un imputado sin datos. ¿Querés descartarlo y crear la causa, o completar sus datos?", botones "Descartar y crear" / "Completar datos").
  - Si hay sujetos `incomplete` (con datos pero sin nombre) → mantener el error actual "Cada imputado necesita un nombre", solo para esos.
- En `buildPayload`: filtrar los sujetos completamente vacíos.
- En modo crear, no inicializar con un `emptySujeto()` automático: arrancar con `sujetos: []` y mostrar el empty state que ya existe ("Sin imputados cargados.").

## Reglas y notas

- Sin cambios de schema, RLS ni autenticación.
- Patrón hook + mapper preservado.
- Debounce 250ms en autocomplete.
- `Causa.causasConexas[]` se sigue derivando de `causa_conexa_texto` para no romper otras vistas; los nuevos campos se usan para el indicador clickeable.

## Archivos tocados

```text
nuevo  src/hooks/useCausasSearch.ts
nuevo  src/components/forms/CausaConexaInput.tsx
edita  src/data/mockCausas.ts            (Causa: + causaConexaId, causaConexaTexto)
edita  src/lib/causaMapper.ts            (DbCausa + dbCausaToUI propagan campos)
edita  src/hooks/useCausaMutations.ts    (CausaInput agrega causa_conexa_id)
edita  src/components/forms/CausaFormDialog.tsx  (input conexa + validación sin imputados)
edita  src/components/CausasTable.tsx    (punto azul clickeable, AlertDialog borrar, openCausaId)
edita  src/components/DetenidosList.tsx  (context menu "Borrar causa")
edita  src/components/VocaliaWorkspace.tsx (navigateToCausa + openCausaId)
```
