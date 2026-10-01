-- "Conductor" y "Conductor de Transporte de Persona" son el mismo cargo: se conserva el rol
-- `conductor` (ahora con la etiqueta "Conductor de Transporte de Persona") y se elimina el
-- valor duplicado `conductor_transporte_personas` (sin usuarios asignados).
update public.perfiles set rol = 'conductor' where rol = 'conductor_transporte_personas';
update public.funciones_personal set rol = 'conductor' where rol = 'conductor_transporte_personas';

alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles add constraint perfiles_rol_check check (rol in (
  'conductor_logistico',
  'conductor',
  'jefe_faena',
  'supervisor_operaciones',
  'ingeniero_sstyma',
  'calibrador',
  'mecanico_terreno',
  'mecanico_flota_menor',
  'mecanico_maquinaria',
  'jefe_maquinarias',
  'supervisor_maquinarias',
  'ingeniero_confiabilidad',
  'jefe_cdg',
  'encargado_bodega',
  'encargado_flota_menor'
));

alter table public.funciones_personal drop constraint if exists funciones_personal_rol_check;
alter table public.funciones_personal add constraint funciones_personal_rol_check check (rol in (
  'conductor_logistico',
  'conductor',
  'jefe_faena',
  'supervisor_operaciones',
  'ingeniero_sstyma',
  'calibrador',
  'mecanico_terreno',
  'mecanico_flota_menor',
  'mecanico_maquinaria'
));
