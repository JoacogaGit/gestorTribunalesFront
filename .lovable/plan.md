
# Plan: Miembros + columnas + edge function de invitaciones

## Tarea 1 — Cablear pantalla de Miembros del Tribunal

**`src/components/VocaliaWorkspace.tsx`**
- Importar y usar `useRolTribunal(tribunalId)` → `esAdmin`.
- Pasar `esAdmin` como prop a `<AppSidebar>`.
- Agregar bloque de render para `view === "miembros"`:
  - Si `esAdmin`: renderizar `<MiembrosTribunal tribunalId={tribunalId} />`.
  - Si no: mostrar mensaje "No tenés permisos para ver esta sección" + `useEffect` que haga `setView("dashboard")` automáticamente (pequeño delay con toast).
- Título por defecto para `miembros`: "Miembros del tribunal".

**`src/components/AppSidebar.tsx`**
- Ya recibe `esAdmin?: boolean` y oculta el item correctamente. Sin cambios.

## Tarea 2 — Reorganizar columnas en tablas de causas

**`src/hooks/useProximasAnotacionesPorCausa.ts`**
- Cambiar el tipo devuelto a:
  ```ts
  interface AnotacionResumen {
    proximaConFecha?: { id; titulo; fecha_hora };
    totalConFecha: number;
    proximaSinFecha?: { id; titulo; created_at };
    totalSinFecha: number;
  }
  ```
- Quitar el filtro `.not("fecha_hora", "is", null)` para traer también las sin fecha; agregar `created_at` al select.
- Agrupar por causa, separar en dos buckets (con/sin fecha), elegir próxima de cada uno (con fecha: futura más cercana o pasada más reciente; sin fecha: `created_at` desc).

**`src/components/CausasTable.tsx`**
- Eliminar la columna `juicios` (Juicios y Audiencias) del array `allColumns`.
- Reemplazar la columna `agenda` por dos columnas nuevas, en este orden:
  1. **`eventosConFecha`** — "Eventos con fecha": muestra `proximaConFecha.titulo` truncado + `fmtDate` con `getSemaforoText`. Badge `+N` si `totalConFecha > 1`. `—` si no hay. Conserva el legacy `c.agenda` apilado debajo (mismo patrón actual) para no romper datos mock.
  2. **`notas`** — "Notas": muestra `proximaSinFecha.titulo` truncado, sin fecha ni semáforo. Badge `+N` si `totalSinFecha > 1`. `—` si no hay.
- Posición: ambas donde estaba "Agenda" (en lugar de la columna eliminada `agenda`).
- `sortValue` de "Eventos con fecha" usa fecha de `proximaConFecha`; el de "Notas" usa `created_at` de `proximaSinFecha`.
- Limpiar `localStorage` de `cols-hidden-*` no es necesario; si el usuario tenía oculta `agenda`/`juicios`, simplemente quedará sin efecto.

**`src/components/DetenidosList.tsx`**
- Si reusa `CausasTable`, queda automático. Si tiene su propia tabla, replicar mismo cambio (eliminar juicios, separar agenda en dos). Verificar al implementar.

## Tarea 3 — Edge function `send-invitation-email`

**`supabase/functions/send-invitation-email/index.ts`** (deploy automático)
- CORS handlers (OPTIONS).
- Validar JWT del caller con `supabase.auth.getUser(token)`. Si falta → 401.
- Validar body: `{ invitacion_id: string }` con zod.
- Cliente service-role para:
  - `SELECT token, email_invitado, rol_a_asignar, tribunal_id, expira_en, usado FROM invitaciones WHERE id = ?`. Si no existe / usada / expirada → 400 con mensaje claro.
  - `SELECT nombre FROM tribunales WHERE id = ?`.
- Construir HTML con paleta del login (fondo oscuro #0F1B3D estilo / acentos dorados), botón CTA grande con `${ORIGIN}/invitacion/${token}`. Origin = `req.headers.get("origin")` o `Deno.env.get("APP_URL")` fallback.
- Mencionar rol asignado y "Este link expira en 7 días."
- Envío:
  - Si `RESEND_API_KEY` está set: `POST https://api.resend.com/emails` con `from: "JusTrack <onboarding@resend.dev>"`, `to`, `subject`, `html`. Si OK → `{ ok: true, sent: true }`. Si falla → `{ ok: true, sent: false, reason: "send_failed", error }`.
  - Si no está set: `{ ok: true, sent: false, reason: "no_email_provider" }`.
- Subject: `Te invitaron a ${tribunal.nombre} en JusTrack`.

**Configuración**
- `RESEND_API_KEY` es opcional. Si el usuario quiere envío real, después puede agregarla via secrets. Por ahora el flujo funciona sin ella (frontend ya muestra link manualmente cuando `sent: false`).
- No requiere `verify_jwt = false`; valida JWT en código.

## Archivos tocados

- **Editados**: `src/components/VocaliaWorkspace.tsx`, `src/components/CausasTable.tsx`, `src/hooks/useProximasAnotacionesPorCausa.ts`, posiblemente `src/components/DetenidosList.tsx`.
- **Creados**: `supabase/functions/send-invitation-email/index.ts`.

## Reglas

Sin cambios de schema/RLS. Patrón hook+mapper. Loading states, errores claros, mobile-friendly.
