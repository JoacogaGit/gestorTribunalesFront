export type EstadoLibertad = "Detenido" | "Excarcelado" | "Rebelde" | "SJP";
export type EstadoCausa = "En trámite" | "En juicio" | "Terminada" | "Queja en Corte" | "Casación" | "REX";

export interface Audiencia {
  tipo: string;
  fecha: string;
  hora: string;
  notas?: string;
}

export interface AgendaItem {
  texto: string;
  fecha: string;
}

export interface Imputado {
  nombre: string;
  estadoLibertad: EstadoLibertad;
  lugarDetencion?: string;
  fechaVencimientoPena?: string;
  defensor: { nombre: string; tipo: "DPO" | "Particular"; contacto: string };
}

export interface OtroInterviniente {
  rol: string; // Querella, Actor civil, Demandado civil, etc.
  nombre: string;
  contacto?: string;
}

export interface AdjuntoPDF {
  nombre: string;
  /** Data URL (base64). Persistido en localStorage para el prototipo. */
  data: string;
}

export type TipoProceso = "unipersonal" | "colegiado";

export interface Causa {
  id: string;
  numero: string;
  /** Número interno del tribunal (separado del nº de expediente). */
  numeroInterno?: string | null;
  /** Despachante (máx 3 caracteres). */
  despachante?: string | null;



  /** Carátula explícita (cuando viene de DB). Si no, se deriva de imputados. */
  caratulaOverride?: string;
  delito: string;
  imputados: Imputado[];
  estadoCausa: EstadoCausa;
  fechaInicio: string;
  fechaElevacion?: string;
  fechaRadicacion?: string;
  /** Fecha de ingreso (354). ISO YYYY-MM-DD. */
  fechaIngreso?: string | null;
  /** Tipo de proceso: UNIP/COL. */
  tipoProceso?: TipoProceso | null;
  fechaPrescripcion: string;
  fechasPrescripcionExtra?: { fecha: string; label?: string }[];
  fechaVencimientoPP?: string;
  /** true si fechaVencimientoPP fue calculada automáticamente (fecha_detencion + 2 años). */
  fechaVencimientoPPCalculado?: boolean;
  juicioFijado?: { fecha: string; hora: string };
  audiencias?: Audiencia[];
  probation?: { vencimiento: string };
  vocalia: number;
  causasConexas?: string[];
  /** UUID de la causa vinculada (cuando hubo match en autocomplete). */
  causaConexaId?: string | null;
  /** Texto libre de la causa conexa (con o sin match). */
  causaConexaTexto?: string | null;
  /** Campo unificado: anotaciones / notas. */
  anotaciones?: string;
  agenda?: AgendaItem[];
  link?: string;
  otrosIntervinientes?: OtroInterviniente[];
  adjuntos?: AdjuntoPDF[];
  hiddenColumns?: Record<string, string[]>;
  extra?: Record<string, string>;
  /** Color de fondo para destacar la fila (compartido entre todos los miembros del tribunal). */
  colorDestacado?: string | null;
}

export function createEmptyCausa(vocalia: number): Causa {
  return {
    id: `new-${Date.now()}`,
    numero: "",
    delito: "",
    imputados: [
      { nombre: "", estadoLibertad: "Excarcelado", defensor: { nombre: "", tipo: "DPO", contacto: "" } },
    ],
    estadoCausa: "En trámite",
    fechaInicio: new Date().toISOString().slice(0, 10),
    fechaPrescripcion: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    vocalia,
  };
}

export function getCaratula(causa: Causa): string {
  if (causa.caratulaOverride) return causa.caratulaOverride;
  if (causa.imputados.length === 1) return causa.imputados[0].nombre;
  return `${causa.imputados[0].nombre} y otros`;
}

export type ProximityLevel = "vencido" | "critico" | "urgente" | "proximo" | "medio" | "lejano";

// Escala unificada con eventoMapper: ≤4d (incluye vencidos) | 5-10 | 11-20 | 21-30 | 31-60 | 60+.
export function getProximityLevel(fecha: string): ProximityLevel {
  const diff = (new Date(fecha).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diff <= 4) return "vencido";
  if (diff <= 10) return "critico";
  if (diff <= 20) return "urgente";
  if (diff <= 30) return "proximo";
  if (diff <= 60) return "medio";
  return "lejano";
}

