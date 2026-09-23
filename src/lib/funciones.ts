import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

/**
 * Llama una Edge Function y devuelve el mensaje de error real que respondió (las funciones
 * responden 400 con `{ error }`, y supabase-js solo expone "non-2xx status code").
 */
export async function invocarFuncion<T = unknown>(
  nombre: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke(nombre, { body })
  if (!error) {
    const apiError = (data as { error?: string } | null)?.error
    return apiError ? { data: null, error: apiError } : { data: data as T, error: null }
  }
  if (error instanceof FunctionsHttpError) {
    try {
      const cuerpo = (await error.context.json()) as { error?: string }
      return { data: null, error: cuerpo.error ?? error.message }
    } catch {
      return { data: null, error: error.message }
    }
  }
  return { data: null, error: 'Sin conexión con el servidor.' }
}
