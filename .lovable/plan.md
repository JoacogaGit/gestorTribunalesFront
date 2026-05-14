# Plan: CRUD de causas/sujetos + ícono vencimiento pena en Recursos

## Arquitectura general

Sigo el patrón existente: hook + mapper + componente. Centralizo toda la mutación en un único hook `useCausaMutations` y un único componente de formulario reutilizable `CausaFormDialog` para crear y editar.

```text
useCausaMutations  ──▶ supabase (causas + sujetos + eventos)
        ▲
        │ refetch()
        │
CausaFormDialog (modo "crear" | "editar")
        ▲
        ├── CausasTable (botón "Nueva causa" + click en fila)
        └── DetenidosList (botón "Nueva causa con detenido" + click en fila)
```

## Archivos nuevos

### 1. `src/hooks/useCausaMutations.ts`
Expone funciones async que devuelven `{ ok, error }`:
- `crearCausa(payload, sujetos[])` — inserta causa con `vocalia_id` del contexto, luego inserta sujetos. Si falla la inserción de sujetos, hace `delete` de la causa creada (rollback manual; PostgREST no soporta tx multi-tabla).
- `actualizarCausa(id, payload)` — `update` sobre `causas`.
- `borrarCausa(id)` — `delete` sobre `causas` (Supabase no tiene cascade configurado en el schema visible, así que primero borro `eventos` por `causa_id`, luego `sujetos` por `causa_id`, luego la causa).
- `crearSujeto(causaId, payload)`, `actualizarSujeto(id, payload)`, `borrarSujeto(id)`.

Toma `vocaliaId` del `useVocaliaActual()` internamente para no repetirlo en cada call site.

### 2. `src/components/forms/CausaFormDialog.tsx`
Modal grande (`Dialog` de shadcn, `max-w-3xl`, scroll interno) con dos modos:
- `mode="crear"` — campos vacíos, botón "Crear causa".
- `mode="editar"` — pre-rellena con la causa, botón "Guardar cambios" y zona roja con "Borrar causa" + confirmación.

Estructura interna del form (RHF + zod):
- **Datos generales** (siempre visibles)
  - `expediente_nro` (Input, requerido, validado con zod `min(1)`)
  - `caratula` (Input)
  - `estado_causa` (Select cerrado: Trámite / Recurso / Terminada)
  - `tipo_recurso` (Select condicional, sólo si estado = Recurso: Casación / REX / Queja en Corte)
- **Datos complementarios** (`Collapsible` cerrado por defecto)
  - `querella`, `actor_civil`, `otros_intervinientes`, `causa_conexa_texto`
- **Imputados** (lista dinámica con `useFieldArray`)
  - Sub-form por imputado renderizado como `<SujetoFormCard />` (componente interno o archivo aparte).
  - Botón "+ Agregar imputado" arriba de la lista.
  - En modo editar: cada card de imputado existente tiene su propio botón "Borrar imputado" con confirmación inline (`AlertDialog`).
  - En modo crear: botón "X" simple (no hay nada en DB todavía).

### 3. `src/components/forms/SujetoFormCard.tsx`
Tarjeta con campos:
- `nombre_completo` (requerido)
- `delito`
- `situacion_libertad` (Select cerrado: Libre / Detenido / Rebelde / Probation / Condenado)
- `defensor`
- `lugar_alojamiento` (sólo si situación = Detenido)
- `fecha_detencion`, `vencimiento_pp`, `vencimiento_pena`, `prescripcion_fecha` (DatePickers shadcn)
- `observaciones` (Textarea)

### 4. `src/components/forms/ConfirmDeleteDialog.tsx`
`AlertDialog` reutilizable para "Borrar causa" y "Borrar imputado" con mensajes parametrizados.

## Archivos editados

### `src/components/CausaDetail.tsx`
Reemplazo total. En vez del editor mock actual, monta `CausaFormDialog` en modo `"editar"` cargando los datos reales de la causa. Mantiene la misma firma de props (`causa`, `onClose`, `onUpdate`, `onDelete`) para no romper los call sites; `onUpdate`/`onDelete` ya no se usan (la mutación se dispara dentro del propio dialog y llama al `refetch` recibido).

### `src/components/CausasTable.tsx`
- El click en una fila ya abre `CausaDetail` → ahora abrirá el nuevo dialog editor.
- El botón "Nueva causa" deja de llamar `onCreateCausa(mockCausa)` y abre `CausaFormDialog` en modo `"crear"`.
- Recibe un nuevo prop opcional `onMutated?: () => void` que dispara el refetch del workspace.

### `src/components/DetenidosList.tsx`
Mismo cambio: botón "Nueva causa con detenido" abre el dialog en modo crear con `situacion_libertad="detenido"` pre-cargado en el primer imputado.

### `src/components/VocaliaWorkspace.tsx`
- Elimina `remoteNoop` y `remoteTableCommon`.
- Pasa a cada `CausasTable` / `DetenidosList` un `onMutated` que invoca el `refetch` del hook correspondiente (`tramiteRemote.refetch`, etc.).
- Para la pestaña Recursos pasa un flag `showVencPena` (ver tarea 4) o lo activa por `listKey === "recursos"`.

### `src/components/CausasTable.tsx` (tarea 4 — ícono vencimiento de pena)
Sólo cuando `listKey === "recursos"`:
- Agrega columna "Venc. pena" entre las columnas existentes de fechas.
- Por fila calcula el vencimiento más próximo entre los imputados (`min(fechaVencimientoPena)` no nulo).
- Renderiza con un `Badge`/ícono `Gavel` y aplica `getProximityColor()` (mismo helper ya usado para otras fechas) para el semáforo cromático.
- Si no hay vencimiento cargado: "—" en `text-muted-foreground`.

## Detalles técnicos

- **Validación**: `zod` schema en `CausaFormDialog`. `expediente_nro.trim().min(1)`. Sujetos: `nombre_completo.trim().min(1)`. Selectores tipados con los enums exactos del schema.
- **Mapeo UI ↔ DB**: ya existe `dbCausaToUI` en `causaMapper.ts`. Agrego `causaUIToDb` y `sujetoUIToDb` (inversos) en el mismo archivo.
- **Estado de carga**: durante mutación, botón principal con `disabled` + spinner (`Loader2` de lucide). Toast de éxito con `sonner`; toast de error sin cerrar el modal.
- **Borrado en cascada manual**: orden `eventos → sujetos → causas`. Si alguno falla, toast de error y aborta.
- **Refetch**: cada vista pasa su `refetch` como `onMutated`; `VocaliaWorkspace` no necesita estado nuevo.
- **Confirmaciones**: `AlertDialog` (no `confirm()` nativo) tanto para borrar causa como borrar imputado.

## Fuera de alcance (confirmado en el pedido)
- No se toca auth, RLS, ni se crean tablas.
- El "match automático" de causa conexa queda como texto libre.
- Otros formularios mock que no sean "Nueva causa" / detalle de causa no se tocan.

## Riesgos
- **Sin transacción real**: el rollback manual puede dejar causas huérfanas si la red cae entre dos requests. Mitigación: mensaje de error explícito sugiriendo recargar.
- **RLS**: las policies actuales requieren `es_miembro_de_vocalia(vocalia_id)` o las dev-policies para `anon`. Con auth aún no implementada, las dev-policies (`true` para `anon`) cubren el caso. Cuando se active auth real habrá que validar membresía — fuera de alcance ahora.
