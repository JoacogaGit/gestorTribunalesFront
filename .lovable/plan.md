
# Plan — 8 mejoras JusTrack

## 1) Migración en segundo plano (MigracionContext global)

Nuevo archivo `src/contexts/MigracionContext.tsx`:
- Mueve TODO el estado y lógica de procesamiento de lotes que hoy vive en `WizardMigracion`: `archivoCache`, `pestanasDetectadas`, `lotes`, `resultadosOk`, `resultado` (unificado), `editable`, `incluir`, `mapeo`, `procesando`, `filename`, `vocaliaIdActiva`, `exito`.
- Expone acciones: `iniciarDesdeArchivo(file)`, `procesarSeleccion(nombres)`, `reintentarFallidos()`, `continuarConOk()`, `descartar()`, `cargarEnBD()`, `setEditable`, `setIncluir`, `setMapeo`, `reprocesarConMapeo()`, `retomarDesdeResume()`, `descartarResume()`.
- El bucle `ejecutarLotes` corre dentro del provider con `useRef` para `cancelar` y actualiza estado por lote. Persistencia en localStorage `migracion_v1_<vocaliaId>` ya existente se conserva.
- Montado en `App.tsx` envolviendo a `AuthProvider` (debajo de `VocaliaProvider` porque depende de la vocalía activa).

`WizardMigracion.tsx` queda como **vista** que solo consume el contexto: render según `procesando | lotes | mapeo | resultado | exito`. No tiene su propio bucle ni estados duplicados. Si el usuario navega a otra vista mientras `procesando=true`, el bucle sigue activo en el provider.

Indicador en el header (`VocaliaWorkspace.tsx`, NO en sidebar): chip pequeño junto a `ZoomControl`/`RefreshButton` cuando `migracion.activa`:
- En curso: `Loader2` + texto `Migración en curso… {ok}/{total}`.
- Lista para revisar: `CheckCircle2` + `Migración lista`.
- Click → `setView("migrar")`.
- Solo visible cuando hay `lotes.length > 0` o `resultado` sin confirmar para la vocalía actual. Se oculta tras `cargarEnBD` exitoso o `descartar`.

## 2) Botón "Nueva causa" sticky arriba en cada lista

En `CausasTable.tsx`, la barra/título donde vive el botón "Nueva causa" pasa a `sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/50` dentro del contenedor con scroll. Aplica a todas las listas (Trámite, Recursos, Terminadas, Dashboard). Para `DetenidosList.tsx`, mismo patrón en su header.

## 3) Contador numérico (1..N) a la izquierda de cada fila

En `CausasTable.tsx`:
- Nueva primera columna fija `#` (no ordenable, ancho ~36px, `text-muted-foreground text-xs tabular-nums`).
- Numera según `sorted` (orden visible actual), 1 a N. Reinicia con filtro/búsqueda.
- Aplicar mismo `#` en `DetenidosList.tsx`.

## 4) Columna `UNIP` / `COL` (tipo de proceso)

- `Causa` (UI) y mapper: añadir `tipoProceso?: "unipersonal" | "colegiado" | null` (ya existe en DB `causas.tipo_proceso`). Actualizar `dbCausaToUI` en `src/lib/causaMapper.ts`.
- En `CausasTable.tsx`, nueva columna `tipoProceso` entre `defensor` y `prescripcion`:
  - Header `Tipo` con `w-12 text-center`.
  - Render: `UNIP` / `COL` / `—` en badge sutil `text-[10px]`.
- Reducir ancho/padding de `defensor` y eliminar `max-w` exagerado para compactar el espacio liberado.
- Aplica a todas las listas (la columna se incluye en `allColumns`, comportamiento por defecto: visible).
- Formulario de causa (`CausaFormDialog`) ya soporta `tipo_proceso` si está implementado; si no, agregar Select UNIP/COL.

## 5) Filas rojas persistentes (nueva tabla)

SQL a aprobar (no se ejecuta sin OK):

```sql
CREATE TABLE public.migracion_pendientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vocalia_id uuid NOT NULL REFERENCES public.vocalias(id) ON DELETE CASCADE,
  datos_crudos text NOT NULL,
  razon text,
  sujeto_propuesto jsonb,
  archivo_origen text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.migracion_pendientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY mp_select ON public.migracion_pendientes FOR SELECT
  USING (es_miembro_de_vocalia(vocalia_id) OR es_superadmin());
CREATE POLICY mp_insert ON public.migracion_pendientes FOR INSERT
  WITH CHECK (es_miembro_de_vocalia(vocalia_id) OR es_superadmin());
CREATE POLICY mp_delete ON public.migracion_pendientes FOR DELETE
  USING (es_miembro_de_vocalia(vocalia_id) OR es_superadmin());
CREATE INDEX ON public.migracion_pendientes (vocalia_id, created_at DESC);
```

