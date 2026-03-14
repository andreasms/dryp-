export async function createHaccpLog(supabase, payload) {
  const { data, error } = await supabase
    .from('haccp_logs')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getHaccpLogs(supabase, { from, to, category } = {}) {
  let q = supabase
    .from('haccp_logs')
    .select('*')

  if (from) q = q.gte('log_date', from)
  if (to) q = q.lte('log_date', to)
  if (category) q = q.eq('category', category)

  q = q.order('log_date', { ascending: false })
       .order('created_at', { ascending: false })

  const { data, error } = await q
  if (error) throw error
  return data
}

export async function updateHaccpLog(supabase, id, updates) {
  const { data, error } = await supabase
    .from('haccp_logs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteHaccpLog(supabase, id) {
  const { error } = await supabase
    .from('haccp_logs')
    .delete()
    .eq('id', id)

  if (error) throw error
}
