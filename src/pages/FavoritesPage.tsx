import { useEffect, useState } from 'react'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'
import { useFavorites } from '../favorites/FavoritesContext'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../supabaseClient'
import type { Ad } from '../types'
import { AdCard } from '../components/AdCard'

export function FavoritesPage() {
  const { user } = useAuth()
  const { favoriteIds } = useFavorites()
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setAds([])
        setLoading(false)
        return
      }
      if (!favoriteIds.length) {
        setAds([])
        setLoading(false)
        return
      }
      setLoading(true)
      const { data, error } = await supabase
        .from('listings')
        .select(
          `
          *,
          brand:brands(*),
          model:models(*),
          photos:ad_photos(*)
        `,
        )
        .in('id', favoriteIds)
        .order('created_at', { ascending: false })

      if (!error) {
        setAds((data as Ad[]) ?? [])
      } else {
        console.error('Failed to load favorites', error)
        setAds([])
      }
      setLoading(false)
    }

    void load()
  }, [favoriteIds, user])

  return (
    <MainLayout>
      <Header />
      <main className="home-main">
        <section className="ads-section">
          <div className="section-header">
            <h2 className="section-title">Избранное</h2>
          </div>
          {!user ? (
            <div className="ads-empty">Войдите, чтобы видеть избранное.</div>
          ) : loading ? (
            <div className="ads-grid">
              <div className="ad-card-skeleton" />
              <div className="ad-card-skeleton" />
              <div className="ad-card-skeleton" />
              <div className="ad-card-skeleton" />
            </div>
          ) : ads.length ? (
            <div className="ads-grid">
              {ads.map((ad) => (
                <AdCard key={ad.id} ad={ad} />
              ))}
            </div>
          ) : (
            <div className="ads-empty">В избранном пока нет объявлений.</div>
          )}
        </section>
      </main>
    </MainLayout>
  )
}