Frontend:
- En `cargarEnBD` (al confirmar migración) → insertar todas las `filas_rojas` agregadas (de `resultado.filas_rojas` + de cada `resultadosOk[*].resultado.filas_rojas`) con `archivo_origen = filename`.
- Nuevo hook `src/hooks/useMigracionPendientes.ts` (list + delete).
- Nuevo componente `src/components/migracion/PendientesRevision.tsx` mostrado en la vista "Migrar causas" (arriba del wizard si hay pendientes, o pestaña). Cada item: razón, datos_crudos, fecha, botón "Crear causa manualmente" (abre `CausaFormDialog` con texto crudo precargado en carátula/observaciones) y "Descartar".

## 6) Campo `fecha_ingreso` (Fecha 354)

- DB: ya existe `causas.fecha_ingreso DATE` (visto en schema). No requiere migración.
- `Causa` UI: añadir `fechaIngreso?: string`. Mapper.
- `CausasTable.tsx`: columna `Fecha 354` junto a UNIP/COL, formato DD/MM/AAAA, `text-muted-foreground text-xs`.
- `CausaFormDialog`: campo `<Input type="date">` con label "Fecha de ingreso (354)".
- Edge function `supabase/functions/procesar-migracion/index.ts`:
  - System prompt: agregar regla para mapear columnas "Elevación", "Fecha 354", "Ingreso", "Fecha elevación", "Elevación a juicio" → `fecha_ingreso` (ISO `YYYY-MM-DD`, normalizar `DD/MM/YYYY`).
  - JSON schema de causa: agregar `fecha_ingreso: string|null`.
- `useMigracion.ts`: `CausaIA` agrega `fecha_ingreso: string | null`. `cargarEnBD` lo incluye en `causaPayload`.

## 7) Eventos vencidos clickeables

Buscar en `CalendarioAlertas.tsx` y en el render de eventos en `CausaDetail.tsx` / `CausasTable.tsx` el patrón que deshabilita click si `fecha < hoy` (probable `disabled`, `pointer-events-none` o conditional `onClick`). Quitar la condición y mantener solo un estilo visual (texto en gris/tachado) para distinguir vencidos. El click siempre abre el detalle.

## 8) Filtro correcto de "Causas en Trámite"

Ya hay `useCausasPorEstado("tramite", vocaliaId, { excluirSituaciones: ["rebelde","probation"] })` en `VocaliaWorkspace`. Verificar que `useCausasPorEstado` filtre por sujetos NO borrados (ya lo hace) y que `useCausasDashboard` aplique el mismo filtro para `dashFilter === "tramite"`. Ajustar `dashCausas` filter:
```ts
case "tramite": return all.filter(c =>
  (c.estadoCausa === "En trámite" || c.estadoCausa === "En juicio") &&
  !c.imputados.some(i => ["Rebelde","SJP"].includes(i.estadoLibertad)));
```

## Pendientes anteriores
- Scroll calendario (`overflow-y-auto`): verificar que esté.
- Zoom listas: ya existe (`useListZoom` + `ZoomControl`).
- Vista activa por vocalía en localStorage: ya existe (`justrack_vista_activa_<vocaliaId>`).

## Detalles técnicos

- Orden de columnas en `CausasTable`: `# | N° Causa | Carátula | Delito | Libertad | Estado | Defensor | Tipo (UNIP/COL) | Fecha 354 | Prescripción | PP | (Vto. Pena en recursos) | …`.
- `MigracionContext` debe rebindear vocalía: si cambia `vocaliaId`, descarta estado activo solo si no hay procesamiento en curso; si lo hay, mantiene la migración asociada a su vocalía original y el indicador en header se muestra solo cuando coincide la vocalía activa (`migracion.vocaliaId === vocaliaId`).
- RLS de `migracion_pendientes`: usa `es_miembro_de_vocalia` ya existente.
- No tocar `types.ts` (regenera tras migración).

## Orden de implementación
1. SQL `migracion_pendientes` (esperar OK del usuario).
2. `MigracionContext` + refactor `WizardMigracion` + indicador header.
3. Columnas `#`, `UNIP/COL`, `Fecha 354` + sticky "Nueva causa" + mapper update.
4. Edge function: prompt + schema con `fecha_ingreso`.
5. `PendientesRevision` + hook + inserción al cargar.
6. Eventos vencidos clickeables.
7. Ajuste filtro dashboard "tramite".
