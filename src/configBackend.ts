/**
 * Configuración del modo backend propio (Node).
 *
 * Si al compilar se define la variable VITE_API_URL (por ejemplo
 * `VITE_API_URL=https://formacion.indra.com`), la aplicación deja de usar
 * Supabase y consume el backend Node propio: misma interfaz, mismas
 * funciones, distinto motor. Si no se define, todo sigue igual que hoy.
 */
export const URL_API: string | null =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/+$/, '') || null;

export const modoBackendActivo = URL_API !== null;
