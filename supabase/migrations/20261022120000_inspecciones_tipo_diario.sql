-- El checklist "crítico" pasa a llamarse "diario". Se migran las inspecciones ya guardadas
-- y se actualiza la restricción de la columna.
alter table public.inspecciones drop constraint if exists inspecciones_tipo_check;

update public.inspecciones set tipo = 'diario' where tipo = 'critico';

alter table public.inspecciones alter column tipo set default 'completo';
alter table public.inspecciones add constraint inspecciones_tipo_check
  check (tipo in ('completo', 'diario'));

-- Compatibilidad: versiones viejas de la app (PWA en caché) o registros que quedaron en la cola
-- sin conexión pueden seguir enviando 'critico'; se guardan como 'diario' en vez de fallar.
create or replace function public.normalizar_tipo_inspeccion()
returns trigger
language plpgsql
as $$
begin
  if new.tipo = 'critico' then
    new.tipo := 'diario';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_normalizar_tipo_inspeccion on public.inspecciones;
create trigger trg_normalizar_tipo_inspeccion
  before insert or update of tipo on public.inspecciones
  for each row execute function public.normalizar_tipo_inspeccion();
