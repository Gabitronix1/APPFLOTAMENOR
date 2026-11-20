-- 1) Patentes siempre en formato estándar: solo letras y números, en mayúsculas
--    ("TG-BR-99" → "TGBR99"). Junto con el índice único existente, evita duplicados por
--    guiones, puntos o espacios, venga de donde venga el insert.
create or replace function public.normalizar_patente() returns trigger
language plpgsql as $$
begin
  new.patente := upper(regexp_replace(new.patente, '[^A-Za-z0-9]', '', 'g'));
  return new;
end;
$$;

drop trigger if exists trg_normalizar_patente on public.patentes;
create trigger trg_normalizar_patente
  before insert or update of patente on public.patentes
  for each row execute function public.normalizar_patente();

update public.patentes
set patente = upper(regexp_replace(patente, '[^A-Za-z0-9]', '', 'g'))
where patente <> upper(regexp_replace(patente, '[^A-Za-z0-9]', '', 'g'));

-- 2) Crear patentes nuevas: solo personas autorizadas (perfiles.puede_crear_patentes).
--    Solo la gestión puede editar perfiles (RLS), así que nadie puede otorgárselo solo.
alter table public.perfiles add column if not exists puede_crear_patentes boolean not null default false;

create or replace function public.puede_crear_patentes() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and puede_crear_patentes);
$$;

-- Antes: cualquiera insertaba ("insertar todos") y la gestión tenía ALL (incluía insert).
-- Ahora: insertar solo autorizados; editar/eliminar sigue siendo de la gestión.
drop policy if exists "patentes: insertar todos" on public.patentes;
drop policy if exists "patentes: gestión" on public.patentes;
drop policy if exists "patentes: insertar autorizados" on public.patentes;
drop policy if exists "patentes: gestión editar" on public.patentes;
drop policy if exists "patentes: gestión eliminar" on public.patentes;

create policy "patentes: insertar autorizados" on public.patentes
  for insert to authenticated with check (public.puede_crear_patentes());
create policy "patentes: gestión editar" on public.patentes
  for update to authenticated using (public.es_gestion()) with check (public.es_gestion());
create policy "patentes: gestión eliminar" on public.patentes
  for delete to authenticated using (public.es_gestion());

-- Departamento de Gestión: Ignacio Maldonado, Gabriel Valderrama, Luis Toledo, Cristóbal Leiva.
-- Flota Menor: Axel Toledo.
update public.perfiles set puede_crear_patentes = true
where id in (
  '398e51ab-c1d2-4c30-b896-de928382d687',
  'ef25bb18-ab54-4a44-bc7c-8f120944801e',
  '7e2a3af1-e8d2-490f-80ff-5ad748ad6592',
  '890c5202-a574-43e5-9362-cb42f73f22e3',
  'ac07d768-e10e-42bd-b00c-e18d92b61d30'
);

-- 3) Últimos kilometrajes por patente, para guiar el odómetro en el Checklist (se guarda
--    en el celular como catálogo, así también funciona sin señal). Security definer para
--    que cada conductor vea el último km de cualquier vehículo, no solo de sus checklists.
create or replace function public.historial_km_patentes()
returns table (id uuid, lecturas jsonb)
language sql stable security definer set search_path = public as $$
  select p.id,
    coalesce((
      select jsonb_agg(
               jsonb_build_object('fecha', x.fecha, 'km', x.kilometraje, 'tipo', x.tipo, 'conductor', x.conductor)
               order by x.fecha
             )
      from (
        select i.fecha, i.kilometraje, i.tipo,
               nullif(trim(coalesce(o.nombre, '') || ' ' || coalesce(o.apellido, '')), '') as conductor
        from public.inspecciones i
        left join public.operadores o on o.id = i.operador_id
        where i.patente_id = p.id
        order by i.fecha desc
        limit 12
      ) x
    ), '[]'::jsonb)
  from public.patentes p
  where p.activo;
$$;

revoke all on function public.historial_km_patentes() from public, anon;
grant execute on function public.historial_km_patentes() to authenticated;
