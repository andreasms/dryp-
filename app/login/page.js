'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('login') // login or signup
  const supabase = createClient()

  const ALLOWED_EMAILS = (process.env.NEXT_PUBLIC_ALLOWED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const emailLower = email.toLowerCase().trim()
    if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(emailLower)) {
      setError('Denne email har ikke adgang til DRYP. Kontakt administrator.')
      setLoading(false)
      return
    }

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setError('Tjek din email for bekræftelseslink!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Forkert email eller password')
      else window.location.href = '/'
    }
    setLoading(false)
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f1a0b'
    }}>
      <div className="fade-in" style={{
        background: '#1a2814', border: '1px solid #2d4a22', borderRadius: 16,
        padding: 40, width: 360, textAlign: 'center'
      }}>
        <div style={{
          fontFamily: "'Archivo Black', sans-serif", fontSize: 28,
          color: '#a8d870', letterSpacing: '0.12em', marginBottom: 4
        }}>DRYP</div>
        <div style={{
          fontSize: 10, color: 'rgba(232,240,216,0.3)',
          letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 32
        }}>Sikker adgang · Skagen</div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email" required
              style={{ textAlign: 'center' }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password" required minLength={6}
              style={{ textAlign: 'center' }}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 12, color: error.includes('Tjek') ? '#54c878' : '#e85454',
              marginBottom: 12
            }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '10px 0', borderRadius: 8,
            background: '#a8d870', color: '#0f1a0b',
            fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
            opacity: loading ? 0.5 : 1
          }}>
            {loading ? '...' : mode === 'login' ? 'Log ind' : 'Opret konto'}
          </button>
        </form>

        <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{
          background: 'none', color: 'rgba(232,240,216,0.4)',
          fontSize: 11, marginTop: 16, textDecoration: 'underline'
        }}>
          {mode === 'login' ? 'Opret ny konto' : 'Har allerede en konto? Log ind'}
        </button>
      </div>
    </div>
  )
}
