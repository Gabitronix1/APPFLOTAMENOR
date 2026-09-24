-- El rol (permisos) queda definido de inmediato al registrarse, según la función elegida.
-- Las funciones agregadas con "+" usan el rol que tengan aquí (por defecto Conductor
-- Logístico, que solo da acceso al Checklist y a sus guías); un jefe lo cambia en Maestros.
-- Solo roles de terreno: el autoregistro nunca da permisos de jefatura.
alter table public.funciones_personal
  add column if not exists rol text not null default 'conductor_logistico'
  check (rol in ('conductor_logistico', 'mecanico_flota_menor', 'mecanico_maquinaria'));
