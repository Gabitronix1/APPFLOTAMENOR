-- Pregunta 12 del checklist: Documentación del vehículo (Padrón/Permiso de Circulación, SOAP,
-- Revisión Técnica, Acreditación). Se incluye en los checklists "completo" y "diario".
insert into public.preguntas (id, codigo, nombre_corto, nombre_largo, icono, orden)
values (
  12, 'p12', 'Documentación',
  'Revisar si existen y están vigentes los documentos del vehículo: Padrón/Permiso de Circulación, SOAP, Revisión Técnica, Acreditación.',
  'file', 12
)
on conflict (id) do nothing;

-- La vista expone p12/obs12 al final (create or replace solo permite agregar columnas al final).
create or replace view public.v_inspecciones as
 SELECT i.id, i.fecha, i.kilometraje, i.operativo, i.obs_general, i.uuid_local,
    o.id AS operador_id,
    ((o.apellido || ' '::text) || o.nombre) AS conductor,
    o.turno_inicio,
    p.id AS patente_id, p.patente,
    f.id AS fundo_id, f.nombre AS fundo, f.contrato,
    (max(CASE WHEN r.pregunta_id = 1 THEN r.valor::integer END))::boolean AS p1,
    max(CASE WHEN r.pregunta_id = 1 THEN r.observacion END) AS obs1,
    (max(CASE WHEN r.pregunta_id = 2 THEN r.valor::integer END))::boolean AS p2,
    max(CASE WHEN r.pregunta_id = 2 THEN r.observacion END) AS obs2,
    (max(CASE WHEN r.pregunta_id = 3 THEN r.valor::integer END))::boolean AS p3,
    max(CASE WHEN r.pregunta_id = 3 THEN r.observacion END) AS obs3,
    (max(CASE WHEN r.pregunta_id = 4 THEN r.valor::integer END))::boolean AS p4,
    max(CASE WHEN r.pregunta_id = 4 THEN r.observacion END) AS obs4,
    (max(CASE WHEN r.pregunta_id = 5 THEN r.valor::integer END))::boolean AS p5,
    max(CASE WHEN r.pregunta_id = 5 THEN r.observacion END) AS obs5,
    (max(CASE WHEN r.pregunta_id = 6 THEN r.valor::integer END))::boolean AS p6,
    max(CASE WHEN r.pregunta_id = 6 THEN r.observacion END) AS obs6,
    count(r.id) FILTER (WHERE r.valor = true) AS n_fallas,
    count(res.id) FILTER (WHERE res.id IS NOT NULL) AS n_resueltas,
    (max(CASE WHEN r.pregunta_id = 7 THEN r.valor::integer END))::boolean AS p7,
    max(CASE WHEN r.pregunta_id = 7 THEN r.observacion END) AS obs7,
    (max(CASE WHEN r.pregunta_id = 8 THEN r.valor::integer END))::boolean AS p8,
    max(CASE WHEN r.pregunta_id = 8 THEN r.observacion END) AS obs8,
    (max(CASE WHEN r.pregunta_id = 9 THEN r.valor::integer END))::boolean AS p9,
    max(CASE WHEN r.pregunta_id = 9 THEN r.observacion END) AS obs9,
    (max(CASE WHEN r.pregunta_id = 10 THEN r.valor::integer END))::boolean AS p10,
    max(CASE WHEN r.pregunta_id = 10 THEN r.observacion END) AS obs10,
    (max(CASE WHEN r.pregunta_id = 11 THEN r.valor::integer END))::boolean AS p11,
    max(CASE WHEN r.pregunta_id = 11 THEN r.observacion END) AS obs11,
    i.tipo,
    (max(CASE WHEN r.pregunta_id = 12 THEN r.valor::integer END))::boolean AS p12,
    max(CASE WHEN r.pregunta_id = 12 THEN r.observacion END) AS obs12
   FROM inspecciones i
     JOIN operadores o ON o.id = i.operador_id
     JOIN patentes p ON p.id = i.patente_id
     LEFT JOIN fundos f ON f.id = i.fundo_id
     LEFT JOIN respuestas r ON r.inspeccion_id = i.id
     LEFT JOIN resoluciones res ON res.inspeccion_id = i.id
  GROUP BY i.id, o.id, p.id, f.id
  ORDER BY i.fecha DESC;
