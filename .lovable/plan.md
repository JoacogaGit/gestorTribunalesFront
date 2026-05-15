## Tarea 1 — Invitaciones y gestión de miembros

### 1.1 Detección de rol admin
- Nuevo hook `src/hooks/useRolTribunal.ts`: query a `miembros_tribunal` por `tribunal_id` + `usuario_id = auth.uid()` → devuelve `{ rol: 'admin' | 'miembro' | null, loading }`.
- `VocaliaWorkspace` lo consume (con `tribunalId` actual) y lo pasa a `AppSidebar` como `esAdmin`.

### 1.2 Sidebar
- En `AppSidebar`, agregar item `{ id: "miembros", label: "Miembros del tribunal", icon: Users }` al final de `defaultNavItems`, renderizado solo si `esAdmin`.

### 1.3 Pantalla "Miembros del tribunal"
Nuevo componente `src/components/MiembrosTribunal.tsx`, montado cuando `view === "miembros"` en `VocaliaWorkspace`.

Hooks nuevos:
- `useTribunal(tribunalId)` — `SELECT nombre, codigo_acceso FROM tribunales WHERE id = ?`.
- `useMiembrosTribunal(tribunalId)` — JOIN `miembros_tribunal` ↔ `perfiles` → `{ id, nombre, email, rol, created_at }[]`. Expone `refetch`, `cambiarRol(usuarioId, nuevoRol)`, `quitarMiembro(usuarioId)`.
- `useInvitaciones(tribunalId)` — `SELECT * FROM invitaciones WHERE tribunal_id = ? AND usado = false AND expira_en > now()`. Expone `refetch`, `crear({email, rol})`, `cancelar(id)`, `reenviar(id)`.

Layout:
- Header: nombre del tribunal + tarjeta destacada con `codigo_acceso` (mono, grande) + botón Copiar (clipboard + toast).
- Tabla "Miembros actuales": Nombre / Email / Rol (Badge) / Ingreso. Acciones por fila vía DropdownMenu o botones:
  - "Cambiar rol" → AlertDialog → UPDATE. Bloqueado si es el último admin y se intenta degradar, y bloqueado para auto-degradación cuando es único admin.
  - "Quitar del tribunal" (rojo) → AlertDialog → DELETE. Bloqueado si es el propio usuario o si es el último admin (mensaje claro).
- Sección "Invitaciones pendientes": tabla Email / Rol / Creada / Expira / Estado (badge "Vigente" o "Por vencer" si `<2 días`). Acciones: Copiar link (`${origin}/invitacion/${token}`), Reenviar mail, Cancelar.
- Botón destacado `+ Invitar miembro` arriba a la derecha → abre `Dialog`:
  - Email (zod: email, max 255), Select Rol (`miembro` default, `admin`), nota explicativa.
  - Checkbox "Enviar mail" (default on) — en esta iteración (ver 1.5) se ignora si la edge function no existe y siempre se muestra el link.
  - Botón "Generar invitación" → INSERT (RLS valida admin) → invocar edge function si corresponde → pantalla de éxito con link copiable y email destinatario.

### 1.4 Aceptación de invitación
Nueva ruta `/invitacion/:token` en `App.tsx` → `src/pages/AcceptInvitation.tsx`.
- Si no hay sesión: pantalla con dos botones grandes (Iniciar sesión / Registrarme). Antes de redirigir a `/auth` o `/signup`, guardar `localStorage.setItem("pending_invitation_token", token)`.
- Tras login (en `AuthContext` post-`SIGNED_IN` o en `Index`), si existe el token pendiente: navegar a `/invitacion/:token` y limpiar el storage.
- Si hay sesión: leer datos de la invitación (`SELECT i.*, t.nombre tribunal_nombre FROM invitaciones i JOIN tribunales t ON t.id = i.tribunal_id WHERE token = ?`) → si RLS no la deja leer, intentar igualmente el RPC de aceptación. Mostrar tarjeta "Te invitaron a [tribunal] como [rol]" + botones Aceptar / Rechazar.
- Aceptar: `supabase.rpc("aceptar_invitacion", { p_token: token })`. Manejar errores: invitación inválida/expirada, ya miembro (mensaje + botón "Ir al tribunal"). Tras éxito: invalidar `useMembresias` y navegar a `/`.
- Rechazar: navegar a `/`.

### 1.5 Edge Function `send-invitation-email`
- Crear `supabase/functions/send-invitation-email/index.ts`.
- Recibe `{ invitacion_id }`, valida JWT del caller, lee invitación con service role, arma HTML con asunto "Te invitaron a [tribunal] en JusTrack" y CTA al link `${origin}/invitacion/${token}`.
- Implementación inicial: usar `auth.admin.inviteUserByEmail` no aplica (es para signup); en su lugar, primer envío vía **Resend si está configurado** — comprobar `Deno.env.get("RESEND_API_KEY")`. Si no está, retornar `{ ok: true, sent: false, reason: "no_email_provider" }`.
- En el frontend, si `sent === false`, el modal de éxito muestra: "El mail no se envió automáticamente; copiá y enviá el link manualmente." Esto cumple la nota técnica del brief sin bloquear la entrega.
- (Opcional, fuera de scope inicial) si el usuario ya tiene una API key de Resend la sumamos; documentar en el modal.

