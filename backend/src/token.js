// ---------------------------------------------------------------------------
// Autenticación: login con usuario "CO + documento" y contraseña = documento.
// Emite un token firmado (HMAC-SHA256) con vencimiento; sin dependencias
// externas, usando solo el módulo criptográfico de Node.
// ---------------------------------------------------------------------------
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const carpetaDatos = join(__dirname, '..', 'datos');
mkdirSync(carpetaDatos, { recursive: true });

// El secreto se lee de la variable de entorno o se genera una vez y persiste.
const archivoSecreto = join(carpetaDatos, 'secreto.txt');
function obtenerSecreto() {
  if (process.env.SECRETO_TOKEN) return process.env.SECRETO_TOKEN;
  if (existsSync(archivoSecreto)) return readFileSync(archivoSecreto, 'utf-8').trim();
  const secreto = randomBytes(48).toString('hex');
  writeFileSync(archivoSecreto, secreto, { encoding: 'utf-8' });
  return secreto;
}
const SECRETO = obtenerSecreto();

const VENCIMIENTO_MS = 12 * 60 * 60 * 1000; // 12 horas

function firma(carga) {
  return createHmac('sha256', SECRETO).update(carga).digest('base64url');
}

/** Crea un token firmado para un usuario. */
export function crearToken(usuario) {
  const cuerpo = {
    id: usuario.id,
    documento: usuario.documento,
    nombre: usuario.nombre,
    exp: Date.now() + VENCIMIENTO_MS,
  };
  const carga = Buffer.from(JSON.stringify(cuerpo)).toString('base64url');
  return `${carga}.${firma(carga)}`;
}

/** Verifica un token y devuelve su contenido, o null si es inválido/expirado. */
export function verificarToken(token) {
  if (typeof token !== 'string') return null;
  const [carga, sello] = token.split('.');
  if (!carga || !sello) return null;
  const esperado = firma(carga);
  const a = Buffer.from(sello);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const contenido = JSON.parse(Buffer.from(carga, 'base64url').toString('utf-8'));
    if (typeof contenido.exp !== 'number' || contenido.exp < Date.now()) return null;
    return contenido;
  } catch {
    return null;
  }
}
