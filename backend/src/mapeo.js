// ---------------------------------------------------------------------------
// Mapeo entre filas de la base (snake_case) y objetos de la aplicación
// (camelCase). Idéntico al de la versión frontend para que la interfaz no
// note ningún cambio de motor.
// ---------------------------------------------------------------------------
import { bd, aJson, deJson } from './bd.js';

export function aUsuario(f) {
  return {
    id: f.id,
    nombre: f.nombre,
    documento: f.documento,
    rol: f.rol,
    campanas: deJson(f.campanas, []),
    supervisorId: f.supervisor_id ?? undefined,
  };
}

export function aPregunta(f) {
  const datos = deJson(f.datos, null);
  return {
    id: f.id,
    tipo: f.tipo,
    pregunta: f.pregunta,
    opciones: deJson(f.opciones, []),
    respuestaCorrecta: f.respuesta_correcta,
    respuestaTexto: f.respuesta_texto ?? undefined,
    escenario: datos?.escenario ?? undefined,
    pares: datos?.pares ?? undefined,
    respuestasAceptadas: datos?.respuestasAceptadas ?? undefined,
    palabras: datos?.palabras ?? undefined,
  };
}

export function aMaterial(f) {
  return { id: f.id, nombre: f.nombre, tipo: f.tipo, url: f.url, persistente: true };
}

/** Arma un preturno completo con sus preguntas y materiales anidadas. */
export function aPreturno(f) {
  const preguntas = bd
    .prepare('SELECT * FROM preguntas WHERE preturno_id = ? ORDER BY orden')
    .all(f.id)
    .map(aPregunta);
  const materiales = bd
    .prepare('SELECT * FROM materiales WHERE preturno_id = ? ORDER BY orden')
    .all(f.id)
    .map(aMaterial);
  return {
    id: f.id,
    titulo: f.titulo,
    descripcion: f.descripcion,
    fecha: f.fecha,
    tipo: f.tipo,
    campanas: deJson(f.campanas, []),
    oculto: Boolean(f.oculto),
    disponibleDesde: f.disponible_desde ?? undefined,
    disponibleHasta: f.disponible_hasta ?? undefined,
    limiteIntentos: f.limite_intentos ?? null,
    carpeta: f.carpeta ?? undefined,
    portada: f.portada ?? undefined,
    preguntas,
    materiales,
  };
}

export function aIntento(f) {
  return {
    id: f.id,
    preturnoId: f.preturno_id,
    usuarioId: f.usuario_id,
    usuarioNombre: f.usuario_nombre,
    aciertos: f.aciertos,
    total: f.total,
    respuestas: deJson(f.respuestas, null),
    fecha: f.fecha,
  };
}

export function aCarpeta(f) {
  return { id: f.id, campana: f.campana, tipo: f.tipo, nombre: f.nombre, oculta: Boolean(f.oculta) };
}

// --------------------------- Escritura -------------------------------------

export function insertarUsuario(u) {
  bd.prepare(
    `INSERT INTO usuarios (id, nombre, documento, rol, campanas, supervisor_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(u.id, u.nombre, u.documento, u.rol, aJson(u.campanas ?? []), u.supervisorId ?? null);
}

export function insertarPreturnoCompleto(p) {
  bd.prepare(
    `INSERT INTO preturnos
       (id, titulo, descripcion, fecha, tipo, campanas, oculto, disponible_desde,
        disponible_hasta, limite_intentos, carpeta, portada)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    p.id, p.titulo, p.descripcion ?? '', p.fecha, p.tipo ?? 'preturno',
    aJson(p.campanas ?? []), p.oculto ? 1 : 0,
    p.disponibleDesde ?? null, p.disponibleHasta ?? null,
    p.limiteIntentos ?? null, p.carpeta ?? null, p.portada ?? null,
  );
  insertarHijos(p);
}

export function insertarHijos(p) {
  const mat = bd.prepare(
    `INSERT INTO materiales (id, preturno_id, nombre, tipo, url, orden)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  p.materiales?.forEach((m, i) => mat.run(m.id, p.id, m.nombre, m.tipo, m.url, i));

  const pre = bd.prepare(
    `INSERT INTO preguntas
       (id, preturno_id, tipo, pregunta, opciones, respuesta_correcta, respuesta_texto, datos, orden)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  p.preguntas?.forEach((q, i) => {
    const datos =
      q.escenario || q.pares || q.respuestasAceptadas || q.palabras
        ? aJson({
            escenario: q.escenario,
            pares: q.pares,
            respuestasAceptadas: q.respuestasAceptadas,
            palabras: q.palabras,
          })
        : null;
    pre.run(
      q.id, p.id, q.tipo ?? 'opcion', q.pregunta, aJson(q.opciones ?? []),
      q.respuestaCorrecta ?? 0, q.respuestaTexto ?? null, datos, i,
    );
  });
}

/**
 * Actualiza un preturno. Si `cambios` trae materiales o preguntas, se
 * reemplaza POR COMPLETO solo esa colección (borrar + insertar).
 */
export function actualizarPreturnoCompleto(p, cambios) {
  bd.prepare(
    `UPDATE preturnos SET titulo = ?, descripcion = ?, fecha = ?, tipo = ?, campanas = ?,
       oculto = ?, disponible_desde = ?, disponible_hasta = ?, limite_intentos = ?,
       carpeta = ?, portada = ?
     WHERE id = ?`,
  ).run(
    p.titulo, p.descripcion ?? '', p.fecha, p.tipo ?? 'preturno', aJson(p.campanas ?? []),
    p.oculto ? 1 : 0, p.disponibleDesde ?? null, p.disponibleHasta ?? null,
    p.limiteIntentos ?? null, p.carpeta ?? null, p.portada ?? null, p.id,
  );

  if (cambios && 'materiales' in cambios) {
    bd.prepare('DELETE FROM materiales WHERE preturno_id = ?').run(p.id);
    const mat = bd.prepare(
      `INSERT INTO materiales (id, preturno_id, nombre, tipo, url, orden)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    (p.materiales ?? []).forEach((m, i) => mat.run(m.id, p.id, m.nombre, m.tipo, m.url, i));
  }
  if (cambios && 'preguntas' in cambios) {
    bd.prepare('DELETE FROM preguntas WHERE preturno_id = ?').run(p.id);
    const pre = bd.prepare(
      `INSERT INTO preguntas
         (id, preturno_id, tipo, pregunta, opciones, respuesta_correcta, respuesta_texto, datos, orden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    (p.preguntas ?? []).forEach((q, i) => {
      const datos =
        q.escenario || q.pares || q.respuestasAceptadas || q.palabras
          ? aJson({
              escenario: q.escenario,
              pares: q.pares,
              respuestasAceptadas: q.respuestasAceptadas,
              palabras: q.palabras,
            })
          : null;
      pre.run(
        q.id, p.id, q.tipo ?? 'opcion', q.pregunta, aJson(q.opciones ?? []),
        q.respuestaCorrecta ?? 0, q.respuestaTexto ?? null, datos, i,
      );
    });
  }
}
