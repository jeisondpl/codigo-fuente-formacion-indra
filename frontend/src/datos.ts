import type {
  Campana,
  EstadoApp,
  GrupoFecha,
  Material,
  Pregunta,
  Preturno,
  Rol,
  TipoPrograma,
  Usuario,
} from './tipos';
import { esTokenIdb, guardarArchivo, leerArchivo } from './almacenArchivos';
import { cargarEstadoRemoto, insertarUsuarioBD, subirEstadoInicialBD } from './datosBackend';

/** Clave del almacenamiento local anterior a Supabase (migración) */
const CLAVE_ALMACEN = 'formacion-indra-datos-v7';
/** Marca que evita repetir la migración de datos locales a Supabase */
const CLAVE_MIGRADO = 'formacion-indra-migrado-supabase';

/** Prefijo obligatorio del usuario de acceso */
export const PREFIJO_USUARIO = 'CO';

/** Construye el nombre de usuario de acceso a partir del documento (solo dígitos). */
export function construirUsuarioLogin(documento: string): string {
  return PREFIJO_USUARIO + documento;
}

/** Quita cualquier carácter que no sea dígito del documento. */
export function limpiarDocumento(valor: string): string {
  return valor.replace(/\D/g, '');
}

/**
 * Valida las credenciales de acceso. El usuario es CO + número de documento
 * y la contraseña es el propio número de documento del usuario.
 */
export function validarCredenciales(
  nombreUsuario: string,
  contrasena: string,
  usuarios: Usuario[],
): Usuario | null {
  const limpio = nombreUsuario.trim().toUpperCase();
  const documento = limpio.startsWith(PREFIJO_USUARIO)
    ? limpio.slice(PREFIJO_USUARIO.length)
    : limpio;
  const usuario = usuarios.find((u) => u.documento === documento) ?? null;
  if (!usuario || contrasena !== usuario.documento) return null;
  return usuario;
}

