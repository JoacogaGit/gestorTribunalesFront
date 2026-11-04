# Project architecture decisions

- Tutorial field explanations use transient DOM overlays with viewport-level connectors, because they must point to live form controls without covering the form.
- New-office tutorial starts use a user/office-scoped one-shot session marker, because existing profile completion must not suppress a newly created office's welcome.
- Space creation shares a hook and optional password fields across all creation screens, because protected password failures must be retryable without duplicate spaces.
- Focused mobile search renders in a body portal, because ancestor transforms must not offset its viewport-fixed position.
- Relevamiento charts use React Three Fiber procedural scenes, because each saved block needs an interactive 3D visualization without external assets.
- Tutorial responsible-filter demonstrations use a transient event-driven override in the existing filter hook, because they must filter real rows without overwriting the user's selection or opening blocking menus.- Las contraseñas de espacios viven en `vocalia_passwords` (sin acceso directo; solo vía RPCs `definir/verificar/vocalia_tiene_password`), porque el hash no debe exponerse a miembros.
- La visibilidad de causas secretas y de listas `solo_admin` se resuelve en RLS (helper `es_admin_de_vocalia`), porque así estadísticas y búsquedas quedan cubiertas sin filtros en el cliente.
- La sincronización puntual con Google Calendar se dispara fire-and-forget desde el cliente (`src/lib/gcalSync.ts`, `fireSync` en hooks), porque la Edge Function resuelve tokens y no debe bloquear la UI.
- Las listas de causas cargan con `useRemoteCausas`, consultan solo mientras su vista está activa (`enabled`), muestran al instante la última respuesta en memoria y se refrescan al oír `emitCausasChanged` (`src/lib/causasBus.ts`), que toda mutación de causas/sujetos/listas debe emitir, porque así los cambios se ven sin parpadeos y un guardado no dispara una consulta por cada pestaña.
- Los guardados de varios pasos van dentro de `conAvisosAgrupados` (`src/lib/loteAvisos.ts`) y sus pasos independientes en paralelo, porque cada aviso intermedio relanzaba refrescos a mitad del guardado.
- La ficha guarda leyendo los valores más recientes tras cerrar el teclado y guarda también los formularios de anotación abiertos, y solo restaura borradores si la causa no cambió desde entonces, porque en el teléfono el toque en Guardar puede llegar antes que el último valor.
- "Excel → Solo esta lista" exporta las filas que cada `CausasTable` publica en `src/lib/vistaExportable.ts` (ya filtradas y ordenadas), porque el filtrado vive dentro de la tabla y la exportación debe coincidir exactamente con lo visible.
- La lista Delegadas sigue a `estado_causa = 'delegada'` y `causas.delegada` es una marca permanente (un trigger la fuerza al pasar a ese estado), porque una delegada que termina debe salir de la lista sin perder su condición.
- Los subestados pertenecen a un estado principal (`subestados_tramite.estado_causa`) y se eligen con `patchSubestado` (`src/lib/subestadosPorEstado.ts`), porque el click derecho y la ficha deben ofrecer solo los del estado correspondiente.
- Los nombres propios de las listas predeterminadas viven en `tribunales.nombres_listas` (jsonb por oficina), porque deben compartirse entre todos los miembros de la oficina.
- Qué causas muestra el dashboard se decide con `esVisibleEnDashboard` (`src/lib/visibilidadDashboard.ts`) y se guarda por usuario y espacio en el navegador, porque el dashboard trae todas las causas, incluidas las terminadas.
