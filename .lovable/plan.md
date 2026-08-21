# Logo limpio de IusTrack

## Objetivo
Generar una versión limpia del ícono de IusTrack a partir de la imagen de referencia subida: balanza blanca centrada dentro de un cuadrado con esquinas redondeadas de color naranja/ámbar, sin texto ni elementos adicionales.

## Entregables
1. Imagen del ícono en alta resolución (1024×1024 px, PNG).
2. Variante con fondo transparente para usar como asset de marca.
3. Favicon generado a partir del mismo ícono (64×64 px PNG en `public/`) y referenciado en `index.html`.

## Detalles técnicos
- Usar `generate_image` con calidad `premium` para obtener bordes nítidos del ícono.
- Ajustar el favicon con ImageMagick para que sea cuadrado y proporcionado.
- Eliminar el favicon por defecto de Lovable (`public/favicon.ico`).

## No incluye
- Cambios de diseño en la app.
- Modificaciones al nombre o tipografía de IusTrack.
