# Cierre de pendientes — Migración / Papelera / Onboarding

Cinco cambios acotados al frontend. No se toca DB, RLS, ni nada ya terminado.

## 1. Fix de tipo en `WizardMigracion.tsx`

En `handleFile` (línea ~45), `procesar` devuelve `ResultadoIA | null` y se pasa a `handleResultado(r)` que ya hace el discriminated narrowing por `r.modo`. El problema es que `setResultado` espera `ResultadoIADirecto` pero el chequeo está bien escrito. Falta solo asegurar el narrowing: dentro de `handleResultado`, tras `if (r.modo === "mapeo_asistido_requerido") return;`, asignar a una variable tipada explícitamente como `ResultadoIADirecto` antes de pasarla al state (TS no siempre estrecha bien tras early-return por discriminante con union genérico). Cambio mínimo en esa función + tipar `handleResultado` para recibir `ResultadoIA` (no `ResultadoIA | null`).

## 2. Cablear Papelera y Wizard en `VocaliaWorkspace.tsx`

- Importar `Papelera` y `WizardMigracion`.
- Agregar entradas en `defaultTitles`: `papelera: "Papelera"`, `migrar: "Migrar causas"`.
- Render: `{view === "papelera" && esAdmin && tribunalId && <Papelera tribunalId={tribunalId} />}` (con fallback de "sin permisos" igual que `miembros`).
- Render: `{view === "migrar" && <WizardMigracion vocaliaId={vocaliaId} vocaliaNombre={vocaliaNombre} onDone={() => setView("dashboard")} />}`.
- Guard en el `useEffect` ya existente: extender la condición a `(view === "miembros" || view === "papelera") && !esAdmin` → redirige y avisa.

## 3. Items en `AppSidebar.tsx`

- Importar `Trash2`, `Upload` de lucide-react.
- Agregar a `defaultNavItems` el item `{ id: "migrar", label: "Migrar causas", icon: Upload }` (visible para todos), insertado al final de la lista principal (antes de calendario o después, consistente con el grupo).
- Replicar el patrón actual del item "Miembros" (bloque `esAdmin && (() => {...})()`) para renderizar **"Papelera"** con icono `Trash2`, solo cuando `esAdmin`.

## 4. Disparar `BienvenidaTribunal` desde `WelcomeNoTribunal.tsx`

- Agregar estado `mode === "bienvenida"`.
- En `handleCrearVocalia`, tras success: en vez de llamar `onCreated()` directo, `setMode("bienvenida")` (sin perder `tribunalId`).
- Render del `mode === "bienvenida"`: usar `<BienvenidaTribunal>` con:
  - `onMigrar`: llama `onCreated()` y además guarda en `sessionStorage` un flag `justrack:open-migrar=1`.
  - `onEmpezarDesdeCero`: llama `onCreated()` directamente.
- En `VocaliaWorkspace` (al montar): `useEffect` que lee ese flag de `sessionStorage`; si está, lo borra y hace `setView("migrar")`. Así el ruteo queda transparente y solo se dispara la primera vez.
- Los usuarios que se unen con código/token siguen el flujo original (`onCreated()` directo, sin bienvenida).

## 5. Mapeo asistido — Paso 2 del wizard

Cuando la edge function devuelve `modo: "mapeo_asistido_requerido"` con `columnas_detectadas` y `campos_disponibles`:

- Nuevo state `mapeo: ResultadoIAMapeo | null` y `archivoCache: ArchivoParseado | null` (guardado en `handleFile` antes de invocar IA, para poder reusarlo en el reintento).
- En `handleResultado`, si `r.modo === "mapeo_asistido_requerido"`, setear `mapeo = r` en vez del `toast.warning + return` actual.
- Render condicional (antes del Paso 3): tabla compacta — una fila por columna detectada, con:
  - Índice + 2-3 valores muestra (`muestra`).
  - Hipótesis de la IA (texto chico, gris).
  - `Select` (shadcn) con `campos_disponibles` + "(ignorar)".
- Botón **"Reprocesar con mi mapeo"**: arma `Record<string, string>` (`indice → campo`), invoca `procesar(vocaliaId, vocaliaNombre, archivoCache, mapeo)`, pasa por `handleResultado`. Si la IA vuelve a pedir mapeo, se queda en este paso con un toast de error.
- Botón secundario **"Descartar y reintentar"** vuelve al Paso 1.
- Loading state en botones durante el reintento.

## Archivos modificados

- `src/components/WizardMigracion.tsx` — fix tipo + paso 2 mapeo asistido.
- `src/components/VocaliaWorkspace.tsx` — views `papelera` + `migrar`, guard admin, autoabrir tras bienvenida.
- `src/components/AppSidebar.tsx` — items `Migrar causas` (todos) + `Papelera` (admin).
- `src/components/WelcomeNoTribunal.tsx` — nuevo `mode: "bienvenida"` integrando `BienvenidaTribunal`.

## Fuera de alcance

- Nada de DB / RLS / edge functions.
- Nada en hooks ya cableados.
- Sin tocar `Papelera.tsx`, `BienvenidaTribunal.tsx`, `useMigracion.ts`, `procesar-migracion/index.ts` (ya están listos).
