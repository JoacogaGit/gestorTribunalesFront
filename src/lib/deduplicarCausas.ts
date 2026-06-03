import { CausaIA, EventoIA, ResultadoIADirecto, SujetoIA } from "@/hooks/useMigracion";

type EstadoCausa = CausaIA["estado_causa"];
type SitLib = SujetoIA["situacion_libertad"];
type Confianza = CausaIA["confianza"];

const ESTADO_RANK: Record<EstadoCausa, number> = { tramite: 1, recurso: 2, terminada: 3 };
const SIT_RANK: Record<SitLib, number> = { libre: 1, probation: 2, rebelde: 3, detenido: 4, condenado: 5 };
const CONF_RANK: Record<Confianza, number> = { verde: 1, amarillo: 2, rojo: 3 };

function normExp(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}
function normNombre(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}
function countFilled(obj: Record<string, unknown>): number {
  return Object.values(obj).filter((v) => v !== null && v !== undefined && v !== "").length;
}
function mergeObs(a: string | null, b: string | null): string | null {
  const partes = [a, b].filter((x): x is string => !!x && x.trim() !== "");
  if (partes.length === 0) return null;
  const set = new Set<string>();
  partes.forEach((p) => p.split(" | ").forEach((x) => { const t = x.trim(); if (t) set.add(t); }));
  return Array.from(set).join(" | ");
}

function pickScalar<T>(a: T, b: T, aCount: number, bCount: number): T {
  if (a === null || a === undefined || a === "") return b;
  if (b === null || b === undefined || b === "") return a;
  if (a === b) return a;
  return bCount > aCount ? b : a;
}

