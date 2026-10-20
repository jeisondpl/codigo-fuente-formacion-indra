// API 6 · Archivos (subida, descarga y borrado de materiales multimedia)
// ---------------------------------------------------------------------------
import { Router } from 'express';
import { createWriteStream, existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const carpetaArchivos = join(__dirname, '..', '..', 'archivos');
mkdirSync(carpetaArchivos, { recursive: true });

export const rutaArchivos = Router();

const LIMITE_ARCHIVO = 20 * 1024 * 1024; // 20 MB, igual que la versión Supabase
const EXTENSIONES = new Set([
  '.mp4', '.webm', '.mov', '.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg',
]);

// POST /archivos  (cuerpo binario del archivo; cabecera x-nombre-archivo con la extensión)
// Devuelve { nombre } que el frontend guarda como token "api:<nombre>".
rutaArchivos.post('/', async (req, res) => {
  const nombreOriginal = String(req.headers['x-nombre-archivo'] ?? 'archivo');
  const ext = extname(nombreOriginal).toLowerCase();
  if (!EXTENSIONES.has(ext)) {
    return res.status(400).json({ error: `Extensión no permitida: ${ext || '(sin extensión)'}` });
  }
  const nombre = `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const destino = join(carpetaArchivos, nombre);
  try {
    await pipeline(req, createWriteStream(destino));
    const { statSync } = await import('node:fs');
    if (statSync(destino).size > LIMITE_ARCHIVO) {
      unlinkSync(destino);
      return res.status(413).json({ error: 'El archivo supera el límite de 20 MB.' });
    }
    res.status(201).json({ nombre });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo guardar el archivo: ' + e.message });
  }
});

// GET /archivos/:nombre  → sirve el archivo (video/pdf/imagen)
rutaArchivos.get('/:nombre', (req, res) => {
  const nombre = basename(String(req.params.nombre));
  const ruta = join(carpetaArchivos, nombre);
  if (!existsSync(ruta)) return res.status(404).json({ error: 'Archivo no encontrado.' });
  res.sendFile(ruta);
});

// DELETE /archivos/:nombre
rutaArchivos.delete('/:nombre', (req, res) => {
  const nombre = basename(String(req.params.nombre));
  const ruta = join(carpetaArchivos, nombre);
  try {
    if (existsSync(ruta)) unlinkSync(ruta);
    res.json({ ok: true });
  } catch {
    res.json({ ok: true }); // si ya no existe, se considera borrado
  }
});
