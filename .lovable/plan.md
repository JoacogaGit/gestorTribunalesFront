# Correcciones del tutorial interactivo

## Objetivo
Corregir los controles y la presentación del recorrido sin modificar funciones externas ni lógica de datos.

## Cambios
- Integrar una cruz pequeña de salida dentro de cada recuadro del tutorial, siempre visible y clickeable; al salir, mantener el aviso para reabrirlo desde `?`.
- Aplicar el tema verde únicamente al paso “¿Y dónde vive todo esto?”, centrar ese recuadro y desenfocar el resto de la pantalla; limpiar esas clases antes de mostrar el paso siguiente.
- Reemplazar los recuadros que cubren la ficha por ayudas externas conectadas visualmente a campos concretos. Las tarjetas se distribuirán alrededor de la ficha, con líneas y puntas de flecha recalculadas al cambiar tamaño o desplazarse.
- Mantener una alternativa compacta en pantallas pequeñas para evitar superposiciones.

## Verificación
- Comprobar navegación hacia adelante y atrás, salida desde distintos pasos y restauración del estilo normal después de Supabase.
- Revisar que las ayudas no tapen los campos de la ficha y que el tutorial siga funcionando con distintos tamaños de pantalla.
- Confirmar que la app compile sin errores y que ninguna Edge Function haya cambiado.