function mergePrescripciones(
  a: SujetoIA["prescripciones"],
  b: SujetoIA["prescripciones"],
): SujetoIA["prescripciones"] {
  const out: NonNullable<SujetoIA["prescripciones"]> = [];
  const seen = new Set<string>();
  const add = (p: { fecha: string; descripcion: string | null }) => {
    const key = `${(p.fecha ?? "").trim()}||${(p.descripcion ?? "").trim().toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(p);
  };
  (a ?? []).forEach(add);
  (b ?? []).forEach(add);
  return out;
}

function mergeSujetos(a: SujetoIA, b: SujetoIA): SujetoIA {
  const ac = countFilled(a as unknown as Record<string, unknown>);
  const bc = countFilled(b as unknown as Record<string, unknown>);
  const sit: SitLib = SIT_RANK[a.situacion_libertad] >= SIT_RANK[b.situacion_libertad] ? a.situacion_libertad : b.situacion_libertad;
  return {
    nombre_completo: pickScalar(a.nombre_completo, b.nombre_completo, ac, bc),
    delito: pickScalar(a.delito, b.delito, ac, bc),
    situacion_libertad: sit,
    defensor: pickScalar(a.defensor, b.defensor, ac, bc),
    lugar_alojamiento: pickScalar(a.lugar_alojamiento, b.lugar_alojamiento, ac, bc),
    fecha_detencion: pickScalar(a.fecha_detencion, b.fecha_detencion, ac, bc),
    prescripcion_fecha: pickScalar(a.prescripcion_fecha, b.prescripcion_fecha, ac, bc),
    prescripciones: mergePrescripciones(a.prescripciones, b.prescripciones),
    vencimiento_pp: pickScalar(a.vencimiento_pp, b.vencimiento_pp, ac, bc),
    vencimiento_pena: pickScalar(a.vencimiento_pena, b.vencimiento_pena, ac, bc),
    vencimiento_sjp: pickScalar(a.vencimiento_sjp, b.vencimiento_sjp, ac, bc),
    observaciones: mergeObs(a.observaciones, b.observaciones),
  };
}

function mergeSujetosLista(aLista: SujetoIA[], bLista: SujetoIA[]): SujetoIA[] {
  const out: SujetoIA[] = aLista.map((s) => ({ ...s }));
  for (const b of bLista) {
    const key = normNombre(b.nombre_completo);
    const idx = out.findIndex((x) => normNombre(x.nombre_completo) === key && key !== "");
    if (idx === -1) out.push({ ...b });
    else out[idx] = mergeSujetos(out[idx], b);
  }
  return out;
}

function mergeEventos(aLista: EventoIA[], bLista: EventoIA[]): EventoIA[] {
  const out: EventoIA[] = [...aLista];
  for (const b of bLista) {
    const dup = out.some((x) => x.titulo === b.titulo && (x.fecha_hora ?? "") === (b.fecha_hora ?? ""));
    if (!dup) out.push(b);
  }
  return out;
}

function mergeCausa(a: CausaIA, b: CausaIA): CausaIA {
  const ac = countFilled(a as unknown as Record<string, unknown>);
  const bc = countFilled(b as unknown as Record<string, unknown>);
  const estado: EstadoCausa = ESTADO_RANK[a.estado_causa] >= ESTADO_RANK[b.estado_causa] ? a.estado_causa : b.estado_causa;
  const confianza: Confianza = CONF_RANK[a.confianza] >= CONF_RANK[b.confianza] ? a.confianza : b.confianza;
  const origenA = a.origen_pestanas ?? [];
  const origenB = b.origen_pestanas ?? [];
  return {
    id_temporal: a.id_temporal,
    expediente_nro: pickScalar(a.expediente_nro, b.expediente_nro, ac, bc),
    caratula: pickScalar(a.caratula, b.caratula, ac, bc),
    estado_causa: estado,
    tipo_recurso: pickScalar(a.tipo_recurso, b.tipo_recurso, ac, bc),
    tipo_proceso: pickScalar(a.tipo_proceso ?? null, b.tipo_proceso ?? null, ac, bc),
    querella: pickScalar(a.querella, b.querella, ac, bc),
    actor_civil: pickScalar(a.actor_civil, b.actor_civil, ac, bc),
    otros_intervinientes: pickScalar(a.otros_intervinientes, b.otros_intervinientes, ac, bc),
    causa_conexa_texto: pickScalar(a.causa_conexa_texto, b.causa_conexa_texto, ac, bc),
    confianza,
    notas_ia: [a.notas_ia, b.notas_ia].filter(Boolean).join(" | ") || undefined,
    origen_pestanas: Array.from(new Set([...origenA, ...origenB])),
    sujetos: mergeSujetosLista(a.sujetos, b.sujetos),
    eventos: mergeEventos(a.eventos, b.eventos),
  };
}

export function deduplicarCausas(
  entradas: { pestana: string; resultado: ResultadoIADirecto }[],
): ResultadoIADirecto {
  const causasMap = new Map<string, CausaIA>();
  const sinKey: CausaIA[] = [];
  const filasRojas: ResultadoIADirecto["filas_rojas"] = [];
  const pestanasProcesadas: string[] = [];
  let totalFilasOrigen = 0;
  let counter = 0;

  for (const { pestana, resultado } of entradas) {
    pestanasProcesadas.push(pestana);
    totalFilasOrigen += resultado.resumen?.total_filas_origen ?? 0;
    if (resultado.filas_rojas?.length) filasRojas.push(...resultado.filas_rojas);

    for (const c of resultado.causas) {
      const conOrigen: CausaIA = {
        ...c,
        id_temporal: `m-${counter++}`,
        origen_pestanas: Array.from(new Set([...(c.origen_pestanas ?? []), pestana])),
      };
      const key = normExp(c.expediente_nro);
      if (!key) { sinKey.push(conOrigen); continue; }
      const prev = causasMap.get(key);
      causasMap.set(key, prev ? mergeCausa(prev, conOrigen) : conOrigen);
    }
  }

  const causas: CausaIA[] = [...causasMap.values(), ...sinKey];
  const sujetosCount = causas.reduce((a, c) => a + c.sujetos.length, 0);
  const eventosCount = causas.reduce((a, c) => a + c.eventos.length, 0);
  const verdes = causas.filter((c) => c.confianza === "verde").length;
  const amarillos = causas.filter((c) => c.confianza === "amarillo").length;
  const rojos = causas.filter((c) => c.confianza === "rojo").length;

  return {
    modo: "procesamiento_directo",
    resumen: {
      total_filas_origen: totalFilasOrigen,
      causas_detectadas: causas.length,
      sujetos_detectados: sujetosCount,
      eventos_detectados: eventosCount,
      verdes, amarillos, rojos,
    },
    pestanas_procesadas: pestanasProcesadas,
    causas,
    filas_rojas: filasRojas,
  };
}
