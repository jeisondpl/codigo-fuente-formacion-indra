// API 4 · Intentos (resultados de quizzes) + API 5 · Carpetas
// ---------------------------------------------------------------------------
import { Router } from 'express';
import { bd, aJson } from '../bd.js';
import { aCarpeta } from '../mapeo.js';

export const rutaIntentos = Router();
export const rutaCarpetas = Router();

// POST /api/intentos  { intento }
rutaIntentos.post('/', (req, res) => {
  const i = req.body ?? {};
  if (!i.id || !i.preturnoId || !i.usuarioId) {
    return res.status(400).json({ error: 'Faltan campos obligatorios del intento.' });
  }
  try {
    bd.prepare(
      `INSERT INTO intentos (id, preturno_id, usuario_id, usuario_nombre, aciertos, total, respuestas, fecha)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      i.id, i.preturnoId, i.usuarioId, i.usuarioNombre ?? '',
      i.aciertos ?? 0, i.total ?? 0, aJson(i.respuestas ?? null), i.fecha ?? new Date().toISOString(),
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(409).json({ error: 'No se pudo registrar el intento: ' + e.message });
  }
});

// POST /api/intentos/borrar  { ids: [] }
rutaIntentos.post('/borrar', (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const stmt = bd.prepare('DELETE FROM intentos WHERE id = ?');
  ids.forEach((id) => stmt.run(id));
  res.json({ ok: true });
});

// PUT /api/carpetas  { carpeta }  → crea o actualiza (por campaña+tipo+nombre)
rutaCarpetas.put('/', (req, res) => {
  const c = req.body ?? {};
  if (!c.id || !c.campana || !c.tipo || !c.nombre) {
    return res.status(400).json({ error: 'Faltan campos obligatorios de la carpeta.' });
  }
  bd.prepare(
    `INSERT INTO carpetas (id, campana, tipo, nombre, oculta, creado_en)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (campana, tipo, nombre)
     DO UPDATE SET oculta = excluded.oculta`,
  ).run(c.id, c.campana, c.tipo, c.nombre, c.oculta ? 1 : 0, c.creadoEn ?? new Date().toISOString());
  res.json({ ok: true });
});

// DELETE /api/carpetas/:id
rutaCarpetas.delete('/:id', (req, res) => {
  bd.prepare('DELETE FROM carpetas WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
