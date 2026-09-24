// Autocompletado de causa desde la carátula PDF de Lex100 (1 página, texto seleccionable).
// Tolerante: si un campo no aparece, queda vacío.

export interface CaratulaSujeto {
  nombre_completo: string;
  detenido: boolean;
  defensor: string;
}

export interface CaratulaLex100 {
  despachante: string;
  expediente_nro: string;
  fecha_ingreso: string | null; // yyyy-mm-dd
  modo_inicio: string | null;
  sujetos: CaratulaSujeto[];
  delito: string;
  querella: string;
  otros_intervinientes: string;
  fiscalia_interviniente: string;
  caratula: string;
}

// pdfjs se carga una sola vez y se reutiliza (precarga al abrir el formulario).
// El worker es LOCAL (empaquetado por Vite con ?url), nunca desde una CDN.
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
export function precargarPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ]).then(([pdfjs, w]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = w.default;
      return pdfjs;
    }).catch((e) => { pdfjsPromise = null; throw e; });
  }
  return pdfjsPromise;
}

// Respaldo para redes restrictivas que bloquean el archivo del worker:
// se carga el worker (local) en el hilo principal ("fake worker" de pdfjs).
let fakeWorkerListo: Promise<void> | null = null;
function activarWorkerEnHiloPrincipal() {
  if (!fakeWorkerListo) {
    fakeWorkerListo = import("pdfjs-dist/build/pdf.worker.min.mjs").then((mod) => {
      (globalThis as any).pdfjsWorker = mod;
    }).catch((e) => { fakeWorkerListo = null; throw e; });
  }
  return fakeWorkerListo;
}

const OPCIONES = { disableFontFace: true, isEvalSupported: false, disableAutoFetch: true, disableStream: true };

async function extraerLineas(buf: ArrayBuffer): Promise<string[]> {
  const pdfjs = await precargarPdfjs();
  let doc: any;
  try {
    doc = await pdfjs.getDocument({ data: buf.slice(0), ...OPCIONES }).promise;
  } catch (e) {
    console.warn("pdfjs worker falló, reintentando en hilo principal", e);
    await activarWorkerEnHiloPrincipal();
    doc = await pdfjs.getDocument({ data: buf.slice(0), ...OPCIONES }).promise;
  }
  const out: string[] = [];
  const total = Math.min(doc.numPages, 2);
  for (let n = 1; n <= total; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const lineas = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items as any[]) {
      const str = String(item.str ?? "");
      if (!str.trim()) continue;
      const x = item.transform?.[4] ?? 0;
      const y = Math.round((item.transform?.[5] ?? 0) / 3) * 3;
      const arr = lineas.get(y) ?? [];
      arr.push({ x, str });
      lineas.set(y, arr);
    }
    Array.from(lineas.entries())
      .sort((a, b) => b[0] - a[0])
      .forEach(([, items]) => {
        const t = items.sort((a, b) => a.x - b.x).map((i) => i.str.trim()).join(" ").replace(/\s+/g, " ").trim();
        if (t) out.push(t);
      });
  }
  return out;
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

type Seccion = "imputado" | "letrados" | "sobre" | "querellante" | "damnificado" | null;

const SECCIONES: { re: RegExp; sec: Seccion }[] = [
  { re: /^IMPUTAD[OA]S?\b\s*:?\s*/, sec: "imputado" },
  { re: /^LETRADOS?\b\s*:?\s*/, sec: "letrados" },
  { re: /^SOBRE\b\s*:?\s*/, sec: "sobre" },
  { re: /^QUERELLANTES?\b\s*:?\s*/, sec: "querellante" },
  { re: /^DAMNIFICAD[OA]S?\b\s*:?\s*/, sec: "damnificado" },
];

// Etiquetas que cortan cualquier sección (se ignoran).
const CORTES = /^(FISCALIA|JUEZ|SECRETARI|TRIBUNAL|JUZGADO|SALA\b|ORGANISMO|CONEX|IDENTIDAD|DENUNCIANTE|INSTRUCTOR|EXPTE|FECHA|REPUBLICA|PODER JUDICIAL|CAMARA|CRIM\.? Y CORREC|DEFENSOR|\*)/;

const MODOS: Record<string, string> = {
  DENUNCIA: "Denuncia",
  PREVENCION: "Prevención",
  OVD: "OVD",
  OFICIO: "Oficio",
  TESTIMONIO: "Testimonio",
};

