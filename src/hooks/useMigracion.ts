import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArchivoParseado, PestanaParseada } from "@/lib/parseMigracionFile";
import { normalizarCausa } from "@/lib/normalizarCausa";

export interface CausaIA {
  id_temporal: string;
  expediente_nro: string;
  caratula: string | null;
  estado_causa: "tramite" | "recurso" | "terminada";
  tipo_recurso: "casacion" | "rex" | "queja_corte" | null;
  tipo_proceso?: "unipersonal" | "colegiado" | null;
  fecha_ingreso?: string | null;
  querella: string | null;
  actor_civil: string | null;
  otros_intervinientes: string | null;
  causa_conexa_texto: string | null;
  confianza: "verde" | "amarillo" | "rojo";
  notas_ia?: string;
  origen_pestanas?: string[];
  sujetos: SujetoIA[];
  eventos: EventoIA[];
}
export interface PrescripcionIA {
  fecha: string;
  descripcion: string | null;
}
export interface SujetoIA {
  nombre_completo: string;
  delito: string | null;
  situacion_libertad: "libre" | "detenido" | "rebelde" | "probation" | "condenado";
  defensor: string | null;
  lugar_alojamiento: string | null;
  fecha_detencion: string | null;
  /** Legacy: solo se usa si no viene `prescripciones`. */
  prescripcion_fecha?: string | null;
  /** Nuevo: array de prescripciones (una por delito/supuesto). */
  prescripciones?: PrescripcionIA[];
  vencimiento_pp: string | null;
  vencimiento_pena: string | null;
  vencimiento_sjp: string | null;
  observaciones: string | null;
}
export interface EventoIA {
  titulo: string;
  descripcion: string | null;
  fecha_hora: string | null;
  tipo_evento: string | null;
}
export interface FilaRojaIA {
  fila_origen: string;
  razon: string;
  datos_crudos: string;
}
export interface ResultadoIADirecto {
  modo: "procesamiento_directo";
  resumen: {
    total_filas_origen: number; causas_detectadas: number; sujetos_detectados: number;
    eventos_detectados: number; verdes: number; amarillos: number; rojos: number;
  };
  pestanas_procesadas: string[];
  causas: CausaIA[];
  filas_rojas: FilaRojaIA[];
}
export interface ResultadoIAMapeo {
  modo: "mapeo_asistido_requerido";
  razon: string;
  columnas_detectadas: { indice: number; muestra: string[]; hipotesis: string }[];
  campos_disponibles: string[];
}
export type ResultadoIA = ResultadoIADirecto | ResultadoIAMapeo;

export interface LoteResultado {
  ok: boolean;
  resultado?: ResultadoIADirecto;
  errorCode?: string;
  errorMsg?: string;
}

function detectarErrorCodigo(invokeErr: unknown, dataErr?: string): string {
  if (invokeErr) {
    const msg = String((invokeErr as { message?: string })?.message || invokeErr).toLowerCase();
    if (msg.includes("resource") || msg.includes("546") || msg.includes("worker")) return "worker_resource_limit";
    if (msg.includes("timeout") || msg.includes("504") || msg.includes("aborted")) return "anthropic_timeout";
    if (msg.includes("payload") || msg.includes("413")) return "payload_too_large";
    return "ai_error";
  }
  return dataErr || "unknown";
}

