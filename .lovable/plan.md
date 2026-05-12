# Conectar Dashboard y Calendario a Supabase

Reemplazar todos los datos hardcodeados del Dashboard y el Calendario por datos reales de Supabase, manteniendo el patrón **hook + mapper** ya usado en las pestañas de listado. Regla transversal: **excluir siempre las causas con `estado_causa = 'terminada'`**.

## Parte 1 — Dashboard (KPIs reales)

Crear `src/hooks/useDashboardKpis.ts` que devuelva `{ kpis, loading, error, refetch }`. Usa `count` exacto en cada consulta y filtra por causas activas (`tramite` + `recurso`).

```text
{ detenidos, juiciosEsteMes, ppProximas, rebeldes, eventos30d, totalCausas }
```

Consultas (todas con `head: true, count: 'exact'`):

1. **Detenidos**: `sujetos` con `situacion_libertad='detenido'` filtrando por causa activa vía `causas!inner(estado_causa)` con `.in('causas.estado_causa', ['tramite','recurso'])`.
2. **Juicios este mes**: `eventos` con `tipo_evento` ∈ `['audiencia','juicio']`, `fecha_hora` entre primer y último día del mes actual, join `causas!inner` activo.
3. **PP próximas**: `sujetos` con `vencimiento_pp` entre hoy y hoy+30d, join `causas!inner` activo.
4. **Rebeldes**: `sujetos` con `situacion_libertad='rebelde'`, join `causas!inner` activo.
5. **Eventos 30 días**: `eventos` con `fecha_hora` entre hoy y hoy+30d, join `causas!inner` activo.
6. **Total causas**: `causas` con `estado_causa.in.(tramite,recurso)`.

Refactorizar `src/components/KpiCards.tsx` para recibir el resultado del hook (no `causas: Causa[]`). Estados: skeleton mientras `loading`, alert con retry si `error`. Cada tarjeta sigue siendo clickeable; al expandirse, en lugar del listado mock, mostrar mensaje "Detalle disponible en la pestaña correspondiente" (mantener simple — sin fetchear listas de detalle ahora). Si el contador es 0, mostrar texto amigable ("No hay detenidos", etc.).

En `VocaliaWorkspace.tsx`, el bloque `view === "dashboard"`:
- Pasar el hook a `<KpiCards />`.
- La tabla bajo los filtros usa las causas activas reales: combinar `tramiteRemote.causas` + `recursosRemote.causas` (excluye terminadas) para `dashCausas`. El filtro `dashFilter` se calcula sobre esa unión usando los hooks remotos ya disponibles (rebeldes/sjp/detenidos/recursos). Eliminar dependencia de `mockCausas` en el dashboard.

## Parte 2 — Calendario (eventos unificados)

Crear `src/hooks/useCalendarioEventos.ts` que devuelva `{ eventos: CalendarEvento[], loading, error, refetch }` haciendo cuatro consultas en paralelo, todas con join `causas!inner` filtrando `estado_causa.in.(tramite,recurso)`:

```text
type CalendarEvento = {
  id: string;
  fecha: string;            // ISO
  hora?: string;
  titulo: string;
  descripcion?: string;
  tipo: 'evento' | 'vencimiento_pp' | 'vencimiento_pena' | 'prescripcion';
  causaId: string;
  causaNumero: string;
  causaCaratula: string;
  sujetoId?: string;
}
```

Fuentes:
- **A) Eventos manuales**: `eventos.select('*, causas!inner(expediente_nro,caratula,estado_causa)')` con `not('fecha_hora','is',null)`.
- **B) Vto PP**: `sujetos.select('id,nombre_completo,vencimiento_pp,causa_id, causas!inner(...)')` con `not('vencimiento_pp','is',null)`. Título: `"Vence PP — " + nombre_completo`.
- **C) Vto Pena**: idem con `vencimiento_pena`.
- **D) Prescripciones**: idem con `prescripcion_fecha`. Título: `"Prescripción — " + nombre_completo`.

Crear `src/lib/eventoMapper.ts` con:
- `mapDbEventoToCalendar(row) → CalendarEvento`
- `mapSujetoFechaToCalendar(row, campo, tipo) → CalendarEvento`
- **Semáforo cromático** `getSemaforoClasses(fecha)` con buckets: `<=0d` rojo intenso, `1–7d` naranja fuerte, `8–30d` naranja claro, `31–60d` amarillo, `>60d` verde claro. Devolver tres helpers: `bg`, `dot`, `text` con tokens semánticos (extender `tailwind.config.ts`/`index.css` si hace falta agregar `--cal-rojo`, `--cal-naranja-fuerte`, etc., en HSL). Reusar este helper también desde donde se muestren fechas de vencimiento dentro de las listas de causas (por ejemplo `CausasTable` y `DetenidosList`).

Refactorizar `src/components/CalendarioAlertas.tsx`:
- Quitar prop `causas` y `getAllEventos`. Consumir `useCalendarioEventos()`.
- Estados: skeleton, error con retry, vacío ("No hay eventos en los próximos 30 días").
- Reemplazar el filtro existente por tipo (que usaba `TipoEvento` mock) por **4 checkboxes** persistidos en `localStorage`:
  - ☑ Eventos manuales (`evento`)
  - ☑ Vencimientos de Prisión Preventiva (`vencimiento_pp`)
  - ☑ Vencimientos de Pena (`vencimiento_pena`)
  - ☑ Prescripciones (`prescripcion`)
  
  Por defecto todos activos. Cambios reactivos sin recargar.
- Mantener: calendario lateral con marcador de días con eventos, panel de pasados/futuros, búsqueda, descartar/restaurar (clave `localStorage` por `causaId|tipo|fecha`).
- Aplicar `getSemaforoClasses` en cada fila de evento (reemplaza `getProximityBg`/`getProximityDot` actual).

En `VocaliaWorkspace.tsx`, `view === "calendario"` ya no recibe `causas` — el componente se autoabastece.

## Detalles técnicos

- **Eficiencia**: KPIs usan `select('*', { count: 'exact', head: true })`, sin traer filas. Calendario sí trae filas (necesita renderizar), pero solo columnas necesarias.
- **Filtro por causa activa en joins**: usar PostgREST inner join + `.in('causas.estado_causa', ['tramite','recurso'])`.
- **Rango mes actual** y **+30 días**: calcular en JS y pasar como ISO a `.gte/.lte`.
- **Sin cambios en**: RLS, schema, auth, pestañas de listado ya conectadas, vocalía (no se filtra todavía).
- **Mock cleanup**: `mockCausas` deja de usarse en Dashboard y Calendario (se mantiene el archivo por ahora porque `WelcomeModal`/import lo usan).

## Archivos

Nuevos:
- `src/hooks/useDashboardKpis.ts`
- `src/hooks/useCalendarioEventos.ts`
- `src/lib/eventoMapper.ts`

Editados:
- `src/components/KpiCards.tsx` — consume hook, sin `causas` prop.
- `src/components/CalendarioAlertas.tsx` — consume hook, 4 filtros, semáforo nuevo.
- `src/components/VocaliaWorkspace.tsx` — wiring del dashboard y calendario.
- `src/data/mockCausas.ts` — agregar nuevas funciones de semáforo (o moverlas a `eventoMapper`).
- `tailwind.config.ts` / `src/index.css` — tokens HSL para semáforo si faltan.
