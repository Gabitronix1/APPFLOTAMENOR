-- Ingreso con RUT y registro sin señal.

-- RUT sin puntos ni guion y con K mayúscula, para comparar RUTs escritos de distintas formas.
create or replace function public.normalizar_rut(valor text)
returns text
language sql
immutable
as $$
  select nullif(upper(regexp_replace(coalesce(valor, ''), '[^0-9kK]', '', 'g')), '')
$$;

-- La solicitud recuerda si se vinculó a un operador que ya existía (mismo RUT o mismo
-- nombre sin RUT), para mostrárselo al jefe al aprobar y deshacer el RUT si la rechaza.
alter table public.solicitudes_acceso
  add column if not exists vinculo_existente boolean not null default false;

-- Catálogos mínimos para llenar un Checklist en un celular que todavía no tiene cuenta
-- (registro sin señal): patentes, categorías y líneas. No incluye personas ni RUTs.
create or replace function public.catalogos_publicos()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'patentes', coalesce((
      select json_agg(json_build_object(
        'id', p.id, 'patente', p.patente, 'descripcion', p.descripcion,
        'categoria_id', p.categoria_id, 'linea', p.linea, 'activo', p.activo
      ) order by p.patente)
      from public.patentes p where p.activo
    ), '[]'::json),
    'categorias_vehiculo', coalesce((
      select json_agg(row_to_json(c) order by c.orden) from public.categorias_vehiculo c
    ), '[]'::json),
    'lineas_operacion', coalesce((
      select json_agg(row_to_json(l) order by l.orden) from public.lineas_operacion l
    ), '[]'::json)
  )
$$;

revoke all on function public.catalogos_publicos() from public;
grant execute on function public.catalogos_publicos() to anon, authenticated;
