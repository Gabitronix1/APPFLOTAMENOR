-- Tipo de checklist: 'completo' (11 preguntas) o 'critico' (las 5 preguntas críticas
-- de la matriz de criticidad). Las inspecciones existentes quedan como 'completo'.
alter table public.inspecciones
  add column if not exists tipo text not null default 'completo';

alter table public.inspecciones drop constraint if exists inspecciones_tipo_check;
alter table public.inspecciones add constraint inspecciones_tipo_check
  check (tipo in ('completo', 'critico'));

-- La vista expone el tipo como última columna (create or replace solo permite agregar al final).
create or replace view public.v_inspecciones as
 SELECT i.id,
    i.fecha,
    i.kilometraje,
    i.operativo,
    i.obs_general,
    i.uuid_local,
    o.id AS operador_id,
    ((o.apellido || ' '::text) || o.nombre) AS conductor,
    o.turno_inicio,
    p.id AS patente_id,
    p.patente,
    f.id AS fundo_id,
    f.nombre AS fundo,
    f.contrato,
    (max(
        CASE
            WHEN (r.pregunta_id = 1) THEN (r.valor)::integer
            ELSE NULL::integer
        END))::boolean AS p1,
    max(
        CASE
            WHEN (r.pregunta_id = 1) THEN r.observacion
            ELSE NULL::text
        END) AS obs1,
    (max(
        CASE
            WHEN (r.pregunta_id = 2) THEN (r.valor)::integer
            ELSE NULL::integer
        END))::boolean AS p2,
    max(
        CASE
            WHEN (r.pregunta_id = 2) THEN r.observacion
            ELSE NULL::text
        END) AS obs2,
    (max(
        CASE
            WHEN (r.pregunta_id = 3) THEN (r.valor)::integer
            ELSE NULL::integer
        END))::boolean AS p3,
    max(
        CASE
            WHEN (r.pregunta_id = 3) THEN r.observacion
            ELSE NULL::text
        END) AS obs3,
    (max(
        CASE
            WHEN (r.pregunta_id = 4) THEN (r.valor)::integer
            ELSE NULL::integer
        END))::boolean AS p4,
    max(
        CASE
            WHEN (r.pregunta_id = 4) THEN r.observacion
            ELSE NULL::text
        END) AS obs4,
    (max(
        CASE
            WHEN (r.pregunta_id = 5) THEN (r.valor)::integer
            ELSE NULL::integer
        END))::boolean AS p5,
    max(
        CASE
            WHEN (r.pregunta_id = 5) THEN r.observacion
            ELSE NULL::text
        END) AS obs5,
    (max(
        CASE
            WHEN (r.pregunta_id = 6) THEN (r.valor)::integer
            ELSE NULL::integer
        END))::boolean AS p6,
    max(
        CASE
            WHEN (r.pregunta_id = 6) THEN r.observacion
            ELSE NULL::text
        END) AS obs6,
    count(r.id) FILTER (WHERE (r.valor = true)) AS n_fallas,
    count(res.id) FILTER (WHERE (res.id IS NOT NULL)) AS n_resueltas,
    (max(
        CASE
            WHEN (r.pregunta_id = 7) THEN (r.valor)::integer
            ELSE NULL::integer
        END))::boolean AS p7,
    max(
        CASE
            WHEN (r.pregunta_id = 7) THEN r.observacion
            ELSE NULL::text
        END) AS obs7,
    (max(
        CASE
            WHEN (r.pregunta_id = 8) THEN (r.valor)::integer
            ELSE NULL::integer
        END))::boolean AS p8,
    max(
        CASE
            WHEN (r.pregunta_id = 8) THEN r.observacion
            ELSE NULL::text
        END) AS obs8,
    (max(
        CASE
            WHEN (r.pregunta_id = 9) THEN (r.valor)::integer
            ELSE NULL::integer
        END))::boolean AS p9,
    max(
        CASE
            WHEN (r.pregunta_id = 9) THEN r.observacion
            ELSE NULL::text
        END) AS obs9,
    (max(
        CASE
            WHEN (r.pregunta_id = 10) THEN (r.valor)::integer
            ELSE NULL::integer
        END))::boolean AS p10,
    max(
        CASE
            WHEN (r.pregunta_id = 10) THEN r.observacion
            ELSE NULL::text
        END) AS obs10,
    (max(
        CASE
            WHEN (r.pregunta_id = 11) THEN (r.valor)::integer
            ELSE NULL::integer
        END))::boolean AS p11,
    max(
        CASE
            WHEN (r.pregunta_id = 11) THEN r.observacion
            ELSE NULL::text
        END) AS obs11,
    i.tipo
   FROM (((((inspecciones i
     JOIN operadores o ON ((o.id = i.operador_id)))
     JOIN patentes p ON ((p.id = i.patente_id)))
     LEFT JOIN fundos f ON ((f.id = i.fundo_id)))
     LEFT JOIN respuestas r ON ((r.inspeccion_id = i.id)))
     LEFT JOIN resoluciones res ON ((res.inspeccion_id = i.id)))
  GROUP BY i.id, o.id, p.id, f.id
  ORDER BY i.fecha DESC;
