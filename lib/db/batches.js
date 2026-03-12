export async function createBatch(supabase, payload) {
  const { data, error } = await supabase
    .from('batches')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getBatches(supabase) {
  const { data, error } = await supabase
    .from('batches')
    .select('*')
    .order('planned_date', { ascending: false })

  if (error) throw error
  return data
}

export async function updateBatchStatus(supabase, batchId, status, extras = {}) {
  const { data, error } = await supabase
    .from('batches')
    .update({ status, ...extras })
    .eq('id', batchId)
    .select()
    .single()

  if (error) throw error
  return data
}
