import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import type { Profile } from '../types'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
  adminLoading: boolean
  profile: Profile | null
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session ?? null)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!user) {
        setIsAdmin(false)
        setAdminLoading(false)
        setProfile(null)
        return
      }

      setAdminLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin, avatar_url, first_name, last_name, full_name, region_id, phone')
        .eq('id', user.id)
        .single()

      if (cancelled) return

      if (error) {
        // Не считаем пользователя "не админом" из-за временной ошибки сети/RLS.
        // Оставляем false, но снимаем loading, чтобы UI не зависал.
        setIsAdmin(false)
        setAdminLoading(false)
        setProfile(null)
        return
      }

      setIsAdmin(!!data?.is_admin)
      setProfile((data as unknown as Profile) ?? null)
      setAdminLoading(false)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [user])

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null)
      setIsAdmin(false)
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin, avatar_url, first_name, last_name, full_name, region_id, phone')
      .eq('id', user.id)
      .single()
    if (error) return
    setIsAdmin(!!(data as any)?.is_admin)
    setProfile((data as unknown as Profile) ?? null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin,
        adminLoading,
        profile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

