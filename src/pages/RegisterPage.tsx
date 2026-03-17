import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'

export function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    setLoading(false)

    if (signUpError) {
      // Common case when SMTP / email templates are misconfigured:
      // Supabase returns 500 with "Error sending confirmation email".
      if (signUpError.message.toLowerCase().includes('confirmation email')) {
        setError(
          'Supabase не смог отправить письмо подтверждения. Проверьте настройки SMTP (Sender email/host/port/login/password), а также шаблоны Email. Временно можно отключить подтверждение email в Auth → Providers → Email.',
        )
        return
      }
      setError(signUpError.message)
      return
    }

    // If email confirmations are enabled, session may be null here.
    if (!data.session) {
      setSuccessMessage('Аккаунт создан. Проверьте почту и подтвердите email, затем войдите.')
      return
    }

    navigate('/')
  }

  return (
    <MainLayout>
      <Header />
      <main className="auth-main">
        <section className="auth-card">
          <h1 className="auth-title">Регистрация в AUTONOVA</h1>
          <p className="auth-subtitle">
            После заполнения формы мы отправим вам письмо для подтверждения регистрации
          </p>
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
            {successMessage && <div className="auth-success">{successMessage}</div>}
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Создаём…' : 'Создать аккаунт'}
            </button>
            <div className="auth-alt">
              Уже есть аккаунт? <Link to="/login">Войти</Link>
            </div>
          </form>
        </section>
      </main>
    </MainLayout>
  )
}

