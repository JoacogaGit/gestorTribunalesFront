# Arreglos de listas, ficha y dashboard

## Cambios
1. Reutilizar la tabla completa de causas en la vista Detenidos para que tenga los mismos filtros por subestado y categoría, búsqueda, ordenamiento y selector de columnas que Trámite, conservando únicamente las causas con personas detenidas.
2. Quitar el límite de tres caracteres del campo Despachante y actualizar su texto de ayuda.
3. Agregar a cada imputado una aclaración libre para el vencimiento de pena, persistirla junto a la fecha y mostrarla debajo de esa fecha en las listas.
4. Rehacer la cadena de altura del dashboard con contenedores flexibles y una única zona de desplazamiento interno, igual que las demás listas, sin cálculos frágiles por dispositivo.
5. En la creación de causas, dejar abiertos y visibles todos los campos desde el inicio y dar al bloque de cada imputado un fondo/borde semántico sutilmente diferenciado.

## Datos
- Añadir `vencimiento_pena_nota` a `sujetos` como texto opcional, con los permisos existentes de la tabla sin alterar funciones externas.
- Actualizar consultas, tipos y mapeos para transportar el nuevo dato en todas las vistas.

## Validación
- Verificar tipos, pruebas relevantes y carga de la aplicación.
- Revisar visualmente dashboard y Detenidos en escritorio y móvil, incluyendo su desplazamiento interno.
- Confirmar que no se modificó ninguna Edge Function.
