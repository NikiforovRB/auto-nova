import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'
import { supabase } from '../supabaseClient'
import type { Ad } from '../types'

dayjs.extend(utc)
dayjs.extend(timezone)

export function AdDetailsPage() {
  const { id } = useParams()
  const [ad, setAd] = useState<Ad | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [showPhone, setShowPhone] = useState(false)

  useEffect(() => {
    if (!id) return
    const adId = Number(id)
    if (Number.isNaN(adId)) return

    const load = async () => {
      const { data, error } = await supabase
        .from('ads')
        .select(
          `
          *,
          brand:brands(*),
          model:models(*),
          photos:ad_photos(*),
          profile:profiles(phone)
        `,
        )
        .eq('id', adId)
        .single()

      if (!error && data) {
        setAd(data as unknown as Ad)
        const ordered =
          (data as any).photos?.sort(
            (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0),
          ) ?? []
        setPhotos(
          ordered.length
            ? ordered.map((p: any) => p.url as string)
            : ['https://via.placeholder.com/800x480?text=AUTONOVA'],
        )
      }
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
        ? dayjs.utc(ad.created_at).tz('Europe/Moscow').format('D MMMM YYYY, HH:mm')
        : '',
    [ad],
  )

  if (!ad) {
    return (
      <MainLayout>
        <Header />
        <main className="ad-details-main">
          <section className="ad-details-card">Загрузка объявления…</section>
        </main>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Header />
      <main className="ad-details-main">
        <section className="ad-details-card">
          <div className="ad-details-gallery">
            <img
              src={photos[activeIndex]}
              alt=""
              className="ad-details-photo"
            />
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
            <div className="ad-details-meta">
              <span>
                {ad.year} • {formattedMileage} км
              </span>
              {ad.city && <span>{ad.city}</span>}
            </div>
            {ad.description && (
              <p className="ad-details-description">{ad.description}</p>
            )}
            <div className="ad-details-contacts">
              <h2>Контакты</h2>
              <button
                type="button"
                className="primary-button"
                onClick={() => setShowPhone(true)}
              >
                {showPhone
                  ? ad.profile?.phone ?? 'Телефон не указан'
                  : 'Показать телефон'}
              </button>
            </div>
            <div className="ad-details-created">
              Объявление размещено: {createdAtMoscow} (МСК)
            </div>
          </div>
        </section>
      </main>
    </MainLayout>
  )
}

