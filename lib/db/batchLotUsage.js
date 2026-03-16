export async function getBatchLotUsage(supabase, batchId) {
  const { data, error } = await supabase
    .from('batch_lot_usage')
    .select('*, lots(lot_number, item_id, unit, qty_remaining, expiry_date, supplier)')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function createBatchLotUsage(supabase, payload) {
  const { data, error } = await supabase
    .from('batch_lot_usage')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}
