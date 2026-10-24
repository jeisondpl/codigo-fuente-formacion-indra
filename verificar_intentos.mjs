// Verificación: ¿se están guardando intentos de quiz en Supabase tras el fix?
import { createClient } from '@supabase/supabase-js';

const URL = 'https://supabase-api-prod.verdent.ai/p/p703ba1a145c856d16d13';
const KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoyMTA3Njk4ODcyLCJpYXQiOjE3OTIwNzk2NzIsImlzcyI6InN1cGFiYXNlIiwicHJvamVjdF9yZWYiOiJwNzAzYmExYTE0NWM4NTZkMTZkMTMiLCJyb2xlIjoiYW5vbiJ9.aRiQ6KUta6r4g49BV8DevLPmM1n8c_BXX9c-fug8nfo';

const supabase = createClient(URL, KEY);

const { data, error } = await supabase
  .from('intentos')
  .select('id, usuario_nombre, aciertos, total, fecha, preturno_id')
  .order('fecha', { ascending: false })
  .limit(8);

if (error) {
  console.error('ERROR consultando intentos:', error.message);
  process.exit(1);
}

console.log(`Últimos intentos registrados: ${data.length}`);
const ahora = Date.now();
for (const i of data) {
  const haceMin = Math.round((ahora - new Date(i.fecha).getTime()) / 60000);
  console.log(
    `- ${i.usuario_nombre}: ${i.aciertos}/${i.total} · hace ${haceMin} min · fecha=${i.fecha}`,
  );
}
