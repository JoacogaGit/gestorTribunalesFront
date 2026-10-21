- [x] Recorrer las listas predeterminadas una por una y terminar en Crear lista
- [x] Agregar demostración de filtro por carátula
- [x] Mostrar el movimiento reversible de una categoría
- [x] Completar datos ficticios durante la explicación de la ficha
- [x] Reubicar el recuadro del calendario y descubrir Migración
- [x] Abrir Gestión de oficina y destacar su código único
- [x] Validar compilación y comportamiento visible
- [x] Permitir ajustes manuales registrados sobre cálculos automáticos
- [x] Modernizar los controles numéricos y centrar los títulos sin numeración
- [x] Agregar vista de gráficos 3D para los cinco bloques
- [x] Agregar exportación básica del relevamiento a Excel
- [x] Unificar los títulos de Estadísticas con tipografía sans-serif
- [x] Verificar cálculos y carga pública; la vista autenticada requiere sesión disponible
- [x] Permitir arrastrar y soltar la carátula PDF en la creación de causa
- [x] Mover violencia de género de la causa a cada imputado y actualizar listados
- [x] Contar causas con imputados VG en el relevamiento, agrupadas sin duplicar cada causa por tipo
- [x] Corregir movimiento de categorías y aclarar ficha y miembros en el tutorial
- [x] Limpiar el buscador al mover categorías y alinear la demostración con los encabezados reales
- [x] Mostrar cuatro anotaciones ficticias, con y sin fecha, antes del calendario
- [x] Ubicar arriba a la derecha la tarjeta del paso de miembros
- [ ] Validar visualmente ficha, relevamientos y tutorial (requiere una sesión disponible)
- [x] Dejar libre la ficha durante su explicación y mostrar las anotaciones ficticias dentro del panel real
- [x] Reemplazar el filtro por carátula por una demostración estable con otro campo
- [x] Mostrar varios movimientos reversibles de distintas categorías
- [x] Separar anotaciones como último paso de ficha, después del imputado y antes del calendario

## Varios cambios modo judicial (2026-10-17)
- [x] Migración: causa secreta, contraseña de espacio, permisos por lista, opciones de listas
- [x] Filtro por despachante en tablero de anotaciones
- [x] Causa secreta: marcar/desmarcar (menú causa, solo admin) + indicador
- [x] Contraseña de espacio: definir (admin) + candado al entrar
- [x] Permisos de edición por lista de tablero (UI admin)
- [x] Click derecho: Para sacar sentencia / Para comunicar
- [x] Calendario: incluir eventos de causas en sentencia/comunicar; excluir listas sin calendario
- [x] Crear lista: opciones click derecho / calendario / solo admin
- [x] Sync Google Calendar: borrar eventos al eliminar o mover a lista sin calendario
- [x] Buscador móvil: barra abajo sobre teclado, resultados arriba
- [x] Dashboard: incluir Para sacar sentencia y Para comunicar
- [x] Quitar botón "Ocultar flagrancia"
- [x] Verificar: tsgo, eslint, build

## Correcciones modo judicial (2026-10-19)
- [x] Tutorial automático al crear oficina y filtro sin paso duplicado
- [x] Filtro por despachante visible en anotaciones
- [x] Centrar búsqueda móvil
- [x] Rayas grises y control de causa secreta en ficha para admin
- [x] Contraseña opcional al crear espacios, conservando edición posterior
- [x] Diez pruebas y carga pública sin errores
- [ ] Verificar los seis cambios dentro de una oficina (bloqueado: sin sesión en Supabase externo)
- [x] Opción de lista: "De qué otra(s) lista(s) desaparece la causa" (pestañas + otras listas personalizadas)

## Tres correcciones modo judicial (2026-10-21)
- [ ] Click derecho: cambio de estado se refleja al instante en todas las vistas
- [ ] Móvil: estados y anotaciones se guardan de verdad al tocar Guardar
- [ ] Detenidos/Rebeldes/SJP no excluyen causas por estado (sentencia/comunicar)
- [ ] Fluidez: refresco automático tras cambios, sin parpadeos ni pérdida de estado