export function getProximityColor(fecha: string): string {
  switch (getProximityLevel(fecha)) {
    case "vencido": return "text-red-600 font-bold";
    case "critico": return "text-red-500 font-semibold";
    case "urgente": return "text-orange-600 font-semibold";
    case "proximo": return "text-orange-500";
    case "medio": return "text-yellow-600";
    case "lejano": return "text-green-600";
  }
}

export function getProximityBg(fecha: string): string {
  switch (getProximityLevel(fecha)) {
    case "vencido": return "bg-red-600/80 text-white border-l-red-700";
    case "critico": return "bg-red-400/70 text-white border-l-red-500";
    case "urgente": return "bg-orange-500/70 text-white border-l-orange-600";
    case "proximo": return "bg-orange-300/70 text-orange-950 border-l-orange-400";
    case "medio": return "bg-yellow-400/70 text-yellow-950 border-l-yellow-500";
    case "lejano": return "bg-green-500/30 text-foreground border-l-green-600";
  }
}

export function getProximityDot(fecha: string): string {
  switch (getProximityLevel(fecha)) {
    case "vencido": return "bg-red-600";
    case "critico": return "bg-red-400";
    case "urgente": return "bg-orange-500";
    case "proximo": return "bg-orange-300";
    case "medio": return "bg-yellow-400";
    case "lejano": return "bg-green-500";
  }
}

export type TipoEvento = "Juicio" | "Prescripción" | "Vto. PP" | "Audiencia" | "Vto. Probation" | "Agenda" | "Vto. Pena";

export const TIPOS_EVENTO: TipoEvento[] = ["Juicio", "Audiencia", "Prescripción", "Vto. PP", "Vto. Probation", "Vto. Pena", "Agenda"];

export interface Evento {
  causa: Causa;
  tipo: TipoEvento;
  descripcion: string;
  fecha: string;
  hora?: string;
}

export function getAllEventos(causas: Causa[]): Evento[] {
  const eventos: Evento[] = [];
  for (const c of causas) {
    if (!c.numero && !c.imputados.some((i) => i.nombre)) continue;
    if (c.juicioFijado?.fecha) {
      eventos.push({ causa: c, tipo: "Juicio", descripcion: "Juicio oral", fecha: c.juicioFijado.fecha, hora: c.juicioFijado.hora });
    }
    if (c.fechaPrescripcion) {
      eventos.push({ causa: c, tipo: "Prescripción", descripcion: "Prescripción", fecha: c.fechaPrescripcion });
    }
    if (c.fechasPrescripcionExtra) {
      for (const fp of c.fechasPrescripcionExtra) {
        if (fp.fecha) eventos.push({ causa: c, tipo: "Prescripción", descripcion: fp.label ? `Prescripción — ${fp.label}` : "Prescripción", fecha: fp.fecha });
      }
    }
    if (c.fechaVencimientoPP) {
      eventos.push({ causa: c, tipo: "Vto. PP", descripcion: "Vto. Prisión Preventiva", fecha: c.fechaVencimientoPP });
    }
    if (c.probation?.vencimiento) {
      eventos.push({ causa: c, tipo: "Vto. Probation", descripcion: "Vto. Probation", fecha: c.probation.vencimiento });
    }
    if (c.audiencias) {
      for (const a of c.audiencias) {
        if (a.fecha) eventos.push({ causa: c, tipo: "Audiencia", descripcion: `Aud. ${a.tipo}`, fecha: a.fecha, hora: a.hora });
      }
    }
    if (c.agenda) {
      for (const ag of c.agenda) {
        if (ag.fecha) eventos.push({ causa: c, tipo: "Agenda", descripcion: ag.texto, fecha: ag.fecha });
      }
    }
    for (const imp of c.imputados) {
      if (imp.fechaVencimientoPena) {
        eventos.push({ causa: c, tipo: "Vto. Pena", descripcion: `Vto. Pena — ${imp.nombre}`, fecha: imp.fechaVencimientoPena });
      }
    }
  }
  return eventos.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
}

