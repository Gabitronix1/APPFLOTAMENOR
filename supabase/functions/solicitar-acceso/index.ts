import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Autoservicio de cuentas para personal de terreno nuevo (conductores/mecánicos): no requiere
// sesión (verify_jwt = false). Queda sin rol hasta que un jefe la aprueba en Maestros > Usuarios.
//
// La cuenta se identifica por RUT: el correo es técnico (`<rut>@rut.isidorachile.cl`) y la
// persona nunca lo ve. También lo llama la app al recuperar la señal para crear las cuentas
// que se registraron sin conexión (con el id del operador que el celular ya usó en sus
// registros, para no tener que corregirlos).

// Únicos roles que una persona puede "solicitar" al autoregistrarse — nunca roles de
// jefatura/administrativos, esos solo los asigna un jefe desde Maestros > Usuarios.
const ROLES_SOLICITABLES = ['conductor_logistico', 'mecanico_flota_menor', 'mecanico_maquinaria']
const DOMINIO_RUT = 'rut.isidorachile.cl'
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

class ErrorConCodigo extends Error {
  constructor(message: string, public code: string) {
    super(message)
  }
}

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

function escaparLike(valor: string): string {
  return valor.replace(/[\\%_]/g, c => `\\${c}`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  let userIdCreado: string | null = null

  try {
    const body = await req.json()
    const { password, rol_solicitado, operador_id } = body
    const nombre = String(body.nombre ?? '').trim()
    const apellido = String(body.apellido ?? '').trim()
    const rutLimpio = limpiarRut(String(body.rut ?? ''))

    if (!nombre || !apellido) throw new Error('Falta nombre y apellido.')
    if (!rutLimpio) throw new Error('Falta el RUT.')
    if (!rutValido(rutLimpio)) throw new ErrorConCodigo('El RUT no es válido. Revisa el número y el dígito verificador.', 'rut_invalido')
    if (!password || String(password).length < 6) throw new Error('La clave debe tener al menos 6 caracteres.')
    // Función (cargo) elegida o agregada con "+" en el registro. Si es una de las funciones
    // base, llega como rol; si es otra, llega como texto y el jefe asigna el rol al aprobar.
    const funcion = String(body.funcion ?? '').trim().replace(/\s+/g, ' ').slice(0, 60)
    const rolSolicitado = ROLES_SOLICITABLES.includes(rol_solicitado) ? rol_solicitado : null
    if (!rolSolicitado && funcion.length < 2) throw new Error('Indica tu función.')

    const rut = `${rutLimpio.slice(0, -1)}-${rutLimpio.slice(-1)}`
    // Compatibilidad con la versión anterior de la app, que enviaba un correo.
    const email = String(body.email ?? '').trim().toLowerCase() || `${rutLimpio.toLowerCase()}@${DOMINIO_RUT}`

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError) {
      const yaExiste =
        (createError as { code?: string }).code === 'email_exists' || /already|registered|exists/i.test(createError.message)
      if (yaExiste) throw new ErrorConCodigo('Ese RUT ya tiene una cuenta. Ingresa con tu RUT y tu clave.', 'ya_registrado')
      throw createError
    }
    userIdCreado = created.user.id

    // Vincular el RUT a una persona: 1) operador con ese RUT; 2) único operador activo con el
    // mismo nombre y sin RUT (p. ej. conductores cargados antes sin RUT); 3) operador nuevo.
    let operadorId: string | null = null
    let vinculoExistente = false

    const { data: porRut } = await admin.from('operadores').select('id').eq('rut', rut).limit(1)
    if (porRut?.length) {
      operadorId = porRut[0].id
      vinculoExistente = true
    } else {
      const { data: porNombre } = await admin
        .from('operadores')
        .select('id')
        .eq('activo', true)
        .is('rut', null)
        .ilike('nombre', escaparLike(nombre))
        .ilike('apellido', escaparLike(apellido))
        .limit(2)
      if (porNombre?.length === 1) {
        operadorId = porNombre[0].id
        vinculoExistente = true
        const { error: rutError } = await admin.from('operadores').update({ rut }).eq('id', operadorId)
        if (rutError) throw rutError
      }
    }

    if (!operadorId) {
      const nuevo: Record<string, unknown> = { nombre, apellido, rut, activo: true }
      if (typeof operador_id === 'string' && UUID_RE.test(operador_id)) nuevo.id = operador_id
      const { data: operador, error: opError } = await admin.from('operadores').insert(nuevo).select('id').single()
      if (opError) throw opError
      operadorId = operador.id
    }

    const { error: solicitudError } = await admin.from('solicitudes_acceso').insert({
      user_id: created.user.id,
      operador_id: operadorId,
      email,
      rol_solicitado: rolSolicitado,
      funcion: funcion || null,
      vinculo_existente: vinculoExistente,
    })
    if (solicitudError) throw solicitudError

    // Una función nueva queda disponible para todos en el registro (si ya existía, el índice
    // único por nombre la ignora).
    if (!rolSolicitado && funcion) {
      const { error: funcionError } = await admin.from('funciones_personal').insert({ nombre: funcion })
      if (funcionError && funcionError.code !== '23505') console.error('funciones_personal', funcionError)
    }

    return jsonResponse({ ok: true, operador_id: operadorId, email })
  } catch (err) {
    // Si algo falló después de crear la cuenta, se elimina para que la persona pueda
    // reintentar (si no, quedaría "ya registrado" sin solicitud ni operador).
    if (userIdCreado) await admin.auth.admin.deleteUser(userIdCreado).catch(() => undefined)
    const message = err instanceof Error ? err.message : 'Error desconocido.'
    const code = err instanceof ErrorConCodigo ? err.code : undefined
    return jsonResponse({ error: message, code }, 400)
  }
})
