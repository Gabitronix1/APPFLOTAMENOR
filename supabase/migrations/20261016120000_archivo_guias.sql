-- Archivo de guías de despacho (fotos/imágenes) por contrato > carpetas (meses u otras).
-- Solo lo usa el Encargado de Bodega. Los contratos (AP, P1, P2, P4, P5) son fijos en la app;
-- las carpetas se cuelgan de un contrato y pueden anidarse (parent_id).

create table if not exists public.archivo_guias_carpetas (
  id uuid primary key default gen_random_uuid(),
  contrato text not null check (contrato in ('AP','P1','P2','P4','P5')),
  parent_id uuid references public.archivo_guias_carpetas(id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) > 0),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists archivo_guias_carpetas_idx on public.archivo_guias_carpetas (contrato, parent_id);

create table if not exists public.archivo_guias_archivos (
  id uuid primary key default gen_random_uuid(),
  contrato text not null check (contrato in ('AP','P1','P2','P4','P5')),
  carpeta_id uuid references public.archivo_guias_carpetas(id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) > 0),
  storage_path text not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists archivo_guias_archivos_idx on public.archivo_guias_archivos (contrato, carpeta_id);

create or replace function public.es_encargado_bodega() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'encargado_bodega');
$$;

alter table public.archivo_guias_carpetas enable row level security;
alter table public.archivo_guias_archivos enable row level security;

create policy archivo_guias_carpetas_all on public.archivo_guias_carpetas
  for all to authenticated using (public.es_encargado_bodega()) with check (public.es_encargado_bodega());
create policy archivo_guias_archivos_all on public.archivo_guias_archivos
  for all to authenticated using (public.es_encargado_bodega()) with check (public.es_encargado_bodega());

insert into storage.buckets (id, name, public) values ('archivo-guias', 'archivo-guias', false)
  on conflict (id) do nothing;

create policy archivo_guias_storage_all on storage.objects
  for all to authenticated
  using (bucket_id = 'archivo-guias' and public.es_encargado_bodega())
  with check (bucket_id = 'archivo-guias' and public.es_encargado_bodega());
