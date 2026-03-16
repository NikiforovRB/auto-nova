import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    navigate('/')
  }

  return (
    <MainLayout>
      <Header />
      <main className="auth-main">
        <section className="auth-card">
          <h1 className="auth-title">Вход в AUTONOVA</h1>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="auth-field">
              <span>Пароль</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Входим…' : 'Войти'}
            </button>
          </form>
        </section>
      </main>
    </MainLayout>
  )
}

