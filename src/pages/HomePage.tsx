import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../shared/Header'
import { MainLayout } from '../shared/MainLayout'
import { supabase } from '../supabaseClient'
import type { Ad, Brand } from '../types'
import { useAuth } from '../auth/AuthContext'
import { AdCard } from '../components/AdCard'

export function HomePage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [favorites, setFavorites] = useState<number[]>([])
  const [selectedBrandId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const [{ data: brandsData }, { data: adsData }] = await Promise.all([
        supabase.from('brands').select('*').order('sort_order', { ascending: true }).order('name'),
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
          .order('created_at', { ascending: false }),
      ])

      setBrands((brandsData as Brand[]) ?? [])
      setAds((adsData as Ad[]) ?? [])
      setLoading(false)
    }

    void load()
  }, [])

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

  const filteredAds = useMemo(
    () => (selectedBrandId ? ads.filter((ad) => ad.brand_id === selectedBrandId) : ads),
    [ads, selectedBrandId],
  )

  const handleFavoriteChange = (adId: number, next: boolean) => {
    setFavorites((prev) =>
      next ? [...prev, adId] : prev.filter((id) => id !== adId),
    )
  }

  return (
    <MainLayout>
      <Header />
      <main className="home-main">
        <section className="hero-section">
          <div className="hero-text">
            <h1 className="hero-title">Площадка для покупки и продажи автомобилей</h1>
            <p className="hero-subtitle">
              AUTONOVA — удобный сервис для поиска, продажи и покупки автомобилей по всей России.
            </p>
          </div>
        </section>

        <section className="brands-section">
          <div className="section-header">
            <h2 className="section-title">Популярные марки</h2>
          </div>
          <div className="brands-grid">
            {brands.map((brand) => (
              <button
                key={brand.id}
                type="button"
                className={`brand-pill-button ${
                  selectedBrandId === brand.id ? 'is-active' : ''
                }`}
                onClick={() => navigate(`/brands/${brand.id}`)}
              >
                {brand.logo_url ? (
                  <img src={brand.logo_url} alt="" className="brand-pill-icon" />
                ) : (
                  <span className="brand-pill-icon brand-pill-icon-empty" aria-hidden="true" />
                )}
                <span className="brand-pill-text">{brand.name}</span>
              </button>
            ))}
            {!brands.length && <div className="brand-empty">Марки пока не добавлены</div>}
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
          ) : filteredAds.length ? (
            <div className="ads-grid">
              {filteredAds.map((ad) => (
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

