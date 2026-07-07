import { supabase } from './supabase'

const PAGE_SIZE = 1000

export async function fetchAllPages<T>(
  table: string,
  select = '*',
  order?: { column: string; ascending: boolean },
): Promise<T[]> {
  const result: T[] = []
  let from = 0
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + PAGE_SIZE - 1)
    if (order) q = q.order(order.column, { ascending: order.ascending })
    const { data, error } = await q
    if (error || !data || data.length === 0) break
    result.push(...(data as unknown as T[]))
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return result
}
