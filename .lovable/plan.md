## Objetivo

Cerrar el ciclo de conexión a datos reales: limpiar el último mock del Dashboard, exponer filtros visibles en el Calendario, activar el selector de vocalías con datos reales (incluyendo edición de nombre y vuelta al login), y propagar `vocaliaId` a todas las consultas.

---

## 1. Estado global de vocalía seleccionada

**Nuevo:** `src/context/VocaliaContext.tsx`
- Provee `{ vocaliaId, vocaliaNombre, tribunalId, setVocalia(v), clearVocalia() }`.
- Hook `useVocaliaActual()` (lanza error si se usa fuera del provider).
- Persistencia ligera en `localStorage` (`justrack-vocalia-id`) para no perderla en refresh.

**`src/pages/Index.tsx`:** envolver el árbol en `<VocaliaProvider>` y reemplazar el state local `vocalia: number` por `vocaliaId: string | null` derivado del contexto.

---

## 2. Selector de vocalías con datos reales (Tarea 3.1, 3.6, 4)

**Nuevo hook:** `src/hooks/useVocalias.ts`
- `select id, nombre, tribunal_id` de `vocalias`, ordenado por nombre.
- Devuelve `{ vocalias, loading, error, refetch }`.
- Función `renombrarVocalia(id, nombre)`: valida no vacío, hace `update({ nombre }).eq("id", id)`, refetch optimista.

**`src/components/VocaliaSelector.tsx`** (rewrite):
- Consume `useVocalias()`, ya no `mockCausas`.
- Para cada vocalía: contador real con `useEffect` adicional o (más simple) un único query agregado por vocalía vía `count: 'exact', head: true` en `causas` filtrando `vocalia_id` y `estado_causa in (tramite, recurso)`. Lo dejamos como un hook chico `useVocaliaStats(id)` o un fetch en el componente — un solo `Promise.all` al montar.
- Ícono lápiz por tarjeta → input inline → confirma con Enter / blur, valida no vacío, llama `renombrarVocalia`.
- Botón "Volver al inicio de sesión" (icono `LogOut`) en el header del selector que llama `onLogout` (prop nueva, equivalente a setear `user=null` en `Index.tsx`).
- Estados loading/error/empty ("No hay vocalías disponibles para tu tribunal").

**`src/pages/Index.tsx`:** pasar `onLogout` también al selector.

---

## 3. Propagar `vocaliaId` a todas las consultas (Tarea 3.3)

Refactor de hooks para aceptar `vocaliaId: string` como argumento y aplicar `.eq("vocalia_id", vocaliaId)` (o filtro embebido en relación):

- `useCausasPorEstado(estado, vocaliaId)` → añade `.eq("vocalia_id", vocaliaId)`.
- `useCausasConSujetoEn(situacion, vocaliaId)` → en paso 2 (fetch causas por ids) añade `.eq("vocalia_id", vocaliaId)`.
- `useDetenidos(vocaliaId)` → cambia a `select("*, causas!inner(*)").eq("situacion_libertad","detenido").eq("causas.vocalia_id", vocaliaId)`.
- `useDashboardKpis(vocaliaId)` → todas las queries embebidas usan `causas!inner(...)` con `.eq("causas.vocalia_id", vocaliaId)`. Para `totalCausas` filtrar directo por `vocalia_id`.
- `useCalendarioEventos(vocaliaId)` → añade `.eq("causas.vocalia_id", vocaliaId)` en las 4 queries.

**Excepción documentada:** las consultas de "causas conexas" (no se tocan en este plan) seguirán sin filtrar por vocalía.

**`VocaliaWorkspace.tsx`:**
- Lee `vocaliaId, vocaliaNombre` desde `useVocaliaActual()`.
- Sustituye la prop `vocalia: number` por nada (toma del contexto).
- Pasa `vocaliaId` a cada hook.
- Header y breadcrumb (`"Panel General — {vocaliaNombre}"`, chip superior con `vocaliaNombre`).
- `AppSidebar`: acepta `vocaliaNombre: string` y muestra "{vocaliaNombre} — Cambiar". Convertir el botón "Cambiar" en un `DropdownMenu` poblado con `useVocalias()` filtradas al `tribunal_id` actual; al elegir otra → `setVocalia(v)`. Mantiene la opción "Volver al selector" como item del menú.

