# Mejoras de Estadísticas y relevamientos

## Resultado
El relevamiento permitirá corregir cifras automáticas sin perder el valor calculado, visualizar sus cinco bloques mediante gráficos 3D y descargar una planilla básica.

## Implementación
- Guardar por separado los ajustes manuales de cada celda automática y mostrar el valor final como calculado más ajuste. Las celdas ajustadas quedarán identificadas visualmente y mostrarán el detalle del cálculo.
- Al cerrar un relevamiento, congelar los valores finales —incluidos los ajustes— para conservar exactamente lo revisado por el usuario.
- Reemplazar los controles numéricos actuales por steppers compactos, modernos y claros, permitiendo sumar y restar en automático y cargar valores no negativos en manual.
- Agregar junto a “Cerrar relevamiento” los botones “Ver gráficos” y “Exportar a Excel”.
- Mostrar una vista de gráficos con profundidad 3D y paleta violeta/dorada, con una visualización distinta para Causas, Resoluciones, Hábeas corpus, Flagrancia y Violencia de género.
- Generar una exportación básica `.xlsx` con una hoja de resumen y una hoja por bloque, incluyendo valores calculados, ajustes y valores finales cuando corresponda.
- Centrar los títulos y subtítulos de los bloques, quitar la numeración inicial y usar tipografía sans-serif limpia en todos los títulos de esta sección.

## Detalles técnicos
- Los ajustes se conservarán dentro de los datos existentes del relevamiento, sin agregar tablas ni modificar funciones externas.
- Los gráficos usarán una escena 3D interactiva por bloque, con alternativa estática si el dispositivo pide reducir movimiento.
- La exportación se hará desde el navegador y tomará los mismos valores finales visibles en pantalla.
- Se comprobarán los cálculos, el archivo Excel y la presentación en escritorio y móvil.