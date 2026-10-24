/**
 * Cliente de la API del backend Node propio.
 *
 * Implementa EXACTAMENTE las mismas funciones que `datosSupabase.ts`
 * (mismos nombres y firmas) para que la aplicación funcione con cualquiera
 * de los dos motores sin cambios adicionales.
 */
import type { Campana, Carpeta, EstadoApp, Intento, Preturno, Usuario } from './tipos';
import { URL_API } from './configBackend';

const CLAVE_TOKEN = 'formacion-indra-token';

export function guardarTokenApi(token: string): void {
  try {
    localStorage.setItem(CLAVE_TOKEN, token);
  } catch {
    // sin localStorage: la sesión vive solo en memoria
  }
}

function leerToken(): string | null {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export function cerrarSesionApi(): void {
  try {
    localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    // ignorar
  }
}

async function req<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const encabezados: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = leerToken();
  if (token) encabezados.Authorization = `Bearer ${token}`;
  const res = await fetch(`${URL_API}${ruta}`, {
    method: metodo,
    headers: encabezados,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${detalle.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Autenticación
// ---------------------------------------------------------------------------

/** Valida credenciales contra el backend y guarda el token de sesión. */
export async function iniciarSesionApi(
  nombreUsuario: string,
  contrasena: string,
): Promise<Usuario | null> {
  const r = await req<{ token: string; usuario: Usuario }>('POST', '/api/auth/login', {
    usuario: nombreUsuario,
    contrasena,
  }).catch(() => null);
  if (!r) return null;
  guardarTokenApi(r.token);
  return r.usuario;
}

// ---------------------------------------------------------------------------
// Lectura de estado
// ---------------------------------------------------------------------------

export async function cargarEstadoRemoto(): Promise<EstadoApp> {
  const r = await req<EstadoApp>('GET', '/api/estado');
  return {
    usuarios: r.usuarios ?? [],
    preturnos: r.preturnos ?? [],
    intentos: r.intentos ?? [],
    carpetas: r.carpetas ?? [],
  };
}

// ---------------------------------------------------------------------------
// Usuarios
// ---------------------------------------------------------------------------

export async function insertarUsuarioBD(usuario: Usuario): Promise<void> {
  await req('POST', '/api/usuarios', usuario);
}

export async function actualizarUsuarioBD(
  id: string,
  cambios: Partial<Omit<Usuario, 'id'>>,
): Promise<void> {
  await req('PUT', `/api/usuarios/${encodeURIComponent(id)}`, cambios);
}

export async function eliminarUsuarioBD(id: string): Promise<void> {
  await req('DELETE', `/api/usuarios/${encodeURIComponent(id)}`);
}

// ---------------------------------------------------------------------------
// Formaciones (preturnos y continuas)
// ---------------------------------------------------------------------------

export async function insertarPreturnoBD(preturno: Preturno): Promise<void> {
  await req('POST', '/api/formaciones', preturno);
}

export async function actualizarPreturnoBD(
  combinado: Preturno,
  cambios: Partial<Omit<Preturno, 'id'>>,
): Promise<void> {
  await req('PUT', `/api/formaciones/${encodeURIComponent(combinado.id)}`, {
    preturno: combinado,
    cambios,
  });
}

export async function alternarOcultoBD(id: string, oculto: boolean): Promise<void> {
  await req('PATCH', `/api/formaciones/${encodeURIComponent(id)}/oculto`, { oculto });
}

export async function eliminarPreturnoBD(id: string): Promise<void> {
  await req('DELETE', `/api/formaciones/${encodeURIComponent(id)}`);
}

export async function quitarCarpetaDeFormacionesBD(ids: string[]): Promise<void> {
  await req('POST', '/api/formaciones/quitar-carpeta', { ids });
}

// ---------------------------------------------------------------------------
// Intentos
// ---------------------------------------------------------------------------

export async function insertarIntentoBD(intento: Intento): Promise<void> {
  await req('POST', '/api/intentos', intento);
}

export async function eliminarIntentosBD(ids: string[]): Promise<void> {
  await req('POST', '/api/intentos/borrar', { ids });
}

// ---------------------------------------------------------------------------
// Carpetas
// ---------------------------------------------------------------------------

export async function upsertCarpetaBD(carpeta: Carpeta): Promise<void> {
  await req('PUT', '/api/carpetas', carpeta);
}

export async function eliminarCarpetaBD(id: string): Promise<void> {
  await req('DELETE', `/api/carpetas/${encodeURIComponent(id)}`);
}

// ---------------------------------------------------------------------------
// Migración inicial (sube el estado local a la base vacía, igual que Supabase)
// ---------------------------------------------------------------------------

export async function subirEstadoInicialBD(estado: EstadoApp): Promise<void> {
  for (const u of estado.usuarios) {
    await req('POST', '/api/usuarios', u).catch(() => {}); // duplicado = ya existía
  }
  for (const p of estado.preturnos) {
    await req('POST', '/api/formaciones', p).catch(() => {});
  }
  for (const i of estado.intentos) {
    await req('POST', '/api/intentos', i).catch(() => {});
  }
  for (const c of estado.carpetas) {
    await req('PUT', '/api/carpetas', c).catch(() => {});
  }
}
