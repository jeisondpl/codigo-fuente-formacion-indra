// ---------------------------------------------------------------------------
// Servidor backend · Formación Indra
// Node.js + Express + SQLite relacional (integrado, sin dependencias nativas)
//
// Arranque:            node servidor.js
// Puerto:              variable de entorno PORT (por defecto 3001)
// Secreto de tokens:   variable de entorno SECRETO_TOKEN (opcional)
// ---------------------------------------------------------------------------
import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { asegurarAdmin } from './src/bd.js';
import { verificarToken } from './src/token.js';
import { rutaAuth, rutaEstado } from './src/rutas/auth.js';
import { rutaUsuarios } from './src/rutas/usuarios.js';
import { rutaFormaciones } from './src/rutas/formaciones.js';
import { rutaIntentos, rutaCarpetas } from './src/rutas/intentos-carpetas.js';
import { rutaArchivos } from './src/rutas/archivos.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUERTO = Number(process.env.PORT ?? 3050);

asegurarAdmin(); // garantiza el usuario administrador en el primer arranque

const app = express();
app.disable('x-powered-by');
app.use(cors()); // por defecto permite todos los orígenes; ajustar en producción
app.use(express.json({ limit: '25mb' }));

// ----- Protección con token (excepto login, estado y archivos públicos) -----
app.use('/api', (req, res, siguiente) => {
  if (req.path === '/auth/login' || req.path === '/estado') return siguiente();
  const encabezado = req.headers.authorization ?? '';
  const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : null;
  if (!verificarToken(token)) {
    return res.status(401).json({ error: 'No autorizado: inicia sesión para continuar.' });
  }
  siguiente();
});

// ----- Módulos de la API (api 1, api 2, ...) -----
app.use('/api/auth', rutaAuth);
app.use('/api', rutaEstado);        // GET /api/estado
app.use('/api/usuarios', rutaUsuarios);
app.use('/api/formaciones', rutaFormaciones);
app.use('/api/intentos', rutaIntentos);
app.use('/api/carpetas', rutaCarpetas);
app.use('/archivos', rutaArchivos); // subida/descarga de archivos (el GET es público)

// ----- Sirve el frontend compilado (carpeta ../dist) si existe --------------
// Así un solo servidor entrega la aplicación completa (útil en despliegue).
const dist = join(__dirname, '..', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api|\/archivos).*/, (_req, res) => res.sendFile(join(dist, 'index.html')));
}

app.listen(PUERTO, () => {
  console.log(`Backend de Formación Indra escuchando en el puerto ${PUERTO}`);
  console.log(`API:      http://localhost:${PUERTO}/api/estado`);
  console.log(`Archivos: http://localhost:${PUERTO}/archivos/`);
});
