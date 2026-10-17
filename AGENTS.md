# Project architecture decisions

- Tutorial field explanations use transient DOM overlays with viewport-level connectors, because they must point to live form controls without covering the form.
- Relevamiento charts use React Three Fiber procedural scenes, because each saved block needs an interactive 3D visualization without external assets.
- Tutorial responsible-filter demonstrations use a transient event-driven override in the existing filter hook, because they must filter real rows without overwriting the user's selection or opening blocking menus.- Las contraseñas de espacios viven en `vocalia_passwords` (sin acceso directo; solo vía RPCs `definir/verificar/vocalia_tiene_password`), porque el hash no debe exponerse a miembros.
- La visibilidad de causas secretas y de listas `solo_admin` se resuelve en RLS (helper `es_admin_de_vocalia`), porque así estadísticas y búsquedas quedan cubiertas sin filtros en el cliente.
- La sincronización puntual con Google Calendar se dispara fire-and-forget desde el cliente (`src/lib/gcalSync.ts`, `fireSync` en hooks), porque la Edge Function resuelve tokens y no debe bloquear la UI.
