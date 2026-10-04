import { useCallback, useEffect, useRef, useState } from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Scale, PartyPopper, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export const TUTORIAL_EVENT = "iustrack:tutorial";

/** Dispara el recorrido desde cualquier parte de la app. */
export function lanzarTutorial() {
  window.dispatchEvent(new CustomEvent(TUTORIAL_EVENT));
}

/** Estilo de resaltado del elemento: cambia el "ángulo" visual de cada paso. */
type Efecto = "pulso" | "brillo" | "marco" | "barrido";

interface CampoGuiado {
  target: string;
  titulo: string;
  texto: string;
  lado?: "left" | "right";
  /** Valor ficticio que se carga durante la demostración, sin guardar la causa. */
  ejemplo?: string;
}

interface Paso {
  /** Vista de la app a la que hay que navegar antes de mostrar el paso. */
  view?: string;
  /** Selector del elemento a iluminar. Si no existe, el popover queda centrado. */
  target?: string;
  titulo: string;
  /** HTML permitido. */
  texto: string;
  /** Abre el sidebar (drawer) en móvil para este paso. */
  abrirSidebar?: boolean;
  /** Mini demo animada que corre al llegar al paso. */
  demo?: () => Promise<void>;
  side?: "top" | "bottom" | "left" | "right";
  /** Tinta el popover con la estética verde de Supabase. */
  supabase?: boolean;
  /** Paso destacado (diferencial de IusTrack). */
  destacado?: boolean;
  efecto?: Efecto;
  /** Campos de la ficha que se sombrean de a uno, con tarjetas externas conectadas. */
  campos?: CampoGuiado[];
  /** Fija el recuadro arriba para no cubrir el contenido señalado. */
  popoverArriba?: boolean;
  /** Mantiene visible y sin oscurecer el contenido de fondo. */
  fondoClaro?: boolean;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Escribe en un input controlado por React disparando el evento nativo. */
function setInputValue(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function setDemoInputValue(el: HTMLInputElement, value: string) {
  if (!el.dataset.tourOriginalValue) el.dataset.tourOriginalValue = el.value || "__EMPTY__";
  setInputValue(el, value);
}

async function demoBuscador() {
  const el = document.querySelector<HTMLInputElement>('[data-tour="buscador"]');
  if (!el) return;
  await esperar(500);
  const texto = "Pérez";
  for (let i = 1; i <= texto.length; i++) {
    setInputValue(el, texto.slice(0, i));
    await esperar(220);
  }
  await esperar(1600);
  for (let i = texto.length - 1; i >= 0; i--) {
    setInputValue(el, texto.slice(0, i));
    await esperar(90);
  }
}

let demoAbort = new AbortController();

function limpiarDemos() {
  demoAbort.abort();
  demoAbort = new AbortController();
  document.querySelectorAll(".iustrack-tour-list-focus, .iustrack-tour-filter-focus, .iustrack-tour-drag-target").forEach((el) => {
    el.classList.remove("iustrack-tour-list-focus", "iustrack-tour-filter-focus", "iustrack-tour-drag-target");
  });
  document.getElementById("iustrack-tour-drag-demo")?.remove();
  document.getElementById("iustrack-tour-notes-demo")?.remove();
  document.querySelectorAll(".iustrack-tour-example-value").forEach((el) => el.remove());
  document.querySelectorAll<HTMLInputElement>("input[data-tour-original-value]").forEach((el) => {
    const original = el.dataset.tourOriginalValue;
    setInputValue(el, original === "__EMPTY__" ? "" : (original ?? ""));
    delete el.dataset.tourOriginalValue;
  });
}

/** Recorre ágilmente los nombres de las listas y termina en Crear nueva lista. */
async function demoListasPredeterminadas() {
  const signal = demoAbort.signal;
  await esperar(300);
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-tour-list-item="predeterminada"]'))
    .filter((el) => el.getBoundingClientRect().height > 0);
  for (const item of items) {
    if (signal.aborted) return;
    document.querySelectorAll(".iustrack-tour-list-focus").forEach((el) => el.classList.remove("iustrack-tour-list-focus"));
    item.classList.add("iustrack-tour-list-focus");
    item.scrollIntoView({ block: "nearest", behavior: "smooth" });
    await esperar(230);
  }
  if (signal.aborted) return;
  document.querySelectorAll(".iustrack-tour-list-focus").forEach((el) => el.classList.remove("iustrack-tour-list-focus"));
  const crear = document.querySelector<HTMLElement>('[data-tour="crear-lista"]');
  crear?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  crear?.classList.add("iustrack-tour-list-focus");
}

/** Filtra por un dato de carátula y deja visible qué columna se está usando. */
async function demoFiltroCaratula() {
  const signal = demoAbort.signal;
  const header = document.querySelector<HTMLElement>('[data-tour-column="caratula"]');
  const input = document.querySelector<HTMLInputElement>('[data-tour="buscador"]');
  if (!header || !input) return;
  header.classList.add("iustrack-tour-filter-focus");
  await esperar(350);
  for (const [i] of Array.from("Gómez").entries()) {
    if (signal.aborted) return;
    setDemoInputValue(input, `Gómez`.slice(0, i + 1));
    await esperar(150);
  }
}

/** Cursor ficticio que arrastra Carátula hacia otra posición y la devuelve. */
async function demoMoverCategoria() {
  const signal = demoAbort.signal;
  const buscador = document.querySelector<HTMLInputElement>('[data-tour="buscador"]');
  if (buscador) setInputValue(buscador, "");
  const origen = document.querySelector<HTMLElement>('[data-tour-column="caratula"]');
  const destino = document.querySelector<HTMLElement>('[data-tour-column="delito"]')
    ?? document.querySelector<HTMLElement>('[data-tour-column="libertad"]');
  if (!origen || !destino) return;
  origen.classList.add("iustrack-tour-drag-target");
  destino.classList.add("iustrack-tour-drag-target");
  origen.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
  await esperar(250);
  if (signal.aborted) return;
  const a = origen.getBoundingClientRect();
  const b = destino.getBoundingClientRect();
  const layer = document.createElement("div");
  layer.id = "iustrack-tour-drag-demo";
  layer.className = "iustrack-tour-drag-demo";
  layer.innerHTML = `<span class="iustrack-tour-drag-label">${origen.textContent?.trim() || "Carátula"}</span><span class="iustrack-tour-cursor">↖</span>`;
  document.body.appendChild(layer);
  layer.style.width = `${a.width}px`;
  layer.style.height = `${a.height}px`;
  const mover = (x: number, y: number, duracion: number) => {
    layer.style.transitionDuration = `${duracion}ms`;
    layer.style.left = `${x}px`;
    layer.style.top = `${y}px`;
  };
  mover(a.left, a.top, 0);
  await esperar(450);
  if (signal.aborted) return;
  layer.classList.add("is-grabbing");
  mover(b.left, a.top, 850);
  await esperar(1050);
  if (signal.aborted) return;
  mover(a.left, a.top, 850);
  await esperar(1050);
  layer.classList.remove("is-grabbing");
}

/** Carga cuatro anotaciones ficticias en paralelo, sin guardar datos. */
async function demoAnotaciones() {
  const signal = demoAbort.signal;
  const aside = document.querySelector<HTMLElement>('[data-tour="panel-anotaciones-causa"]');
  const visible = aside && aside.getBoundingClientRect().width > 0;
  const panel = document.createElement("div");
  panel.id = "iustrack-tour-notes-demo";
  panel.className = visible ? "iustrack-tour-notes-demo en-panel" : "iustrack-tour-notes-demo";
  panel.innerHTML = `
    <div class="iustrack-tour-notes-heading"><strong>Anotaciones de ejemplo</strong><span>Se cargan en paralelo</span></div>
    <div class="iustrack-tour-notes-grid">
      <article style="--note-delay:0ms"><strong>Revisar escrito presentado</strong><span class="sin-fecha">Sin fecha · pendiente</span></article>
      <article style="--note-delay:140ms"><strong>Audiencia de declaración</strong><span class="con-fecha">Con fecha · 12 oct., 10:30</span></article>
      <article style="--note-delay:280ms"><strong>Llamar a la fiscalía</strong><span class="sin-fecha">Sin fecha · recordatorio</span></article>
      <article style="--note-delay:420ms"><strong>Vence traslado</strong><span class="con-fecha">Con fecha · 18 oct.</span></article>
    </div>
    <p>Las que tienen fecha aparecen en el calendario en tiempo real.</p>`;
  if (visible) {
    const titulo = aside!.firstElementChild;
    if (titulo) titulo.after(panel); else aside!.prepend(panel);
  } else {
    document.body.appendChild(panel);
  }
  await esperar(2600);
  if (signal.aborted) panel.remove();
}

interface Props {
  onNavigate: (view: string) => void;
  onOpenSidebar?: (open: boolean) => void;
  isMobile?: boolean;
  /** Si el usuario pertenece a más de un espacio, se muestra el paso del selector. */
  multiVocalia?: boolean;
  /** Solo los admin ven Papelera y Miembros en el menú. */
  esAdmin?: boolean;
  /** Vista del primer tablero de anotaciones (si existe), para mostrarlo en vivo. */
  tableroView?: string | null;
  /** Oficina tipo estudio jurídico: recorrido distinto. */
  esEstudio?: boolean;
}

/** Abre el formulario de causa para recorrerlo en vivo. */
async function demoAbrirFormulario() {
  if (document.querySelector('[data-tour="form-causa"]')) return;
  const btn = document.querySelector<HTMLButtonElement>('[data-tour="nueva-causa"]');
  if (!btn) return;
  await esperar(300);
  btn.click();
  await esperar(700);
}

/** Cierra el formulario si quedó abierto. */
function cerrarFormulario() {
  const dlg = document.querySelector('[data-tour="form-causa"]');
  if (!dlg) return;
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
}

// ---------- Sombreado progresivo de campos con tarjetas conectadas ----------

let guiaAbort = new AbortController();

function limpiarGuias() {
  guiaAbort.abort();
  guiaAbort = new AbortController();
  document.getElementById("iustrack-tour-field-guides")?.remove();
  document.querySelectorAll(".iustrack-tour-field-focus, .iustrack-tour-field-done").forEach((el) => {
    el.classList.remove("iustrack-tour-field-focus", "iustrack-tour-field-done");
  });
}

function cargarEjemplo(item: CampoGuiado, target: HTMLElement) {
  if (!item.ejemplo) return;
  const input = target.querySelector<HTMLInputElement>('input:not([type="file"]):not([type="hidden"])');
  const textarea = target.querySelector<HTMLTextAreaElement>("textarea");
  if (input) {
    setDemoInputValue(input, item.ejemplo);
    return;
  }
  if (textarea) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
    setter?.call(textarea, item.ejemplo);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  const value = document.createElement("span");
  value.className = "iustrack-tour-example-value";
  value.textContent = item.ejemplo;
  target.appendChild(value);
}

function dibujarGuia(item: CampoGuiado, target: HTMLElement, signal: AbortSignal) {
  document.getElementById("iustrack-tour-field-guides")?.remove();
  if (window.innerWidth < 1100) return;
  const layer = document.createElement("div");
  layer.id = "iustrack-tour-field-guides";
  layer.className = "iustrack-tour-field-guides";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("aria-hidden", "true");
  const card = document.createElement("div");
  const lado = item.lado ?? "right";
  card.className = `iustrack-tour-field-card iustrack-tour-field-card-${lado}`;
  card.innerHTML = `<strong>${item.titulo}</strong><span>${item.texto}</span>`;
  layer.append(svg, card);
  document.body.appendChild(layer);

  const posicionar = () => {
    const dialog = document.querySelector<HTMLElement>('[data-tour="form-causa"]');
    if (!dialog) return;
    const d = dialog.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const w = Math.min(250, Math.max(170, (window.innerWidth - d.width) / 2 - 40));
    const left = lado === "left" ? Math.max(12, d.left - w - 36) : Math.min(window.innerWidth - w - 12, d.right + 36);
    const top = Math.max(16, Math.min(window.innerHeight - 140, t.top + t.height / 2 - 40));
    Object.assign(card.style, { width: `${w}px`, left: `${left}px`, top: `${top}px` });
    const c = card.getBoundingClientRect();
    const sx = lado === "left" ? c.right : c.left;
    const sy = c.top + c.height / 2;
    const ex = lado === "left" ? t.left - 6 : t.right + 6;
    const ey = t.top + Math.min(t.height / 2, 22);
    const mx = (sx + ex) / 2;
    svg.innerHTML = `<defs><marker id="iustrack-tour-arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" /></marker></defs>
      <path class="iustrack-tour-line" d="M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}" marker-end="url(#iustrack-tour-arrowhead)" />
      <circle class="iustrack-tour-dot" cx="${sx}" cy="${sy}" r="3.5" />`;
  };
  requestAnimationFrame(posicionar);
  window.addEventListener("resize", posicionar, { signal });
  document.querySelector('[data-tour="form-causa"]')?.addEventListener("scroll", posicionar, { signal, passive: true });
}

/** Recorre los campos: cada uno se sombrea, se conecta a su tarjeta, y a los ~2 s pasa al siguiente. */
async function recorrerCampos(campos: CampoGuiado[]) {
  limpiarGuias();
  const signal = guiaAbort.signal;
  await esperar(650);
  for (const item of campos) {
    if (signal.aborted) return;
    const el = document.querySelector<HTMLElement>(item.target);
    if (!el) continue;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    await esperar(380);
    if (signal.aborted) return;
    document.querySelectorAll(".iustrack-tour-field-focus").forEach((f) => {
      f.classList.remove("iustrack-tour-field-focus");
      f.classList.add("iustrack-tour-field-done");
    });
    cargarEjemplo(item, el);
    el.classList.add("iustrack-tour-field-focus");
    dibujarGuia(item, el, signal);
    await esperar(2000);
  }
}

// ---------- Contenido visual reutilizable ----------

const bullets = (items: [string, string][]) =>
  `<ul class="iustrack-tour-callouts">${items
    .map(([t, d], i) => `<li style="animation-delay:${0.12 + i * 0.09}s"><span class="iustrack-tour-arrow">→</span><span><strong>${t}:</strong> ${d}</span></li>`)
    .join("")}</ul>`;

const LOGO_GCAL = `<svg class="iustrack-tour-brand-logo" viewBox="0 0 48 48" aria-hidden="true">
  <rect x="6" y="6" width="36" height="36" rx="4" fill="#fff"/>
  <path d="M6 14V10a4 4 0 0 1 4-4h28a4 4 0 0 1 4 4v4z" fill="#4285F4"/>
  <path d="M34 42l8-8h-8z" fill="#EA4335"/><path d="M34 34h8V14h-8z" fill="#FBBC04" opacity=".0"/>
  <path d="M42 34V14h-8v20z" fill="#34A853" opacity=".0"/>
  <rect x="6" y="14" width="6" height="28" fill="#1967D2" opacity=".15"/>
  <text x="24" y="35" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="17" fill="#4285F4">31</text>
  <rect x="6" y="38" width="28" height="4" fill="#34A853"/><rect x="38" y="14" width="4" height="20" fill="#FBBC04"/>
</svg>`;

const LOGO_EXCEL = `<svg class="iustrack-tour-brand-logo" viewBox="0 0 48 48" aria-hidden="true">
  <rect x="14" y="6" width="30" height="36" rx="3" fill="#21A366"/>
  <rect x="29" y="6" width="15" height="12" fill="#33C481"/><rect x="29" y="18" width="15" height="12" fill="#107C41"/>
  <rect x="14" y="30" width="30" height="12" rx="0" fill="#185C37"/>
  <rect x="4" y="13" width="22" height="22" rx="3" fill="#107C41"/>
  <path d="M9 18h4l2 4 2-4h4l-4 6 4 6h-4l-2-4-2 4H9l4-6z" fill="#fff"/>
</svg>`;

const marca = (logo: string, nombre: string) =>
  `<div class="iustrack-tour-brand">${logo}<span>${nombre}</span></div>`;

/** Mini-animación: una causa cambia de estado y viaja sola a otra lista. */
const demoReubicacion = (desde: string, hasta: string) => `
  <div class="iustrack-tour-move" aria-hidden="true">
    <div class="iustrack-tour-move-col"><span class="iustrack-tour-move-title">${desde}</span><span class="iustrack-tour-move-row"></span><span class="iustrack-tour-move-row"></span></div>
    <div class="iustrack-tour-move-col"><span class="iustrack-tour-move-title">${hasta}</span><span class="iustrack-tour-move-row"></span></div>
    <span class="iustrack-tour-move-chip">12345/2026</span>
  </div>`;

function construirPasos(props: Props): Paso[] {
  const { esEstudio, esAdmin, multiVocalia, tableroView } = props;
  const vistaLista = esEstudio ? "dashboard" : "tramite";
  const responsable = esEstudio ? "empleado a cargo" : "despachante";
  const responsables = esEstudio ? "empleados a cargo" : "despachantes o sumariantes";

  const pasos: Paso[] = [];

  // 2 — Panel lateral
  pasos.push({
    view: "dashboard",
    target: '[data-tour="sidebar"]',
    efecto: "barrido",
    side: "right",
    titulo: "Desde acá se controla todo",
    texto:
      `<p class="iustrack-tour-lead">Este panel es tu centro de mando: cada sección de IusTrack está a un toque.</p>
       ${bullets([
         ["Listas de causas", "se ordenan solas según los datos que cargues."],
         ["Herramientas", "calendario, anotaciones, migración, equipo y más."],
       ])}`,
    abrirSidebar: true,
  });

  if (multiVocalia) {
    pasos.push({
      target: '[data-tour="vocalia-selector"]',
      efecto: "marco",
      side: "right",
      titulo: "Cambiar de espacio",
      texto: "Si trabajás en más de un espacio, cambiás desde acá. Cada espacio tiene sus propias causas, calendario y anotaciones.",
      abrirSidebar: true,
    });
  }

  // 3 — Listas predeterminadas
  pasos.push({
    view: "dashboard",
    target: '[data-tour="sidebar"]',
    efecto: "brillo",
    side: "right",
    titulo: "Tus listas, ya armadas",
    texto:
      `<p class="iustrack-tour-lead">${esEstudio
        ? "Vienen listas predeterminadas por fuero, instancia, detenidos y SJP."
        : "Vienen listas predeterminadas: Trámite, Detenidos, Rebeldes, SJP, Recursos, Flagrancia, Delegadas, 196bis/NN, Terminadas y más."}</p>
       ${bullets([
         ["Creá listas nuevas", "con el botón “+” armás listas propias (ej. “Urgentes de la semana”) y elegís de qué pestañas se ocultan sus causas."],
         ["Ocultá las que no uses", "desde el ícono de personalizar tildás qué listas ver. Se pueden volver a activar cuando quieras."],
       ])}`,
    abrirSidebar: true,
    demo: demoListasPredeterminadas,
  });

  // 4 — Dashboard
  pasos.push(
    {
      view: "dashboard",
      target: '[data-tour="kpis"]',
      efecto: "pulso",
      titulo: "Un dashboard que responde",
      texto:
        `<p class="iustrack-tour-lead">Cada tarjeta cuenta tus causas según un criterio.</p>
         ${bullets([
           ["Tocá una tarjeta", "la lista de abajo se filtra al instante con esas causas."],
           ["Se ilumina", "la tarjeta activa se destaca y su columna pasa al frente."],
         ])}`,
    },
    {
      view: "dashboard",
      target: '[data-tour="nueva-estadistica"]',
      efecto: "marco",
      titulo: "Tus propias estadísticas",
      texto: esEstudio
        ? "Armá tarjetas a medida: por fuero, estado procesal, rol del estudio, situación de libertad o vencimientos próximos. Le ponés nombre y color."
        : "Armá tarjetas a medida: por estado, subestado, situación de libertad o vencimientos próximos. Le ponés nombre y color.",
    },
  );

  // 5 — Causas en trámite
  pasos.push(
    {
      view: vistaLista,
      target: '[data-tour="buscador"]',
      efecto: "brillo",
      titulo: esEstudio ? "Encontrá cualquier causa" : "Causas en trámite",
      texto:
        `<p class="iustrack-tour-lead">Escribí cualquier dato y la lista se filtra mientras tipeás. Mirá:</p>
         ${bullets([
           ["Buscar", "por expediente, carátula o nombre de una persona."],
           ["Ordenar", "tocando el título de cada columna."],
         ])}`,
      demo: demoBuscador,
    },
    {
      view: vistaLista,
      target: '[data-tour-column="caratula"]',
      efecto: "pulso",
      titulo: "Filtrá por cada columna",
      texto:
        `${bullets([
          ["Carátula", "escribí un dato de esa columna para quedarte solo con las filas que coinciden."],
          ["Otros filtros", "también podés filtrar por subestado, situación o categoría."],
        ])}
        <p class="iustrack-tour-hint">Tu acomodo queda guardado para la próxima vez.</p>`,
      demo: demoFiltroCaratula,
    },
    {
      view: vistaLista,
      target: '[data-tour="column-headers"]',
      efecto: "marco",
      titulo: "Mové las categorías",
      texto:
        `${bullets([
          ["Arrastrá", "agarrá el título de una categoría y llevalo al lugar que te resulte más cómodo."],
          ["Siempre reversible", "podés moverlo otra vez o devolverlo a su posición original."],
        ])}
        <p class="iustrack-tour-hint">Tu acomodo queda guardado para la próxima vez.</p>`,
      demo: demoMoverCategoria,
    },
    {
      view: vistaLista,
      target: '[data-tour="nueva-causa"]',
      efecto: "barrido",
      titulo: "Crear una causa nueva",
      texto: "Con este botón abrís la ficha en blanco. En unos pasos la recorremos juntos.",
    },
  );

  // 6 — Editar datos: la app se reorganiza sola
  pasos.push({
    view: vistaLista,
    target: '[data-tour="main"]',
    efecto: "marco",
    side: "left",
    titulo: "La app se reorganiza sola",
    texto:
      `<p class="iustrack-tour-lead">Cuando modificás los datos de una causa, IusTrack la reubica automáticamente en la lista que corresponde.</p>
       ${demoReubicacion(esEstudio ? "Instrucción" : "Trámite", esEstudio ? "Elevadas a juicio" : "Recursos")}
       <p class="iustrack-tour-hint">${esEstudio
         ? "Cambiás el estado procesal y la causa pasa de pestaña. Marcás un detenido y aparece en Detenidos."
         : "Cambiás el estado a Recurso y sale de Trámite. Marcás un detenido y aparece en Detenidos. Sin mover nada a mano."}</p>`,
  });

  // 7 — Ficha de causa: sombreado progresivo
  const fichaBase = { target: '[data-tour="form-causa"]', side: "left" as const, efecto: "marco" as Efecto };
  pasos.push(
    {
      ...fichaBase,
      fondoClaro: true,
      demo: demoAbrirFormulario,
      titulo: "La ficha de la causa",
      texto: `<p class="iustrack-tour-lead">Mirá cómo se ilumina cada campo, uno por uno, con su explicación al costado.</p>`,
      campos: [
        { target: '[data-tour-field="expediente"]', titulo: "Expediente", texto: "El número único que identifica la causa.", lado: "left", ejemplo: "12345/2026" },
        { target: '[data-tour-field="caratula"]', titulo: "Carátula", texto: "El nombre con el que la vas a reconocer.", lado: "right", ejemplo: "PÉREZ, JUAN s/ ROBO" },
        { target: '[data-tour-field="responsable"]', titulo: esEstudio ? "Empleado a cargo" : "Despachante", texto: "Quién la impulsa. Sirve para filtrar causas y calendario.", lado: "left", ejemplo: esEstudio ? "Dra. López" : "García" },
        { target: '[data-tour-field="estado"]', titulo: "Estado", texto: "Define en qué lista aparece la causa.", lado: "right", ejemplo: esEstudio ? "En instrucción" : "En trámite" },
        ...(esEstudio ? [] : [{ target: '[data-tour-field="caratula-pdf"]', titulo: "Carátula en PDF", texto: "Subí la carátula de Lex100 y los campos se completan solos. Revisás antes de guardar.", lado: "right" as const }]),
        { target: '[data-tour-field="acciones"]', titulo: "Guardar o eliminar", texto: "Al editar una causa aparece “Borrar causa”: va a la Papelera y se puede recuperar.", lado: "left" },
      ],
    },
    {
      ...fichaBase,
      fondoClaro: true,
      titulo: "La ficha del imputado",
      texto: `<p class="iustrack-tour-lead">Cada persona tiene su propio bloque, con color diferenciado.</p>`,
      campos: [
        { target: '[data-tour-field="imputado-nombre"]', titulo: "Persona", texto: "Cada imputado se carga por separado.", lado: "left", ejemplo: "PÉREZ, JUAN" },
        { target: '[data-tour-field="imputado-situacion"]', titulo: "Situación de libertad", texto: "Libre, detenido, rebelde… Detenidos y rebeldes generan su propia lista.", lado: "right", ejemplo: "Detenido" },
        { target: '[data-tour-field="imputado-defensor"]', titulo: "Defensor", texto: "El letrado de esta persona.", lado: "left", ejemplo: "Dra. Ana López" },
        { target: '[data-tour-field="imputado-vencimientos"]', titulo: "Vencimientos", texto: "Prisión preventiva y pena: viajan solos al calendario.", lado: "right", ejemplo: "2026-12-15" },
      ],
    },
    {
      target: '[data-tour="panel-anotaciones-causa"]',
      side: "left" as const,
      efecto: "marco" as Efecto,
      fondoClaro: true,
      titulo: "Anotaciones de la causa",
      texto:
        `<p class="iustrack-tour-lead">A la derecha de la ficha cargás eventos y notas, incluso mientras creás la causa.</p>
         ${bullets([
           ["Con fecha", "se convierten en eventos y aparecen en tiempo real en el calendario (el paso siguiente)."],
           ["Sin fecha", "quedan como notas o pendientes de la causa."],
         ])}`,
      demo: demoAnotaciones,
    },
    {
      ...fichaBase,
      fondoClaro: true,
      titulo: "Marcas y datos secundarios",
      texto: `<p class="iustrack-tour-lead">Las marcas agregan la causa a su propia lista con un solo toque.</p>`,
      campos: [
        { target: '[data-tour-field="marca-flagrancia"]', titulo: "Flagrancia", texto: "La causa aparece en la lista Flagrancia.", lado: "right" },
        { target: '[data-tour-field="marca-delegada"]', titulo: "Delegada", texto: "Pasa a Delegadas y sale de Trámite.", lado: "left" },
        { target: '[data-tour-field="marca-196bis"]', titulo: "196bis / NN", texto: "Pasa a su lista 196bis/NN y sale de Trámite.", lado: "right" },
        { target: '[data-tour-field="fecha-ingreso"]', titulo: "Fecha de ingreso", texto: "Cuándo entró la causa.", lado: "left" },
        ...(esEstudio ? [] : [{ target: '[data-tour-field="datos-judiciales"]', titulo: "Datos judiciales", texto: "Firmante, modo de inicio, fiscalía y último movimiento.", lado: "right" as const }]),
      ],
    },
  );

  // 9 — Calendario (diferencial)
  pasos.push(
    {
      view: "calendario",
      target: '[data-tour="main"]',
      efecto: "pulso",
      destacado: true,
      side: "top",
      popoverArriba: true,
      titulo: "El Calendario: tu red de seguridad",
      texto:
        `<p class="iustrack-tour-kicker">El diferencial de IusTrack</p>
         <p class="iustrack-tour-lead">Todos los vencimientos, audiencias y eventos, en un semáforo de colores.</p>
         <div class="iustrack-tour-semaforo"><span class="r">Urgente</span><span class="a">Próximo</span><span class="v">Con tiempo</span></div>
         <p class="iustrack-tour-emph">Gracias a esto, NO se pierde ningún vencimiento.</p>`,
    },
    {
      view: "calendario",
      target: '[data-tour="google-calendar"]',
      efecto: "brillo",
      destacado: true,
      titulo: "Sincronizado con Google Calendar",
      texto:
        `${marca(LOGO_GCAL, "Google Calendar")}
         ${bullets([
           ["Se sincroniza solo", "cada vencimiento y evento aparece en tu agenda de Google."],
           ["Alertas a tiempo", "recordatorios 3 días antes, 1 día antes y 1 hora antes, en el celular."],
         ])}
         <p class="iustrack-tour-emph">Aunque no abras IusTrack, el aviso te llega.</p>`,
    },
  );

  // 10 — Filtro por responsable
  pasos.push({
    view: vistaLista,
    target: '[data-tour="filtro-responsable"]',
    efecto: "marco",
    titulo: `Filtrá por ${responsable}`,
    texto: `Elegí uno o varios ${responsables} y tanto la lista de causas como el calendario muestran solo lo suyo.`,
  });

  // 11 — Migración
  pasos.push({
    view: "migrar",
    target: '[data-tour="migracion-panel"]',
    efecto: "barrido",
    side: "top",
    titulo: "Traé tus causas ya cargadas",
    texto:
      `<p class="iustrack-tour-lead">No hace falta cargar todo a mano.</p>
       <div class="iustrack-tour-formats"><span>Excel</span><span>Word</span><span>PDF</span><span>Lex100</span></div>
       <p class="iustrack-tour-hint">IusTrack lee el archivo, arma las causas y te deja revisar todo antes de guardar.</p>`,
  });

  // 12 — Miembros y roles
  pasos.push({
    view: esAdmin ? "miembros" : undefined,
    target: esAdmin ? '[data-tour="codigo-oficina"]' : '[data-tour="sidebar"]',
    efecto: "pulso",
    fondoClaro: true,
    side: "right",
    popoverArriba: true,
    titulo: "Tu equipo y los permisos",
    texto:
      `<p class="iustrack-tour-lead">Invitá por email o compartí el <strong>código único</strong> de tu oficina para que se unan.</p>
       ${bullets([
         ["Administrador", "maneja personas, causas y configuración."],
         ["Miembro", "crea y edita causas."],
         ["Lector", "solo mira, no modifica nada."],
       ])}`,
    abrirSidebar: true,
  });

  // 13 — Papelera
  pasos.push({
    target: esAdmin ? '[data-tour="nav-papelera"]' : '[data-tour="sidebar"]',
    efecto: "brillo",
    side: "right",
    titulo: "Papelera: nada se pierde",
    texto: "Las causas y elementos borrados van a la Papelera y se pueden recuperar durante <strong>30 días</strong>.",
    abrirSidebar: true,
  });

  // 14 — Exportar
  pasos.push({
    view: vistaLista,
    target: '[data-tour="exportar-excel"]',
    efecto: "marco",
    titulo: "Todo en un Excel",
    texto:
      `${marca(LOGO_EXCEL, "Microsoft Excel")}
       <p class="iustrack-tour-lead">Descargás todas tus listas en un solo archivo, con <strong>una hoja por lista</strong>, listo para imprimir o compartir.</p>`,
  });

  // 15 — Seguridad / Supabase
  pasos.push({
    supabase: true,
    titulo: "¿Y dónde vive todo esto?",
    texto:
      `<div class="iustrack-tour-supabase-head">
         <svg class="iustrack-tour-supabase-logo" viewBox="0 0 109 113" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
           <path d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.727-2.97l-1.007-67.719h45.59c8.26 0 12.865 9.52 7.733 15.965l-43.589 54.724Z" fill="#3ECF8E"/>
           <path d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.727-2.97l-1.007-67.719h45.59c8.26 0 12.865 9.52 7.733 15.965l-43.589 54.724Z" fill="#249361" fill-opacity=".55"/>
           <path d="M45.317.317c2.86-3.601 8.658-1.628 8.727 2.97l.436 67.719H9.361c-8.26 0-12.865-9.52-7.733-15.965L45.317.317Z" fill="#96F2D7"/>
         </svg>
         <span class="iustrack-tour-supabase-brand">Seguridad &middot; Supabase</span>
       </div>
       <p class="iustrack-tour-lead">Toda la información de IusTrack se almacena en <strong style="color:#3ECF8E">Supabase</strong>, una plataforma profesional construida sobre PostgreSQL, uno de los motores de bases de datos más robustos y usados del mundo.</p>
       <p>Supabase funciona sobre la infraestructura de Amazon Web Services (AWS), el mismo servicio en la nube que utilizan bancos, gobiernos y grandes empresas a nivel global.</p>
       <p>Tus datos viajan siempre cifrados y están protegidos por reglas de acceso que garantizan que cada oficina vea únicamente su propia información.</p>
       <p class="iustrack-tour-hint">En resumen: la información judicial que cargás está alojada con estándares de seguridad de nivel empresarial.</p>`,
  });

  // 16 — Cierre (antes del diálogo final)
  pasos.push({
    target: '[data-tour="ayuda"]',
    efecto: "pulso",
    titulo: "Siempre tenés ayuda a mano",
    texto:
      `<p class="iustrack-tour-lead">Tocá el signo de pregunta <strong>(?)</strong> para reactivar este recorrido cuando quieras.</p>
       <p class="iustrack-tour-emph">Empezá: migrá tus causas o creá la primera.</p>`,
  });

  return pasos;
}

export default function TutorialTour({ onNavigate, onOpenSidebar, isMobile, multiVocalia, esAdmin, tableroView, esEstudio }: Props) {
  const { user } = useAuth();
  const [fase, setFase] = useState<"idle" | "bienvenida" | "recorrido" | "final">("idle");
  const driverRef = useRef<Driver | null>(null);
  const idxRef = useRef(0);
  const pasosRef = useRef<Paso[]>([]);
  const [total, setTotal] = useState(construirPasos({ onNavigate, multiVocalia, esAdmin, tableroView, esEstudio }).length + 2);

  // Clave local por usuario: evita que la marca de otro usuario del mismo navegador
  // impida el arranque automático del tutorial.
  const claveLocal = user ? `iustrack:tutorial_completado:${user.id}` : null;

  const marcarCompletado = useCallback(async () => {
    if (!user) return;
    try {
      localStorage.setItem(`iustrack:tutorial_completado:${user.id}`, "1");
    } catch { /* noop */ }
    const { error } = await supabase
      .from("perfiles")
      .update({ tutorial_completado: true })
      .eq("id", user.id);
    if (error) console.error("[tutorial] no se pudo guardar tutorial_completado", error);
  }, [user]);

  // Auto-arranque la primera vez (incluye la primera entrada a una oficina recién creada).
  useEffect(() => {
    if (!user || !claveLocal) return;
    let cancelled = false;
    (async () => {
      let visto = false;
      try { visto = localStorage.getItem(claveLocal) === "1"; } catch { /* noop */ }
      if (visto) return;
      const { data, error } = await supabase
        .from("perfiles")
        .select("tutorial_completado")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || error) return;
      if (data?.tutorial_completado) {
        try { localStorage.setItem(claveLocal, "1"); } catch { /* noop */ }
        return;
      }
      // Perfil sin marcar (o todavía sin fila creada): arranca el tutorial.
      setFase((f) => (f === "idle" ? "bienvenida" : f));
    })();
    return () => { cancelled = true; };
  }, [user, claveLocal]);