---

## 4. Limpieza Dashboard (Tarea 1)

**Nuevo hook:** `src/hooks/useCausasDashboard.ts`
- `select("*, sujetos(*)").eq("vocalia_id", vocaliaId).in("estado_causa", ["tramite","recurso"]).order("created_at", { ascending: false })`.
- Devuelve `{ causas, loading, error, refetch }` mapeando con `dbCausaToUI`.

**`VocaliaWorkspace.tsx`:**
- Eliminar el state local `causas` basado en `mockCausas` y todo el bloque `isNewUser`.
- Eliminar handlers que mutan el array local (`updateCausa`, `deleteCausa`, `createCausa`, `changeEstado`, `importToList`, `handleImportCausas`) y reemplazarlos por `remoteNoop` (igual que las otras pestañas).
- En `view === "dashboard"`: usar `useCausasDashboard(vocaliaId)`. Mantener el filtro local (`dashFilter`) operando sobre el resultado real. Si `causas.length === 0` → mostrar `RemoteListSection` con mensaje "Sin causas en esta vocalía".
- `WelcomeModal` y tableros personalizados: dejar la importación como noop por ahora (toast informativo).

---

## 5. Filtros del Calendario visibles (Tarea 2)

**`CalendarioAlertas.tsx`:**
- Reemplazar el `DropdownMenu` actual de "Tipos" por un panel de 4 checkboxes visibles en la columna izquierda, debajo del mini-calendario:
  - ☑ Eventos manuales
  - ☑ Vencimientos de PP
  - ☑ Vencimientos de Pena
  - ☑ Prescripciones
- Usar `Checkbox` de shadcn (`@/components/ui/checkbox`) con label clickeable y un punto de color del semáforo al lado del label.
- Estado ya existe (`hiddenTipos` + `FILTER_KEY` localStorage). Se conserva la persistencia.
- Cambios reactivos inmediatos (ya está, vía `useMemo`).

---

## 6. Volver al login desde el selector (Tarea 4)

Ya cubierto en sección 2 (botón en `VocaliaSelector`). `Index.tsx` expone `onLogout` que setea `user=null` y `clearVocalia()`.

---

## Detalles técnicos

### Tipos `vocalia` en código existente
Hoy `vocalia` viaja como `number` (1, 2, 3) en muchos componentes (`CausasTable`, `DetenidosList`, `WelcomeModal`, mocks). Cambio mínimo:
- Mantener la prop visual donde sólo se muestra: pasar `vocaliaNombre` (string) en lugar de número.
- Donde se usa para filtrar mocks (ya no se va a usar) → remover.
- El tipo `Causa.vocalia` (mock) se conserva sólo porque `dbCausaToUI` puede setear un placeholder; no impacta la UI.

### Orden de cambios (para evitar romper compilación intermedia)

```text
1. Crear VocaliaContext + envolver Index
2. Crear useVocalias + reescribir VocaliaSelector (pantalla previa)
3. Refactor de hooks de datos para aceptar vocaliaId
4. Refactor VocaliaWorkspace: leer del contexto, pasar vocaliaId, header dinámico
5. AppSidebar: dropdown de cambio de vocalía
6. Crear useCausasDashboard y reemplazar tabla mock del Panel General
7. Calendario: checkboxes visibles
```

### Archivos tocados

- **Crea:** `src/context/VocaliaContext.tsx`, `src/hooks/useVocalias.ts`, `src/hooks/useCausasDashboard.ts`
- **Edita:** `src/pages/Index.tsx`, `src/components/VocaliaSelector.tsx`, `src/components/VocaliaWorkspace.tsx`, `src/components/AppSidebar.tsx`, `src/components/CalendarioAlertas.tsx`, `src/components/KpiCards.tsx` (sólo tipo de prop), `src/hooks/useCausasPorEstado.ts`, `src/hooks/useCausasConSujetoEn.ts`, `src/hooks/useDetenidos.ts`, `src/hooks/useDashboardKpis.ts`, `src/hooks/useCalendarioEventos.ts`

### No se toca

- Esquema de Supabase / RLS / auth.
- Lógica de causas conexas (las relaciones cross-vocalía siguen sin filtrar).
- Pestañas ya conectadas conservan su patrón hook + mapper.
