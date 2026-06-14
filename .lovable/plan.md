# Plan: Google Login + Google Calendar Sync

## 1. Login con Google (rápido)

- En `AuthScreen.tsx`, agregar botón "Continuar con Google" debajo del form actual (no toco el login por email).
- Estilo oficial: fondo blanco, borde gris, logo G en colores, texto "Continuar con Google".
- Llama a `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`.
- El trigger `crear_perfil_al_registrarse` ya funciona con cualquier signup de `auth.users` (incluye OAuth), así que no toco nada de eso.

**Nota:** este login pide solo los scopes básicos (email/profile). NO sirve para acceder al Calendar — eso requiere un flujo OAuth separado (ver punto 2).

## 2. Vinculación Google Calendar — decisión de arquitectura

Esto es lo que necesito confirmar:

El provider Google de Supabase, tal como está configurado para login, **no devuelve refresh_token con scope de Calendar**. Para tener acceso persistente a la API de Google Calendar (poder crear/editar/borrar eventos incluso días después, y poder refrescar el token cuando expire), hay dos caminos:

**Opción A — OAuth manual separado (recomendado, lo que voy a hacer):**
- Botón "Vincular Google Calendar" abre un popup/redirect a `https://accounts.google.com/o/oauth2/v2/auth` directamente (sin pasar por Supabase Auth).
- Scopes: `https://www.googleapis.com/auth/calendar`, `access_type=offline`, `prompt=consent` (para forzar entrega de refresh_token).
- Callback va a una ruta nueva `/google-calendar-callback` que recibe el `code`, lo manda a una Edge Function que lo intercambia por `access_token` + `refresh_token` y guarda en `google_calendar_sync`.
- Esto es **independiente del login**: un usuario que entró con email/password también puede vincular su Calendar.
- **Requiere que vos crees credenciales OAuth en Google Cloud Console** (Client ID + Client Secret) y los guardes como secrets `GOOGLE_OAUTH_CLIENT_ID` y `GOOGLE_OAUTH_CLIENT_SECRET`. Las del provider de Supabase no me sirven porque el secret no es accesible desde edge functions.

**Opción B — Reusar el login de Google con scopes ampliados:**
- Modificar el botón de Google login para pedir scope de Calendar.
- Más simple pero acopla login a Calendar (el usuario que entra con Google le da permiso de Calendar incluso si no piensa vincularlo).
- Además sigue sin garantizar refresh_token persistente, depende de cómo Supabase exponga el provider token.

→ **Voy con Opción A.** Login y Calendar quedan desacoplados, como corresponde.

## 3. Base de datos

Migración con la tabla que pediste:

```sql
CREATE TABLE public.google_calendar_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vocalia_id uuid NOT NULL REFERENCES vocalias(id) ON DELETE CASCADE,
  google_calendar_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);
```

- GRANTs a `authenticated` y `service_role`.
- RLS: SELECT/UPDATE/DELETE solo cuando `user_id = auth.uid()`. INSERT también scoped al propio user (aunque el insert real lo hará la edge function con service_role).
- Realtime no necesario.

## 4. Edge Functions

Tres funciones nuevas en `supabase/functions/`:

### `google-calendar-oauth` (POST)
- Recibe `{ code, vocalia_id }` del callback.
- Intercambia `code` → tokens contra `https://oauth2.googleapis.com/token`.
- Crea calendario nuevo en Google: `POST /calendar/v3/calendars` con name "JusTrack - [nombre vocalía]".
- INSERT en `google_calendar_sync` (con service role).

### `google-calendar-sync` (POST)
- Recibe `{ action: 'create'|'update'|'delete', evento_id, causa_id }`.
- Busca la fila en `google_calendar_sync` para el user dueño (o miembros con vinculación) cuya `vocalia_id` matchee la causa.
- Refresca access_token si expiró (usando refresh_token).
- Llama a Google Calendar API:
  - **create:** título = solo `expediente`, descripción vacía o "Evento JusTrack", fecha del evento, `reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 4320 }, { method: 'popup', minutes: 1440 }, { method: 'popup', minutes: 60 }] }`.
  - **update / delete:** según corresponda. Guardo el `google_event_id` en una columna nueva de `eventos` (`google_event_id text`) para poder ubicar el evento remoto.
- Solo sincroniza eventos con `fecha_hora IS NOT NULL`.

### `google-calendar-unlink` (POST)
- Borra el calendario "JusTrack - [vocalía]" de Google (`DELETE /calendar/v3/calendars/{id}`).
- Revoca tokens (`POST https://oauth2.google.com/revoke`).
- DELETE de la fila en `google_calendar_sync`.

**Columna extra necesaria:** agregar `google_event_id text` a `eventos` (nullable) para mapear eventos JusTrack ↔ Google. Esto va en la misma migración.

## 5. Hooks de sincronización (frontend)

Modifico `useEventoMutations.ts`: después de cada create/update/delete exitoso, si el evento tiene `fecha_hora`, dispara `supabase.functions.invoke('google-calendar-sync', { body: { action, evento_id, causa_id } })`. Si falla, log silencioso (no rompo la operación principal). El edge function ya decide por sí mismo si hay vinculación activa para esa vocalía/usuario.

**Importante:** la sync es **por usuario vinculado**, no por evento. Si el usuario A vinculó Calendar para vocalía X, y el usuario B (miembro de la misma vocalía) crea un evento en X, ese evento se sincroniza al Calendar de A. La edge function busca todas las filas `google_calendar_sync` activas con esa `vocalia_id` y propaga a cada una.

## 6. UI — Configuración Google Calendar

Nuevo componente `GoogleCalendarSection.tsx`, integrado en `UserMenu.tsx` dentro de una nueva sección del diálogo de perfil (o un diálogo separado abierto desde un item del menú "Google Calendar").

Estados:
- **No vinculado:** muestra el mensaje informativo que pediste textualmente, selector de vocalía (de las que el user es miembro), botón "Vincular Google Calendar".
- **Vinculado:** "✅ Vinculado a [vocalía]" + botón "Desvincular" → AlertDialog de confirmación.

## 7. Abandonar tribunal → desvincular automáticamente

En `useMembresias.ts` (o donde esté la lógica de abandonar), si el user tiene vinculación a una vocalía del tribunal que abandona, llamo `google-calendar-unlink` antes de salir.

## 8. Lo que NECESITO de vos antes de implementar

Para que el OAuth con Calendar funcione necesito **credenciales OAuth propias en Google Cloud** (las del provider de Supabase no son reutilizables desde edge functions). Pasos:

1. Ir a https://console.cloud.google.com/apis/credentials
2. Crear "OAuth 2.0 Client ID" tipo "Web application".
3. Authorized redirect URI: `https://justrackk.lovable.app/google-calendar-callback` (y también la preview URL si querés probar ahí).
4. Habilitar "Google Calendar API" en la library.
5. Pasarme Client ID + Client Secret para guardarlos como secrets.

¿Confirmás que arrancamos con Opción A y que vas a generar las credenciales OAuth? Si querés evito el paso de credenciales propias y vamos con Opción B (más limitada), avisame.