  // Disparo manual
  useEffect(() => {
    const handler = () => setFase("bienvenida");
    window.addEventListener(TUTORIAL_EVENT, handler);
    return () => window.removeEventListener(TUTORIAL_EVENT, handler);
  }, []);


  const prepararPaso = useCallback(
    async (i: number) => {
      const paso = pasosRef.current[i];
      if (!paso) return;
      // Cierra el formulario de causa si el paso ya no lo necesita.
      limpiarGuias();
      limpiarDemos();
      if (!paso.target?.startsWith('[data-tour="form')) {
        cerrarFormulario();
        await esperar(150);
      }
      if (paso.view) onNavigate(paso.view);
      if (isMobile) onOpenSidebar?.(!!paso.abrirSidebar);
      await esperar(paso.view || paso.abrirSidebar ? 500 : 180);
      // Algunas vistas administrativas terminan de montar después de navegar.
      if (paso.target) {
        for (let intento = 0; intento < 12 && !document.querySelector(paso.target); intento += 1) {
          await esperar(150);
        }
      }
    },
    [isMobile, onNavigate, onOpenSidebar]
  );

  const terminar = useCallback(
    (celebrar: boolean) => {
      limpiarGuias();
      limpiarDemos();
      document.body.classList.remove("iustrack-tour-supabase-active");
      document.body.classList.remove("iustrack-tour-clear-background");
      delete document.body.dataset.tourFx;
      driverRef.current?.destroy();
      driverRef.current = null;
      cerrarFormulario();
      if (isMobile) onOpenSidebar?.(false);
      if (celebrar) setFase("final");
      else {
        setFase("idle");
        void marcarCompletado();
        toast.info("Podés volver a ver el tutorial cuando quieras tocando el signo de pregunta (?).", { duration: 7000 });
      }
    },
    [isMobile, marcarCompletado, onOpenSidebar]
  );


