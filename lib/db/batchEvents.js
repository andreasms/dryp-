export async function appendEvent(supabase, payload) {
  const { data, error } = await supabase
    .from('batch_events')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getTimeline(supabase, batchId) {
  const { data, error } = await supabase
    .from('batch_events')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

export async function getLatestEvent(supabase, batchId, eventType) {
  const { data, error } = await supabase
    .from('batch_events')
    .select('*')
    .eq('batch_id', batchId)
    .eq('event_type', eventType)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data
}
