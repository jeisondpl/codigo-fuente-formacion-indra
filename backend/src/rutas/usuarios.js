// API 2 · Usuarios (creación, edición, eliminación)
// ---------------------------------------------------------------------------
import { Router } from 'express';
import { bd, aJson, deJson } from '../bd.js';
import { aUsuario, insertarUsuario } from '../mapeo.js';

export const rutaUsuarios = Router();

const CAMPOS = ['nombre', 'documento', 'rol', 'campanas', 'supervisorId'];

// POST /api/usuarios  { usuario }
rutaUsuarios.post('/', (req, res) => {
  const u = req.body ?? {};
  if (!u.id || !u.nombre || !u.documento || !u.rol) {
    return res.status(400).json({ error: 'Faltan campos obligatorios del usuario.' });
  }
  try {
    insertarUsuario(u);
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(409).json({ error: 'El documento ya existe: ' + e.message });
  }
});

// PUT /api/usuarios/:id  { cambios }
rutaUsuarios.put('/:id', (req, res) => {
  const { id } = req.params;
  const c = req.body ?? {};
  const fila = bd.prepare('SELECT * FROM usuarios WHERE id = ?').get(id);
  if (!fila) return res.status(404).json({ error: 'Usuario no encontrado.' });

  bd.prepare(
    'UPDATE usuarios SET nombre = ?, documento = ?, rol = ?, campanas = ?, supervisor_id = ? WHERE id = ?',
  ).run(
    c.nombre ?? fila.nombre,
    c.documento ?? fila.documento,
    c.rol ?? fila.rol,
    'campanas' in c ? aJson(c.campanas ?? []) : fila.campanas,
    'supervisorId' in c ? (c.supervisorId ?? null) : fila.supervisor_id,
    id,
  );
  res.json({ ok: true });
});

// DELETE /api/usuarios/:id
rutaUsuarios.delete('/:id', (req, res) => {
  bd.prepare('DELETE FROM intentos WHERE usuario_id = ?').run(req.params.id);
  bd.prepare('DELETE FROM usuarios WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});
