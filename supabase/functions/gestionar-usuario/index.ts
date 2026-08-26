import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

// Únicos roles con permiso para crear usuarios o cambiar roles (mismo criterio que es_gestion() en la BD).
const ROLES_JEFES = ['jefe_maquinarias', 'jefe_cdg']

const ROLES_VALIDOS = [
  'conductor_logistico',
  'mecanico_flota_menor',
  'mecanico_maquinaria',
  'jefe_maquinarias',
  'supervisor_maquinarias',
  'ingeniero_confiabilidad',
  'jefe_cdg',
]

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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Falta encabezado de autorización.')

    // Cliente con el JWT de quien llama, solo para identificarlo y validar su rol.
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) throw new Error('Sesión inválida.')

    const { data: callerPerfil, error: perfilError } = await callerClient
      .from('perfiles')
      .select('rol')
      .eq('id', userData.user.id)
      .single()
    if (perfilError || !callerPerfil || !ROLES_JEFES.includes(callerPerfil.rol)) {
      throw new Error('No tienes permiso para gestionar usuarios.')
    }

    const body = await req.json()
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    if (body.action === 'actualizar_rol') {
      const { perfil_id, rol } = body
      if (!perfil_id || !ROLES_VALIDOS.includes(rol)) throw new Error('Datos inválidos.')

      const { error } = await admin.from('perfiles').update({ rol }).eq('id', perfil_id)
      if (error) throw error

      return jsonResponse({ ok: true })
    }

    if (body.action === 'crear') {
      const { email, rol, operador_id, nombre, apellido, rut } = body
      if (!email || !ROLES_VALIDOS.includes(rol)) throw new Error('Datos inválidos.')

      let operadorId: string | null = operador_id ?? null
      if (!operadorId) {
        if (!nombre || !apellido) throw new Error('Falta nombre y apellido para crear el operador.')
        const { data: nuevoOperador, error: opError } = await admin
          .from('operadores')
          .insert({ nombre, apellido, rut: rut || null, activo: true })
          .select('id')
          .single()
        if (opError) throw opError
        operadorId = nuevoOperador.id
      }

      // Envía un correo de invitación: la persona define su propia contraseña, nunca la manejamos nosotros.
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email)
      if (inviteError) throw inviteError

      const { error: perfilInsertError } = await admin
        .from('perfiles')
        .insert({ id: invited.user.id, operador_id: operadorId, rol })
      if (perfilInsertError) throw perfilInsertError

      return jsonResponse({ ok: true, id: invited.user.id })
    }

    throw new Error('Acción no reconocida.')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido.'
    return jsonResponse({ error: message }, 400)
  }
})
