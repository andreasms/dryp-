import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
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
