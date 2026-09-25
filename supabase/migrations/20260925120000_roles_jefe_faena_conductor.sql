-- Nuevas funciones/roles de terreno: Jefe de Faena y Conductor (distinto de Conductor
-- Logístico: no participa de Guías de Despacho). Por ahora ambos acceden al Checklist y a
-- Listo para faena, igual que el resto del personal de terreno, y se pueden elegir al crear
-- la cuenta desde el Login.
alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles add constraint perfiles_rol_check check (rol in (
  'conductor_logistico',
  'conductor',
  'jefe_faena',
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
  'mecanico_flota_menor',
  'mecanico_maquinaria'
));
