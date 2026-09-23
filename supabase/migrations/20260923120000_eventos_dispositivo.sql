-- Registro de uso de la app por celular: inicios de sesión con/sin señal, periodos sin
-- señal y sincronizaciones. Los eventos se generan en el celular (ocurrido_en = hora real,
-- aunque haya sido sin señal) y se suben cuando vuelve la conexión.
create table if not exists public.eventos_dispositivo (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  operador_id uuid references public.operadores (id) on delete set null,
  device_id text not null,
  tipo text not null check (
    tipo in ('app_abierta', 'login', 'logout', 'sin_senal_inicio', 'sin_senal_fin', 'sincronizacion')
  ),
  ocurrido_en timestamptz not null,
  detalle jsonb not null default '{}'::jsonb,
  dispositivo text,
  recibido_en timestamptz not null default now()
);

create index if not exists eventos_dispositivo_ocurrido_en_idx on public.eventos_dispositivo (ocurrido_en desc);
create index if not exists eventos_dispositivo_user_idx on public.eventos_dispositivo (user_id, ocurrido_en desc);

alter table public.eventos_dispositivo enable row level security;

-- Cada persona solo registra eventos a su nombre.
create policy "eventos_dispositivo: insertar propios" on public.eventos_dispositivo
  for insert to authenticated
  with check (user_id = auth.uid());

-- Los administrativos ven todo (página "Uso sin señal"); cada persona ve los suyos.
create policy "eventos_dispositivo: lectura" on public.eventos_dispositivo
  for select to authenticated
  using (es_administrativo() or user_id = auth.uid());
