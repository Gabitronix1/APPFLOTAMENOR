import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Autoservicio de cuentas para personal de terreno nuevo (conductores/mecánicos): no requiere
// sesión (verify_jwt = false). Queda sin rol hasta que un jefe la aprueba en Maestros > Usuarios.

// Únicos roles que una persona puede "solicitar" al autoregistrarse — nunca roles de
// jefatura/administrativos, esos solo los asigna un jefe desde Maestros > Usuarios.
const ROLES_SOLICITABLES = ['conductor_logistico', 'mecanico_flota_menor', 'mecanico_maquinaria']

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const body = await req.json()
    const { email, password, nombre, apellido, rut, rol_solicitado } = body

    if (!email || !password) throw new Error('Falta email o contraseña.')
    if (!nombre?.trim() || !apellido?.trim()) throw new Error('Falta nombre y apellido.')
    if (!ROLES_SOLICITABLES.includes(rol_solicitado)) throw new Error('Rol solicitado inválido.')

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError) throw createError

    const { data: operador, error: opError } = await admin
      .from('operadores')
      .insert({ nombre: nombre.trim(), apellido: apellido.trim(), rut: rut?.trim() || null, activo: true })
      .select('id')
      .single()
    if (opError) throw opError

    const { error: solicitudError } = await admin.from('solicitudes_acceso').insert({
      user_id: created.user.id,
      operador_id: operador.id,
      email,
      rol_solicitado,
    })
    if (solicitudError) throw solicitudError

    return jsonResponse({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido.'
    return jsonResponse({ error: message }, 400)
  }
})
