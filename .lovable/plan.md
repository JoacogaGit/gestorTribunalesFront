# Ajustes de dashboard, Estadísticas y recarga

## Objetivo
- Hacer que el dashboard y sus tablas aprovechen toda la altura visible en ambos modos, con scroll interno estable.
- Mantener intacto el apartado de Estadísticas, pero cubrirlo temporalmente con un aviso centrado y bloquear toda interacción del contenido difuminado.
- Incorporar una acción de actualización disponible en todas las vistas principales.

## Cambios
1. Corregir la cadena de alturas del área principal y del dashboard para usar exactamente la pantalla disponible, evitando scrolls anidados que recortan la tabla.
2. Ajustar las listas para que hereden el espacio restante y mantengan su propia zona de desplazamiento.
3. En Estadísticas, envolver el contenido existente con desenfoque y bloqueo de interacción; superponer el cartel “Próximamente: Estadísticas” y el texto solicitado.
4. Centralizar la acción de recarga en el encabezado de cada vista, conectándola a la recarga específica cuando exista y usando una actualización general segura para las demás secciones.
5. Conservar los controles de zoom donde correspondan y evitar duplicar el botón dentro del calendario.

## Validación
- Comprobar tipos y pruebas existentes.
- Verificar que la aplicación cargue y que no se haya modificado ninguna Edge Function.
