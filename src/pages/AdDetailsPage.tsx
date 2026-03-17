import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'
import { supabase } from '../supabaseClient'
import type { Ad } from '../types'
import { useTranslation } from 'react-i18next'

dayjs.extend(utc)
dayjs.extend(timezone)

export function AdDetailsPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const [ad, setAd] = useState<Ad | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [showPhone, setShowPhone] = useState(false)
  const [phone, setPhone] = useState<string | null>(null)
  const [ownerName, setOwnerName] = useState<string | null>(null)
  const [ownerAvatarUrl, setOwnerAvatarUrl] = useState<string | null>(null)
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      setErrorMessage(t('adDetails.invalidId'))
      return
    }
    const adId = Number(id)
    if (Number.isNaN(adId)) {
      setLoading(false)
      setErrorMessage(t('adDetails.invalidId'))
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
              ? t('adDetails.notFound')
              : t('adDetails.loadFailed'),
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
        setErrorMessage(t('adDetails.notFound'))
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
        ? new Intl.NumberFormat(
            i18n.language === 'ru'
              ? 'ru-RU'
              : i18n.language === 'tr'
                ? 'tr-TR'
                : i18n.language === 'sr'
                  ? 'sr-RS'
                  : i18n.language === 'el'
                    ? 'el-GR'
                    : 'en-US',
            {
            style: 'currency',
            currency: i18n.language === 'tr' ? 'TRY' : 'RUB',
            maximumFractionDigits: 0,
          }).format(ad.price)
        : '',
    [ad, i18n.language],
  )

  const formattedMileage = useMemo(
    () =>
      ad
        ? new Intl.NumberFormat(
            i18n.language === 'ru'
              ? 'ru-RU'
              : i18n.language === 'tr'
                ? 'tr-TR'
                : i18n.language === 'sr'
                  ? 'sr-RS'
                  : i18n.language === 'el'
                    ? 'el-GR'
                    : 'en-US',
          ).format(ad.mileage)
        : '',
    [ad, i18n.language],
  )

  const createdAtMoscow = useMemo(
    () =>
      ad
        ? dayjs
            .utc(ad.created_at)
            .tz('Europe/Moscow')
            .locale(i18n.language === 'en' ? 'en' : i18n.language)
            .format('D MMMM YYYY')
        : '',
    [ad, i18n.language],
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
          <section className="ad-details-card">{t('adDetails.loading')}</section>
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
            {errorMessage ?? t('adDetails.notFound')}
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
      const payload = data as { phone?: string | null; name?: string | null; avatarUrl?: string | null } | null
      const loadedPhone = payload?.phone ?? null
      setPhone(loadedPhone)
      setOwnerName(payload?.name ?? null)
      setOwnerAvatarUrl(payload?.avatarUrl ?? null)
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
                aria-label={t('adDetails.openFullscreen')}
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
                {ad.year} • {formattedMileage} {t('units.km')}
              </span>
              {ad.city && <span>{ad.city}</span>}
            </div>
            <div className="ad-details-contacts">
              <h2>{t('adDetails.contacts')}</h2>
              <button
                type="button"
                className="primary-button"
                onClick={onShowPhone}
              >
                {showPhone
                  ? phoneLoading
                    ? t('adDetails.phoneLoading')
                    : phone ?? ad.profile?.phone ?? t('adDetails.phoneNotSet')
                  : t('adDetails.showPhone')}
              </button>
              {showPhone ? (
                <div className="ad-owner">
                  <div className="ad-owner-avatar">
                    {ownerAvatarUrl ? <img src={ownerAvatarUrl} alt="" /> : <div className="ad-owner-avatar-empty" />}
                  </div>
                  <div className="ad-owner-name">{ownerName ?? '—'}</div>
                </div>
              ) : null}
            </div>
            </div>
          </div>

          {ad.description ? (
            <div className="ad-details-description">{ad.description}</div>
          ) : null}
          <div className="ad-details-created">
            {t('adDetails.posted', { date: createdAtMoscow })}
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
              <button type="button" className="lightbox-close" onClick={() => setLightboxOpen(false)} aria-label={t('adDetails.dragLightboxClose')}>
                ✕
              </button>
              {photos.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="lightbox-nav lightbox-prev"
                    onClick={() => setActiveIndex((prev) => (prev - 1 + photos.length) % photos.length)}
                    aria-label={t('adDetails.prevPhoto')}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="lightbox-nav lightbox-next"
                    onClick={() => setActiveIndex((prev) => (prev + 1) % photos.length)}
                    aria-label={t('adDetails.nextPhoto')}
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

