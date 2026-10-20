import { createClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase de la plataforma.
 * La URL y la clave publicable son configuración pública (no son secretos);
 * en publicación se inyectan como variables de entorno si están disponibles.
 */
const url =
  import.meta.env.VITE_SUPABASE_URL ??
  'https://supabase-api-prod.verdent.ai/p/p703ba1a145c856d16d13';

const clavePublicable =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMTA3Njk4ODcyLCJpYXQiOjE3OTIwNzk2NzIsImlzcyI6InN1cGFiYXNlIiwicHJvamVjdF9yZWYiOiJwNzAzYmExYTE0NWM4NTZkMTZkMTMiLCJyb2xlIjoiYW5vbiJ9.aRiQ6KUta6r4g49BV8DevLPmM1n8c_BXX9c-fug8nfo';

export const supabase = createClient(url, clavePublicable, {
  auth: { persistSession: false, autoRefreshToken: false },
});
