-- Nueva línea de operación "Logística".
insert into public.lineas_operacion (codigo, nombre, orden)
select 'LOG', 'Logística', coalesce(max(orden), 0) + 1 from public.lineas_operacion
where not exists (select 1 from public.lineas_operacion where codigo = 'LOG');
