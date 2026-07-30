De las 8 mejoras, la base de datos ya quedó migrada para todas, pero en la interfaz solo se completó la #3 (Anotaciones con listas anidadas). Faltan las otras 7 en el frontend.

Estado verificado hoy en el código:
- Rol "lector" existe en la base (`rol_miembro_enum` y función `es_lector_tribunal`), pero `useRolTribunal` solo contempla "admin" | "miembro".
- Los tipos de recurso en `causaMapper.ts` siguen siendo solo casación, REX y queja en Corte.
- No hay ninguna referencia a subestados de trámite, duplicar causa ni tutorial en el frontend.
- El texto "Fecha 354" sigue en la tabla de causas y en el formulario.

## Plan de trabajo

### 1. Scroll vertical del dashboard
Revisar el contenedor principal de `VocaliaWorkspace` (hoy tiene `overflow-hidden` con alto fijo de pantalla) y asegurar que cada vista interna scrollee correctamente en escritorio y móvil, sin cortar contenido.

### 2. Rol Lector
- Extender `useRolTribunal` con el rol "lector" y exponer un indicador `soloLectura`.
- En `MiembrosTribunal`, permitir asignar/cambiar a "Lector" (con la protección de no dejar el tribunal sin admin).
- Ocultar o deshabilitar botones de crear/editar/borrar para lectores en: causas, imputados, eventos, categorías, listas personalizadas y anotaciones de vocalía (las listas personales del propio usuario siguen editables).

### 3. Anotaciones con listas anidadas — hecho
Ya funciona: anotación → listas (personal o de vocalía) → columnas → tarjetas.

### 4. Quitar "354" de fecha de ingreso
Reemplazar la etiqueta por "Fecha de ingreso" en la tabla de causas, el formulario y el comentario del modelo de datos.

### 5. Nuevos tipos de recurso
Agregar "Apelación" y "TSJ" a los tipos disponibles, con sus etiquetas, en el formulario de causa, filtros y vistas de recursos.

### 6. Subdivisiones del estado "Trámite"
- Nuevo hook para leer los subestados de la vocalía (ya se crean por defecto: Para indagar, Indagado, Procesado, Elevado).
- Selector de subestado en el formulario de causa cuando el estado es "trámite".
- Mostrar el subestado como etiqueta en la tabla y permitir agrupar/filtrar por él en la vista de Trámite.
- Pantalla simple para renombrar, agregar y borrar subestados de la vocalía (solo admin/miembro).

### 7. Duplicar causa
Opción "Duplicar" en el menú contextual y en el detalle de la causa: abre el formulario de nueva causa precargado con todos los datos (carátula, intervinientes, imputados) y el número de expediente vacío para completarlo.

### 8. Tutorial y ayuda contextual
- Modal de bienvenida paso a paso la primera vez, usando el campo `tutorial_completado` del perfil.
- Opción "Ver tutorial" en el menú de usuario para repetirlo.
- Íconos de ayuda con tooltip breve en las secciones clave (causas, calendario, anotaciones, listas, migración).

## Detalles técnicos
- Archivos principales: `src/hooks/useRolTribunal.ts`, `src/components/MiembrosTribunal.tsx`, `src/lib/causaMapper.ts`, `src/components/forms/CausaFormDialog.tsx`, `src/components/CausasTable.tsx`, `src/components/VocaliaWorkspace.tsx`, `src/hooks/useCausaMutations.ts`, más hooks y componentes nuevos para subestados, duplicar y tutorial.
- No hacen falta migraciones nuevas: las tablas `subestados_tramite`, el enum ampliado y `perfiles.tutorial_completado` ya existen.
- Las restricciones de lector se aplican en la interfaz y ya están reforzadas por las políticas de acceso en la base.
