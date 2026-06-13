## Plan: 3 features (animaciones de fondo + despachante + categorías como plantilla)

Antes de codear, una pregunta clave sobre **categorías** (sección 3), porque el modelo que describís **no coincide** con lo que ya hay en la base.

---

### Hallazgo importante sobre categorías ya existentes

La BD ya tiene:

- `categorias_personalizadas` (id, vocalia_id, nombre_categoria, color, creado_por)
- `causas_en_categorias` (categoria_id, causa_id) — tabla de **etiquetas** (una causa "pertenece" o no a una categoría).

Lo que pedís ahora es un modelo **distinto**: una categoría es una **plantilla** que materializa una entrada (registro de `eventos`) en cada causa, editable individualmente, con posibilidad de tener varias entradas de la misma categoría en una causa.

Son dos features distintas. Necesito saber cómo procedo:

**Opción A — reemplazar:** Borrar/migrar el sistema viejo de "etiquetas" y dejar solo el nuevo de plantillas. (Riesgo: si ya hay datos asignados como etiquetas, se pierden / hay que migrarlos.)

**Opción B — coexistir:** Dejar la tabla vieja intacta (no se usa en UI) y construir el nuevo sistema en paralelo sobre `eventos` + nueva columna `categoria_personalizada_id`. La UI vieja de "etiquetas" desaparece de la vocalía y se reemplaza por el nuevo flujo de plantillas.

**Opción C — extender el modelo viejo:** Mantener `categorias_personalizadas` como tabla de categorías (renombrar `nombre_categoria` ya está bien), descartar `causas_en_categorias`, y agregar `categoria_personalizada_id` a `eventos`. Las "plantillas" se generan automáticamente al crear la categoría como `eventos` vacíos.

Mi recomendación: **Opción C**. Reusa la tabla existente, evita duplicar conceptos, y el sistema viejo de "etiquetas" parece estar sin UI activa (no encontré componentes que lo consuman; lo confirmo antes de borrar). Si confirmás C, sigo con el plan abajo.

---

### Sección 1 — Animaciones sutiles de fondo (sin preguntas)

Crear `<SubtleBackground />` reutilizable y montarlo en:

- `AuthScreen.tsx`
- `WelcomeNoTribunal.tsx` (cubre selector "crear o ingresar", form "crear tribunal", form "ingresar código" — los 3 viven en el mismo componente con estados `mode`)
- `BienvenidaTribunal.tsx`
- `pages/SignUp.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `AcceptInvitation.tsx` (para consistencia)

Implementación:

- CSS puro: 2–3 blobs `radial-gradient` con `@keyframes` lento (~30–40s) desplazándose y latiendo en opacidad. Sin canvas, sin librerías.
- Capa adicional de "polvo": ~25 `<span>` posicionados absolutamente, animados con `translate` + `opacity` lentísimo (>20s), `will-change: transform`, `pointer-events: none`.
- Tokens HSL: `hsl(var(--primary) / 0.05)` y `hsl(var(--gold) / 0.06)` — funcionan en claro y oscuro porque los tokens cambian.
- Mobile: `@media (max-width: 768px)` y `prefers-reduced-motion: reduce` → desactivar partículas (solo gradiente estático).
- Reemplaza los blobs hardcodeados que ya hay en esas pantallas para no duplicar.

### Sección 2 — Campo "Despachante" (sin preguntas)

- **Migración**: `ALTER TABLE causas ADD COLUMN despachante text` + `CHECK (despachante IS NULL OR length(despachante) <= 3)`.
- **Forms**: input opcional (3 chars, `maxLength=3`, sin transformar) en `CausaFormDialog.tsx` (sirve para crear y editar).
- **Tabla `CausasTable.tsx`**: agregar key `despachante` al schema de columnas, label "Despachante", al final del orden por defecto, **visible**. Aplicar el patrón de "one-time migration" en `localStorage` (flag `${storageKey}:despachante-default-applied`) idéntico al usado para `numeroInterno`, para no romper layouts existentes.
- Actualizar `causaMapper.ts`, `normalizarCausa.ts`, `useCausaMutations.ts`, `mockCausas.ts` para incluir el campo.

### Sección 3 — Categorías como plantilla (asumiendo Opción C)

**BD** (una migración):

```sql
ALTER TABLE eventos
  ADD COLUMN categoria_personalizada_id uuid
  REFERENCES categorias_personalizadas(id) ON DELETE CASCADE;
CREATE INDEX ON eventos(categoria_personalizada_id);
-- causas_en_categorias: drop si no tiene datos / no se usa.
```

**Crear categoría** (admin o miembro):

- Botón "Crear categoría" en la vista de la vocalía (ubicación a definir: panel lateral o sección dedicada en `VocaliaWorkspace`).
- Modal "Nombre de la categoría".
- Edge function o transacción RPC: `INSERT` en `categorias_personalizadas` + `INSERT` masivo en `eventos` (uno por cada causa **no terminada** de la vocalía) con `titulo = nombre`, `descripcion=NULL`, `fecha_hora=NULL`, `categoria_personalizada_id=<id>`.

**Editar entradas** en cada causa:

- En `AnotacionesSection.tsx` se renderizan junto al resto de eventos. Visualmente marcadas con un badge tipo "Categoría: X" para distinguirlas.
- Edición usa el form existente (`EventoFormInline`) — el usuario rellena `descripcion` y opcionalmente `fecha_hora`.
- Si tiene fecha → ya aparece en calendario gracias a hooks existentes.
- Botón "Agregar otra [nombre]" debajo del bloque de cada categoría → crea un nuevo evento vinculado al mismo `categoria_personalizada_id`.

**Borrar categoría**:

- Lista de categorías de la vocalía con botón "Borrar".
- Modal: "Se borrarán N anotaciones de M causas. No se puede deshacer."
  - `N = COUNT(eventos WHERE categoria_personalizada_id = X)`
  - `M = COUNT(DISTINCT causa_id ...)`
- `DELETE` en `categorias_personalizadas` (cascade borra eventos).

**Filtro de causas por categoría**:

- En la barra de filtros de las tablas de causas, agregar selector "Con entradas en categoría: [select]".
- Hook: `useCausasTramite` y compañía aceptan `categoriaFiltroId` y hacen `inner join` con `eventos` filtrando por esa categoría (al menos una entrada).
- Combinable con filtros actuales.

**RLS**: políticas en `eventos` ya cubren miembros de la vocalía vía `causa_id`. Para `categorias_personalizadas` confirmo políticas actuales y agrego `INSERT/DELETE` para cualquier miembro del tribunal de la vocalía.

---

### Orden de ejecución

1. **Confirmás Opción C** (o me decís A/B).
2. Migración BD (despachante + categoria_personalizada_id + drop opcional).
3. Animaciones de fondo (independiente).
4. Despachante en forms/tabla/mappers.
5. Categorías: backend (RPC para crear con bulk insert) → UI crear/listar/borrar → integración en `AnotacionesSection` → filtro en tablas.

¿Confirmás Opción C para las categorías y arranco?