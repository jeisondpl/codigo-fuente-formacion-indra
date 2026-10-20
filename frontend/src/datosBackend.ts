/**
 * Fachada de datos: elige el motor según la configuración.
 *
 * - Con VITE_API_URL definida → backend Node propio (`datosApi`).
 * - Sin ella → Supabase (`datosSupabase`), exactamente como hoy.
 *
 * El resto de la aplicación importa desde aquí, nunca de un motor directo:
 * así las capas quedan desacopladas y cambiar de motor es solo configuración.
 */
import { modoBackendActivo } from './configBackend';
import * as api from './datosApi';
import * as sbs from './datosSupabase';
import type { Campana, Carpeta, Intento, Preturno, Usuario } from './tipos';

export const usarBackendNode = modoBackendActivo;

export const cargarEstadoRemoto = usarBackendNode ? api.cargarEstadoRemoto : sbs.cargarEstadoRemoto;
export const insertarUsuarioBD = usarBackendNode ? api.insertarUsuarioBD : sbs.insertarUsuarioBD;
export const actualizarUsuarioBD = usarBackendNode
  ? api.actualizarUsuarioBD
  : sbs.actualizarUsuarioBD;
export const eliminarUsuarioBD = usarBackendNode ? api.eliminarUsuarioBD : sbs.eliminarUsuarioBD;
export const insertarPreturnoBD = usarBackendNode
  ? api.insertarPreturnoBD
  : sbs.insertarPreturnoBD;
export const actualizarPreturnoBD = usarBackendNode
  ? api.actualizarPreturnoBD
  : sbs.actualizarPreturnoBD;
export const alternarOcultoBD = usarBackendNode ? api.alternarOcultoBD : sbs.alternarOcultoBD;
export const eliminarPreturnoBD = usarBackendNode
  ? api.eliminarPreturnoBD
  : sbs.eliminarPreturnoBD;
export const quitarCarpetaDeFormacionesBD = usarBackendNode
  ? api.quitarCarpetaDeFormacionesBD
  : sbs.quitarCarpetaDeFormacionesBD;
export const insertarIntentoBD = usarBackendNode ? api.insertarIntentoBD : sbs.insertarIntentoBD;
export const eliminarIntentosBD = usarBackendNode
  ? api.eliminarIntentosBD
  : sbs.eliminarIntentosBD;
export const upsertCarpetaBD = usarBackendNode ? api.upsertCarpetaBD : sbs.upsertCarpetaBD;
export const eliminarCarpetaBD = usarBackendNode ? api.eliminarCarpetaBD : sbs.eliminarCarpetaBD;
export const subirEstadoInicialBD = usarBackendNode
  ? api.subirEstadoInicialBD
  : sbs.subirEstadoInicialBD;

/** Solo existe en modo backend Node: valida credenciales contra la API. */
export const iniciarSesion = usarBackendNode ? api.iniciarSesionApi : null;

/** Solo hace algo en modo backend Node: descarta el token de sesión guardado. */
export const cerrarSesion = usarBackendNode ? api.cerrarSesionApi : () => {};
