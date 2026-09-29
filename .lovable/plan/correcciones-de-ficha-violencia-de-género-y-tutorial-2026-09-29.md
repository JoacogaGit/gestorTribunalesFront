# Correcciones de ficha, violencia de género y tutorial

## Cambios
1. Convertir la carga de carátula Lex100 en una zona que acepte tanto selección como arrastrar y soltar un único PDF, reutilizando la lectura actual y manteniendo la carga manual ante errores.
2. Quitar el marcado de violencia de género de la causa y agregarlo dentro de cada imputado, junto al delito, con su selector de tipo y persistencia en los campos ya disponibles de `sujetos`.
3. Actualizar consultas y presentación para que el indicador VG de una causa se derive de sus imputados, sin depender de los campos anteriores de la causa.
4. Cambiar el bloque de Violencia de género del relevamiento para contar una causa si tiene al menos un imputado marcado. Una misma causa se contará una sola vez por cada tipo presente entre sus imputados.
5. Corregir la demostración de mover categorías calculando la posición real del encabezado y animando el elemento centrado, incluida la vuelta a su ubicación inicial.
6. En los pasos de ficha y miembros, quitar el oscurecimiento o desenfoque del contenido señalado para que la ficha, el código y la lista permanezcan claros.

## Conservación
- Cerrar la ficha tocando fuera seguirá descartando los cambios.
- No se modificará ninguna Edge Function.

## Verificación
- Revisar tipos, pruebas y carga de la aplicación.
- Comprobar visualmente el arrastre del PDF y los tres pasos del tutorial cuando la sesión disponible lo permita.
