# Plan: Soft delete, migración por IA y onboarding de tribunal

## Tarea 1 — Soft delete (papelera de reciclaje)

### 1.1 SQL para correr manualmente (NO lo ejecuta Lovable)

Se entrega al usuario en chat para que lo copie al SQL Editor:

```sql
ALTER TABLE public.causas
  ADD COLUMN borrado_en TIMESTAMPTZ,
  ADD COLUMN borrado_por UUID REFERENCES public.perfiles(id);
ALTER TABLE public.sujetos
  ADD COLUMN borrado_en TIMESTAMPTZ,
  ADD COLUMN borrado_por UUID REFERENCES public.perfiles(id);
ALTER TABLE public.eventos
  ADD COLUMN borrado_en TIMESTAMPTZ,
  ADD COLUMN borrado_por UUID REFERENCES public.perfiles(id);

CREATE INDEX idx_causas_activos   ON public.causas  (vocalia_id) WHERE borrado_en IS NULL;
CREATE INDEX idx_sujetos_activos  ON public.sujetos (causa_id)   WHERE borrado_en IS NULL;
CREATE INDEX idx_eventos_activos  ON public.eventos (causa_id)   WHERE borrado_en IS NULL;
```

Mensaje al usuario: hasta que no se corra el SQL, los hooks seguirán funcionando (las columnas extra son nullables; el filtro `.is("borrado_en", null)` falla suave si no existen → se aplica el filtro recién después de correr la migración). Se documenta este orden.

### 1.2 Filtros en hooks de lectura

A todos los `.select(...)` agregar `.is("borrado_en", null)` (y para joins anidados, ej. `sujetos!inner`, filtrar sujetos también):

- `useCausasPorEstado`, `useCausasConSujetoEn`, `useCausasTramite`, `useCausasDashboard`, `useCausasSearch`
- `useDetenidos` (filtra sujetos y causa embebida)
- `useDashboardKpis` (cuentas)
- `useCalendarioEventos`, `useEventosCausa`, `useProximasAnotacionesPorCausa`

### 1.3 Mutations de borrado → soft delete

- `useCausaMutations.ts`: `borrarCausa` ahora hace `UPDATE causas SET borrado_en = now(), borrado_por = userId`. También marca `sujetos` y `eventos` de la causa como borrados (cascada lógica).
- `useEventoMutations.ts`: `borrarEvento` → `UPDATE` con `borrado_en`/`borrado_por`.
- Para sujetos sueltos: si hay `borrarSujeto` en algún hook, mismo patrón.

### 1.4 Pantalla Papelera (solo admins)

- `AppSidebar.tsx`: nuevo item `Papelera` (icono `Trash2`) condicionado a `esAdmin`, debajo de "Miembros del tribunal".
- `VocaliaWorkspace.tsx`: registrar `view === "papelera"` (con redirect si no es admin, igual que miembros).
- Nuevo componente `src/components/Papelera.tsx` con `Tabs` (Causas / Sujetos / Eventos).
- Nuevos hooks: `useBorrados.ts` que expone `useCausasBorradas(vocaliaId)`, `useSujetosBorrados(vocaliaId)`, `useEventosBorrados(vocaliaId)`. Cada uno trae con join a `perfiles` para el nombre del que borró.
- Cada fila: título, `borrado_en` formateado, "borrado por X", botón **Restaurar** con `AlertDialog` que ejecuta `UPDATE ... SET borrado_en = NULL, borrado_por = NULL`.
- Sin botón de borrado definitivo (fuera de scope).

## Tarea 2 — Onboarding post-creación de tribunal

### 2.1 Pantalla de bienvenida

- Nuevo componente `src/components/BienvenidaTribunal.tsx`.
- Se dispara después de `crear_tribunal` (en el flujo actual de `VocaliaSelector` / `WelcomeNoTribunal`): tras la primera vocalía creada, en lugar de entrar directo al workspace, se muestra esta pantalla.
- Estado nuevo (`flagBienvenidaPendiente`) guardado en `localStorage` por `tribunal_id` para no repetirla.
- Contenido: título "Tu gestión de causas inteligente empieza acá", subtítulo cálido, descripción de migración, dos CTAs:
  - Primario: "🚀 Migrar mis causas existentes" → entra al workspace con `view = "migrar"`.
  - Secundario: "Empezar desde cero" → `view = "dashboard"`.
- Footer recordando que se puede migrar después desde el sidebar.

### 2.2 Item permanente "Migrar causas" en sidebar

- En `AppSidebar.tsx` agregar item `Migrar causas` (icono `Upload`) visible para todos los miembros.
- `VocaliaWorkspace.tsx`: `view === "migrar"` renderiza `<WizardMigracion vocaliaId={...} vocaliaNombre={...} />`.

## Tarea 3 — Wizard de migración por IA

### 3.1 Infraestructura

**Dependencias frontend**:
```
bun add xlsx papaparse mammoth
```

**Parseo (`src/lib/parseMigracionFile.ts`)**:
- Detecta extensión y devuelve `{ tipo, pestanas: [{ nombre, filas: string[][] | string }] }`.
- Excel: SheetJS, todas las hojas → matriz de celdas.
- CSV: papaparse.
- DOCX: mammoth (`extractRawText`) → una única "pestaña" con texto.
- TXT: lectura directa → texto plano.
- Límite 10 MB.

