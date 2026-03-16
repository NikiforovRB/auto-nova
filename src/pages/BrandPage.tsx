import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '../shared/Header'
import { MainLayout } from '../shared/MainLayout'
import { supabase } from '../supabaseClient'
import type { Ad, Brand } from '../types'
import { useAuth } from '../auth/AuthContext'
import { AdCard } from '../components/AdCard'

export function BrandPage() {
  const { id } = useParams()
  const brandId = id ? Number(id) : NaN
  const [brand, setBrand] = useState<Brand | null>(null)
  const [ads, setAds] = useState<Ad[]>([])
  const [favorites, setFavorites] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!Number.isFinite(brandId)) {
      navigate('/')
      return
    }

    const load = async () => {
      setLoading(true)
      const [{ data: brandData }, { data: adsData }] = await Promise.all([
        supabase.from('brands').select('*').eq('id', brandId).single(),
        supabase
          .from('ads')
          .select(
            `
            *,
            brand:brands(*),
            model:models(*),
            photos:ad_photos(*)
          `,
          )
          .eq('status', 'active')
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false }),
      ])

      setBrand((brandData as Brand) ?? null)
      setAds((adsData as Ad[]) ?? [])
      setLoading(false)
    }

    void load()
  }, [brandId, navigate])

  useEffect(() => {
    if (!user) {
      setFavorites([])
      return
    }

    const loadFavorites = async () => {
      const { data } = await supabase
        .from('favorites')
        .select('ad_id')
        .eq('user_id', user.id)
      setFavorites((data ?? []).map((row) => row.ad_id as number))
    }

    void loadFavorites()
  }, [user])

  const title = useMemo(() => (brand?.name ? `Купить ${brand.name}` : 'Купить'), [brand?.name])

  const handleFavoriteChange = (adId: number, next: boolean) => {
    setFavorites((prev) => (next ? [...prev, adId] : prev.filter((x) => x !== adId)))
  }

  return (
    <MainLayout>
      <Header />
      <main className="home-main">
        <section className="hero-section">
          <div className="hero-text">
            <h1 className="hero-title">{title}</h1>
            <p className="hero-subtitle">Все активные объявления по выбранной марке.</p>
          </div>
        </section>

        <section className="ads-section">
          <div className="section-header">
            <h2 className="section-title">Объявления</h2>
          </div>
          {loading ? (
            <div className="ads-grid">
              <div className="ad-card-skeleton" />
              <div className="ad-card-skeleton" />
              <div className="ad-card-skeleton" />
              <div className="ad-card-skeleton" />
            </div>
          ) : ads.length ? (
            <div className="ads-grid">
              {ads.map((ad) => (
                <AdCard
                  key={ad.id}
                  ad={ad}
                  isFavorite={favorites.includes(ad.id)}
                  onFavoriteChange={handleFavoriteChange}
                />
              ))}
            </div>
          ) : (
            <div className="ads-empty">Пока нет активных объявлений</div>
          )}
        </section>
      </main>
    </MainLayout>
  )
}

