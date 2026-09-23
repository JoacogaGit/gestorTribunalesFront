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

async function extraerLineas(buf: ArrayBuffer): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const out: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
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

    // Secciones
    let valor: string | null = null;
    const hit = SECCIONES.find((s) => s.re.test(N));
    if (hit) {
      sec = hit.sec;
      const m = N.match(hit.re)!;
      valor = linea.slice(m[0].length).trim();
    } else if (CORTES.test(N)) {
      sec = null;
      continue;
    } else if (sec) {
      valor = linea;
    }
    if (!sec || !valor) continue;
    valor = valor.replace(/^[:\-–\s]+/, "").trim();
    if (!valor) continue;

    if (sec === "imputado") {
      const detenido = /\(\s*D\s*\)/i.test(valor);
      const nombre = valor.replace(/\(\s*D\s*\)/gi, "").replace(/\s+/g, " ").trim();
      if (nombre) r.sujetos.push({ nombre_completo: nombre, detenido, defensor: "" });
    } else if (sec === "letrados") {
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

  r.delito = delitos.join(" ").trim();
  r.querella = querellas.join("; ");
  r.otros_intervinientes = damnificados.map((d) => `Damnf. ${d}`).join("; ");
  r.caratula = r.sujetos.length
    ? r.sujetos.map((s) => s.nombre_completo).join(" y otros / ").split(" y otros / ").join("; ")
    : r.expediente_nro;
  return r;
}

export async function parseCaratulaLex100(file: File): Promise<CaratulaLex100> {
  const buf = await file.arrayBuffer();
  const lineas = await extraerLineas(buf);
  return parseCaratulaTexto(lineas);
}
