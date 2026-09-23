-- Funciones (cargos) que el personal puede elegir o agregar con "+" al crear su cuenta.
-- Son descriptivas: los permisos los sigue dando el rol que asigna un jefe al aprobar.
create table if not exists public.funciones_personal (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) between 2 and 60),
  created_at timestamptz not null default now()
);

create unique index if not exists funciones_personal_nombre_idx on public.funciones_personal (lower(trim(nombre)));

alter table public.funciones_personal enable row level security;

-- Todos las ven en el registro (incluso sin cuenta); se agregan a través de la función
-- solicitar-acceso al crear la cuenta; solo los jefes las editan o eliminan.
create policy "funciones_personal: lectura todos" on public.funciones_personal
  for select to anon, authenticated using (true);
create policy "funciones_personal: gestión" on public.funciones_personal
  for all to authenticated using (es_gestion()) with check (es_gestion());

-- Función (cargo) que la persona indicó al registrarse.
alter table public.solicitudes_acceso add column if not exists funcion text;