## Tarea 2 — Anotaciones en columna "Agenda"

- Nuevo hook `src/hooks/useProximasAnotacionesPorCausa.ts`: dada una lista de `causaIds`, hace `SELECT id, causa_id, titulo, fecha_hora FROM eventos WHERE causa_id IN (...) AND fecha_hora IS NOT NULL`. Devuelve `Map<causaId, { proxima: Evento, total: number }>` calculando la próxima fecha futura (o, si no hay, la más reciente pasada). Se suscribe a `eventosBus` para refetch automático.
- En `CausasTable` (y `DetenidosList` si reusa misma columna), localizar la columna "Agenda" actual y renderizar:
  - `proxima.titulo` truncado, `fecha` `DD/MM/AAAA` con clases del semáforo (`getSemaforoBg/Text`).
  - Si `total > 1`: badge `+{total - 1}`.
  - Si no hay: `—`.
- No tocar la columna "Juicios y audiencias" si existe.

## Tarea 3 — Fix: el panel se cierra al guardar anotación

Causa: `AnotacionesSection` llama `onMutated` (prop del `CausaFormDialog`), que en las tablas dispara `refetch` de la lista; el array de causas se recrea, el `selectedCausa` queda con referencia vieja, y el `Dialog` se desmonta/cierra.

Fix:
- En `AnotacionesSection`, **no propagar `onMutated`** hacia el padre tras crear/editar/borrar eventos. La sincronización con calendario/dashboard ya ocurre vía `eventosBus`. La lista local se refresca con `refetch()` interno.
- Quitar la prop `onMutated` del componente (o dejarla unused) y eliminar su pase desde `CausaFormDialog` (línea 431).
- Verificar que tras el cambio el dialog padre no recibe ningún evento de cierre cuando se mutan eventos.

## Tarea 4 — Tarjeta de vocalía clickeable

En `VocaliaSelector.tsx`:
- Convertir el `<div className="glass-card …">` de cada vocalía en un elemento clickeable con `role="button"`, `tabIndex={0}`, `cursor-pointer`, y `onClick={() => handleSelect(v)}` (también `onKeyDown` Enter/Space).
- En el botón de lápiz (editar) y en los inputs/botones de confirmar/cancelar edición: `onClick={(e) => { e.stopPropagation(); … }}`.
- Si `editingId === v.id`, desactivar el `onClick` de la tarjeta (no entrar mientras se renombra).
- El botón "Entrar" se mantiene tal cual (también `stopPropagation` para no duplicar la navegación, aunque idempotente).
- El botón "Volver al inicio de sesión" está fuera de la tarjeta, no requiere cambios.

## Detalles técnicos

- Sin cambios de schema ni RLS. Las RLS existentes ya permiten al admin ver/insertar/actualizar/eliminar `miembros_tribunal`, `invitaciones` y leer `tribunales`.
- Patrón hook + mapper en todos los hooks nuevos. Loading states en cada acción. Mensajes de error humanizados.
- Mobile: tablas con `overflow-x-auto`; modal de invitar usa el `Dialog` shadcn standard.
- La protección real es RLS; el frontend solo oculta UI cuando `rol !== 'admin'`.

## Archivos

Nuevos:
- `src/hooks/useRolTribunal.ts`
- `src/hooks/useTribunal.ts`
- `src/hooks/useMiembrosTribunal.ts`
- `src/hooks/useInvitaciones.ts`
- `src/hooks/useProximasAnotacionesPorCausa.ts`
- `src/components/MiembrosTribunal.tsx`
- `src/components/forms/InvitarMiembroDialog.tsx`
- `src/pages/AcceptInvitation.tsx`
- `supabase/functions/send-invitation-email/index.ts`

Editados:
- `src/App.tsx` (ruta `/invitacion/:token`)
- `src/components/AppSidebar.tsx` (item Miembros condicional)
- `src/components/VocaliaWorkspace.tsx` (vista miembros, prop esAdmin)
- `src/components/VocaliaSelector.tsx` (tarjeta clickeable)
- `src/components/CausasTable.tsx` (columna Agenda con próxima anotación)
- `src/components/DetenidosList.tsx` (idem si aplica)
- `src/components/forms/AnotacionesSection.tsx` (no propagar onMutated)
- `src/components/forms/CausaFormDialog.tsx` (quitar onMutated del AnotacionesSection)
- `src/context/AuthContext.tsx` o `src/pages/Index.tsx` (rescatar `pending_invitation_token` post-login)
