import { supabase } from './supabase';
import type {
  Campana,
  Carpeta,
  EstadoApp,
  Intento,
  Material,
  ParEmparejamiento,
  Pregunta,
  Preturno,
  Rol,
  TipoMaterial,
  TipoPregunta,
  TipoPrograma,
  Usuario,
} from './tipos';

// ---------------------------------------------------------------------------
// Mapeo entre filas de la base de datos (snake_case) y tipos de la app
// ---------------------------------------------------------------------------

interface FilaUsuario {
  id: string;
  nombre: string;
  documento: string;
  rol: Rol;
  campanas: Campana[];
  supervisor_id: string | null;
}

interface FilaPreturno {
  id: string;
  titulo: string;
  fecha: string;
  descripcion: string;
  campanas: Campana[];
  tipo: TipoPrograma;
  portada: string | null;
  disponible_desde: string | null;
  disponible_hasta: string | null;
  oculto: boolean;
  limite_intentos: number | null;
  carpeta: string | null;
}

interface FilaMaterial {
  id: string;
  preturno_id: string;
  nombre: string;
  tipo: TipoMaterial;
  url: string;
  orden: number;
}

/** Campos estructurados de los nuevos tipos de pregunta (columna jsonb `datos`). */
interface DatosPregunta {
  escenario?: string;
  pares?: ParEmparejamiento[];
  respuestasAceptadas?: string[];
  palabras?: string[];
}

interface FilaPregunta {
  id: string;
  preturno_id: string;
  tipo: TipoPregunta;
  pregunta: string;
  opciones: string[];
  respuesta_correcta: number;
  respuesta_texto: string | null;
  datos: DatosPregunta | null;
  orden: number;
}

interface FilaIntento {
  id: string;
  preturno_id: string;
  usuario_id: string;
  usuario_nombre: string;
  aciertos: number;
  total: number;
  respuestas: (number | string | null)[] | null;
  fecha: string;
}

interface FilaCarpeta {
  id: string;
  campana: Campana;
  tipo: TipoPrograma;
  nombre: string;
  oculta: boolean;
}

function aCarpeta(f: FilaCarpeta): Carpeta {
  return { id: f.id, campana: f.campana, tipo: f.tipo, nombre: f.nombre, oculta: f.oculta };
}

function filaCarpeta(c: Carpeta): FilaCarpeta {
  return { id: c.id, campana: c.campana, tipo: c.tipo, nombre: c.nombre, oculta: c.oculta };
}

function aUsuario(f: FilaUsuario): Usuario {
  return {
    id: f.id,
    nombre: f.nombre,
    documento: f.documento,
    rol: f.rol,
    campanas: f.campanas ?? [],
    supervisorId: f.supervisor_id ?? undefined,
  };
}

function aPregunta(f: FilaPregunta): Pregunta {
  return {
    id: f.id,
    tipo: f.tipo,
    pregunta: f.pregunta,
    opciones: f.opciones ?? [],
    respuestaCorrecta: f.respuesta_correcta,
    respuestaTexto: f.respuesta_texto ?? undefined,
    escenario: f.datos?.escenario ?? undefined,
    pares: f.datos?.pares ?? undefined,
    respuestasAceptadas: f.datos?.respuestasAceptadas ?? undefined,
    palabras: f.datos?.palabras ?? undefined,
  };
}

function aMaterial(f: FilaMaterial): Material {
  return { id: f.id, nombre: f.nombre, tipo: f.tipo, url: f.url, persistente: true };
}

/** Convierte una pregunta de la app en fila de base de datos. */
function filaPregunta(q: Pregunta, preturnoId: string, orden: number) {
  const datos: DatosPregunta | null =
    q.escenario || q.pares || q.respuestasAceptadas || q.palabras
      ? {
          escenario: q.escenario,
          pares: q.pares,
          respuestasAceptadas: q.respuestasAceptadas,
          palabras: q.palabras,
        }
      : null;
  return {
    id: q.id,
    preturno_id: preturnoId,
    tipo: q.tipo ?? 'opcion',
    pregunta: q.pregunta,
    opciones: q.opciones,
    respuesta_correcta: q.respuestaCorrecta,
    respuesta_texto: q.respuestaTexto ?? null,
    datos,
    orden,
  };
}

function aIntento(f: FilaIntento): Intento {
  return {
    id: f.id,
    preturnoId: f.preturno_id,
    usuarioId: f.usuario_id,
    usuarioNombre: f.usuario_nombre,
    aciertos: f.aciertos,
    total: f.total,
    respuestas: f.respuestas ?? undefined,
    fecha: f.fecha,
  };
}

function filaUsuario(u: Usuario): FilaUsuario {
  return {
    id: u.id,
    nombre: u.nombre,
    documento: u.documento,
    rol: u.rol,
    campanas: u.campanas,
    supervisor_id: u.supervisorId ?? null,
  };
}