export function generarId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Normaliza un texto para comparar respuestas: sin tildes, sin mayúsculas, espacios simples. */
export function normalizarTexto(t: string): string {
  const sinTildes = Array.from(t.normalize('NFD'))
    .filter((c) => c.charCodeAt(0) < 768 || c.charCodeAt(0) > 879)
    .join('');
  return sinTildes.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Longitud máxima de palabra admitida en el tablero de la sopa de letras. */
export const SOPA_MAX_LETRAS = 12;
/** Número máximo de palabras colocadas en el tablero. */
export const SOPA_MAX_PALABRAS = 10;

/**
 * Prepara la lista de palabras de una sopa de letras: divide las frases en
 * palabras sueltas (sin tildes), descarta las demasiado largas para que el
 * tablero se mantenga pequeño y limita la cantidad total.
 */
export function palabrasSopa(palabras: string[]): string[] {
  const todas = palabras
    .flatMap((frase) => normalizarTexto(frase).toUpperCase().split(/\s+/))
    .map((w) => w.replace(/[^A-ZÑ]/g, ''))
    .filter((w) => w.length >= 2 && w.length <= SOPA_MAX_LETRAS);
  return [...new Set(todas)].slice(0, SOPA_MAX_PALABRAS);
}

/** ¿La respuesta del asesor es correcta para esta pregunta? */
export function esRespuestaCorrecta(
  p: Pregunta,
  elegida: number | string | null | undefined,
): boolean {
  if (elegida === null || elegida === undefined) return false;
  const tipo = p.tipo ?? 'opcion';

  switch (tipo) {
    case 'completar':
      return (
        typeof elegida === 'string' &&
        normalizarTexto(elegida) === normalizarTexto(p.respuestaTexto ?? '')
      );
    case 'caso':
      return elegida === p.respuestaCorrecta;
    case 'secuencia': {
      // La respuesta guarda los índices originales en el orden elegido: "2,0,1,3"
      if (typeof elegida !== 'string') return false;
      const orden = elegida.split(',').map(Number);
      return (
        orden.length === p.opciones.length &&
        orden.every((v, i) => v === i && Number.isInteger(v))
      );
    }
    case 'emparejamiento': {
      // La respuesta guarda pares "izquierda:derechaOriginal": "0:2,1:0,2:1"
      if (typeof elegida !== 'string' || !p.pares) return false;
      const paresElegidos = elegida.split(',').map((s) => s.split(':').map(Number));
      return (
        paresElegidos.length === p.pares.length &&
        paresElegidos.every(
          ([i, d]) => Number.isInteger(i) && Number.isInteger(d) && d === i,
        )
      );
    }
    case 'abierta': {
      if (typeof elegida !== 'string') return false;
      const aceptadas = (p.respuestasAceptadas ?? []).filter((a) => a.trim());
      // Sin respuestas definidas: se valora que el asesor haya participado
      if (aceptadas.length === 0) return elegida.trim().length > 0;
      return aceptadas.some((a) => normalizarTexto(a) === normalizarTexto(elegida));
    }
    case 'sopa': {
      // La respuesta guarda las palabras encontradas: "PALABRA1|PALABRA2"
      if (typeof elegida !== 'string') return false;
      const esperadas = palabrasSopa(p.palabras ?? []);
      if (esperadas.length === 0) return false;
      const encontradas = elegida.split('|').filter(Boolean);
      return esperadas.every((w) => encontradas.includes(w));
    }
    default:
      return elegida === p.respuestaCorrecta;
  }
}

/** Texto legible de la respuesta elegida por el asesor. */
export function textoRespuesta(
  p: Pregunta,
  elegida: number | string | null | undefined,
): string {
  if (elegida === null || elegida === undefined) return 'Sin responder';
  const tipo = p.tipo ?? 'opcion';

  switch (tipo) {
    case 'completar':
    case 'abierta':
      return String(elegida);
    case 'secuencia': {
      if (typeof elegida !== 'string') return 'Sin responder';
      return elegida
        .split(',')
        .map((i) => p.opciones[Number(i)] ?? '—')
        .join(' → ');
    }
    case 'emparejamiento': {
      if (typeof elegida !== 'string' || !p.pares) return 'Sin responder';
      return elegida
        .split(',')
        .map((s) => {
          const [i, d] = s.split(':').map(Number);
          return `${p.pares?.[i]?.izquierda ?? '?'} = ${p.pares?.[d]?.derecha ?? '?'}`;
        })
        .join('; ');
    }
    case 'sopa': {
      if (typeof elegida !== 'string') return 'Sin responder';
      const encontradas = elegida.split('|').filter(Boolean);
      const total = palabrasSopa(p.palabras ?? []).length;
      return `${encontradas.length} de ${total} palabras: ${encontradas.join(', ')}`;
    }
    default:
      return typeof elegida === 'number' ? (p.opciones[elegida] ?? '—') : String(elegida);
  }
}

/** Texto legible de la respuesta correcta de la pregunta. */
export function textoCorrecta(p: Pregunta): string {
  const tipo = p.tipo ?? 'opcion';
  switch (tipo) {
    case 'completar':
      return p.respuestaTexto ?? '—';
    case 'secuencia':
      return p.opciones.join(' → ');
    case 'emparejamiento':
      return (p.pares ?? []).map((par) => `${par.izquierda} = ${par.derecha}`).join('; ');
    case 'abierta': {
      const aceptadas = (p.respuestasAceptadas ?? []).filter((a) => a.trim());
      return aceptadas.length > 0 ? aceptadas.join(' / ') : 'Respuesta abierta (participación)';
    }
    case 'sopa':
      return `Encontrar todas: ${palabrasSopa(p.palabras ?? []).join(', ')}`;
    default:
      return p.opciones[p.respuestaCorrecta] ?? '—';
  }
}

/** ¿La pregunta está completa y lista para publicarse? */
export function preguntaCompleta(p: Pregunta): boolean {
  if (!p.pregunta.trim()) return false;
  const tipo = p.tipo ?? 'opcion';
  switch (tipo) {
    case 'completar':
      return Boolean(p.respuestaTexto?.trim());
    case 'caso':
      return (
        Boolean(p.escenario?.trim()) &&
        p.opciones.length > 0 &&
        p.opciones.every((o) => o.trim())
      );
    case 'secuencia':
      return p.opciones.length >= 2 && p.opciones.every((o) => o.trim());
    case 'emparejamiento':
      return (
        (p.pares?.length ?? 0) >= 2 &&
        (p.pares ?? []).every((par) => par.izquierda.trim() && par.derecha.trim())
      );
    case 'abierta':
      return true;
    case 'sopa':
      return palabrasSopa(p.palabras ?? []).length >= 3;
    default:
      return p.opciones.length > 0 && p.opciones.every((o) => o.trim());
  }
}

function aISO(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function deISO(iso: string): Date {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function fechaHoyISO(): string {
  return aISO(new Date());
}

export function formatearFecha(iso: string): string {
  return deISO(iso).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatearFechaCorta(iso: string): string {
  return deISO(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  });
}

/** Agrupa los preturnos por franja de fecha: hoy, resto de la semana, próximos y anteriores. */
export function agruparPorFecha(preturnos: Preturno[]): Record<GrupoFecha, Preturno[]> {
  const hoy = deISO(fechaHoyISO()).getTime();
  const DIA = 24 * 60 * 60 * 1000;
  const grupos: Record<GrupoFecha, Preturno[]> = {
    hoy: [],
    semana: [],
    proximos: [],
    anteriores: [],
  };
  for (const p of preturnos) {
    const t = deISO(p.fecha).getTime();
    if (t === hoy) grupos.hoy.push(p);
    else if (t < hoy) grupos.anteriores.push(p);
    else if (t <= hoy + 6 * DIA) grupos.semana.push(p);
    else grupos.proximos.push(p);
  }
  const porFecha = (a: Preturno, b: Preturno) => a.fecha.localeCompare(b.fecha);
  (Object.keys(grupos) as GrupoFecha[]).forEach((k) => grupos[k].sort(porFecha));
  return grupos;
}

export const ETIQUETAS_GRUPO: Record<GrupoFecha, string> = {
  hoy: 'Preturnos de hoy',
  semana: 'Preturnos de esta semana',
  proximos: 'Próximos preturnos',
  anteriores: 'Preturnos anteriores',
};

export const GRUPOS_ORDEN: GrupoFecha[] = ['hoy', 'semana', 'proximos', 'anteriores'];

/** Etiqueta visible para cada programa de formación. */
export function etiquetaPrograma(tipo: TipoPrograma): string {
  return tipo === 'continua' ? 'Formación continua' : 'Preturno';
}

/** Etiquetas visibles de las campañas. */
export const ETIQUETAS_CAMPANA: Record<Campana, string> = {
  criticos: 'Clientes Críticos',
  sta: 'STA',
};

export const CAMPANAS: Campana[] = ['criticos', 'sta'];

/** Une las etiquetas de las campañas de una formación o usuario ("A · B"). */
export function etiquetasDeCampanas(campanas: Campana[]): string {
  return campanas.map((c) => ETIQUETAS_CAMPANA[c]).join(' · ');
}

/** ¿La formación ya está habilitada (fecha/hora de publicación) para los asesores? */
export function estaDisponible(p: Preturno, ahora = new Date()): boolean {
  const t = ahora.getTime();
  if (p.disponibleDesde && new Date(p.disponibleDesde).getTime() > t) return false;
  if (p.disponibleHasta && new Date(p.disponibleHasta).getTime() <= t) return false;
  return true;
}

/** Normaliza la lista de campañas de un usuario: formadores en ambas, asesores en su campaña. */
function campanasDeUsuario(rol: Rol, campanas?: Campana[]): Campana[] {
  const validas = (campanas ?? []).filter((c) => c === 'criticos' || c === 'sta');
  if (rol === 'Formador') return validas.length > 0 ? validas : [...CAMPANAS];
  return validas.length > 0 ? validas : ['criticos'];
}

function imagenDemo(titulo: string, subtitulo: string, colorA: string, colorB: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="320">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${colorA}"/><stop offset="1" stop-color="${colorB}"/>
    </linearGradient></defs>
    <rect width="960" height="320" fill="url(#g)"/>
    <circle cx="820" cy="60" r="110" fill="#00A3E0" opacity="0.35"/>
    <circle cx="120" cy="280" r="140" fill="#00A3E0" opacity="0.18"/>
    <text x="60" y="150" font-family="Segoe UI, Arial" font-size="38" fill="#FFFFFF" font-weight="700">${titulo}</text>
    <text x="60" y="195" font-family="Segoe UI, Arial" font-size="21" fill="#9fd8f5">${subtitulo}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function datosSemilla(): EstadoApp {
  const hoy = new Date();
  const enDias = (n: number) => aISO(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + n));

  const usuarios: Usuario[] = [
    { id: 'u-diego-1', nombre: 'Diego Alexander Henao Charry', documento: DOC_FORMADOR_PRINCIPAL, rol: 'Formador', campanas: ['criticos', 'sta'] },
    { id: 'u-form-1', nombre: 'Claudia Restrepo', documento: '52884113', rol: 'Formador', campanas: ['criticos', 'sta'] },
    { id: 'u-sup-1', nombre: 'Supervisor Farfan', documento: '7123456', rol: 'Supervisor', campanas: ['criticos', 'sta'] },
    { id: 'u-sup-2', nombre: 'Jeny Ortiz', documento: '6234567', rol: 'Supervisor', campanas: ['criticos', 'sta'] },
    { id: 'u-ase-1', nombre: 'Andrés Gómez', documento: '1045778', rol: 'Asesor', campanas: ['criticos'], supervisorId: 'u-sup-1' },
    { id: 'u-ase-2', nombre: 'Valentina Torres', documento: '1098334', rol: 'Asesor', campanas: ['sta'], supervisorId: 'u-sup-2' },
    { id: 'u-ase-3', nombre: 'Julián Martínez', documento: '884201', rol: 'Asesor', campanas: ['sta'], supervisorId: 'u-sup-2' },
  ];

  const pregunta: Pregunta = {
    id: generarId(),
    pregunta: '¿Cuál es el primer paso al recibir una llamada de un cliente crítico?',
    opciones: [
      'Escalar de inmediato a la gerencia',
      'Identificar al cliente y documentar el caso',
      'Ofrecer un descuento comercial',
      'Cerrar el ticket sin respuesta',
    ],
    respuestaCorrecta: 1,
  };

  const pregunta2: Pregunta = {
    id: generarId(),
    pregunta: '¿Qué canal tiene la mayor prioridad de respuesta según el protocolo?',
    opciones: ['Correo electrónico', 'Redes sociales', 'Línea de emergencias 24/7', 'Chat web'],
    respuestaCorrecta: 2,
  };

  const preturnos: Preturno[] = [
    {
      id: 'p-1',
      titulo: 'Protocolo de atención a clientes críticos',
      fecha: fechaHoyISO(),
      descripcion:
        'Sesión de alineación sobre el nuevo protocolo: niveles de severidad, tiempos de respuesta y escalamiento.',
      campanas: ['criticos'],
      tipo: 'preturno',
      carpeta: 'Octubre',
      portada: imagenDemo(
        'Protocolo de atención',
        'Preturno · Guía visual de la sesión',
        '#001B3A',
        '#0072CE',
      ),
      oculto: false,
      materiales: [
        {
          id: generarId(),
          nombre: 'Guía visual del protocolo.png',
          tipo: 'imagen',
          url: imagenDemo(
            'Protocolo de atención',
            'Clientes críticos · Guía visual de la sesión',
            '#001B3A',
            '#0072CE',
          ),
          persistente: true,
        },
        {
          id: generarId(),
          nombre: 'Video introductorio.mp4',
          tipo: 'video',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
          persistente: true,
        },
      ],
      preguntas: [pregunta, pregunta2],
    },
    {
      id: 'p-2',
      titulo: 'Manejo de objeciones en negociación',
      fecha: enDias(3),
      descripcion:
        'Técnicas de escucha activa y respuesta a objeciones frecuentes durante la renovación de contratos.',
      campanas: ['criticos'],
      tipo: 'preturno',
      carpeta: 'Octubre',
      portada: imagenDemo(
        'Manejo de objeciones',
        'Preturno · Negociación y renovación',
        '#0a2a52',
        '#00A3E0',
      ),
      oculto: false,
      materiales: [],
      preguntas: [],
    },
    {
      id: 'p-3',
      titulo: 'Ruta de fortalecimiento comercial',
      fecha: enDias(-4),
      descripcion:
        'Programa de formación continua de varias semanas: venta consultiva, seguimiento y cierre de cuentas críticas.',
      campanas: ['criticos'],
      tipo: 'continua',
      portada: imagenDemo(
        'Ruta de fortalecimiento',
        'Formación continua · Recorrido completo',
        '#003a70',
        '#00A3E0',
      ),
      oculto: false,
      materiales: [],
      preguntas: [],
    },
    {
      id: 'p-4',
      titulo: 'Fundamentos STA: portafolio y servicios',
      fecha: fechaHoyISO(),
      descripcion:
        'Preturno de inducción a la campaña STA: portafolio de servicios, tarifas y flujo de cotización.',
      campanas: ['sta'],
      tipo: 'preturno',
      carpeta: 'Octubre',
      portada: imagenDemo(
        'Fundamentos STA',
        'Preturno · Portafolio y servicios',
        '#001B3A',
        '#00A3E0',
      ),
      oculto: false,
      materiales: [],
      preguntas: [],
    },
    {
      id: 'p-5',
      titulo: 'Ruta STA: atención de alto volumen',
      fecha: enDias(5),
      descripcion:
        'Formación continua de la campaña STA: gestión de grandes volúmenes de interacción sin perder calidad.',
      campanas: ['sta'],
      tipo: 'continua',
      portada: imagenDemo(
        'Ruta STA',
        'Formación continua · Alto volumen',
        '#0a2a52',
        '#00A3E0',
      ),
      oculto: false,
      materiales: [],
      preguntas: [],
    },
  ];

  return { usuarios, preturnos, intentos: [], carpetas: [] };
}

/** Documento del formador principal (Diego Alexander Henao Charry) */
export const DOC_FORMADOR_PRINCIPAL = '1023940501';

/**
 * Garantiza que el formador principal exista con su rol correcto.
 * Si otro perfil ocupa su documento (p. ej. un usuario de prueba),
 * lo reemplaza conservando su id para no romper los registros previos.
 */
function asegurarFormadorPrincipal(usuarios: Usuario[]): Usuario[] {
  const existente = usuarios.find((u) => u.documento === DOC_FORMADOR_PRINCIPAL);
  const diego: Usuario = {
    id: existente?.id ?? 'u-diego-1',
    nombre: 'Diego Alexander Henao Charry',
    documento: DOC_FORMADOR_PRINCIPAL,
    rol: 'Formador',
    campanas: ['criticos', 'sta'],
    foto: existente?.foto,
  };
  return [diego, ...usuarios.filter((u) => u.documento !== DOC_FORMADOR_PRINCIPAL)];
}

/** Completa los campos nuevos en datos guardados antes de la segmentación por campañas. */
function normalizarPreturno(p: Preturno): Preturno {
  const campanaAnterior: Campana =
    (p as unknown as { campana?: Campana }).campana === 'sta' ? 'sta' : 'criticos';
  const campanas = Array.isArray(p.campanas)
    ? p.campanas.filter((c) => c === 'criticos' || c === 'sta')
    : [];
  return {
    ...p,
    campanas: campanas.length > 0 ? campanas : [campanaAnterior],
    tipo: p.tipo === 'continua' ? 'continua' : 'preturno',
    oculto: Boolean(p.oculto),
    portada: p.portada,
    disponibleDesde: p.disponibleDesde,
    disponibleHasta: p.disponibleHasta,
    limiteIntentos: p.limiteIntentos ?? null,
    carpeta: p.carpeta,
  };
}

/** Completa los campos nuevos de usuarios guardados antes de la segmentación. */
function normalizarUsuario(u: Usuario): Usuario {
  return {
    ...u,
    campanas: campanasDeUsuario(u.rol, u.campanas),
    foto: u.foto,
    supervisorId: u.supervisorId,
  };
}

/** Lee el estado guardado en localStorage antes de la migración a Supabase. */
function leerEstadoLocal(): EstadoApp | null {
  try {
    const crudo = localStorage.getItem(CLAVE_ALMACEN);
    if (crudo) {
      const parseado = JSON.parse(crudo) as EstadoApp;
      if (Array.isArray(parseado.usuarios) && Array.isArray(parseado.preturnos)) {
        // Incorpora formaciones semilla que falten (igual que antes de migrar).
        const faltantes = datosSemilla().preturnos.filter(
          (semilla) => !parseado.preturnos.some((p) => p.id === semilla.id),
        );
        return {
          ...parseado,
          usuarios: asegurarFormadorPrincipal(parseado.usuarios.map(normalizarUsuario)),
          preturnos: [...parseado.preturnos.map(normalizarPreturno), ...faltantes],
          intentos: Array.isArray(parseado.intentos) ? parseado.intentos : [],
          carpetas: Array.isArray(parseado.carpetas) ? parseado.carpetas : [],
        };
      }
    }
  } catch {
    // datos corruptos: se ignoran
  }
  return null;
}

/**
 * Sube los archivos guardados en IndexedDB (tokens `idb:`) a Supabase Storage
 * y reescribe sus URLs, para que funcionen desde cualquier equipo.
 */
async function migrarArchivosLocales(estado: EstadoApp): Promise<EstadoApp> {
  const preturnos = await Promise.all(
    estado.preturnos.map(async (p): Promise<Preturno> => {
      let portada = p.portada;
      if (portada && esTokenIdb(portada)) {
        const blob = await leerArchivo(portada);
        if (blob) portada = await guardarArchivo(blob);
      }
      const materiales = await Promise.all(
        p.materiales.map(async (m): Promise<Material> => {
          if (!esTokenIdb(m.url)) return m;
          const blob = await leerArchivo(m.url);
          if (!blob) return m;
          try {
            return { ...m, url: await guardarArchivo(blob), persistente: true };
          } catch {
            return m;
          }
        }),
      );
      return { ...p, portada, materiales };
    }),
  );
  return { ...estado, preturnos };
}

function yaMigrado(): boolean {
  try {
    return localStorage.getItem(CLAVE_MIGRADO) === '1';
  } catch {
    return true;
  }
}

function marcarMigrado(): void {
  try {
    localStorage.setItem(CLAVE_MIGRADO, '1');
  } catch {
    // sin almacenamiento local: la app funciona igual desde Supabase
  }
}

/**
 * Carga el estado compartido desde Supabase.
 * En la primera ejecución sube los datos locales (o la semilla) para que la
 * base quede inicializada con la información que ya existía.
 */
export async function cargarEstado(): Promise<EstadoApp> {
  let estado = await cargarEstadoRemoto();

  if (!yaMigrado() && estado.preturnos.length === 0 && estado.intentos.length === 0) {
    // Base sin inicializar: sube los datos locales si existen, si no, la semilla.
    const inicial = leerEstadoLocal() ?? datosSemilla();
    try {
      const migrado = await migrarArchivosLocales(inicial);
      await subirEstadoInicialBD(migrado);
      estado = await cargarEstadoRemoto();
    } catch {
      // si falla la subida inicial se usa lo que haya en la base
    }
    marcarMigrado();
  }

  // Garantiza que el formador principal siempre pueda ingresar.
  if (!estado.usuarios.some((u) => u.documento === DOC_FORMADOR_PRINCIPAL)) {
    const diego: Usuario = {
      id: 'u-diego-1',
      nombre: 'Diego Alexander Henao Charry',
      documento: DOC_FORMADOR_PRINCIPAL,
      rol: 'Formador',
      campanas: ['criticos', 'sta'],
    };
    estado = { ...estado, usuarios: [diego, ...estado.usuarios] };
    try {
      await insertarUsuarioBD(diego);
    } catch {
      // otro navegador pudo crearlo primero: la recarga lo sincronizará
    }
  }

  return estado;
}