  const arrancarRecorrido = useCallback(async () => {
    const pasos = construirPasos({ onNavigate, multiVocalia, esAdmin, tableroView, esEstudio });
    pasosRef.current = pasos;
    const TOTAL = pasos.length + 2;
    setTotal(TOTAL);
    setFase("recorrido");
    idxRef.current = 0;
    await prepararPaso(0);

    const d = driver({
      allowClose: true,
      animate: true,
      overlayColor: "hsl(222 47% 6% / 0.82)",
      stagePadding: 6,
      stageRadius: 10,
      popoverClass: "iustrack-tour",
      nextBtnText: "Siguiente →",
      prevBtnText: "Atrás",
      doneBtnText: "Terminar",
      showButtons: ["next", "previous", "close"],
      onCloseClick: () => terminar(false),
      steps: pasos.map((p, i) => ({
        element: p.target,
        popover: {
          popoverClass: `iustrack-tour${p.supabase ? " iustrack-tour-supabase" : ""}${p.campos ? " iustrack-tour-fields" : ""}${p.destacado ? " iustrack-tour-destacado" : ""}${p.popoverArriba ? " iustrack-tour-top" : ""}`,
          title: p.titulo,
          description: `${p.texto}<div class="iustrack-tour-progress"><span style="width:${
            ((i + 2) / TOTAL) * 100
          }%"></span></div><div class="iustrack-tour-count">Paso ${i + 2} de ${TOTAL}</div>`,
          side: (p.side ?? "bottom") as "bottom",
          align: "start" as const,
        },
      })),
      onHighlighted: () => {
        const paso = pasosRef.current[idxRef.current];
        limpiarGuias();
        limpiarDemos();
        document.body.classList.toggle("iustrack-tour-supabase-active", !!paso?.supabase);
        document.body.classList.toggle("iustrack-tour-clear-background", !!paso?.fondoClaro);
        document.body.dataset.tourFx = paso?.efecto ?? "marco";
        void (async () => {
          if (paso?.demo) await paso.demo();
          if (paso?.campos?.length && pasosRef.current[idxRef.current] === paso) await recorrerCampos(paso.campos);
        })();
      },
      onNextClick: async () => {
        const next = idxRef.current + 1;
        if (next >= pasos.length) { terminar(true); return; }
        await prepararPaso(next);
        idxRef.current = next;
        d.moveNext();
      },
      onPrevClick: async () => {
        const prev = idxRef.current - 1;
        if (prev < 0) return;
        await prepararPaso(prev);
        idxRef.current = prev;
        d.movePrevious();
      },
      onDestroyed: () => {
        limpiarGuias();
        limpiarDemos();
        document.body.classList.remove("iustrack-tour-supabase-active");
        document.body.classList.remove("iustrack-tour-clear-background");
        delete document.body.dataset.tourFx;
        driverRef.current = null;
      },
    });

    driverRef.current = d;
    d.drive();
  }, [prepararPaso, terminar, onNavigate, multiVocalia, esAdmin, tableroView, esEstudio]);

