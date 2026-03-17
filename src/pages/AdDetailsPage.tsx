import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import 'dayjs/locale/ru'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'
import { supabase } from '../supabaseClient'
import type { Ad } from '../types'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.locale('ru')

export function AdDetailsPage() {
  const { id } = useParams()
  const [ad, setAd] = useState<Ad | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [showPhone, setShowPhone] = useState(false)
  const [phone, setPhone] = useState<string | null>(null)
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setErrorMessage('Некорректный идентификатор объявления.')
      return
    }
    const adId = Number(id)
    if (Number.isNaN(adId)) {
      setLoading(false)
      setErrorMessage('Некорректный идентификатор объявления.')
      return
    }

    const load = async () => {
      setLoading(true)
      setErrorMessage(null)
      const { data: adDataWithProfile, error: adErrorWithProfile } = await supabase
        .from('ads')
        .select(
          `
          *,
          brand:brands(*),
          model:models(*),
          region:regions(name),
          profile:profiles(phone)
        `,
        )
        .eq('id', adId)
        .maybeSingle()

      let adRow: unknown | null = null

      if (adErrorWithProfile) {
        console.error('Failed to load ad details with profile', adErrorWithProfile)

        // Если проблема именно с профилем (RLS / права), пробуем без профиля
        const { data: adDataFallback, error: adErrorFallback } = await supabase
          .from('ads')
          .select(
            `
            *,
            brand:brands(*),
            model:models(*),
            region:regions(name)
          `,
          )
          .eq('id', adId)
          .maybeSingle()

        if (adErrorFallback) {
          console.error('Failed to load ad details (fallback)', adErrorFallback)
          setErrorMessage(
            adErrorFallback.code === 'PGRST116'
              ? 'Объявление не найдено или недоступно.'
              : 'Не удалось загрузить объявление. Попробуйте обновить страницу.',
          )
          setAd(null)
          setPhotos(['https://via.placeholder.com/800x480?text=AUTONOVA'])
          setLoading(false)
          return
        }

        adRow = adDataFallback
      } else {
        adRow = adDataWithProfile
      }

      if (!adRow) {
        setErrorMessage('Объявление не найдено или недоступно.')
        setAd(null)
        setPhotos(['https://via.placeholder.com/800x480?text=AUTONOVA'])
        setLoading(false)
        return
      }

      setAd(adRow as Ad)

      const { data: photosData, error: photosError } = await supabase
        .from('ad_photos')
        .select('*')
        .eq('ad_id', adId)
        .order('order_index', { ascending: true })

      if (photosError) {
        console.error('Failed to load ad photos', photosError)
        setPhotos(['https://via.placeholder.com/800x480?text=AUTONOVA'])
      } else {
        const urls =
          (photosData ?? []).map((p) => (p as { url: string }).url) ??
          []
        setPhotos(
          urls.length
            ? urls
            : ['https://via.placeholder.com/800x480?text=AUTONOVA'],
        )
      }
      setLoading(false)
    }

    void load()
  }, [id])

  const formattedPrice = useMemo(
    () =>
      ad
        ? new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            maximumFractionDigits: 0,
          }).format(ad.price)
        : '',
    [ad],
  )

  const formattedMileage = useMemo(
    () =>
      ad ? new Intl.NumberFormat('ru-RU').format(ad.mileage) : '',
    [ad],
  )

  const createdAtMoscow = useMemo(
    () =>
      ad
        ? dayjs.utc(ad.created_at).tz('Europe/Moscow').format('D MMMM YYYY')
        : '',
    [ad],
  )

  useEffect(() => {
    if (!lightboxOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowLeft') setActiveIndex((prev) => (prev - 1 + photos.length) % photos.length)
      if (e.key === 'ArrowRight') setActiveIndex((prev) => (prev + 1) % photos.length)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightboxOpen, photos.length])

  if (loading) {
    return (
      <MainLayout>
        <Header />
        <main className="ad-details-main">
          <section className="ad-details-card">Загрузка объявления…</section>
        </main>
      </MainLayout>
    )
  }

  if (!ad) {
    return (
      <MainLayout>
        <Header />
        <main className="ad-details-main">
          <section className="ad-details-card">
            {errorMessage ?? 'Объявление не найдено.'}
          </section>
        </main>
      </MainLayout>
    )
  }

  const onShowPhone = async () => {
    setShowPhone(true)
    if (phoneLoading) return
    if (phone !== null) return

    setPhoneLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('get-phone', {
        body: { ad_id: ad.id },
      })
      if (error) {
        console.error('Failed to load phone', error)
        setPhone(null)
        return
      }
      const loadedPhone = (data as { phone?: string | null } | null)?.phone ?? null
      setPhone(loadedPhone)
    } catch (e) {
      console.error('Failed to load phone', e)
      setPhone(null)
    } finally {
      setPhoneLoading(false)
    }
  }

  return (
    <MainLayout>
      <Header />
      <main className="ad-details-main">
        <section className="ad-details-card">
          <div className="ad-details-top">
            <div className="ad-details-gallery">
              <button
                type="button"
                className="ad-details-photo-button"
                onClick={() => setLightboxOpen(true)}
                aria-label="Открыть фото на весь экран"
              >
                <img
                  src={photos[activeIndex]}
                  alt=""
                  className="ad-details-photo"
                />
              </button>
              {photos.length > 1 && (
                <div className="ad-details-thumbs">
                  {photos.map((url, idx) => (
                    <button
                      key={url}
                      type="button"
                      className={`thumb ${idx === activeIndex ? 'is-active' : ''}`}
                      onClick={() => setActiveIndex(idx)}
                    >
                      <img src={url} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="ad-details-info">
            <h1 className="ad-details-title">
              {ad.brand?.name} {ad.model?.name}
            </h1>
            <div className="ad-details-price">{formattedPrice}</div>
            {ad.region?.name ? <div className="ad-details-region">{ad.region.name}</div> : null}
            <div className="ad-details-meta">
              <span>
                {ad.year} • {formattedMileage} км
              </span>
              {ad.city && <span>{ad.city}</span>}
            </div>
            <div className="ad-details-contacts">
              <h2>Контакты</h2>
              <button
                type="button"
                className="primary-button"
                onClick={onShowPhone}
              >
                {showPhone
                  ? phoneLoading
                    ? 'Загрузка…'
                    : phone ?? ad.profile?.phone ?? 'Телефон не указан'
                  : 'Показать телефон'}
              </button>
            </div>
            </div>
          </div>

          {ad.description ? (
            <div className="ad-details-description">{ad.description}</div>
          ) : null}
          <div className="ad-details-created">
            Объявление размещено: {createdAtMoscow}
          </div>
        </section>

        {lightboxOpen ? (
          <div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            onClick={() => setLightboxOpen(false)}
          >
            <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="lightbox-close" onClick={() => setLightboxOpen(false)} aria-label="Закрыть">
                ✕
              </button>
              {photos.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="lightbox-nav lightbox-prev"
                    onClick={() => setActiveIndex((prev) => (prev - 1 + photos.length) % photos.length)}
                    aria-label="Предыдущее фото"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="lightbox-nav lightbox-next"
                    onClick={() => setActiveIndex((prev) => (prev + 1) % photos.length)}
                    aria-label="Следующее фото"
                  >
                    ›
                  </button>
                </>
              ) : null}
              <img src={photos[activeIndex]} alt="" className="lightbox-photo" />
            </div>
          </div>
        ) : null}
      </main>
    </MainLayout>
  )
}

