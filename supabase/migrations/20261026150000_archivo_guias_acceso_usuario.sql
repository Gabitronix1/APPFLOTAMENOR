-- Acceso al Archivo de guías por persona (además de los roles Encargado de Bodega y Jefe de CDG).
-- Solo la gestión puede editar perfiles (RLS), por lo que nadie puede otorgarse este acceso solo.
alter table public.perfiles add column if not exists acceso_archivo_guias boolean not null default false;

create or replace function public.puede_archivo_guias() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and (rol in ('encargado_bodega', 'jefe_cdg') or acceso_archivo_guias)
  );
$$;

-- Ignacio Montecinos, Gonsalo Lagos y Raul Gutierrez (Asistentes Logísticos).
update public.perfiles set acceso_archivo_guias = true
where id in (
  '97d8b4d0-90bb-46d2-aef6-17f621f18440',
  '8ed06334-7478-4d0c-abe8-0a21dc7317b0',
  '4cdc9c5c-b9eb-4fad-88ed-9b21bd56afae'
);
