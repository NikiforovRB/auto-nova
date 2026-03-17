import type { MouseEvent } from 'react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Ad } from '../types'
import { useAuth } from '../auth/AuthContext'
import { useFavorites } from '../favorites/FavoritesContext'
import likeIcon from '../assets/like.svg'
import likeHoverIcon from '../assets/like-nav.svg'
import likeActiveIcon from '../assets/like-active.svg'
import likeActiveHoverIcon from '../assets/like-active-nav.svg'
import { useTranslation } from 'react-i18next'

interface AdCardProps {
  ad: Ad
}

export function AdCard({ ad }: AdCardProps) {
  const { t, i18n } = useTranslation()
  const [hoverIndex, setHoverIndex] = useState(0)
  const [updatingFav, setUpdatingFav] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isFavorite, setFavorite } = useFavorites()
  const favActive = isFavorite(ad.id)

  const photos = useMemo(
    () => {
      if (!ad.photos || ad.photos.length === 0) return null
      return ad.photos
        .slice()
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .slice(0, 12)
    },
    [ad.photos],
  )

  const activePhotoUrl =
    photos?.[hoverIndex]?.url ??
    'https://via.placeholder.com/400x260?text=AUTONOVA' // заглушка

  const formattedPrice = useMemo(
    () =>
      new Intl.NumberFormat(
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
      },
      ).format(ad.price),
    [ad.price, i18n.language],
  )

  const formattedMileage = useMemo(
    () =>
      new Intl.NumberFormat(
        i18n.language === 'ru'
          ? 'ru-RU'
          : i18n.language === 'tr'
            ? 'tr-TR'
            : i18n.language === 'sr'
              ? 'sr-RS'
              : i18n.language === 'el'
                ? 'el-GR'
                : 'en-US',
      ).format(ad.mileage),
    [ad.mileage, i18n.language],
  )

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!photos || photos.length <= 1) return
    const rect = e.currentTarget.getBoundingClientRect()
    const relativeX = e.clientX - rect.left
    const zoneWidth = rect.width / photos.length
    const index = Math.min(
      photos.length - 1,
      Math.max(0, Math.floor(relativeX / zoneWidth)),
    )
    setHoverIndex(index)
  }

  const handleCardClick = () => {
    navigate(`/ads/${ad.id}`)
  }

  const handleFavoriteClick = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (!user) {
      navigate('/login')
      return
    }
    if (updatingFav) return

    const next = !favActive
    setUpdatingFav(true)
    await setFavorite(ad.id, next)
    setUpdatingFav(false)
  }

  return (
    <article className="ad-card" onClick={handleCardClick}>
      <div
        className="ad-photo-wrapper"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(0)}
      >
        <img src={activePhotoUrl} alt="" className="ad-photo" />
        <button
          type="button"
          className={`ad-fav-button ${favActive ? 'is-active' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={favActive ? t('adCard.removeFav') : t('adCard.addFav')}
        >
          <img
            src={favActive ? likeActiveIcon : likeIcon}
            alt=""
            className="ad-fav-icon"
            aria-hidden="true"
          />
          {!favActive ? (
            <img
              src={likeHoverIcon}
              alt=""
              className="ad-fav-icon ad-fav-icon-hover"
              aria-hidden="true"
            />
          ) : (
            <img
              src={likeActiveHoverIcon}
              alt=""
              className="ad-fav-icon ad-fav-icon-hover"
              aria-hidden="true"
            />
          )}
        </button>
        {photos && photos.length > 1 && (
          <div className="ad-photo-dots">
            {photos.map((p, idx) => (
              <span
                key={p.id}
                className={`dot ${idx === hoverIndex ? 'is-active' : ''}`}
              />
            ))}
          </div>
        )}
      </div>
      <div className="ad-body">
        <div className="ad-title">
          {ad.brand?.name} {ad.model?.name}
        </div>
        <div className="ad-price">{formattedPrice}</div>
        <div className="ad-meta">
          {ad.year} • {formattedMileage} {t('units.km')}
        </div>
      </div>
    </article>
  )
}

