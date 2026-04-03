export type EstadoLibertad = "Detenido" | "Excarcelado" | "Rebelde" | "SJP";
export type EstadoCausa = "En trámite" | "En juicio" | "Terminada" | "Queja en Corte" | "Casación" | "REX";

export interface Causa {
  id: string;
  numero: string;
  caratula: string;
  imputados: string[];
  delito: string;
  estadoLibertad: EstadoLibertad;
  lugarDetencion?: string;
  estadoCausa: EstadoCausa;
  defensor: { nombre: string; tipo: "DPO" | "Particular"; contacto: string };
  fechaInicio: string;
  fechaElevacion?: string;
  fechaRadicacion?: string;
  fechaPrescripcion: string;
  fechaVencimientoPP?: string;
  juicioFijado?: { fecha: string; hora: string };
  probation?: { vencimiento: string };
  vocalia: string;
  secretaria: string;
  causasConexas?: string[];
  notas?: string;
}

export const mockCausas: Causa[] = [
  {
    id: "1",
    numero: "81233/2018",
    caratula: "GONZÁLEZ, Juan Carlos s/ Homicidio",
    imputados: ["González, Juan Carlos"],
    delito: "Homicidio simple (Art. 79 CP)",
    estadoLibertad: "Detenido",
    lugarDetencion: "CPF I - Ezeiza",
    estadoCausa: "En juicio",
    defensor: { nombre: "Dra. Martínez, Laura", tipo: "DPO", contacto: "4370-4600 int. 3422" },
    fechaInicio: "2018-06-15",
    fechaElevacion: "2019-03-20",
    fechaRadicacion: "2019-05-10",
    fechaPrescripcion: "2037-03-25",
    fechaVencimientoPP: "2025-06-15",
    juicioFijado: { fecha: "2025-05-12", hora: "09:30" },
    vocalia: "Vocalía 1",
    secretaria: "Secretaría 54",
    causasConexas: ["82100/2018"],
    notas: "Cómputo de palabra vigente. Paradero actualizado.",
  },
  {
    id: "2",
    numero: "82100/2018",
    caratula: "LÓPEZ, Marcelo A. s/ Robo agravado",
    imputados: ["López, Marcelo A.", "Pérez, Sergio R."],
    delito: "Robo agravado por uso de arma (Art. 166 inc. 2 CP)",
    estadoLibertad: "Excarcelado",
    estadoCausa: "En trámite",
    defensor: { nombre: "Dr. Fernández, Pablo", tipo: "Particular", contacto: "pfernandez@estudio.com.ar" },
    fechaInicio: "2018-09-22",
    fechaElevacion: "2020-01-15",
    fechaPrescripcion: "2030-09-22",
    vocalia: "Vocalía 1",
    secretaria: "Secretaría 54",
    causasConexas: ["81233/2018"],
  },
  {
    id: "3",
    numero: "95400/2020",
    caratula: "RAMÍREZ, Diego s/ Estafa reiterada",
    imputados: ["Ramírez, Diego"],
    delito: "Estafa reiterada (Art. 172 CP)",
    estadoLibertad: "Rebelde",
    estadoCausa: "En trámite",
    defensor: { nombre: "Dra. Soto, Carolina", tipo: "DPO", contacto: "4370-4600 int. 3418" },
    fechaInicio: "2020-03-10",
    fechaPrescripcion: "2026-08-10",
    vocalia: "Vocalía 2",
    secretaria: "Secretaría 55",
    notas: "Paradero vigente. Último domicilio: Av. Rivadavia 4500, CABA.",
  },
  {
    id: "4",
    numero: "103222/2021",
    caratula: "ACOSTA, Fabián s/ Tenencia de estupefacientes",
    imputados: ["Acosta, Fabián"],
    delito: "Tenencia de estupefacientes con fines de comercialización (Art. 5 inc. c, Ley 23.737)",
    estadoLibertad: "Detenido",
    lugarDetencion: "Alcaidía Comodoro Py",
    estadoCausa: "Casación",
    defensor: { nombre: "Dra. Villalba, Marta", tipo: "DPO", contacto: "4370-4600 int. 3430" },
    fechaInicio: "2021-07-05",
    fechaElevacion: "2022-02-14",
    fechaRadicacion: "2022-04-20",
    fechaPrescripcion: "2036-07-05",
    fechaVencimientoPP: "2025-07-05",
    vocalia: "Vocalía 3",
    secretaria: "Secretaría 56",
  },
  {
    id: "5",
    numero: "110500/2022",
    caratula: "MEDINA, Lucía s/ Lesiones graves",
    imputados: ["Medina, Lucía"],
    delito: "Lesiones graves (Art. 90 CP)",
    estadoLibertad: "SJP",
    estadoCausa: "En trámite",
    defensor: { nombre: "Dr. Castro, Ignacio", tipo: "Particular", contacto: "icastro@legales.com.ar" },
    fechaInicio: "2022-11-18",
    fechaPrescripcion: "2030-11-18",
    probation: { vencimiento: "2025-11-18" },
    vocalia: "Vocalía 1",
    secretaria: "Secretaría 54",
  },
  {
    id: "6",
    numero: "115800/2023",
    caratula: "TORRES, Ramón s/ Abuso sexual",
    imputados: ["Torres, Ramón"],
    delito: "Abuso sexual con acceso carnal (Art. 119 CP)",
    estadoLibertad: "Detenido",
    lugarDetencion: "CPF II - Marcos Paz",
    estadoCausa: "En juicio",
    defensor: { nombre: "Dra. Gómez, Silvia", tipo: "DPO", contacto: "4370-4600 int. 3425" },
    fechaInicio: "2023-02-28",
    fechaElevacion: "2023-12-10",
    fechaRadicacion: "2024-02-15",
    fechaPrescripcion: "2038-02-28",
    fechaVencimientoPP: "2025-08-28",
    juicioFijado: { fecha: "2025-06-20", hora: "10:00" },
    vocalia: "Vocalía 2",
    secretaria: "Secretaría 55",
    notas: "Víctima menor de edad. Trámite prioritario.",
  },
  {
    id: "7",
    numero: "78900/2017",
    caratula: "SILVA, Roberto s/ Asociación ilícita",
    imputados: ["Silva, Roberto", "Nuñez, Marcos", "Díaz, Ana"],
    delito: "Asociación ilícita (Art. 210 CP)",
    estadoLibertad: "Excarcelado",
    estadoCausa: "Queja en Corte",
    defensor: { nombre: "Dr. Peralta, Andrés", tipo: "Particular", contacto: "aperalta@defensapenales.com.ar" },
    fechaInicio: "2017-04-12",
    fechaElevacion: "2018-09-30",
    fechaRadicacion: "2018-12-01",
    fechaPrescripcion: "2027-04-12",
    vocalia: "Vocalía 3",
    secretaria: "Secretaría 56",
  },
  {
    id: "8",
    numero: "120100/2024",
    caratula: "VARGAS, Emanuel s/ Robo simple",
    imputados: ["Vargas, Emanuel"],
    delito: "Robo simple (Art. 164 CP)",
    estadoLibertad: "Excarcelado",
    estadoCausa: "En trámite",
    defensor: { nombre: "Dra. Ruiz, Florencia", tipo: "DPO", contacto: "4370-4600 int. 3440" },
    fechaInicio: "2024-01-15",
    fechaPrescripcion: "2029-01-15",
    vocalia: "Vocalía 1",
    secretaria: "Secretaría 54",
  },
];
