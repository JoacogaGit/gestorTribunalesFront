# Métricas por registros y panel violeta continuo

## Resultado
El apartado funcionará como un relevamiento por registros: cada métrica contará registros o sumará valores, con carga contextual, filtros y gráficos dentro de una superficie violeta continua.

## Implementación
- Agregar `tipo_conteo` a `metricas`, limitado a `conteo` o `suma`, y conservar las reglas actuales de acceso por espacio.
- Actualizar creación, edición y copia de métricas para incluir el tipo; ocultar y limpiar la unidad en métricas de conteo.
- Calcular totales por período: cantidad de registros para `conteo` y suma de valores para `suma`.
- Reorganizar la pantalla con el bloque de creación destacado arriba, bienvenida persistente y selector global Mensual, Trimestral o Rango libre.
- Permitir ver todas las métricas o aislar una sola; los indicadores y gráficos responderán a esa selección y al período.
- Convertir cada métrica en una sección expandible con sus propios registros y acción “Agregar registro”.
- Permitir crear, editar y borrar registros en contexto; en conteo, guardar automáticamente valor `1`; en suma, solicitar valor numérico.
- Mostrar línea temporal, barras comparativas y torta de composición con estados vacíos claros.
- Hacer que toda el área principal use el fondo violeta sin cortes, y que el panel lateral adopte temporalmente la misma identidad solo al entrar a este apartado.

## Detalles técnicos
- Se reutilizarán `metricas`, `metricas_datos`, Recharts y los controles existentes.
- Los registros seguirán usando `periodo_inicio` y `periodo_fin`; el formulario permitirá fecha puntual y rangos predefinidos.
- La migración asignará `suma` a métricas existentes para conservar sus valores actuales.
- Se verificará creación, edición, filtrado, expansión, gráficos y vista móvil/escritorio.
- No se modificará ninguna Edge Function.
