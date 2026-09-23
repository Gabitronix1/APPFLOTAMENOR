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
  'encargado_bodega',
  'encargado_flota_menor',
]

const DOMINIO_RUT = 'rut.isidorachile.cl'

function limpiarRut(valor: string): string {
  return valor.replace(/[^0-9kK]/g, '').toUpperCase()
}

function rutValido(limpio: string): boolean {
  if (limpio.length < 8 || limpio.length > 9) return false
  const cuerpo = limpio.slice(0, -1)
  if (!/^\d+$/.test(cuerpo)) return false
  let suma = 0
  let multiplo = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplo
    multiplo = multiplo === 7 ? 2 : multiplo + 1
  }
  const resto = 11 - (suma % 11)
  const dv = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto)
  return dv === limpio.slice(-1)
}

/** Valida el RUT y devuelve { rut canónico "12345678-K", correo técnico de la cuenta }. */
function datosRut(valor: string): { rut: string; email: string } {
  const limpio = limpiarRut(valor)
  if (!rutValido(limpio)) throw new Error('El RUT no es válido. Revisa el número y el dígito verificador.')
  return { rut: `${limpio.slice(0, -1)}-${limpio.slice(-1)}`, email: `${limpio.toLowerCase()}@${DOMINIO_RUT}` }
}

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

    // Da (o cambia) el ingreso con RUT y clave de una cuenta existente, o solo resetea su clave.
    // Es la forma de recuperar la clave de quien no tiene correo, y de habilitar con RUT a
    // las cuentas creadas antes con usuario/correo.
    if (body.action === 'asignar_acceso') {
      const { perfil_id, password } = body
      if (!perfil_id) throw new Error('Datos inválidos.')
      if (!password || String(password).length < 6) throw new Error('La clave debe tener al menos 6 caracteres.')

      const cambios: { password: string; email?: string; email_confirm?: boolean } = { password }
      if (body.rut) {
        const { rut, email } = datosRut(String(body.rut))
        const { data: perfil, error: perfilError } = await admin
          .from('perfiles')
          .select('operador_id')
          .eq('id', perfil_id)
          .single()
        if (perfilError || !perfil) throw perfilError ?? new Error('Usuario no encontrado.')
        if (!perfil.operador_id) throw new Error('Este usuario no tiene un operador (nombre) vinculado.')

        const { data: otro } = await admin.from('operadores').select('id').eq('rut', rut).neq('id', perfil.operador_id).limit(1)
        if (otro?.length) throw new Error('Ese RUT ya está asignado a otra persona.')

        const { error: rutError } = await admin.from('operadores').update({ rut }).eq('id', perfil.operador_id)
        if (rutError) throw rutError
        cambios.email = email
        cambios.email_confirm = true
      }

      const { error: updError } = await admin.auth.admin.updateUserById(perfil_id, cambios)
      if (updError) {
        if (/already|registered|exists/i.test(updError.message)) {
          throw new Error('Ese RUT ya tiene otra cuenta para ingresar. Revisa las solicitudes o usuarios duplicados.')
        }
        throw updError
      }
      return jsonResponse({ ok: true })
    }

    if (body.action === 'crear' && body.rut && body.password && !body.email) {
      // Usuario de terreno que ingresa con RUT: sin correo ni invitación, el jefe le da una
      // clave inicial.
      const { rol, operador_id, nombre, apellido, password } = body
      if (!ROLES_VALIDOS.includes(rol)) throw new Error('Datos inválidos.')
      if (String(password).length < 6) throw new Error('La clave debe tener al menos 6 caracteres.')
      const { rut, email } = datosRut(String(body.rut))

      let operadorId: string | null = operador_id ?? null
      if (operadorId) {
        const { data: otro } = await admin.from('operadores').select('id').eq('rut', rut).neq('id', operadorId).limit(1)
        if (otro?.length) throw new Error('Ese RUT ya está asignado a otra persona.')
        const { error: rutError } = await admin.from('operadores').update({ rut }).eq('id', operadorId)
        if (rutError) throw rutError
      } else {
        if (!nombre || !apellido) throw new Error('Falta nombre y apellido para crear el operador.')
        const { data: existente } = await admin.from('operadores').select('id').eq('rut', rut).limit(1)
        if (existente?.length) {
          operadorId = existente[0].id
        } else {
          const { data: nuevoOperador, error: opError } = await admin
            .from('operadores')
            .insert({ nombre, apellido, rut, activo: true })
            .select('id')
            .single()
          if (opError) throw opError
          operadorId = nuevoOperador.id
        }
      }

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (createError) {
        if (/already|registered|exists/i.test(createError.message)) throw new Error('Ese RUT ya tiene una cuenta.')
        throw createError
      }

      const { error: perfilInsertError } = await admin
        .from('perfiles')
        .insert({ id: created.user.id, operador_id: operadorId, rol })
      if (perfilInsertError) {
        await admin.auth.admin.deleteUser(created.user.id)
        throw perfilInsertError
      }

      return jsonResponse({ ok: true, id: created.user.id })
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

    if (body.action === 'aprobar_solicitud') {
      const { solicitud_id, rol } = body
      if (!solicitud_id || !ROLES_VALIDOS.includes(rol)) throw new Error('Datos inválidos.')

      const { data: solicitud, error: solicitudError } = await admin
        .from('solicitudes_acceso')
        .select('id, user_id, operador_id, estado')
        .eq('id', solicitud_id)
        .single()
      if (solicitudError || !solicitud) throw solicitudError ?? new Error('Solicitud no encontrada.')
      if (solicitud.estado !== 'pendiente') throw new Error('Esta solicitud ya fue resuelta.')

      const { error: perfilInsertError } = await admin
        .from('perfiles')
        .insert({ id: solicitud.user_id, operador_id: solicitud.operador_id, rol })
      if (perfilInsertError) throw perfilInsertError

      const { error: updateError } = await admin
        .from('solicitudes_acceso')
        .update({ estado: 'aprobada', resuelta_por: userData.user.id, resuelta_en: new Date().toISOString() })
        .eq('id', solicitud_id)
      if (updateError) throw updateError

      return jsonResponse({ ok: true })
    }

    if (body.action === 'rechazar_solicitud') {
      const { solicitud_id } = body
      if (!solicitud_id) throw new Error('Datos inválidos.')

      const { data: solicitud, error: solicitudError } = await admin
        .from('solicitudes_acceso')
        .select('id, user_id, estado')
        .eq('id', solicitud_id)
        .single()
      if (solicitudError || !solicitud) throw solicitudError ?? new Error('Solicitud no encontrada.')
      if (solicitud.estado !== 'pendiente') throw new Error('Esta solicitud ya fue resuelta.')

      const { error: updateError } = await admin
        .from('solicitudes_acceso')
        .update({ estado: 'rechazada', resuelta_por: userData.user.id, resuelta_en: new Date().toISOString() })
        .eq('id', solicitud_id)
      if (updateError) throw updateError

      // Revoca el acceso: sin perfil ni cuenta, no puede volver a entrar con ese correo.
      await admin.auth.admin.deleteUser(solicitud.user_id)

      return jsonResponse({ ok: true })
    }

    throw new Error('Acción no reconocida.')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido.'
    return jsonResponse({ error: message }, 400)
  }
})
