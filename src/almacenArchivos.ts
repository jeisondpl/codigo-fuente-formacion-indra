import { supabase } from './supabase';
import { URL_API, modoBackendActivo } from './configBackend';

/**
 * Límite por archivo al guardar (Supabase Storage o backend propio).
 * El máximo del canal de subida directo a Supabase es 50 MB; se deja margen.
 * Para archivos más pesados (videos largos) usar «Agregar por enlace».
 */
export const LIMITE_ARCHIVO = 45 * 1024 * 1024;

const BUCKET = 'materiales';
const PREFIJO_SBS = 'sbs:';
const PREFIJO_IDB = 'idb:';
const PREFIJO_API = 'api:';

/** ¿La URL es un token de archivo guardado en Supabase Storage? */
export function esTokenStorage(url?: string): boolean {
  return typeof url === 'string' && url.startsWith(PREFIJO_SBS);
}

/** ¿La URL es un token de archivo guardado en IndexedDB (datos antiguos)? */
export function esTokenIdb(url?: string): boolean {
  return typeof url === 'string' && url.startsWith(PREFIJO_IDB);
}

/** ¿La URL es un token de archivo guardado en el backend Node propio? */
export function esTokenApi(url?: string): boolean {
  return typeof url === 'string' && url.startsWith(PREFIJO_API);
}

/** ¿La URL es cualquier token de archivo guardado (Storage, backend o IndexedDB)? */
export function esTokenArchivo(url?: string): boolean {
  return esTokenStorage(url) || esTokenIdb(url) || esTokenApi(url);
}

/** ¿La URL es un enlace externo (Drive, SharePoint, intranet, etc.) y no un archivo guardado? */
export function esEnlaceExterno(url?: string): boolean {
  return typeof url === 'string' && url.startsWith('http');
}

/** URL pública para mostrar un archivo subido (Supabase Storage o backend propio). */
export function urlPublicaArchivo(token: string): string {
  if (esTokenApi(token)) return `${URL_API}/archivos/${token.slice(PREFIJO_API.length)}`;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(token.slice(PREFIJO_SBS.length));
  return data.publicUrl;
}

function extensionDesdeMime(mime: string): string {
  if (mime.startsWith('video/mp4')) return '.mp4';
  if (mime.startsWith('video/webm')) return '.webm';
  if (mime.startsWith('video/quicktime')) return '.mov';
  if (mime === 'application/pdf') return '.pdf';
  if (mime.startsWith('image/png')) return '.png';
  if (mime.startsWith('image/jpeg')) return '.jpg';
  if (mime.startsWith('image/webp')) return '.webp';
  if (mime.startsWith('image/gif')) return '.gif';
  if (mime.startsWith('image/svg+xml')) return '.svg';
  return '';
}

/** ¿El error de subida es transitorio (red/servidor) y vale la pena reintentar? */
function esErrorTransitorio(error: unknown): boolean {
  const estado = (error as { status?: number } | null)?.status;
  if (typeof estado === 'number') return estado >= 500 || estado === 429;
  return true; // errores de red sin código de estado
}

/** Sube el archivo (Supabase Storage o backend propio) y devuelve el token. */
export async function guardarArchivo(archivo: Blob): Promise<string> {
  const id = `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const extension = extensionDesdeMime(archivo.type);

  if (modoBackendActivo) {
    const res = await fetch(`${URL_API}/archivos`, {
      method: 'POST',
      headers: { 'x-nombre-archivo': `${id}${extension}`, 'content-type': archivo.type || 'application/octet-stream' },
      body: archivo,
    });
    if (!res.ok) throw new Error('No fue posible subir el archivo al servidor');
    const { nombre } = (await res.json()) as { nombre: string };
    return PREFIJO_API + nombre;
  }

  const ruta = `archivos/${id}${extension}`;

  let ultimoError: unknown = null;
  for (let intento = 0; intento < 3; intento++) {
    const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, {
      contentType: archivo.type || 'application/octet-stream',
      upsert: false,
    });
    if (!error) return PREFIJO_SBS + ruta;
    ultimoError = error;
    if (!esErrorTransitorio(error)) break; // límite de tamaño, permisos, etc.
    await new Promise((resolver) => setTimeout(resolver, 1000 * (intento + 1)));
  }
  throw ultimoError instanceof Error ? ultimoError : new Error('No fue posible subir el archivo');
}

/**
 * Devuelve el Blob guardado para un token.
 * Soporta tokens `api:` (backend propio), `sbs:` (Supabase Storage)
 * y `idb:` legados (IndexedDB).
 */
export async function leerArchivo(token: string): Promise<Blob | null> {
  if (esTokenIdb(token)) return leerArchivoIdb(token);
  if (esTokenApi(token)) {
    const res = await fetch(`${URL_API}/archivos/${token.slice(PREFIJO_API.length)}`);
    if (!res.ok) return null;
    return res.blob();
  }
  if (!esTokenStorage(token)) return null;
  const { data, error } = await supabase.storage.from(BUCKET).download(token.slice(PREFIJO_SBS.length));
  if (error || !data) return null;
  return data;
}

/** Elimina el archivo del almacenamiento (ignora errores si ya no existe). */
export async function borrarArchivo(token: string): Promise<void> {
  try {
    if (esTokenIdb(token)) {
      await borrarArchivoIdb(token);
      return;
    }
    if (esTokenApi(token)) {
      await fetch(`${URL_API}/archivos/${token.slice(PREFIJO_API.length)}`, { method: 'DELETE' });
      return;
    }
    if (!esTokenStorage(token)) return;
    await supabase.storage.from(BUCKET).remove([token.slice(PREFIJO_SBS.length)]);
  } catch {
    // el archivo ya no existe o no se pudo borrar: se ignora
  }
}

// ---------------------------------------------------------------------------
// Soporte legado de IndexedDB: permite leer/migrar archivos guardados antes
// de la migración a Supabase.
// ---------------------------------------------------------------------------

const NOMBRE_DB = 'formacion-indra-archivos';
const TIENDA = 'archivos';
const VERSION_DB = 1;

function abrirDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open(NOMBRE_DB, VERSION_DB);
    peticion.onupgradeneeded = () => {
      if (!peticion.result.objectStoreNames.contains(TIENDA)) {
        peticion.result.createObjectStore(TIENDA);
      }
    };
    peticion.onsuccess = () => resolve(peticion.result);
    peticion.onerror = () => reject(peticion.error);
  });
}

async function leerArchivoIdb(token: string): Promise<Blob | null> {
  const db = await abrirDb();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(TIENDA, 'readonly');
      const peticion = tx.objectStore(TIENDA).get(token.slice(PREFIJO_IDB.length));
      peticion.onsuccess = () => resolve((peticion.result as Blob) ?? null);
      peticion.onerror = () => reject(peticion.error);
    });
  } catch {
    return null;
  } finally {
    db.close();
  }
}

async function borrarArchivoIdb(token: string): Promise<void> {
  const db = await abrirDb();
  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(TIENDA, 'readwrite');
      tx.objectStore(TIENDA).delete(token.slice(PREFIJO_IDB.length));
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } finally {
    db.close();
  }
}
