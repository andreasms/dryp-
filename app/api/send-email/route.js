import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// In-memory rate limit: max 10 requests per 60s per user
const rateLimitMap = new Map()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60_000

function isRateLimited(userId) {
  const now = Date.now()
  const timestamps = (rateLimitMap.get(userId) || []).filter(t => now - t < RATE_WINDOW_MS)
  if (timestamps.length >= RATE_LIMIT) {
    rateLimitMap.set(userId, timestamps)
    return true
  }
  timestamps.push(now)
  rateLimitMap.set(userId, timestamps)
  return false
}

export async function POST(request) {
  try {
    const supabase = createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Ikke logget ind' }, { status: 401 })
    }

    if (isRateLimited(user.id)) {
      return NextResponse.json({ error: 'For mange requests — vent venligst' }, { status: 429 })
    }

    const { to, subject, html, from_name } = await request.json()

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Mangler til, emne eller indhold' }, { status: 400 })
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY ikke konfigureret' }, { status: 500 })
    }

    const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev'

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${from_name || 'DRYP'} <${FROM_EMAIL}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: result.message || 'Afsendelse fejlede' }, { status: res.status })
    }

    return NextResponse.json({ success: true, id: result.id })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
