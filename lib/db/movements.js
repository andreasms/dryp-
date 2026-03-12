export async function recordMovement(supabase, payload) {
  const { data, error } = await supabase
    .from('inventory_movements')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getMovementsByBatch(supabase, batchId) {
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function getMovementsByItem(supabase, itemId) {
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getCurrentStockForItem(supabase, itemId) {
  const { data, error } = await supabase
    .from('stock_levels')
    .select('current_qty')
    .eq('item_id', itemId)
    .single()

  if (error) {
    // PGRST116 = no rows returned — item has no movements yet
    if (error.code === 'PGRST116') return 0
    throw error
  }

  return data.current_qty ?? 0
}
