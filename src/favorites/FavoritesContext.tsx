import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../auth/AuthContext'

interface FavoritesContextValue {
  favoriteIds: number[]
  favoritesCount: number
  loading: boolean
  isFavorite: (adId: number) => boolean
  setFavorite: (adId: number, next: boolean) => Promise<void>
  refresh: () => Promise<void>
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [favoriteIds, setFavoriteIds] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    if (!user) {
      setFavoriteIds([])
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('favorites')
      .select('ad_id')
      .eq('user_id', user.id)
    if (!error) {
      setFavoriteIds((data ?? []).map((row) => row.ad_id as number))
    }
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const isFavorite = (adId: number) => favoriteIds.includes(adId)

  const setFavorite = async (adId: number, next: boolean) => {
    if (!user) return

    setFavoriteIds((prev) => (next ? [...prev, adId] : prev.filter((x) => x !== adId)))
    if (next) {
      const { error } = await supabase.from('favorites').insert({ user_id: user.id, ad_id: adId })
      if (error) {
        // rollback
        setFavoriteIds((prev) => prev.filter((x) => x !== adId))
      }
    } else {
      const { error } = await supabase.from('favorites').delete().eq('user_id', user.id).eq('ad_id', adId)
      if (error) {
        // rollback
        setFavoriteIds((prev) => (prev.includes(adId) ? prev : [...prev, adId]))
      }
    }
  }

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteIds,
      favoritesCount: favoriteIds.length,
      loading,
      isFavorite,
      setFavorite,
      refresh,
    }),
    [favoriteIds, loading],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}

