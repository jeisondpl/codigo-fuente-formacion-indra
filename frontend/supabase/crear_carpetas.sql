-- Carpetas de organización por campaña y tipo de programa.
-- Permite crear carpetas libres (PDA, Certificaciones…) y ocultarlas para los asesores.

create table if not exists public.carpetas (
  id text primary key default gen_random_uuid()::text,
  campana text not null check (campana in ('criticos', 'sta')),
  tipo text not null check (tipo in ('preturno', 'continua')),
  nombre text not null,
  oculta boolean not null default false,
  creado_en timestamptz not null default now(),
  unique (campana, tipo, nombre)
);

create index if not exists idx_carpetas_campana on public.carpetas (campana, tipo);

alter table public.carpetas enable row level security;

create policy "carpetas_lectura" on public.carpetas
  for select to anon, authenticated using (true);
create policy "carpetas_insercion" on public.carpetas
  for insert to anon, authenticated with check (true);
create policy "carpetas_actualizacion" on public.carpetas
  for update to anon, authenticated using (true) with check (true);
create policy "carpetas_eliminacion" on public.carpetas
  for delete to anon, authenticated using (true);

grant all on public.carpetas to anon, authenticated;

alter publication supabase_realtime add table public.carpetas;
