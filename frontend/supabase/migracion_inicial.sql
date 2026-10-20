-- ============================================================
-- Plataforma "Formación Indra" — esquema compartido en Supabase
-- Tablas en español, claves de texto (compatibles con ids existentes)
-- ============================================================

-- USUARIOS ---------------------------------------------------
create table if not exists public.usuarios (
  id text primary key default gen_random_uuid()::text,
  nombre text not null,
  documento text not null unique,
  rol text not null check (rol in ('Formador', 'Supervisor', 'Asesor')),
  campanas text[] not null default array['criticos'],
  supervisor_id text references public.usuarios (id) on delete set null,
  creado_en timestamptz not null default now()
);

-- PRETURNOS (preturnos y formaciones continuas) ---------------
create table if not exists public.preturnos (
  id text primary key default gen_random_uuid()::text,
  titulo text not null,
  fecha date not null default current_date,
  descripcion text not null default '',
  campanas text[] not null default array['criticos'],
  tipo text not null default 'preturno' check (tipo in ('preturno', 'continua')),
  portada text,
  disponible_desde text,
  disponible_hasta text,
  oculto boolean not null default false,
  limite_intentos integer check (limite_intentos is null or (limite_intentos between 1 and 5)),
  carpeta text,
  creado_en timestamptz not null default now()
);

-- MATERIALES (archivos adjuntos a un preturno) ----------------
create table if not exists public.materiales (
  id text primary key default gen_random_uuid()::text,
  preturno_id text not null references public.preturnos (id) on delete cascade,
  nombre text not null,
  tipo text not null check (tipo in ('video', 'pdf', 'imagen')),
  url text not null,
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);

-- PREGUNTAS (quiz de cada preturno) ---------------------------
create table if not exists public.preguntas (
  id text primary key default gen_random_uuid()::text,
  preturno_id text not null references public.preturnos (id) on delete cascade,
  tipo text not null default 'opcion' check (tipo in ('opcion', 'verdaderofalso', 'completar')),
  pregunta text not null,
  opciones text[] not null default array[]::text[],
  respuesta_correcta integer not null default 0,
  respuesta_texto text,
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);

-- INTENTOS (resultados de quiz por asesor) --------------------
create table if not exists public.intentos (
  id text primary key default gen_random_uuid()::text,
  preturno_id text not null references public.preturnos (id) on delete cascade,
  usuario_id text not null references public.usuarios (id) on delete cascade,
  usuario_nombre text not null,
  aciertos integer not null default 0,
  total integer not null default 0,
  respuestas jsonb,
  fecha timestamptz not null default now()
);

-- Índices ----------------------------------------------------
create index if not exists idx_materiales_preturno on public.materiales (preturno_id);
create index if not exists idx_preguntas_preturno on public.preguntas (preturno_id);
create index if not exists idx_intentos_preturno on public.intentos (preturno_id);
create index if not exists idx_intentos_usuario on public.intentos (usuario_id);
create index if not exists idx_usuarios_supervisor on public.usuarios (supervisor_id);

-- RLS: la app usa login propio (rol anon de PostgREST) --------
alter table public.usuarios enable row level security;
alter table public.preturnos enable row level security;
alter table public.materiales enable row level security;
alter table public.preguntas enable row level security;
alter table public.intentos enable row level security;

create policy "usuarios_lectura" on public.usuarios
  for select to anon, authenticated using (true);
create policy "usuarios_insercion" on public.usuarios
  for insert to anon, authenticated with check (true);
create policy "usuarios_actualizacion" on public.usuarios
  for update to anon, authenticated using (true) with check (true);
create policy "usuarios_eliminacion" on public.usuarios
  for delete to anon, authenticated using (true);

create policy "preturnos_lectura" on public.preturnos
  for select to anon, authenticated using (true);
create policy "preturnos_insercion" on public.preturnos
  for insert to anon, authenticated with check (true);
create policy "preturnos_actualizacion" on public.preturnos
  for update to anon, authenticated using (true) with check (true);
create policy "preturnos_eliminacion" on public.preturnos
  for delete to anon, authenticated using (true);

create policy "materiales_lectura" on public.materiales
  for select to anon, authenticated using (true);
create policy "materiales_insercion" on public.materiales
  for insert to anon, authenticated with check (true);
create policy "materiales_actualizacion" on public.materiales
  for update to anon, authenticated using (true) with check (true);
create policy "materiales_eliminacion" on public.materiales
  for delete to anon, authenticated using (true);

create policy "preguntas_lectura" on public.preguntas
  for select to anon, authenticated using (true);
create policy "preguntas_insercion" on public.preguntas
  for insert to anon, authenticated with check (true);
create policy "preguntas_actualizacion" on public.preguntas
  for update to anon, authenticated using (true) with check (true);
create policy "preguntas_eliminacion" on public.preguntas
  for delete to anon, authenticated using (true);

create policy "intentos_lectura" on public.intentos
  for select to anon, authenticated using (true);
create policy "intentos_insercion" on public.intentos
  for insert to anon, authenticated with check (true);
create policy "intentos_eliminacion" on public.intentos
  for delete to anon, authenticated using (true);

-- Realtime: sincronización entre navegadores ------------------
alter publication supabase_realtime add table public.usuarios;
alter publication supabase_realtime add table public.preturnos;
alter publication supabase_realtime add table public.materiales;
alter publication supabase_realtime add table public.preguntas;
alter publication supabase_realtime add table public.intentos;

-- Storage: bucket público para materiales ---------------------
insert into storage.buckets (id, name, public)
values ('materiales', 'materiales', true)
on conflict (id) do nothing;

create policy "materiales_bucket_acceso" on storage.objects
  for all to anon, authenticated
  using (bucket_id = 'materiales')
  with check (bucket_id = 'materiales');
