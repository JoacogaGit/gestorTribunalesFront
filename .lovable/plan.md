## Plan

1. **Ajustar tamaño de lotes**
   - En `src/lib/dividirEnLotes.ts`, cambiar `TAMANO_LOTE` de `25` a `8`.
   - Cambiar `MIN_FILAS_LOTE` de `5` a `2`.
   - Mantener intacta la lógica de división, reintento adaptativo y deduplicación.

2. **Agregar estado visual de progreso sin cambiar el flujo**
   - En `src/components/WizardMigracion.tsx`, añadir cálculo de porcentaje, lotes completados/fallidos/pendientes/en curso y pestaña activa.
   - Añadir contador de tiempo transcurrido durante el procesamiento con formato `m:ss`.
   - Añadir rotación de mensajes cálidos mientras procesa.
   - Añadir un breve estado de éxito antes de pasar automáticamente a revisión cuando todos los lotes terminan OK.

3. **Rediseñar Paso de progreso**
   - Reemplazar la lista actual por un encabezado con barra de progreso general animada, porcentaje y texto tipo `Procesando 18 de 35 lotes...`.
   - Agrupar por pestaña en cards visuales con nombre, cantidad de lotes y estado general: pendiente, procesando, completado o con errores.
   - Marcar la card activa con pulso/brillo sutil usando tokens existentes (`accent`, `border`, `card`, `muted`, `alert-*`).
   - Mostrar cada lote como bullet circular: gris pendiente, azul/acento con spinner procesando, verde check OK, rojo X error.
   - Mantener errores detallados por lote debajo del card cuando existan.

4. **Mejorar finalización y errores**
   - Si todo termina OK, mostrar check grande/animado suave durante un momento antes de la pantalla de revisión.
   - Si quedan lotes fallidos, mostrar banner rojo suave y botón destacado `Reintentar fallidos (N)`.
   - Conservar los botones existentes para descartar y continuar con resultados OK.

5. **Compatibilidad visual y responsive**
   - Usar solo tokens semánticos y componentes existentes (`Card`, `Progress`, `Badge`, `Button`, `Alert`).
   - Mantener diseño mobile-friendly con scroll interno para muchos lotes/pestañas.
   - No tocar system prompt, edge function, UI de revisión, deduplicación ni estructura de persistencia.