**Edge function `supabase/functions/procesar-migracion/index.ts`**:
- `verify_jwt = false` en `config.toml`; validar JWT en código vía `supabase.auth.getClaims(token)`.
- Valida que el usuario es miembro de la vocalía (`es_miembro_de_vocalia` RPC con cliente service-role autenticado como el user, o consulta a `miembros_tribunal` join `vocalias`).
- Llama a Anthropic:
  - `POST https://api.anthropic.com/v1/messages`
  - Headers: `x-api-key: ANTHROPIC_API_KEY`, `anthropic-version: 2023-06-01`, `content-type: application/json`.
  - Body: `{ model: "claude-sonnet-4-5", max_tokens: 16000, system: SYSTEM_PROMPT, messages: [{ role:"user", content: "Migrar a vocalía: ...\nArchivo de tipo ...\nContenido:\n" + JSON.stringify(payload) }] }`.
- Reparación de JSON: extrae primer `{ ... }` balanceado; si falla, devuelve `{ ok:false, error:"json_invalido", raw }`.
- Errores: `no_api_key` (sin secret), `forbidden` (no miembro de vocalía), `payload_too_large`.
- Constante `SYSTEM_PROMPT` con el texto completo del rol de Claude (literal del enunciado).
- Devuelve `{ ok:true, resultado: <json IA> }`.

**Secret**: pedir `ANTHROPIC_API_KEY` vía `add_secret`.

**Almacenamiento**: respuesta cruda vive en `useState` del wizard. Nada se persiste hasta confirmar.

### 3.2 Wizard (`src/components/WizardMigracion.tsx`)

Componente con `step: 1 | 2 | 3 | 4` y `useReducer` para el estado IA.

**Paso 1 — Subida**:
- Header `Migrar causas a {vocaliaNombre}` + aviso de vocalía destino.
- Dropzone (drag & drop nativo) + `<input type="file">`. Acepta `.xlsx,.xls,.csv,.docx,.txt`.
- Loader con copy "Nuestra IA está leyendo e interpretando tu archivo…".
- Al recibir respuesta: si `modo === "mapeo_asistido_requerido"` → Paso 2; si `modo === "procesamiento_directo"` → Paso 3.

**Paso 2 — Mapeo asistido**:
- Tabla con `columnas_detectadas`: cada columna muestra muestras + `<Select>` con `campos_disponibles` para mapear.
- Botón "Reintentar con este mapeo" → re-invoca la edge function con `mapeo_manual: { 0: "expediente_nro", ... }` adjunto al payload. La edge function lo agrega como contexto adicional al user message.

**Paso 3 — Revisión**:
- Encabezado con 6 contadores grandes (`Card` por cada uno) + chip-list de `pestanas_procesadas`.
- Lista de causas: `Collapsible` por causa, borde izquierdo color según `confianza` (`verde` = `--alert-ok`, `amarillo` = ámbar, `rojo` = `--alert-urgent`).
- Header: checkbox de inclusión, expediente, carátula, badges (estado, tipo proceso), conteo de sujetos/eventos.
- Expandido: inputs editables (`Input`/`Textarea`/`Select`) para todos los campos de causa, lista de sujetos y eventos con sus campos. `notas_ia` en banner si está.
- Sección "Filas rojas no procesables": tabla con `razon`, `datos_crudos`, botón "Crear causa manualmente" que abre `<CausaFormDialog>` precargado con lo que se pudo inferir.
- Footer fijo: "Vas a cargar N causas, M sujetos, K eventos en {vocalia}" + `Cargar todo` + `Descartar`.

**Paso 4 — Carga**:
- `AlertDialog` de confirmación.
- Inserción: como Supabase JS no expone transacciones cliente-side, se usa una RPC nueva opcional o se hace inserción secuencial con rollback manual:
  - Insertar causas con `select()` para recuperar `id` real, mapear por `id_temporal`.
  - Insertar sujetos con `causa_id` mapeado.
  - Insertar eventos con `causa_id` mapeado.
  - Si falla en cualquier paso: borrar (hard delete) los registros ya creados en este batch (no soft, son recién creados).
- Pantalla de éxito con resumen y botón "Ir al dashboard".

## Archivos

**Creados**
- `src/components/Papelera.tsx`
- `src/components/BienvenidaTribunal.tsx`
- `src/components/WizardMigracion.tsx` (+ sub-componentes `WizardPasoSubida`, `WizardPasoMapeo`, `WizardPasoRevision`, `WizardPasoExito` en el mismo archivo o en `src/components/migracion/`)
- `src/hooks/useBorrados.ts`
- `src/hooks/useRestaurar.ts`
- `src/hooks/useMigracion.ts` (invoca edge function + ejecuta inserts finales)
- `src/lib/parseMigracionFile.ts`
- `supabase/functions/procesar-migracion/index.ts`

**Editados**
- `src/components/AppSidebar.tsx` (items Papelera + Migrar causas)
- `src/components/VocaliaWorkspace.tsx` (views `papelera` y `migrar`, guard admin para papelera)
- `src/components/VocaliaSelector.tsx` o `WelcomeNoTribunal.tsx` (disparo de pantalla de bienvenida tras crear tribunal)
- Todos los hooks de lectura listados en 1.2
- `src/hooks/useCausaMutations.ts`, `src/hooks/useEventoMutations.ts`
- `supabase/config.toml` (registrar función `procesar-migracion`)

**Secret a pedir**: `ANTHROPIC_API_KEY`.

## Notas

- El SQL de soft delete lo corre el usuario manualmente; Lovable solo lo entrega.
- El filtro `.is("borrado_en", null)` se agrega de una sola vez en cada hook; antes de que existan las columnas Supabase responde con error → se aclara al usuario que primero corra el SQL.
- RLS existente cubre todo (insert/update/delete sobre causas/sujetos/eventos chequea membresía de vocalía). El soft delete es un `UPDATE`, igual permitido.
- Coherencia visual: se reutilizan `Card`, `Button`, `Tabs`, `Collapsible`, `AlertDialog`, `Badge` y tokens semánticos existentes.