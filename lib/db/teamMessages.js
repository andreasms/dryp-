export async function getTeamMessages(supabase, { limit = 100 } = {}) {
  const { data, error } = await supabase
    .from('team_messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw error
  return data
}

export async function sendTeamMessage(supabase, payload) {
  const { data, error } = await supabase
    .from('team_messages')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}
