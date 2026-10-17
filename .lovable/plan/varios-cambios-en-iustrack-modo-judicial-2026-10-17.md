# Varios cambios en IusTrack (modo judicial)

11 cambios pedidos por archivo. Solo el punto 8 toca una Edge Function (google-calendar-sync), con autorización explícita del usuario. Ninguna otra función externa se modifica.

## Cambios de base de datos (migraciones)

1. **Causa secreta**: nueva columna `causas.secreta` (sí/no). Reglas de acceso: solo el administrador de la oficina ve causas secretas; para el resto quedan excluidas de listas, dashboard, búsqueda y relevamientos. El admin las ve con un indicador "Secreta".
2. **Contraseña de espacio (suboficina)**: nueva columna en `vocalias` con la contraseña guardada de forma segura (hash). Función segura para verificarla sin exponerla. El admin la define y puede quitarla.
3. **Permisos por lista del tablero**: nueva columna en `tablero_listas` con la lista de usuarios habilitados a editarla (vacía = todos los que hoy pueden). Reglas de acceso actualizadas para respetar ese límite.
4. **Opciones de listas personalizadas**: nuevas columnas en `listas_personalizadas`: `seleccionable_click_derecho` (sí/no), `mostrar_en_calendario` (sí/no), `solo_admin` (sí/no). La opción "de qué lista desaparece" ya existe (`oculta_de`).

## Cambios de pantalla

5. **Filtro por despachante en anotaciones**: en el tablero de anotaciones, filtro por el responsable/despachante de la causa vinculada a cada anotación.
6. **Causa secreta (acciones)**: marcar/desmarcar desde el menú de la causa (solo admin); indicador visual para el admin.
7. **Contraseña de espacio (flujo)**: al unirse con código se pide también la contraseña si el espacio la tiene; al abrir un espacio con candado se pide la contraseña una vez por sesión.
8. **Click derecho**: agregar "Para sacar sentencia" y "Para comunicar" al menú contextual de la causa; respetar `seleccionable_click_derecho` de las listas.
9. **Calendario**: incluir eventos de causas en "Para sacar sentencia" y "Para comunicar"; excluir eventos de causas en listas con `mostrar_en_calendario` apagado.
10. **Dashboard**: incluir causas en "Para sacar sentencia" y "Para comunicar".
11. **Crear lista**: el diálogo de nueva lista suma las tres opciones nuevas (click derecho, calendario, visibilidad por rol) además de la existente de ocultar de otras pestañas.
12. **Buscador en móvil**: al tocar la búsqueda en teléfono, la barra baja sobre el teclado y los resultados se muestran arriba sin tapar las causas.
13. **Quitar botón "Ocultar flagrancia"** de las listas de causas.

## Sincronización con Google Calendar (punto 8, autorizado)

- Al eliminar un evento, se borra también en Google Calendar.
- Al mover una causa a una lista con `mostrar_en_calendario` apagado, sus eventos sincronizados se borran de Google Calendar; al volver a una lista con calendario, se vuelven a crear.

## Verificación

- Typecheck, ESLint y build.
- Pruebas de reglas nuevas (secreta excluida para no-admin, permisos por lista).
- Se avisará qué no se pudo verificar en pantalla por falta de sesión.