export function useMigracion() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const procesar = useCallback(async (
    vocaliaId: string,
    vocaliaNombre: string,
    archivo: ArchivoParseado,
    mapeoManual?: Record<string, string>,
    pestana?: { nombre: string; contenido: string[][] | string },
  ): Promise<ResultadoIA | null> => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("procesar-migracion", {
        body: { vocalia_id: vocaliaId, vocalia_nombre: vocaliaNombre, archivo, mapeo_manual: mapeoManual, pestana },
      });
      if (error) { setError(error.message); return null; }
      if (!data?.ok) {
        const msg = data?.error === "no_api_key" ? "Falta configurar la API key de IA."
          : data?.error === "forbidden" ? "No tenés permisos sobre esta vocalía."
          : data?.error === "payload_too_large" ? "El archivo es demasiado grande para procesar."
          : data?.error === "json_invalido" ? "La IA devolvió un formato inválido. Probá de nuevo."
          : data?.error === "ai_error" ? "Error consultando a la IA. Intentá de nuevo en unos minutos."
          : "No se pudo procesar el archivo.";
        setError(msg);
        return null;
      }
      const res = data.resultado as ResultadoIA;
      if (res?.modo === "procesamiento_directo") {
        res.causas = (res.causas ?? []).map((c) => normalizarCausa(c));
        res.filas_rojas = res.filas_rojas ?? [];
        res.pestanas_procesadas = res.pestanas_procesadas ?? [];
      }
      return res;
    } finally { setLoading(false); }
  }, []);

  /** Procesa un único lote. Devuelve códigos de error normalizados para reintentos adaptativos. */
  const procesarUnLote = useCallback(async (
    vocaliaId: string,
    vocaliaNombre: string,
    archivoMeta: ArchivoParseado,
    pestana: PestanaParseada,
    loteInfo: { pestana: string; nro_lote: number; total_lotes: number; filas: number },
  ): Promise<LoteResultado> => {
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("procesar-migracion", {
        body: {
          vocalia_id: vocaliaId,
          vocalia_nombre: vocaliaNombre,
          archivo: archivoMeta,
          pestana,
          lote_info: loteInfo,
        },
      });
      if (invokeErr) {
        const code = detectarErrorCodigo(invokeErr);
        return { ok: false, errorCode: code, errorMsg: (invokeErr as { message?: string })?.message };
      }
      if (!data?.ok) {
        return { ok: false, errorCode: data?.error || "unknown", errorMsg: data?.error };
      }
      const r = data.resultado as ResultadoIA;
      if (r.modo !== "procesamiento_directo") {
        return { ok: false, errorCode: "mapeo_requerido", errorMsg: "La pestaña requiere mapeo asistido." };
      }
      // Normalización defensiva: garantiza que todo campo escalar sea string|null
      // (nunca objeto) para evitar React error #31 al renderizar.
      r.causas = (r.causas ?? []).map((c) => normalizarCausa(c));
      r.filas_rojas = r.filas_rojas ?? [];
      r.pestanas_procesadas = r.pestanas_procesadas ?? [];
      return { ok: true, resultado: r };
    } catch (e) {
      const code = detectarErrorCodigo(e);
      return { ok: false, errorCode: code, errorMsg: e instanceof Error ? e.message : "error" };
    }
  }, []);

  const cargarEnBD = useCallback(async (
    vocaliaId: string,
    causas: CausaIA[],
  ): Promise<
    | { ok: true; inserted: { causas: number; sujetos: number; eventos: number }; omitidas: { expediente_nro: string; caratula: string | null }[] }
    | { ok: false; error: string }
  > => {
    setLoading(true); setError(null);
    const insertedCausaIds: string[] = [];
    const insertedSujetoIds: string[] = [];
    const insertedEventoIds: string[] = [];
    const omitidas: { expediente_nro: string; caratula: string | null }[] = [];
    const norm = (s: string | null | undefined) => String(s ?? "").trim().toLowerCase();
    const keyOf = (exp: string | null | undefined, car: string | null | undefined) => `${norm(exp)}||${norm(car)}`;
    try {
      // Anti-duplicado: traer causas existentes (no borradas) de la vocalía.
      const { data: existentes, error: existErr } = await supabase
        .from("causas")
        .select("expediente_nro, caratula")
        .eq("vocalia_id", vocaliaId)
        .is("borrado_en", null);
      if (existErr) throw new Error(`No se pudo verificar duplicados: ${existErr.message}`);
      const existingKeys = new Set<string>();
      (existentes ?? []).forEach((r) => existingKeys.add(keyOf(r.expediente_nro, r.caratula)));

      let sujetosCount = 0;
      let eventosCount = 0;
      for (const c of causas) {
        const k = keyOf(c.expediente_nro, c.caratula);
        if (existingKeys.has(k)) {
          omitidas.push({ expediente_nro: c.expediente_nro, caratula: c.caratula });
          continue;
        }
        existingKeys.add(k);

        const causaPayload = {
          vocalia_id: vocaliaId,
          expediente_nro: c.expediente_nro,
          caratula: c.caratula,
          estado_causa: c.estado_causa,
          tipo_recurso: c.tipo_recurso,
          tipo_proceso: c.tipo_proceso ?? null,
          fecha_ingreso: c.fecha_ingreso ?? null,
          querella: c.querella,
          actor_civil: c.actor_civil,
          otros_intervinientes: c.otros_intervinientes,
          causa_conexa_texto: c.causa_conexa_texto,
        };
        const { data: causaRow, error: causaErr } = await supabase
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .from("causas").insert(causaPayload as any).select("id").single();
        if (causaErr || !causaRow) throw new Error(`Causa ${c.expediente_nro}: ${causaErr?.message}`);
        insertedCausaIds.push(causaRow.id);

        if (c.sujetos.length > 0) {
          const payload = c.sujetos.map((s) => {
            const { prescripciones: _p, ...rest } = s;
            return { ...rest, causa_id: causaRow.id };
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: sjRows, error: sjErr } = await supabase.from("sujetos").insert(payload as any).select("id");
          if (sjErr) throw new Error(`Sujetos de ${c.expediente_nro}: ${sjErr.message}`);
          (sjRows ?? []).forEach((r) => insertedSujetoIds.push(r.id));
          sujetosCount += c.sujetos.length;
          const prescPayload: { sujeto_id: string; fecha: string; descripcion: string | null }[] = [];
          (sjRows ?? []).forEach((r, idx) => {
            const sj = c.sujetos[idx];
            const list = sj?.prescripciones ?? [];
            for (const p of list) {
              if (p.fecha) prescPayload.push({ sujeto_id: r.id, fecha: p.fecha, descripcion: p.descripcion ?? null });
            }
          });
          if (prescPayload.length > 0) {
            const { error: pErr } = await supabase.from("prescripciones").insert(prescPayload);
            if (pErr) throw new Error(`Prescripciones de ${c.expediente_nro}: ${pErr.message}`);
          }
        }
        if (c.eventos.length > 0) {
          const payload = c.eventos.map((e) => ({ ...e, causa_id: causaRow.id }));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: evRows, error: evErr } = await supabase.from("eventos").insert(payload as any).select("id");
          if (evErr) throw new Error(`Eventos de ${c.expediente_nro}: ${evErr.message}`);
          evRows?.forEach((r) => insertedEventoIds.push(r.id));
          eventosCount += c.eventos.length;
        }
      }
      return { ok: true, inserted: { causas: insertedCausaIds.length, sujetos: sujetosCount, eventos: eventosCount }, omitidas };
    } catch (e) {
      if (insertedEventoIds.length) await supabase.from("eventos").delete().in("id", insertedEventoIds);
      if (insertedSujetoIds.length) await supabase.from("sujetos").delete().in("id", insertedSujetoIds);
      if (insertedCausaIds.length) await supabase.from("causas").delete().in("id", insertedCausaIds);
      const msg = e instanceof Error ? e.message : "Error al cargar los datos";
      setError(msg);
      return { ok: false, error: msg };
    } finally { setLoading(false); }
  }, []);


  return { loading, error, procesar, procesarUnLote, cargarEnBD };
}
