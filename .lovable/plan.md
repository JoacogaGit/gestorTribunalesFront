# Rediseño de Estadísticas y relevamientos

## Resultado
Un panel ejecutivo especial, oscuro y violeta, con acentos dorados de IusTrack, que combina lectura visual y gestión de datos.

## Implementación
- Aplicar una superficie galáctica propia al apartado, con título y subtítulo centrados.
- Agregar bienvenida inicial con las acciones “Entendido” y “No mostrar de nuevo”, persistiendo la preferencia por usuario/navegador.
- Incorporar selector global Mensual, Trimestral y Rango libre; todos los indicadores y gráficos responderán al período elegido.
- Mostrar tarjetas por métrica con último valor del período, unidad, variación porcentual contra el período anterior y etiqueta automática cuando corresponda.
- Agregar visualizaciones con Recharts:
  - línea para evolución temporal de una métrica seleccionada;
  - barras para comparar métricas en el período;
  - torta para composición proporcional.
- Mantener crear, editar y eliminar métricas; cargar, editar y borrar datos; vincular causas; y copiar configuración de otro espacio.
- Integrar la tabla de datos debajo de los gráficos con el mismo lenguaje visual.

## Detalles técnicos
- Los cálculos se harán en el navegador desde `metricas` y `metricas_datos`, sin cambios en funciones externas.
- Los colores especiales se definirán como variables semánticas del panel para mantener consistencia.
- Los gráficos tendrán estados vacíos, ayudas visuales accesibles y adaptación a pantallas angostas.
- Se verificará el tipado y la vista en escritorio y móvil.
