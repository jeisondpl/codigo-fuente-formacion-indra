// API 3 · Formaciones (preturnos y continuas, con preguntas y materiales)
// ---------------------------------------------------------------------------
import { Router } from 'express';
import { bd } from '../bd.js';
import { aPreturno, insertarPreturnoCompleto, actualizarPreturnoCompleto } from '../mapeo.js';

export const rutaFormaciones = Router();

// POST /api/formaciones  { preturno }   → crea la formación completa
rutaFormaciones.post('/', (req, res) => {
  const p = req.body ?? {};
  if (!p.id || !p.titulo) {
    return res.status(400).json({ error: 'Faltan campos obligatorios de la formación.' });
  }
  try {
    insertarPreturnoCompleto(p);
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(409).json({ error: 'No se pudo crear: ' + e.message });
  }
});

// PUT /api/formaciones/:id  { preturno, cambios }
// Si `cambios` incluye materiales o preguntas, esa colección se reemplaza completa.
rutaFormaciones.put('/:id', (req, res) => {
  const { id } = req.params;
  const { preturno, cambios } = req.body ?? {};
  const fila = bd.prepare('SELECT * FROM preturnos WHERE id = ?').get(id);
  if (!fila) return res.status(404).json({ error: 'Formación no encontrada.' });
  try {
    actualizarPreturnoCompleto({ ...preturno, id }, cambios ?? {});
    res.json({ ok: true });
  } catch (e) {
    res.status(409).json({ error: 'No se pudo actualizar: ' + e.message });
  }
});

// PATCH /api/formaciones/:id/oculto  { oculto: boolean }
rutaFormaciones.patch('/:id/oculto', (req, res) => {
  const { oculto } = req.body ?? {};
  bd.prepare('UPDATE preturnos SET oculto = ? WHERE id = ?').run(oculto ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

// POST /api/formaciones/quitar-carpeta  { ids: [] }  → las formaciones vuelven a "General"
rutaFormaciones.post('/quitar-carpeta', (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
  const stmt = bd.prepare('UPDATE preturnos SET carpeta = NULL WHERE id = ?');
  ids.forEach((id) => stmt.run(id));
  res.json({ ok: true });
});

// DELETE /api/formaciones/:id
rutaFormaciones.delete('/:id', (req, res) => {
  bd.prepare('DELETE FROM preturnos WHERE id = ?').run(req.params.id); // hijos en cascada
  res.json({ ok: true });
});