function filaPreturno(p: Preturno): FilaPreturno {
  return {
    id: p.id,
    titulo: p.titulo,
    fecha: p.fecha,
    descripcion: p.descripcion,
    campanas: p.campanas,
    tipo: p.tipo,
    portada: p.portada ?? null,
    disponible_desde: p.disponibleDesde ?? null,
    disponible_hasta: p.disponibleHasta ?? null,
    oculto: p.oculto,
    limite_intentos: p.limiteIntentos ?? null,
    carpeta: p.carpeta ?? null,
  };
}

// ---------------------------------------------------------------------------
// Carga completa del estado compartido
// ---------------------------------------------------------------------------

/** Carga todo el estado de la plataforma desde Supabase. */
export async function cargarEstadoRemoto(): Promise<EstadoApp> {
  const [resUsuarios, resPreturnos, resMateriales, resPreguntas, resIntentos, resCarpetas] =
    await Promise.all([
      supabase.from('usuarios').select('*'),
      supabase.from('preturnos').select('*'),
      supabase.from('materiales').select('*').order('orden', { ascending: true }),
      supabase.from('preguntas').select('*').order('orden', { ascending: true }),
      supabase.from('intentos').select('*').order('fecha', { ascending: true }),
      supabase.from('carpetas').select('*'),
    ]);

  const error =
    resUsuarios.error ??
    resPreturnos.error ??
    resMateriales.error ??
    resPreguntas.error ??
    resIntentos.error ??
    resCarpetas.error;
  if (error) throw new Error(error.message);

  const materiales = (resMateriales.data ?? []) as unknown as FilaMaterial[];
  const preguntas = (resPreguntas.data ?? []) as unknown as FilaPregunta[];

  const preturnos = ((resPreturnos.data ?? []) as unknown as FilaPreturno[]).map((f) => ({
    ...f,
    toPreturno(): Preturno {
      return {
        id: f.id,
        titulo: f.titulo,
        fecha: f.fecha,
        descripcion: f.descripcion,
        campanas: f.campanas ?? [],
        tipo: f.tipo,
        portada: f.portada ?? undefined,
        disponibleDesde: f.disponible_desde ?? undefined,
        disponibleHasta: f.disponible_hasta ?? undefined,
        oculto: f.oculto,
        limiteIntentos: f.limite_intentos ?? null,
        carpeta: f.carpeta ?? undefined,
        materiales: materiales.filter((m) => m.preturno_id === f.id).map(aMaterial),
        preguntas: preguntas.filter((q) => q.preturno_id === f.id).map(aPregunta),
      };
    },
  })).map((p) => p.toPreturno());

  return {
    usuarios: ((resUsuarios.data ?? []) as unknown as FilaUsuario[]).map(aUsuario),
    preturnos,
    intentos: ((resIntentos.data ?? []) as unknown as FilaIntento[]).map(aIntento),
    carpetas: ((resCarpetas.data ?? []) as unknown as FilaCarpeta[]).map(aCarpeta),
  };
}

// ---------------------------------------------------------------------------
// Mutaciones remotas (fire-and-forget desde el store)
// ---------------------------------------------------------------------------

export async function insertarUsuarioBD(usuario: Usuario): Promise<void> {
  const { error } = await supabase.from('usuarios').insert(filaUsuario(usuario));
  if (error) throw new Error(error.message);
}

