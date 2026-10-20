export type Rol = 'Formador' | 'Supervisor' | 'Asesor';

export interface Usuario {
  id: string;
  nombre: string;
  /** Solo dígitos; el usuario de acceso se construye como CO + documento */
  documento: string;
  rol: Rol;
  /** Campañas a las que pertenece; los formadores pertenecen a ambas */
  campanas: Campana[];
  /** Foto de perfil (dataURL) opcional */
  foto?: string;
  /** Supervisor del asesor (id de usuario con rol Supervisor) */
  supervisorId?: string;
}

export type TipoMaterial = 'video' | 'pdf' | 'imagen';

/** Programas de formación: preturnos (sesiones cortas) y formación continua (recorridos largos) */
export type TipoPrograma = 'preturno' | 'continua';

/** Campañas comerciales que comparten la plataforma */
export type Campana = 'criticos' | 'sta';

export interface Material {
  id: string;
  nombre: string;
  tipo: TipoMaterial;
  url: string;
  /** true si quedó guardado en almacenamiento local; false si solo vive en esta sesión */
  persistente: boolean;
}

export interface Pregunta {
  id: string;
  /** Tipo de pregunta; ausente en datos antiguos = 'opcion' */
  tipo?: TipoPregunta;
  pregunta: string;
  /**
   * Opciones de respuesta:
   * - 'opcion' / 'verdaderofalso' / 'caso': opciones elegibles
   * - 'secuencia': ítems en el ORDEN CORRECTO (al asesor se le muestran mezclados)
   * - demás tipos: vacío
   */
  opciones: string[];
  /** Índice de la opción correcta (tipos 'opcion', 'verdaderofalso' y 'caso') */
  respuestaCorrecta: number;
  /** Respuesta esperada para el tipo 'completar' (se compara sin mayúsculas ni tildes) */
  respuestaTexto?: string;
  /** Texto del escenario para el tipo 'caso' (caso práctico) */
  escenario?: string;
  /** Pares a relacionar para el tipo 'emparejamiento' (la derecha correcta de cada izquierda) */
  pares?: ParEmparejamiento[];
  /** Respuestas aceptadas para el tipo 'abierta'; vacío = se valora la participación */
  respuestasAceptadas?: string[];
  /** Palabras a encontrar para el tipo 'sopa' (sopa de letras generada automáticamente) */
  palabras?: string[];
}

/** Par de una pregunta de emparejamiento: concepto (izquierda) y su definición correcta (derecha). */
export interface ParEmparejamiento {
  izquierda: string;
  derecha: string;
}

/**
 * Tipos de pregunta del quiz:
 * - opcion: selección múltiple (una correcta)
 * - verdaderofalso: verdadero / falso
 * - completar: rellenar los espacios (texto exacto, sin tildes ni mayúsculas)
 * - caso: caso práctico o de escenario (contexto + selección múltiple)
 * - secuencia: ordenamiento o secuencia (ordenar ítems)
 * - emparejamiento: relacionar columnas
 * - abierta: respuesta corta abierta (texto libre)
 * - sopa: sopa de letras generada a partir de palabras
 */
export type TipoPregunta =
  | 'opcion'
  | 'verdaderofalso'
  | 'completar'
  | 'caso'
  | 'secuencia'
  | 'emparejamiento'
  | 'abierta'
  | 'sopa';

export interface Preturno {
  id: string;
  titulo: string;
  fecha: string; // YYYY-MM-DD
  descripcion: string;
  /** Campañas en las que está publicada la formación (una o ambas) */
  campanas: Campana[];
  /** Programa al que pertenece: preturno o formación continua */
  tipo: TipoPrograma;
  /** Imagen de portada (dataURL) mostrada en el banner */
  portada?: string;
  /** Fecha y hora (ISO local) desde la cual la formación es visible para asesores; vacío = disponible ya */
  disponibleDesde?: string;
  /** Fecha y hora (ISO local) hasta la cual la formación permanece visible; vacío = no vence */
  disponibleHasta?: string;
  /** Las formaciones ocultas no aparecen a los asesores; el formador puede mostrarlas de nuevo */
  oculto: boolean;
  /** Máximo de intentos permitidos. null/undefined = sin límite */
  limiteIntentos?: number | null;
  /** Carpeta mensual dentro del programa (ej. "Octubre"); vacío = carpeta General */
  carpeta?: string;
  materiales: Material[];
  preguntas: Pregunta[];
}

export interface Intento {
  id: string;
  preturnoId: string;
  usuarioId: string;
  usuarioNombre: string;
  aciertos: number;
  total: number;
  /** Índice de la opción elegida en cada pregunta; texto libre para 'completar'; null si no respondió */
  respuestas?: (number | string | null)[];
  fecha: string; // ISO con hora
}

export interface EstadoApp {
  usuarios: Usuario[];
  preturnos: Preturno[];
  intentos: Intento[];
  /** Registro de carpetas (creadas por el formador o marcadas como ocultas) */
  carpetas: Carpeta[];
}

/** Carpeta de organización dentro de una campaña y tipo de programa. */
export interface Carpeta {
  id: string;
  campana: Campana;
  tipo: TipoPrograma;
  /** Nombre visible: "Octubre", "PDA", "Certificaciones", etc. */
  nombre: string;
  /** Si está oculta, los asesores no la ven (ni su contenido) */
  oculta: boolean;
}

export type GrupoFecha = 'hoy' | 'semana' | 'proximos' | 'anteriores';
