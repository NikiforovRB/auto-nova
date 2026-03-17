import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../shared/Header'
import { MainLayout } from '../shared/MainLayout'
import { supabase } from '../supabaseClient'
import type { Ad, Brand } from '../types'
import { useAuth } from '../auth/AuthContext'
import { AdCard } from '../components/AdCard'
import { useFavorites } from '../favorites/FavoritesContext'
import { useTranslation } from 'react-i18next'

export function HomePage() {
  const { t } = useTranslation()
  const [brands, setBrands] = useState<Brand[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [selectedBrandId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  useAuth()
  // keep hook to ensure favorites are loaded for header/card
  useFavorites()
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const [{ data: brandsData }, { data: adsData }] = await Promise.all([
        supabase.from('brands').select('*').order('sort_order', { ascending: true }).order('name'),
        supabase
          .from('listings')
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

  const filteredAds = useMemo(
    () => (selectedBrandId ? ads.filter((ad) => ad.brand_id === selectedBrandId) : ads),
    [ads, selectedBrandId],
  )

  return (
    <MainLayout>
      <Header />
      <main className="home-main">
        <section className="hero-section">
          <div className="hero-text">
            <h1 className="hero-title">{t('home.heroTitle')}</h1>
            <p className="hero-subtitle">
              {t('home.heroSubtitle')}
            </p>
          </div>
        </section>

        <section className="brands-section">
          <div className="section-header">
            <h2 className="section-title">{t('home.popularBrands')}</h2>
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
            {!brands.length && <div className="brand-empty">{t('home.brandsEmpty')}</div>}
          </div>
        </section>

        <section className="ads-section">
          <div className="section-header">
            <h2 className="section-title">{t('home.ads')}</h2>
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
                />
              ))}
            </div>
          ) : (
            <div className="ads-empty">{t('home.adsEmpty')}</div>
          )}
        </section>
      </main>
    </MainLayout>
  )
}

