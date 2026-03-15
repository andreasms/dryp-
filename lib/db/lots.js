export async function createLot(supabase, payload) {
  const { data, error } = await supabase
    .from('lots')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getLotsByItem(supabase, itemId) {
  const { data, error } = await supabase
    .from('lots')
    .select('*')
    .eq('item_id', itemId)
    .gt('qty_remaining', 0)
    .order('expiry_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function getActiveLots(supabase) {
  const { data, error } = await supabase
    .from('lots')
    .select('*')
    .gt('qty_remaining', 0)
    .order('expiry_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function decrementLotQty(supabase, lotId, qtyUsed) {
  const { data, error } = await supabase.rpc('decrement_lot_qty', {
    p_lot_id: lotId,
    p_qty: qtyUsed,
  })

  if (error) {
    // Surface the Danish message from the SQL function
    throw new Error(error.message || 'Lot-opdatering fejlede')
  }

  return data // new qty_remaining
}
