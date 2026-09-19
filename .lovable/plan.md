# Panel lateral y listas

## Cambios
- Restaurar el alto flexible y el scroll vertical interno de la vista Detenidos, tanto en escritorio como en móvil.
- Reordenar el panel lateral para que, después de Flagrancia, aparezcan Causas Terminadas y luego las listas personalizadas.
- Agregar un control “Personalizar listas” en el panel lateral con casillas para mostrar u ocultar las pestañas disponibles.
- Guardar la selección en el navegador con una clave específica del usuario, manteniendo siempre accesible el control para reactivar pestañas.
- Si se oculta la pestaña actualmente abierta, volver al Dashboard para evitar una vista inaccesible.

## Alcance técnico
- Los cambios quedarán limitados al panel lateral y al contenedor visual de Detenidos.
- Las listas personalizadas también podrán ocultarse individualmente.
- No se modificarán Edge Functions ni datos de Supabase.

## Verificación
- Comprobar tipos y lint.
- Verificar que la aplicación responda correctamente y que el orden/personalización persistan tras recargar.
