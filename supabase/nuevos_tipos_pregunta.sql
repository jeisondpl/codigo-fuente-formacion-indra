-- Nuevos tipos de pregunta: caso, secuencia, emparejamiento, abierta y sopa.
-- La columna jsonb "datos" guarda escenario, pares, palabras y respuestas aceptadas.

alter table public.preguntas drop constraint if exists preguntas_tipo_check;
alter table public.preguntas add constraint preguntas_tipo_check
  check (tipo in (
    'opcion', 'verdaderofalso', 'completar',
    'caso', 'secuencia', 'emparejamiento', 'abierta', 'sopa'
  ));

alter table public.preguntas add column if not exists datos jsonb;
