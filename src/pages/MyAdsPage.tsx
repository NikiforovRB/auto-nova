import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../shared/Header'
import { MainLayout } from '../shared/MainLayout'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../supabaseClient'
import type { Ad } from '../types'
import { AdCard } from '../components/AdCard'

export function MyAdsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('ads')
        .select('*, brand:brands(*), model:models(*), photos:ad_photos(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setAds((data as Ad[]) ?? [])
      setLoading(false)
    }
    void load()
  }, [user])

  return (
    <MainLayout>
      <Header />
      <main className="profile-main">
        <section className="profile-card">
          <h1 className="profile-title">Мои объявления</h1>

          {!user ? (
            <div>Необходимо войти в аккаунт.</div>
          ) : loading ? (
            <div>Загрузка…</div>
          ) : ads.length ? (
            <div className="my-ads-grid">
              {ads.map((ad) => (
                <div key={ad.id} className="my-ad-card">
                  <AdCard ad={ad} />
                  <button
                    type="button"
                    className="my-ad-edit"
                    onClick={() => navigate(`/ads/${ad.id}/edit`)}
                  >
                    Редактировать
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <p>У вас пока нет объявлений.</p>
              <button type="button" className="primary-button" onClick={() => navigate('/ads/new')}>
                Разместить объявление
              </button>
            </div>
          )}
        </section>
      </main>
    </MainLayout>
  )
}

