-- Centro de gestión Flota Menor: lectura de checklist con sus respuestas para el dashboard.
--
-- inspecciones/respuestas solo las leen los roles administrativos (RLS), pero el dashboard de
-- Flota Menor también lo ven Coordinador de Flota Menor y Encargado de Bodega. Esta función de
-- solo lectura entrega exactamente lo que el tablero necesita a quienes pueden ver el dashboard
-- (puede_ver_dashboard_flota_menor) y nada a los demás.
--
-- respuestas: arreglo de [pregunta_id, falla, observacion, testigo_critico, afecta_campo_visual]
-- (testigo_critico = testigo rojo o ABS en el tablero, que escalan la falla a detención).
create or replace function public.fn_dashboard_flota_menor_checklist(p_desde timestamptz default null)
returns table (
  id uuid,
  fecha timestamptz,
  tipo text,
  kilometraje integer,
  operativo boolean,
  obs_general text,
  linea text,
  fundo text,
  patente_id uuid,
  operador_id uuid,
  respuestas jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.id,
    i.fecha,
    i.tipo,
    i.kilometraje,
    i.operativo,
    i.obs_general,
    i.linea,
    f.nombre as fundo,
    i.patente_id,
    i.operador_id,
    coalesce((
      select jsonb_agg(jsonb_build_array(
        r.pregunta_id,
        coalesce(r.valor, false),
        r.observacion,
        coalesce(r.testigo_rojo, false) or coalesce(r.testigo_abs, false),
        coalesce(r.afecta_campo_visual, false)
      ) order by r.pregunta_id)
      from respuestas r
      where r.inspeccion_id = i.id
    ), '[]'::jsonb) as respuestas
  from inspecciones i
  left join fundos f on f.id = i.fundo_id
  where puede_ver_dashboard_flota_menor()
    and (p_desde is null or i.fecha >= p_desde)
  order by i.fecha desc, i.id
$$;

revoke all on function public.fn_dashboard_flota_menor_checklist(timestamptz) from public, anon;
grant execute on function public.fn_dashboard_flota_menor_checklist(timestamptz) to authenticated;
