## Objetivo

Conectar la pestaña **Trámite** a Supabase: traer las causas reales (`causas` con `estado_causa = 'tramite'`) junto con sus imputados (`sujetos`), y mostrarlas en la tabla existente sin tocar login, vocalías, ni las otras pestañas.

## Alcance

- **Sí toco**: la rama `view === "tramite"` dentro de `VocaliaWorkspace.tsx`, agrego un hook nuevo y un mapper.
- **No toco**: AuthScreen, selector de vocalía, pestañas Detenidos / Rebeldes / SJP / Recursos / Terminadas / Calendario / Dashboard, RLS, schema, ni `mockCausas` (lo dejo como fallback de las otras vistas hasta que migremos el resto).

## Cambios

### 1. Nuevo hook `src/hooks/useCausasTramite.ts`

- Usa `supabase` desde `@/integrations/supabase/client`.
- Query única con join embebido:
  ```ts
  supabase
    .from("causas")
    .select("*, sujetos(*)")
    .eq("estado_causa", "tramite")
    .order("created_at", { ascending: false })
  ```
- Devuelve `{ causas: Causa[], loading: boolean, error: string | null, refetch }`.
- No filtra por vocalía (a propósito, según pedido).
- Ejecuta el fetch en `useEffect` al montar.

### 2. Nuevo mapper `src/lib/causaMapper.ts`

Función `dbCausaToUI(row, sujetos): Causa` que adapta la fila de Supabase al tipo `Causa` existente (para no romper `CausasTable`):

| UI (`Causa`)                  | Supabase                                                      |
|-------------------------------|---------------------------------------------------------------|
| `id`                          | `causas.id`                                                   |
| `numero`                      | `causas.expediente_nro`                                       |
| `delito`                      | `sujetos[0].delito ?? "—"`                                    |
| `imputados[]`                 | `sujetos[]` mapeados (ver abajo)                              |
| `estadoCausa`                 | `"En trámite"` (constante para esta vista)                    |
| `fechaInicio`                 | `causas.created_at` (slice fecha)                             |
| `fechaPrescripcion`           | primer `sujetos[*].prescripcion_fecha` no nulo, o vacío       |
| `fechaVencimientoPP`          | primer `sujetos[*].vencimiento_pp` no nulo                    |
| `otrosIntervinientes`         | derivado de `querella`, `actor_civil`, `otros_intervinientes` |
| `causasConexas`               | `[causa_conexa_texto]` si existe                              |
| `vocalia`                     | 1 (placeholder, ignorado en esta vista)                       |

Mapeo de cada `sujeto → Imputado`:

- `nombre` ← `nombre_completo`
- `defensor.nombre` ← `defensor ?? "—"`, `tipo: "DPO"`, `contacto: ""`
- `lugarDetencion` ← `observaciones` solo si está detenido (opcional)
- `fechaVencimientoPena` ← `vencimiento_pena`
- `estadoLibertad`: enum DB → enum UI
  - `detenido` → `"Detenido"` (rojo, ya estilizado)
  - `libre` → `"Excarcelado"` (verde)
  - `rebelde` → `"Rebelde"` (naranja)
  - `probation` → `"SJP"` (amarillo/info, ya estilizado)
  - `condenado` → `"Excarcelado"` por ahora **+ TODO**: agregar variante visual gris en otra iteración (requiere extender el tipo `EstadoLibertad`, que está fuera del alcance actual).

> El `getCaratula()` actual deriva la carátula del primer imputado. Como la DB tiene `caratula` propia, voy a guardarla en un campo nuevo opcional `caratulaOverride?: string` en el tipo `Causa` y modificar `getCaratula` para usarla si existe. Es una adición no-rompedora (1 campo opcional + 1 línea en la función).

### 3. Modificar `src/components/VocaliaWorkspace.tsx`

Solo la rama `{view === "tramite" && ...}`:

- Reemplazar `causasEnTramite` (que sale del mock filtrado) por el resultado del hook **únicamente para la vista "tramite"**.
- Renderizar tres estados:
  - **Loading**: skeleton con `<Skeleton />` (5 filas de la altura de la tabla).
  - **Error**: `<Alert variant="destructive">` con el mensaje + botón "Reintentar" que llama `refetch`.
  - **Vacío** (`data.length === 0`): card centrada con ícono y texto "No hay causas en trámite".
  - **OK**: el `<CausasTable>` actual con las causas reales.
- Para evitar romper edición desde la tabla, las callbacks `onUpdateCausa` / `onDeleteCausa` / `onCreateCausa` en esta vista quedan **no-op temporales** (muestran `toast.info("La edición se conectará a Supabase en el próximo paso")`). Esto es explícito porque el pedido dice "solo lectura por ahora".

### 4. Sin migraciones, sin tocar RLS, sin tocar tipos generados

El cliente ya está; las RLS actuales asumen `auth.uid()` válido. Como dijiste que asumamos sesión activa, eso queda para el siguiente paso.

## Notas técnicas para vos

- Si al probar ves la tabla vacía aunque haya causas en la DB, es porque las RLS exigen `es_miembro_de_vocalia(...)` y el usuario actual no está autenticado o no es miembro. La consulta no falla, simplemente devuelve `[]`. Cuando conectemos auth, esto se resuelve solo.
- Los campos `juicioFijado`, `audiencias`, `agenda`, `adjuntos` no existen aún en tu schema (los maneja la tabla `eventos`). En esta vista van a aparecer como "—". Si querés traerlos, lo hacemos en un paso separado.
- Mantengo el resto de pestañas leyendo del mock para no romper nada. La migración de las otras vistas la hacemos cuando me digas.

## Resumen de archivos

- ✏️  `src/data/mockCausas.ts` — agregar campo opcional `caratulaOverride?: string` y usarlo en `getCaratula`.
- ➕ `src/lib/causaMapper.ts` (nuevo)
- ➕ `src/hooks/useCausasTramite.ts` (nuevo)
- ✏️  `src/components/VocaliaWorkspace.tsx` — solo la rama `tramite`.