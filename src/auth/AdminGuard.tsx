import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { supabase } from '../supabaseClient'

interface AdminGuardProps {
  children: ReactNode
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading, isAdmin, adminLoading } = useAuth()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      if (!user) {
        if (!cancelled) setChecked(true)
        return
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      if (cancelled) return
      // Если запрос упал, не разлогиниваем и не редиректим – просто отметим, что проверка была.
      if (!error) {
        // sync isAdmin already handled in AuthContext, but keep checked state
        void data
      }
      setChecked(true)
    }
    void check()
    return () => {
      cancelled = true
    }
  }, [user])

  if (loading || adminLoading || !checked) {
    return null
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}

