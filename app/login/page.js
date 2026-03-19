'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Forkert email eller password')
    else window.location.href = '/'
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
              fontSize: 12, color: '#e85454',
              marginBottom: 12
            }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '10px 0', borderRadius: 8,
            background: '#a8d870', color: '#0f1a0b',
            fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
            opacity: loading ? 0.5 : 1
          }}>
            {loading ? '...' : 'Log ind'}
          </button>
        </form>

        <div style={{
          fontSize: 10, color: 'rgba(232,240,216,0.25)',
          marginTop: 20
        }}>
          Brug for adgang? Kontakt administrator.
        </div>
      </div>
    </div>
  )
}
