# Plan: Autenticación funcional con Supabase

Conectar el `AuthScreen` existente (sin tocar su diseño) a Supabase Auth, crear las pantallas faltantes con la misma estética (`elevated-card`, gradientes, ícono `Scale`, fuente `font-display`) y centralizar la sesión en un `AuthContext`.

## 1. AuthContext + protección de rutas

**Nuevo `src/context/AuthContext.tsx`**
- Estado: `user` (id, email, nombre desde `user_metadata.full_name`), `session`, `loading`.
- En el mount: primero `supabase.auth.onAuthStateChange(...)`, luego `getSession()` (orden requerido para evitar deadlocks).
- Expone `logout()` que hace `signOut()` + `clearVocalia()`.
- Hook `useAuth()`.

**`src/App.tsx`**
- Envolver el árbol con `<AuthProvider>` dentro de `BrowserRouter`.
- Agregar rutas:
  - `/` → flujo principal (Index)
  - `/auth` (login), `/signup`, `/forgot-password`, `/reset-password`
  - Las nuevas son públicas; `/` se protege según sesión.

**`src/pages/Index.tsx`**
- Reemplazar el `useState<user>` local por `useAuth()`.
- Si `loading` → spinner de pantalla completa.
- Si no hay sesión → `<Navigate to="/auth" />`.
- Si hay sesión: consultar membresías (ver paso 5) y decidir entre Bienvenida, Selector de vocalías o Workspace.

## 2. Conectar el login existente (`AuthScreen.tsx`)

Mantener intacto el JSX visual. Cambios funcionales solamente:
- Eliminar las tabs login/signup y el botón Google (TAREA 1.4 + se mueve registro a página propia).
- En `handleSubmit`: `await supabase.auth.signInWithPassword({ email, password })`.
- Mapeo de errores:
  - `Invalid login credentials` → "Email o contraseña incorrectos."
  - `Email not confirmed` → "Tu cuenta no está verificada. Revisá tu casilla de mail."
  - resto → "Ocurrió un error. Intentá de nuevo."
- Loading state en el botón principal.
- Reemplazar el footer "¿No tenés cuenta?" por `<Link to="/signup">Registrate</Link>`.
- Reemplazar "¿Olvidaste tu contraseña?" por `<Link to="/forgot-password">`.
- Tras login exitoso → `navigate("/")`.

## 3. Pantallas nuevas (mismo layout que `AuthScreen`)

Reutilizar la cáscara visual: gradient surface + blobs + `elevated-card` + header con `Scale` + título "JusTrack". Crear:

- **`src/pages/SignUp.tsx`** — campos nombre/email/password/confirmar. Valida formato, ≥8 chars, coincidencia. `signUp({ email, password, options: { data: { full_name }, emailRedirectTo: window.location.origin } })`. Tras éxito muestra estado "verificación enviada" + botón "Volver al login". Link al login.
- **`src/pages/ForgotPassword.tsx`** — email + `resetPasswordForEmail(email, { redirectTo: ${origin}/reset-password })`. Mensaje genérico siempre. Link al login.
- **`src/pages/ResetPassword.tsx`** — Supabase ya crea sesión via el link `type=recovery`. Form de nueva contraseña (≥8) + confirmar. `updateUser({ password })`. Éxito → `signOut()` + redirige a `/auth` con toast "Contraseña actualizada…".

## 4. Pantalla de Bienvenida (sin tribunal)

**Nuevo `src/components/WelcomeNoTribunal.tsx`** (reemplaza/complementa el `WelcomeModal` actual cuando el usuario no es miembro de ningún tribunal).

Layout coherente con login. Tres acciones:
- **Crear mi tribunal** → input nombre → `supabase.rpc('crear_tribunal', { p_nombre })` → flujo de crear vocalía inicial (paso 6).
- **Unirme con código** → input 8 chars → `supabase.rpc('unirse_por_codigo', { p_codigo })`.
- **Tengo un token de invitación** (link discreto / accordion) → `supabase.rpc('aceptar_invitacion', { p_token })`.
- Footer: "Cerrar sesión" → `logout()`.

Tras cualquier éxito: invalidar la query de membresías; `Index` re-evalúa y muestra el `VocaliaSelector`.

## 5. Decisión post-login en `Index`

Nuevo hook `src/hooks/useMembresias.ts`:
```ts
supabase.from('miembros_tribunal').select('tribunal_id').eq('usuario_id', user.id)
```
- `loading` → spinner.
- `count === 0` → `<WelcomeNoTribunal />`.
- `count >= 1` → flujo actual (`VocaliaSelector` → `VocaliaWorkspace`).

## 6. Vocalía inicial (post crear tribunal)

Componente inline tras `crear_tribunal`:
- Texto "Tu tribunal está creado. Creá tu primera vocalía…"
- Input nombre → `supabase.from('vocalias').insert({ tribunal_id, nombre })`.
- Refetch de vocalías y caer en el selector.

## 7. Logout

- `VocaliaSelector` → el botón "Volver al inicio de sesión" llama `useAuth().logout()`.
- `VocaliaWorkspace` → el `onLogout` existente también pasa por `logout()`.
- Limpia `vocalia` actual y navega a `/auth`.

## Notas técnicas

- El trigger `trg_crear_perfil` ya inserta en `perfiles`; no se duplica desde el front.
- Las políticas `dev_*` siguen activas: el plan no toca RLS ni crea tablas.
- Toda llamada async usa loading state + manejo de error con `toast`.
- Mobile-friendly heredado del layout actual de `AuthScreen`.
- No se agrega Google OAuth (queda removido el botón existente para evitar UX rota).

## Archivos

**Nuevos:** `src/context/AuthContext.tsx`, `src/pages/SignUp.tsx`, `src/pages/ForgotPassword.tsx`, `src/pages/ResetPassword.tsx`, `src/components/WelcomeNoTribunal.tsx`, `src/hooks/useMembresias.ts`.

**Editados:** `src/App.tsx` (provider + rutas), `src/pages/Index.tsx` (usa `useAuth` + `useMembresias`), `src/components/AuthScreen.tsx` (conecta a Supabase, quita tabs/Google, agrega links a /signup y /forgot-password), `src/components/VocaliaSelector.tsx` (logout via context).
