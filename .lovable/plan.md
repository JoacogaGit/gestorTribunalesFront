## Plan de implementación

1. **AuthContext: estabilizar la referencia de usuario**
   - En `src/context/AuthContext.tsx`, ajustar `onAuthStateChange` para calcular `newUser` y actualizar `user` solo si cambian `id` o `email`.
   - Mantener `setSession(sess)` para que el token/sesión siga actualizado.
   - No agregar `await` dentro del callback.

2. **useMembresias: separar carga inicial de refetch**
   - En `src/hooks/useMembresias.ts`, reemplazar el estado único `loading` por dos estados:
     - `isLoading`: solo true hasta terminar la primera carga efectiva.
     - `isFetching`: true durante cualquier fetch/refetch.
   - Mantener compatibilidad devolviendo también `loading: isLoading`, para no romper usos existentes.
   - Asegurar que `count` se mantenga durante refetchs en background en vez de volver a estado de loader global.

3. **Index: usar solo carga inicial para el loader global**
   - En `src/pages/Index.tsx`, cambiar la condición del loader de membresías para usar `isLoading` en lugar de un estado de fetch general.
   - Mantener la lógica actual de `count === 0` para que `WelcomeNoTribunal` siga apareciendo correctamente.

4. **Validación**
   - Revisar que el flujo de login/logout siga funcionando: logout debe dejar `user = null` y redirigir a `/auth`.
   - Verificar mentalmente que un `TOKEN_REFRESHED` con el mismo usuario no recree `user`, no dispare `useMembresias`, y aunque hubiera refetch, no desmonte `VocaliaWorkspace`.