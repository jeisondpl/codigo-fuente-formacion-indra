// ---------------------------------------------------------------------------
// Base de datos relacional (SQLite integrado en Node 22+).
//
// El esquema replica exactamente el de la versión Supabase (mismos nombres de
// tablas y columnas), de modo que migrar los datos es un simple COPY y
// cambiar el motor a PostgreSQL/SQL Server solo implica reescribir ESTE
// archivo: el resto del backend usa las funciones de aquí.
// ---------------------------------------------------------------------------
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const carpetaDatos = join(__dirname, '..', 'datos');
mkdirSync(carpetaDatos, { recursive: true });

export const bd = new DatabaseSync(join(carpetaDatos, 'formacion-indra.db'));

// WAL: mejor rendimiento concurrente de lecturas con escrituras.
bd.exec('PRAGMA journal_mode = WAL;');
bd.exec('PRAGMA foreign_keys = ON;');

bd.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id            TEXT PRIMARY KEY,
  nombre        TEXT NOT NULL,
  documento     TEXT NOT NULL UNIQUE,
  rol           TEXT NOT NULL CHECK (rol IN ('Formador','Supervisor','Asesor')),
  campanas      TEXT NOT NULL DEFAULT '[]',
  supervisor_id TEXT
);

CREATE TABLE IF NOT EXISTS preturnos (
  id                TEXT PRIMARY KEY,
  titulo            TEXT NOT NULL,
  descripcion       TEXT NOT NULL DEFAULT '',
  fecha             TEXT NOT NULL,
  tipo              TEXT NOT NULL DEFAULT 'preturno' CHECK (tipo IN ('preturno','continua')),
  campanas          TEXT NOT NULL DEFAULT '[]',
  oculto            INTEGER NOT NULL DEFAULT 0,
  disponible_desde  TEXT,
  disponible_hasta  TEXT,
  limite_intentos   INTEGER,
  carpeta           TEXT,
  portada           TEXT
);

CREATE TABLE IF NOT EXISTS materiales (
  id          TEXT PRIMARY KEY,
  preturno_id TEXT NOT NULL REFERENCES preturnos(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  tipo        TEXT NOT NULL,
  url         TEXT NOT NULL,
  orden       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS preguntas (
  id               TEXT PRIMARY KEY,
  preturno_id      TEXT NOT NULL REFERENCES preturnos(id) ON DELETE CASCADE,
  tipo             TEXT NOT NULL DEFAULT 'opcion',
  pregunta         TEXT NOT NULL,
  opciones         TEXT NOT NULL DEFAULT '[]',
  respuesta_correcta INTEGER NOT NULL DEFAULT 0,
  respuesta_texto  TEXT,
  datos            TEXT,
  orden            INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS intentos (
  id            TEXT PRIMARY KEY,
  preturno_id   TEXT NOT NULL REFERENCES preturnos(id) ON DELETE CASCADE,
  usuario_id    TEXT NOT NULL,
  usuario_nombre TEXT NOT NULL,
  aciertos      INTEGER NOT NULL,
  total         INTEGER NOT NULL,
  respuestas    TEXT,
  fecha         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS carpetas (
  id        TEXT PRIMARY KEY,
  campana   TEXT NOT NULL CHECK (campana IN ('criticos','sta')),
  tipo      TEXT NOT NULL CHECK (tipo IN ('preturno','continua')),
  nombre    TEXT NOT NULL,
  oculta    INTEGER NOT NULL DEFAULT 0,
  creado_en TEXT NOT NULL,
  UNIQUE (campana, tipo, nombre)
);
`);

// ---------------------------------------------------------------------------
// Utilidades JSON (las columnas tipo jsonb de Supabase se guardan como TEXT)
// ---------------------------------------------------------------------------
export const aJson = (v) => JSON.stringify(v ?? null);
export const deJson = (v, porDefecto) => {
  if (v === null || v === undefined) return porDefecto;
  try {
    return JSON.parse(v);
  } catch {
    return porDefecto;
  }
};

// ---------------------------------------------------------------------------
// Usuario administrador garantizado (igual que la versión frontend)
// ---------------------------------------------------------------------------
export function asegurarAdmin() {
  const filas = bd.prepare('SELECT COUNT(*) AS n FROM usuarios').get();
  if (filas.n > 0) return;
  bd.prepare(
    `INSERT INTO usuarios (id, nombre, documento, rol, campanas, supervisor_id)
     VALUES (?, ?, ?, 'Formador', ?, NULL)`,
  ).run('u-admin-principal', 'Diego Alexander Henao Charry', '1023940501', aJson(['criticos', 'sta']));
}
