/** Estado efímero compartido: nunca se escribe en almacenamiento ni en la base. */
export type VistaTutorialRelevamiento = "inicio" | "logica" | "crear" | "carpetas" | "automaticos" | "ajustes" | "manuales" | "graficos" | "exportar" | "cierre";
export const EVENTO_TUTORIAL_RELEVAMIENTO = "iustrack:tutorial-relevamientos";
let vista: VistaTutorialRelevamiento | null = null;
export const vistaTutorialRelevamiento = () => vista;
export function mostrarTutorialRelevamiento(siguiente: VistaTutorialRelevamiento | null) {
  vista = siguiente;
  window.dispatchEvent(new CustomEvent(EVENTO_TUTORIAL_RELEVAMIENTO, { detail: siguiente }));
}