export async function actualizarUsuarioBD(
  id: string,
  cambios: Partial<Omit<Usuario, 'id'>>,
): Promise<void> {
  const fila: Partial<FilaUsuario> = {};
  if ('nombre' in cambios) fila.nombre = cambios.nombre;
  if ('documento' in cambios) fila.documento = cambios.documento;
  if ('rol' in cambios) fila.rol = cambios.rol;
  if ('campanas' in cambios) fila.campanas = cambios.campanas;
  if ('supervisorId' in cambios) fila.supervisor_id = cambios.supervisorId ?? null;
  const { error } = await supabase.from('usuarios').update(fila).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function eliminarUsuarioBD(id: string): Promise<void> {
  const { error } = await supabase.from('usuarios').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function insertarPreturnoBD(p: Preturno): Promise<void> {
  const { error } = await supabase.from('preturnos').insert(filaPreturno(p));
  if (error) throw new Error(error.message);
  await insertarHijosBD(p);
}

/** Reemplaza materiales y preguntas de un preturno ya guardado. */
async function insertarHijosBD(p: Preturno): Promise<void> {
  await insertarMaterialesBD(p);
  await insertarPreguntasBD(p);
}

async function insertarMaterialesBD(p: Preturno): Promise<void> {
  if (p.materiales.length > 0) {
    const filas = p.materiales.map((m, idx) => ({
      id: m.id,
      preturno_id: p.id,
      nombre: m.nombre,
      tipo: m.tipo,
      url: m.url,
      orden: idx,
    }));
    const { error } = await supabase.from('materiales').insert(filas);
    if (error) throw new Error(error.message);
  }
}

async function insertarPreguntasBD(p: Preturno): Promise<void> {
  if (p.preguntas.length > 0) {
    const filas = p.preguntas.map((q, idx) => filaPregunta(q, p.id, idx));
    const { error } = await supabase.from('preguntas').insert(filas);
    if (error) throw new Error(error.message);
  }
}

/**
 * Actualiza un preturno en la base. Si `cambios` incluye materiales o
 * preguntas, se reemplaza por completo (borrar + insertar) SOLO esa colección;
 * reinsertar la otra rompería la llave primaria y perdería la actualización.
 */
export async function actualizarPreturnoBD(
  combinado: Preturno,
  cambios: Partial<Omit<Preturno, 'id'>>,
): Promise<void> {
  const { error } = await supabase.from('preturnos').update(filaPreturno(combinado)).eq('id', combinado.id);
  if (error) throw new Error(error.message);

  if ('materiales' in cambios) {
    const { error: eBorrar } = await supabase.from('materiales').delete().eq('preturno_id', combinado.id);
    if (eBorrar) throw new Error(eBorrar.message);
    await insertarMaterialesBD(combinado);
  }
  if ('preguntas' in cambios) {
    const { error: eBorrar } = await supabase.from('preguntas').delete().eq('preturno_id', combinado.id);
    if (eBorrar) throw new Error(eBorrar.message);
    await insertarPreguntasBD(combinado);
  }
}

export async function eliminarPreturnoBD(id: string): Promise<void> {
  // las filas hijas (materiales, preguntas, intentos) se borran en cascada
  const { error } = await supabase.from('preturnos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function alternarOcultoBD(id: string, oculto: boolean): Promise<void> {
  const { error } = await supabase.from('preturnos').update({ oculto }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function insertarIntentoBD(intento: Intento): Promise<void> {
  const { error } = await supabase.from('intentos').insert({
    id: intento.id,
    preturno_id: intento.preturnoId,
    usuario_id: intento.usuarioId,
    usuario_nombre: intento.usuarioNombre,
    aciertos: intento.aciertos,
    total: intento.total,
    respuestas: intento.respuestas ?? null,
    fecha: intento.fecha,
  });
  if (error) throw new Error(error.message);
}

export async function eliminarIntentosBD(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('intentos').delete().in('id', ids);
  if (error) throw new Error(error.message);
}

/** Crea o actualiza el registro de una carpeta (por campaña + tipo + nombre). */
export async function upsertCarpetaBD(carpeta: Carpeta): Promise<void> {
  const { error } = await supabase
    .from('carpetas')
    .upsert(filaCarpeta(carpeta), { onConflict: 'campana,tipo,nombre' });
  if (error) throw new Error(error.message);
}

export async function eliminarCarpetaBD(id: string): Promise<void> {
  const { error } = await supabase.from('carpetas').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/** Quita la carpeta de las formaciones indicadas (quedan en "General"). */
export async function quitarCarpetaDeFormacionesBD(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('preturnos').update({ carpeta: null }).in('id', ids);
  if (error) throw new Error(error.message);
}

/** Inserta el estado completo (migración inicial o datos semilla). Idempotente. */
export async function subirEstadoInicialBD(estado: EstadoApp): Promise<void> {
  if (estado.usuarios.length > 0) {
    const { error } = await supabase
      .from('usuarios')
      .upsert(estado.usuarios.map(filaUsuario), { onConflict: 'documento' });
    if (error) throw new Error(error.message);
  }
  if (estado.preturnos.length > 0) {
    const { error } = await supabase
      .from('preturnos')
      .upsert(estado.preturnos.map(filaPreturno), { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }
  await insertarHijosTotalesBD(estado);
  if (estado.intentos.length > 0) {
    const filas = estado.intentos.map((i) => ({
      id: i.id,
      preturno_id: i.preturnoId,
      usuario_id: i.usuarioId,
      usuario_nombre: i.usuarioNombre,
      aciertos: i.aciertos,
      total: i.total,
      respuestas: i.respuestas ?? null,
      fecha: i.fecha,
    }));
    const { error } = await supabase.from('intentos').upsert(filas, { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }
}

/** Inserta todos los materiales y preguntas del estado (idempotente). */
async function insertarHijosTotalesBD(estado: EstadoApp): Promise<void> {
  const filasMateriales = estado.preturnos.flatMap((p) =>
    p.materiales.map((m, idx) => ({
      id: m.id,
      preturno_id: p.id,
      nombre: m.nombre,
      tipo: m.tipo,
      url: m.url,
      orden: idx,
    })),
  );
  if (filasMateriales.length > 0) {
    const { error } = await supabase
      .from('materiales')
      .upsert(filasMateriales, { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }
  const filasPreguntas = estado.preturnos.flatMap((p) =>
    p.preguntas.map((q, idx) => filaPregunta(q, p.id, idx)),
  );
  if (filasPreguntas.length > 0) {
    const { error } = await supabase
      .from('preguntas')
      .upsert(filasPreguntas, { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }
}

/** ¿La base está sin inicializar (sin preturnos)? */
export async function baseVirgen(): Promise<boolean> {
  const { count, error } = await supabase
    .from('preturnos')
    .select('id', { count: 'exact', head: true });
  if (error) throw new Error(error.message);
  return (count ?? 0) === 0;
}
