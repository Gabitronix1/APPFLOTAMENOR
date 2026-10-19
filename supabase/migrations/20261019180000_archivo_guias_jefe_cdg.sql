-- El Jefe de CDG también usa el Archivo de guías (mismo acceso que el Encargado de Bodega).
create or replace function public.puede_archivo_guias() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol in ('encargado_bodega', 'jefe_cdg'));
$$;

alter policy archivo_guias_carpetas_all on public.archivo_guias_carpetas
  using (public.puede_archivo_guias()) with check (public.puede_archivo_guias());

alter policy archivo_guias_archivos_all on public.archivo_guias_archivos
  using (public.puede_archivo_guias()) with check (public.puede_archivo_guias());

alter policy archivo_guias_storage_all on storage.objects
  using (bucket_id = 'archivo-guias' and public.puede_archivo_guias())
  with check (bucket_id = 'archivo-guias' and public.puede_archivo_guias());
