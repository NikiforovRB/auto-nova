import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'
import { useToast } from '../ui/toast/ToastContext'

export function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const toast = useToast()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      toast.push({
        variant: 'error',
        title: 'Не удалось войти',
        message: signInError.message,
      })
      return
    }

    const userId = signInData.user?.id
    if (!userId) {
      toast.push({
        variant: 'error',
        title: 'Ошибка авторизации',
        message: 'Не удалось получить пользователя из сессии.',
      })
      return
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single()

    if (profileError) {
      toast.push({
        variant: 'error',
        title: 'Ошибка проверки прав',
        message: profileError.message,
      })
      return
    }

    if (!profileData?.is_admin) {
      toast.push({
        variant: 'error',
        title: 'Доступ запрещён',
        message: 'У этого аккаунта нет прав администратора.',
      })
      await supabase.auth.signOut()
      return
    }

    toast.push({
      variant: 'success',
      title: 'Вы вошли в админку',
      message: 'Добро пожаловать.',
    })
    navigate('/admin/brands')
  }

  return (
    <MainLayout>
      <Header />
      <main className="auth-main">
        <section className="auth-card">
          <h1 className="auth-title">Админка AUTONOVA</h1>
          <p className="auth-subtitle">Только для администраторов</p>
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
              {loading ? 'Входим…' : 'Войти в админку'}
            </button>
          </form>
        </section>
      </main>
    </MainLayout>
  )
}

