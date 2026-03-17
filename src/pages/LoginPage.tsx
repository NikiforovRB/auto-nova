import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'
import { useTranslation } from 'react-i18next'

export function LoginPage() {
  const { t } = useTranslation()
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
          <h1 className="auth-title">{t('auth.loginTitle')}</h1>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>{t('auth.email')}</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="auth-field">
              <span>{t('auth.password')}</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && <div className="auth-error">{error}</div>}
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? t('auth.loggingIn') : t('auth.login')}
            </button>
            <div className="auth-alt">
              <Link to="/register">{t('auth.noAccount')}</Link>
            </div>
          </form>
        </section>
      </main>
    </MainLayout>
  )
}

