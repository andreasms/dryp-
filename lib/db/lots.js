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
  // Read current qty first so we can validate before writing
  const { data: lot, error: fetchError } = await supabase
    .from('lots')
    .select('qty_remaining')
    .eq('id', lotId)
    .single()

  if (fetchError) throw fetchError

  const newQty = lot.qty_remaining - qtyUsed
  if (newQty < 0) {
    throw new Error(
      `Ikke nok lagerbeholdning på lot ${lotId}: ` +
      `${lot.qty_remaining} tilgængelig, ${qtyUsed} efterspurgt`
    )
  }

  const { data, error } = await supabase
    .from('lots')
    .update({ qty_remaining: newQty })
    .eq('id', lotId)
    .select()
    .single()

  if (error) throw error
  return data
}
