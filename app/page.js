'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import DrypApp from '@/components/DrypApp'

const defaults = {
  recipes: [
    { id: "dild-250", name: "Dild Olie 250ml", size: "250ml", active: true,
      bom: [{ itemId: "r1", qty: 0.25, unit: "L" }, { itemId: "r2", qty: 0.02, unit: "kg" }, { itemId: "e1", qty: 1, unit: "stk" }, { itemId: "e3", qty: 1, unit: "stk" }, { itemId: "e4", qty: 1, unit: "stk" }],
      steps: ["Modtag og kontroller råvarer", "Skyl og forbered dild", "Bland rapsolie og dild", "Infuser (CCP1)", "Filtrer", "Aftap i flasker", "Forsegl (CCP2)", "Etikettering", "Opbevaring"],
      infusionTemp: "", infusionTime: "", shelfLifeDays: 90 },
    { id: "dild-500", name: "Dild Olie 500ml", size: "500ml", active: true,
      bom: [{ itemId: "r1", qty: 0.5, unit: "L" }, { itemId: "r2", qty: 0.04, unit: "kg" }, { itemId: "e2", qty: 1, unit: "stk" }, { itemId: "e3", qty: 1, unit: "stk" }, { itemId: "e4", qty: 1, unit: "stk" }],
      steps: ["Modtag og kontroller råvarer", "Skyl og forbered dild", "Bland rapsolie og dild", "Infuser (CCP1)", "Filtrer", "Aftap i flasker", "Forsegl (CCP2)", "Etikettering", "Opbevaring"],
      infusionTemp: "", infusionTime: "", shelfLifeDays: 90 },
  ],
  productions: [], batches: [], customers: [], orders: [],
  inventory: [
    { id: "r1", name: "Rapsolie (dansk)", unit: "L", qty: 0, min: 5, cat: "Råvare", leadDays: 7, supplier: "", costPer: 45 },
    { id: "r2", name: "Frisk dild", unit: "kg", qty: 0, min: 1, cat: "Råvare", leadDays: 2, supplier: "", costPer: 80 },
    { id: "e1", name: "Flasker 250ml", unit: "stk", qty: 0, min: 50, cat: "Emballage", leadDays: 14, supplier: "Hedenhus", costPer: 8.5 },
    { id: "e2", name: "Flasker 500ml", unit: "stk", qty: 0, min: 20, cat: "Emballage", leadDays: 14, supplier: "Hedenhus", costPer: 12 },
    { id: "e3", name: "Etiketter", unit: "stk", qty: 0, min: 50, cat: "Emballage", leadDays: 10, supplier: "", costPer: 3 },
    { id: "e4", name: "Kapsler/låg", unit: "stk", qty: 0, min: 50, cat: "Emballage", leadDays: 14, supplier: "Hedenhus", costPer: 1.5 },
  ],
  haccp: { cleaning: [], temps: [], deviations: [], receiving: [], maintenance: [] },
  prices: { retail250: 129, wholesale250: 71, retail500: 219, wholesale500: 120, overhead: 500 },
  emails: [],
  inbox: [],
  documents: [],
  docFolders: ["Generelt", "Opskrifter", "HACCP", "Leverandører"],
  team: {
    pages: [{ id: "welcome", title: "Velkommen til DRYP", content: "Her kan teamet skrive noter, mødereferater, idéer og planer.\n\nBrug + knappen til at oprette nye sider.", updated: new Date().toISOString().slice(0, 10), author: "Andreas" }],
    messages: []
  },
}

export default function Home() {
  const [user, setUser] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Shared team data loader — reused by init, realtime, and tab-focus
  const loadTeamData = async () => {
    const { data: row } = await supabase
      .from('team_data')
      .select('data')
      .eq('team_id', 'dryp')
      .single()
    if (row?.data) setData(row.data)
  }

  // Load user and data
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
      const { data: row } = await supabase
        .from('team_data')
        .select('data')
        .eq('team_id', 'dryp')
        .single()
      setData(row?.data || { ...defaults })
      setLoading(false)
    }
    init()

    // Realtime sync — reload shared data when another user saves
    const channel = supabase.channel('team-data-sync')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'team_data',
        filter: 'team_id=eq.dryp'
      }, (payload) => {
        if (!payload?.new?.data) return
        setData(payload.new.data)
      })
      .subscribe()

    // Tab-focus refetch — catches missed realtime events or large payloads
    const onVisible = () => { if (document.visibilityState === 'visible') loadTeamData() }
    document.addEventListener('visibilitychange', onVisible)

    return () => { supabase.removeChannel(channel); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  // Save function — writes to shared team_data
  const save = useCallback(async (newData) => {
    setData(newData)
    if (!user) return
    await supabase
      .from('team_data')
      .update({ data: newData, updated_by: user.id })
      .eq('team_id', 'dryp')
  }, [user, supabase])

  const update = useCallback((key, value) => {
    const newData = { ...data, [key]: typeof value === 'function' ? value(data[key]) : value }
    save(newData)
  }, [data, save])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, background: '#0f1a0b' }}>
      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 32, color: '#a8d870', letterSpacing: '0.1em' }}>DRYP</div>
      <div style={{ fontSize: 11, color: 'rgba(232,240,216,0.3)' }}>Indlæser...</div>
    </div>
  )

  return <DrypApp data={data} update={update} save={save} user={user} onLogout={handleLogout} supabase={supabase} />
}