  useEffect(() => () => { driverRef.current?.destroy(); }, []);

  return (
    <>
      {/* Paso 1 — Bienvenida */}
      <Dialog open={fase === "bienvenida"} onOpenChange={(o) => { if (!o && fase === "bienvenida") terminar(false); }}>
        <DialogContent className="sm:max-w-2xl text-center animate-scale-in iustrack-tour-welcome">
          <div className="flex flex-col items-center gap-5 py-3">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-gold shadow-soft">
              <Scale className="h-10 w-10 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                Bienvenido a IusTrack
              </h2>
              <p className="mt-4 text-xl sm:text-2xl font-medium text-foreground leading-snug">
                Nunca más se te va a pasar un vencimiento.
              </p>
              <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
                {esEstudio
                  ? "Desde hoy, todas las causas del estudio, sus fechas y sus pendientes van a estar ordenados en un solo lugar, y IusTrack te va a avisar a tiempo. Menos papeles sueltos, menos preocupaciones, más tranquilidad."
                  : "Desde hoy, todas las causas, sus vencimientos y sus pendientes van a estar ordenados en un solo lugar, y IusTrack te va a avisar a tiempo. Menos papeles sueltos, menos preocupaciones, más tranquilidad."}
              </p>
              <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
                Te acompaño paso a paso, con calma. En unos minutos vas a manejarlo todo.
              </p>
            </div>
            <div className="w-full">
              <div className="iustrack-tour-progress"><span style={{ width: `${(1 / total) * 100}%` }} /></div>
              <p className="mt-1.5 text-sm text-muted-foreground">Paso 1 de {total}</p>
            </div>
            <div className="flex w-full flex-col sm:flex-row gap-3">
              <Button variant="ghost" size="lg" className="flex-1 text-base h-12" onClick={() => terminar(false)}>Saltar tutorial</Button>
              <Button size="lg" className="flex-1 text-base h-12" onClick={arrancarRecorrido}>Empezar recorrido</Button>
            </div>
            <button
              type="button"
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
              onClick={() => terminar(false)}
            >
              No volver a mostrar automáticamente
            </button>
            <p className="text-sm text-muted-foreground">
              Siempre podés volver a verlo desde el signo de pregunta (?).
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Paso final — Cierre con confeti */}
      <Dialog open={fase === "final"} onOpenChange={(o) => { if (!o) { setFase("idle"); void marcarCompletado(); } }}>
        <DialogContent className="sm:max-w-2xl overflow-hidden text-center animate-scale-in">
          <div className="pointer-events-none absolute inset-0">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className="iustrack-confetti"
                style={{
                  left: `${(i * 4.1) % 100}%`,
                  animationDelay: `${(i % 8) * 0.18}s`,
                  background: ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--alert-ok))", "hsl(var(--alert-info))"][i % 4],
                }}
              />
            ))}
          </div>
          <div className="relative flex flex-col items-center gap-5 py-3">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <PartyPopper className="h-10 w-10" />
            </div>
            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">¡Listo!</h2>
              <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
                Empezá ahora: migrá tus causas o creá la primera. Si querés volver a ver el recorrido, tocá el signo de pregunta (?).
              </p>
            </div>
            <div className="w-full">
              <div className="iustrack-tour-progress"><span style={{ width: "100%" }} /></div>
              <p className="mt-1.5 text-sm text-muted-foreground">Paso {total} de {total}</p>
            </div>
            <Button size="lg" className="w-full text-base h-12" onClick={() => { setFase("idle"); void marcarCompletado(); }}>
              Empezar a usar IusTrack
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