export const mockCausas: Causa[] = [
  {
    id: "1",
    numero: "81233/2018",
    delito: "Homicidio simple (Art. 79 CP)",
    imputados: [
      { nombre: "González, Juan Carlos", estadoLibertad: "Detenido", lugarDetencion: "CPF I - Ezeiza", defensor: { nombre: "Dra. Martínez, Laura", tipo: "DPO", contacto: "4370-4600 int. 3422" } },
    ],
    estadoCausa: "En juicio",
    fechaInicio: "2018-06-15",
    fechaElevacion: "2019-03-20",
    fechaRadicacion: "2019-05-10",
    fechaPrescripcion: "2037-03-25",
    fechaVencimientoPP: "2025-06-15",
    juicioFijado: { fecha: "2025-05-12", hora: "09:30" },
    audiencias: [
      { tipo: "Art. 454 CPPN", fecha: "2025-04-20", hora: "10:00", notas: "Audiencia previa al debate" },
    ],
    vocalia: 1,
    causasConexas: ["82100/2018"],
    anotaciones: "Cómputo de palabra vigente. Verificar prueba documental presentada por la defensa.",
    agenda: [
      { texto: "Llamar al defensor por prueba pendiente", fecha: "2025-04-18" },
    ],
  },
  {
    id: "2",
    numero: "82100/2018",
    delito: "Robo agravado por uso de arma (Art. 166 inc. 2 CP)",
    imputados: [
      { nombre: "López, Marcelo A.", estadoLibertad: "Excarcelado", defensor: { nombre: "Dr. Fernández, Pablo", tipo: "Particular", contacto: "pfernandez@estudio.com.ar" } },
      { nombre: "Pérez, Sergio R.", estadoLibertad: "Detenido", lugarDetencion: "Alcaidía Comodoro Py", defensor: { nombre: "Dra. Ruiz, Florencia", tipo: "DPO", contacto: "4370-4600 int. 3440" } },
    ],
    estadoCausa: "En trámite",
    fechaInicio: "2018-09-22",
    fechaElevacion: "2020-01-15",
    fechaPrescripcion: "2030-09-22",
    audiencias: [
      { tipo: "Cesura", fecha: "2025-04-28", hora: "11:00" },
    ],
    vocalia: 1,
    causasConexas: ["81233/2018"],
  },
  {
    id: "3",
    numero: "95400/2020",
    delito: "Estafa reiterada (Art. 172 CP)",
    imputados: [
      { nombre: "Ramírez, Diego", estadoLibertad: "Rebelde", defensor: { nombre: "Dra. Soto, Carolina", tipo: "DPO", contacto: "4370-4600 int. 3418" } },
    ],
    estadoCausa: "En trámite",
    fechaInicio: "2020-03-10",
    fechaPrescripcion: "2026-08-10",
    vocalia: 2,
    anotaciones: "Paradero vigente. Último domicilio: Av. Rivadavia 4500, CABA.",
  },
  {
    id: "4",
    numero: "103222/2021",
    delito: "Tenencia de estupefacientes con fines de comercialización (Art. 5 inc. c, Ley 23.737)",
    imputados: [
      { nombre: "Acosta, Fabián", estadoLibertad: "Detenido", lugarDetencion: "Alcaidía Comodoro Py", defensor: { nombre: "Dra. Villalba, Marta", tipo: "DPO", contacto: "4370-4600 int. 3430" } },
    ],
    estadoCausa: "Casación",
    fechaInicio: "2021-07-05",
    fechaElevacion: "2022-02-14",
    fechaRadicacion: "2022-04-20",
    fechaPrescripcion: "2036-07-05",
    fechaVencimientoPP: "2025-07-05",
    audiencias: [
      { tipo: "Nulidad", fecha: "2025-05-05", hora: "14:00", notas: "Planteo de nulidad de procedimiento" },
    ],
    vocalia: 3,
  },
  {
    id: "5",
    numero: "110500/2022",
    delito: "Lesiones graves (Art. 90 CP)",
    imputados: [
      { nombre: "Medina, Lucía", estadoLibertad: "SJP", defensor: { nombre: "Dr. Castro, Ignacio", tipo: "Particular", contacto: "icastro@legales.com.ar" } },
    ],
    estadoCausa: "En trámite",
    fechaInicio: "2022-11-18",
    fechaPrescripcion: "2030-11-18",
    probation: { vencimiento: "2025-11-18" },
    vocalia: 1,
  },
  {
    id: "6",
    numero: "115800/2023",
    delito: "Abuso sexual con acceso carnal (Art. 119 CP)",
    imputados: [
      { nombre: "Torres, Ramón", estadoLibertad: "Detenido", lugarDetencion: "CPF II - Marcos Paz", defensor: { nombre: "Dra. Gómez, Silvia", tipo: "DPO", contacto: "4370-4600 int. 3425" } },
    ],
    estadoCausa: "En juicio",
    fechaInicio: "2023-02-28",
    fechaElevacion: "2023-12-10",
    fechaRadicacion: "2024-02-15",
    fechaPrescripcion: "2038-02-28",
    fechaVencimientoPP: "2025-08-28",
    juicioFijado: { fecha: "2025-06-20", hora: "10:00" },
    audiencias: [
      { tipo: "Instrucción suplementaria", fecha: "2025-04-15", hora: "09:00" },
      { tipo: "Cámara Gesell", fecha: "2025-05-02", hora: "15:00", notas: "Declaración testimonial víctima" },
    ],
    vocalia: 2,
    anotaciones: "Víctima menor de edad. Trámite prioritario.",
    agenda: [
      { texto: "Coordinar con Cámara Gesell", fecha: "2025-04-25" },
      { texto: "Revisar pericia psicológica", fecha: "2025-05-10" },
    ],
  },
  {
    id: "7",
    numero: "78900/2017",
    delito: "Asociación ilícita (Art. 210 CP)",
    imputados: [
      { nombre: "Silva, Roberto", estadoLibertad: "Excarcelado", defensor: { nombre: "Dr. Peralta, Andrés", tipo: "Particular", contacto: "aperalta@defensapenales.com.ar" } },
      { nombre: "Nuñez, Marcos", estadoLibertad: "Excarcelado", defensor: { nombre: "Dr. Peralta, Andrés", tipo: "Particular", contacto: "aperalta@defensapenales.com.ar" } },
      { nombre: "Díaz, Ana", estadoLibertad: "Detenido", lugarDetencion: "CPF IV - Mujeres Ezeiza", defensor: { nombre: "Dra. Soto, Carolina", tipo: "DPO", contacto: "4370-4600 int. 3418" } },
    ],
    estadoCausa: "Queja en Corte",
    fechaInicio: "2017-04-12",
    fechaElevacion: "2018-09-30",
    fechaRadicacion: "2018-12-01",
    fechaPrescripcion: "2027-04-12",
    vocalia: 3,
  },
  {
    id: "8",
    numero: "120100/2024",
    delito: "Robo simple (Art. 164 CP)",
    imputados: [
      { nombre: "Vargas, Emanuel", estadoLibertad: "Excarcelado", defensor: { nombre: "Dra. Ruiz, Florencia", tipo: "DPO", contacto: "4370-4600 int. 3440" } },
    ],
    estadoCausa: "En trámite",
    fechaInicio: "2024-01-15",
    fechaPrescripcion: "2029-01-15",
    audiencias: [
      { tipo: "Conciliación", fecha: "2025-04-10", hora: "12:00" },
    ],
    vocalia: 1,
  },
  {
    id: "9",
    numero: "125300/2024",
    delito: "Amenazas coactivas (Art. 149 bis CP)",
    imputados: [
      { nombre: "Ferreyra, Carlos", estadoLibertad: "Detenido", lugarDetencion: "CPF I - Ezeiza", defensor: { nombre: "Dr. Mendoza, Raúl", tipo: "DPO", contacto: "4370-4600 int. 3450" } },
      { nombre: "Ferreyra, Miguel", estadoLibertad: "Excarcelado", defensor: { nombre: "Dr. Mendoza, Raúl", tipo: "DPO", contacto: "4370-4600 int. 3450" } },
    ],
    estadoCausa: "En trámite",
    fechaInicio: "2024-03-10",
    fechaPrescripcion: "2028-03-10",
    fechaVencimientoPP: "2025-09-10",
    vocalia: 2,
  },
  {
    id: "10",
    numero: "70200/2016",
    delito: "Hurto simple (Art. 162 CP)",
    imputados: [
      { nombre: "Aguirre, Pablo", estadoLibertad: "Excarcelado", defensor: { nombre: "Dr. Ríos, Esteban", tipo: "DPO", contacto: "4370-4600 int. 3411" } },
    ],
    estadoCausa: "Terminada",
    fechaInicio: "2016-05-02",
    fechaPrescripcion: "2024-05-02",
    vocalia: 1,
    anotaciones: "Sentencia firme. Archivo definitivo.",
  },
];
