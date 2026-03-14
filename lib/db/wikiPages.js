export async function getWikiPages(supabase) {
  const { data, error } = await supabase
    .from('wiki_pages')
    .select('*')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data
}

export async function createWikiPage(supabase, payload) {
  const { data, error } = await supabase
    .from('wiki_pages')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateWikiPage(supabase, id, updates) {
  const { data, error } = await supabase
    .from('wiki_pages')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteWikiPage(supabase, id) {
  const { error } = await supabase
    .from('wiki_pages')
    .delete()
    .eq('id', id)

  if (error) throw error
}
