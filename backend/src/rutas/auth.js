// API 1 · Autenticación y estado general
// ---------------------------------------------------------------------------
import { Router } from 'express';
import { bd, asegurarAdmin } from '../bd.js';
import { aUsuario, aPreturno, aIntento, aCarpeta } from '../mapeo.js';
import { crearToken } from '../token.js';

export const rutaAuth = Router();
export const rutaEstado = Router();

// POST /api/auth/login  { usuario: "CO1023940501", contrasena: "1023940501" }
rutaAuth.post('/login', (req, res) => {
  const { usuario, contrasena } = req.body ?? {};
  if (typeof usuario !== 'string' || typeof contrasena !== 'string') {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
  }
  // Regla de la plataforma: usuario = "CO" + documento; contraseña = documento.
  const doc = usuario.trim().toUpperCase().replace(/^CO/, '');
  if (!/^\d+$/.test(doc) || contrasena !== doc) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }
  const fila = bd.prepare('SELECT * FROM usuarios WHERE documento = ?').get(doc);
  if (!fila) return res.status(401).json({ error: 'Credenciales inválidas.' });

  const u = aUsuario(fila);
  res.json({ token: crearToken(u), usuario: u });
});

// GET /api/estado → todo el estado de la plataforma en una sola llamada
rutaEstado.get('/estado', (req, res) => {
  asegurarAdmin();
  const usuarios = bd.prepare('SELECT * FROM usuarios').all().map(aUsuario);
  const preturnos = bd.prepare('SELECT * FROM preturnos').all().map(aPreturno);
  const intentos = bd.prepare('SELECT * FROM intentos ORDER BY fecha DESC').all().map(aIntento);
  const carpetas = bd.prepare('SELECT * FROM carpetas').all().map(aCarpeta);
  res.json({ usuarios, preturnos, intentos, carpetas });
});
