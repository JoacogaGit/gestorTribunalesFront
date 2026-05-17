import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArchivoParseado } from "@/lib/parseMigracionFile";

export interface CausaIA {
  id_temporal: string;
  expediente_nro: string;
  caratula: string | null;
  estado_causa: "tramite" | "recurso" | "terminada";
  tipo_recurso: "casacion" | "rex" | "queja_corte" | null;
  tipo_proceso?: "unipersonal" | "colegiado" | null;
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
export interface SujetoIA {
  nombre_completo: string;
  delito: string | null;
  situacion_libertad: "libre" | "detenido" | "rebelde" | "probation" | "condenado";
  defensor: string | null;
  lugar_alojamiento: string | null;
  fecha_detencion: string | null;
  prescripcion_fecha: string | null;
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

export function useMigracion() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const procesar = useCallback(async (
    vocaliaId: string,
    vocaliaNombre: string,
    archivo: ArchivoParseado,
    mapeoManual?: Record<string, string>,
  ): Promise<ResultadoIA | null> => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("procesar-migracion", {
        body: { vocalia_id: vocaliaId, vocalia_nombre: vocaliaNombre, archivo, mapeo_manual: mapeoManual },
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
      return data.resultado as ResultadoIA;
    } finally { setLoading(false); }
  }, []);

  const cargarEnBD = useCallback(async (
    vocaliaId: string,
    causas: CausaIA[],
  ): Promise<{ ok: true; inserted: { causas: number; sujetos: number; eventos: number } } | { ok: false; error: string }> => {
    setLoading(true); setError(null);
    const insertedCausaIds: string[] = [];
    const insertedSujetoIds: string[] = [];
    const insertedEventoIds: string[] = [];
    try {
      let sujetosCount = 0;
      let eventosCount = 0;
      for (const c of causas) {
        const causaPayload = {
          vocalia_id: vocaliaId,
          expediente_nro: c.expediente_nro,
          caratula: c.caratula,
          estado_causa: c.estado_causa,
          tipo_recurso: c.tipo_recurso,
          tipo_proceso: c.tipo_proceso ?? null,
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
          const payload = c.sujetos.map((s) => ({ ...s, causa_id: causaRow.id }));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: sjRows, error: sjErr } = await supabase.from("sujetos").insert(payload as any).select("id");
          if (sjErr) throw new Error(`Sujetos de ${c.expediente_nro}: ${sjErr.message}`);
          sjRows?.forEach((r) => insertedSujetoIds.push(r.id));
          sujetosCount += c.sujetos.length;
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
      return { ok: true, inserted: { causas: insertedCausaIds.length, sujetos: sujetosCount, eventos: eventosCount } };
    } catch (e) {
      // Rollback hard delete
      if (insertedEventoIds.length) await supabase.from("eventos").delete().in("id", insertedEventoIds);
      if (insertedSujetoIds.length) await supabase.from("sujetos").delete().in("id", insertedSujetoIds);
      if (insertedCausaIds.length) await supabase.from("causas").delete().in("id", insertedCausaIds);
      const msg = e instanceof Error ? e.message : "Error al cargar los datos";
      setError(msg);
      return { ok: false, error: msg };
    } finally { setLoading(false); }
  }, []);

  return { loading, error, procesar, cargarEnBD };
}