function fechaIso(d: string): string | null {
  const m = d.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

export function parseCaratulaTexto(lineas: string[]): CaratulaLex100 {
  const r: CaratulaLex100 = {
    despachante: "", expediente_nro: "", fecha_ingreso: null, modo_inicio: null,
    sujetos: [], delito: "", querella: "", otros_intervinientes: "", fiscalia_interviniente: "", caratula: "",
  };
  const querellas: string[] = [];
  const damnificados: string[] = [];
  const delitos: string[] = [];
  let sec: Seccion = null;
  let crimVisto = false;

  for (const raw of lineas) {
    const linea = raw.trim();
    const N = norm(linea);

    // Campos en línea (pueden aparecer en cualquier parte de la línea)
    const ins = N.match(/INSTRUCTOR\s*:?\s*([A-Z0-9]{1,50})/);
    if (ins && !r.despachante) r.despachante = ins[1];
    const exp = linea.match(/EXPTE\.?\s*N\s*[°º]?\s*\.?:?\s*(?:[A-Za-zÁÉÍÓÚÑ]+\s+)?(\d[\w/.-]*)/i);
    if (exp && !r.expediente_nro) r.expediente_nro = exp[1];
    const fa = N.match(/FECHA\s+ASIGNACION\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
    if (fa && !r.fecha_ingreso) r.fecha_ingreso = fechaIso(fa[1]);
    const fis = linea.match(/FISCAL[IÍ]A\s*:\s*(.+)$/i);
    if (fis && !r.fiscalia_interviniente) { r.fiscalia_interviniente = fis[1].trim(); sec = null; continue; }

    if (/CRIM\.?\s*Y\s*CORREC/.test(N)) {
      crimVisto = true;
      const resto = N.replace(/.*CRIM\.?\s*Y\s*CORREC\.?/, "");
      for (const k of Object.keys(MODOS)) if (new RegExp(`\\b${k}\\b`).test(resto)) r.modo_inicio = MODOS[k];
      continue;
    }
    if (!r.modo_inicio && crimVisto) {
      for (const k of Object.keys(MODOS)) if (new RegExp(`^${k}\\b`).test(N)) r.modo_inicio = MODOS[k];
      if (r.modo_inicio) continue;
    }

    // Secciones: una línea puede traer varias etiquetas pegadas
    // (ej. "IMPUTADO: X (D) LETRADOS: Y IMPUTADO: Z"). Se parte por etiqueta.
    const segs: { sec: Seccion | "cont"; valor: string }[] = [];
    const reEtq = /\b(IMPUTAD[OA]S?|LETRADOS?|SOBRE|QUERELLANTES?|DAMNIFICAD[OA]S?)\b\s*:?/g;
    const marcas: { idx: number; len: number; sec: Seccion }[] = [];
    let mm: RegExpExecArray | null;
    while ((mm = reEtq.exec(N))) {
      const et = mm[1];
      const s: Seccion = et.startsWith("IMPUTAD") ? "imputado" : et.startsWith("LETRADO") ? "letrados"
        : et === "SOBRE" ? "sobre" : et.startsWith("QUERELL") ? "querellante" : "damnificado";
      // "SOBRE" solo cuenta como etiqueta al inicio de línea o seguido de ":"
      if (s === "sobre" && mm.index !== 0 && !mm[0].includes(":")) continue;
      marcas.push({ idx: mm.index, len: mm[0].length, sec: s });
    }
    if (marcas.length) {
      const antes = linea.slice(0, marcas[0].idx).trim();
      if (antes && sec && !CORTES.test(N)) segs.push({ sec: "cont", valor: antes });
      marcas.forEach((m, i) => {
        const fin = i + 1 < marcas.length ? marcas[i + 1].idx : linea.length;
        segs.push({ sec: m.sec, valor: linea.slice(m.idx + m.len, fin).trim() });
      });
    } else if (CORTES.test(N)) {
      sec = null;
      continue;
    } else if (sec) {
      segs.push({ sec: "cont", valor: linea });
    }

    for (const sg of segs) {
      const nuevo = sg.sec !== "cont";
      if (nuevo) sec = sg.sec as Seccion;
      if (!sec) continue;
      const valor = sg.valor.replace(/^[:\-–\s]+/, "").trim();
      if (sec === "imputado") {
        const detenido = /\(\s*D\s*\)/i.test(valor);
        const nombre = valor.replace(/\(\s*D\s*\)/gi, "").replace(/\s+/g, " ").trim();
        const ult = r.sujetos[r.sujetos.length - 1];
        if (nuevo) {
          // Cada etiqueta IMPUTADO es un sujeto nuevo y distinto.
          r.sujetos.push({ nombre_completo: nombre, detenido, defensor: "" });
        } else if (ult && valor) {
          // Continuación del nombre del mismo imputado
          ult.nombre_completo = `${ult.nombre_completo} ${nombre}`.trim();
          if (detenido) ult.detenido = true;
        }
        continue;
      }
      if (!valor) continue;
      if (sec === "letrados") {
        const ult = r.sujetos[r.sujetos.length - 1];
        if (ult) ult.defensor = ult.defensor ? `${ult.defensor}; ${valor}` : valor;
      } else if (sec === "sobre") {
        delitos.push(valor);
      } else if (sec === "querellante") {
        querellas.push(valor);
      } else if (sec === "damnificado") {
        damnificados.push(valor);
      }
    }
  }
  r.sujetos = r.sujetos.filter((s) => s.nombre_completo);

  r.delito = delitos.join(" ").trim();
  r.querella = querellas.join("; ");
  r.otros_intervinientes = damnificados.map((d) => `Damnf. ${d}`).join("; ");
  r.caratula = r.sujetos.length
    ? r.sujetos.map((s) => s.nombre_completo).join("; ")
    : r.expediente_nro;
  return r;
}

export async function parseCaratulaLex100(file: File): Promise<CaratulaLex100> {
  const buf = await file.arrayBuffer();
  const lineas = await extraerLineas(buf);
  return parseCaratulaTexto(lineas);
}
