import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Header } from '../shared/Header'
import { MainLayout } from '../shared/MainLayout'
import { supabase } from '../supabaseClient'
import type { Ad, Brand, Model } from '../types'
import { useAuth } from '../auth/AuthContext'
import { AdCard } from '../components/AdCard'
import { useFavorites } from '../favorites/FavoritesContext'

export function BrandPage() {
  const { id } = useParams()
  const brandId = id ? Number(id) : NaN
  const [brand, setBrand] = useState<Brand | null>(null)
  const [ads, setAds] = useState<Ad[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  useAuth()
  // keep hook to ensure favorites are loaded for header/card
  useFavorites()
  const navigate = useNavigate()

  const [modelId, setModelId] = useState<number | null>(null)
  const [yearMin, setYearMin] = useState('')
  const [yearMax, setYearMax] = useState('')
  const [mileageMin, setMileageMin] = useState('')
  const [mileageMax, setMileageMax] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')

  useEffect(() => {
    if (!Number.isFinite(brandId)) {
      navigate('/')
      return
    }

    const load = async () => {
      setLoading(true)
      const [{ data: brandData }, { data: adsData }, { data: modelsData }] = await Promise.all([
        supabase.from('brands').select('*').eq('id', brandId).single(),
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
          .eq('brand_id', brandId)
          .order('created_at', { ascending: false }),
        supabase
          .from('models')
          .select('*')
          .eq('brand_id', brandId)
          .order('sort_order', { ascending: true })
          .order('name'),
      ])

      setBrand((brandData as Brand) ?? null)
      setAds((adsData as Ad[]) ?? [])
      setModels((modelsData as Model[]) ?? [])
      setLoading(false)
    }

    void load()
  }, [brandId, navigate])

  const title = useMemo(() => (brand?.name ? `Купить ${brand.name}` : 'Купить'), [brand?.name])
  const adsTitle = useMemo(
    () => (brand?.name ? `Объявления по продаже ${brand.name}` : 'Объявления'),
    [brand?.name],
  )

  const filteredAds = useMemo(() => {
    const yMin = yearMin ? Number(yearMin) : null
    const yMax = yearMax ? Number(yearMax) : null
    const mMin = mileageMin ? Number(mileageMin.replace(/\s/g, '')) : null
    const mMax = mileageMax ? Number(mileageMax.replace(/\s/g, '')) : null
    const pMin = priceMin ? Number(priceMin.replace(/\s/g, '')) : null
    const pMax = priceMax ? Number(priceMax.replace(/\s/g, '')) : null

    return ads.filter((ad) => {
      if (modelId && ad.model_id !== modelId) return false
      if (yMin != null && ad.year < yMin) return false
      if (yMax != null && ad.year > yMax) return false
      if (mMin != null && ad.mileage < mMin) return false
      if (mMax != null && ad.mileage > mMax) return false
      if (pMin != null && Number(ad.price) < pMin) return false
      if (pMax != null && Number(ad.price) > pMax) return false
      return true
    })
  }, [ads, modelId, yearMin, yearMax, mileageMin, mileageMax, priceMin, priceMax])

  return (
    <MainLayout>
      <Header />
      <main className="home-main">
        <section className="hero-section">
          <div className="hero-text">
            <h1 className="hero-title">{title}</h1>
            <p className="hero-subtitle">Все активные объявления по выбранной марке.</p>
          </div>
          <div className="brand-filters">
            <label className="brand-filter">
              <span className="label">Модель</span>
              <select value={modelId ?? ''} onChange={(e) => setModelId(e.target.value ? Number(e.target.value) : null)}>
                <option value="">Все</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="brand-filter">
              <span className="label">Год от</span>
              <input inputMode="numeric" value={yearMin} onChange={(e) => setYearMin(e.target.value.replace(/\D/g, ''))} />
            </label>
            <label className="brand-filter">
              <span className="label">Год до</span>
              <input inputMode="numeric" value={yearMax} onChange={(e) => setYearMax(e.target.value.replace(/\D/g, ''))} />
            </label>
            <label className="brand-filter">
              <span className="label">Пробег от</span>
              <input inputMode="numeric" value={mileageMin} onChange={(e) => setMileageMin(e.target.value)} />
            </label>
            <label className="brand-filter">
              <span className="label">Пробег до</span>
              <input inputMode="numeric" value={mileageMax} onChange={(e) => setMileageMax(e.target.value)} />
            </label>
            <label className="brand-filter">
              <span className="label">Цена от</span>
              <input inputMode="numeric" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
            </label>
            <label className="brand-filter">
              <span className="label">Цена до</span>
              <input inputMode="numeric" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
            </label>
          </div>
        </section>

        <section className="ads-section">
          <div className="section-header">
            <h2 className="section-title">{adsTitle}</h2>
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
            <div className="ads-empty">Пока нет активных объявлений</div>
          )}
        </section>
      </main>
    </MainLayout>
  )
}

