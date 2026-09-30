-- Nuevos cargos de terreno: Supervisor de Operaciones, Ingeniero de SSTyMA, Calibrador,
-- Mecánico Terreno y Conductor de Transporte de Persona. Por ahora solo acceden al Checklist
-- y a Listo para faena (igual que conductor/jefe_faena). Además, en la app se renombran las
-- etiquetas: conductor_logistico -> Asistente Logístico, encargado_flota_menor -> Coordinador
-- de Flota Menor (los valores internos no cambian, así que no afecta a usuarios existentes).
alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles add constraint perfiles_rol_check check (rol in (
  'conductor_logistico',
  'conductor',
  'jefe_faena',
  'supervisor_operaciones',
  'ingeniero_sstyma',
  'calibrador',
  'mecanico_terreno',
  'conductor_transporte_personas',
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
  'conductor_transporte_personas',
  'mecanico_flota_menor',
  'mecanico_maquinaria'
));
