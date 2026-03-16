import type { MouseEvent } from 'react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Ad } from '../types'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../supabaseClient'

interface AdCardProps {
  ad: Ad
  isFavorite: boolean
  onFavoriteChange: (adId: number, next: boolean) => void
}

export function AdCard({ ad, isFavorite, onFavoriteChange }: AdCardProps) {
  const [hoverIndex, setHoverIndex] = useState(0)
  const [updatingFav, setUpdatingFav] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  const photos = useMemo(
    () => (ad.photos && ad.photos.length > 0 ? ad.photos : null),
    [ad.photos],
  )

  const activePhotoUrl =
    photos?.[hoverIndex]?.url ??
    'https://via.placeholder.com/400x260?text=AUTONOVA' // заглушка

  const formattedPrice = useMemo(
    () =>
      new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0,
      }).format(ad.price),
    [ad.price],
  )

  const formattedMileage = useMemo(
    () => new Intl.NumberFormat('ru-RU').format(ad.mileage),
    [ad.mileage],
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

    const next = !isFavorite
    onFavoriteChange(ad.id, next)
    setUpdatingFav(true)

    if (next) {
      await supabase.from('favorites').insert({
        user_id: user.id,
        ad_id: ad.id,
      })
    } else {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('ad_id', ad.id)
    }

    setUpdatingFav(false)
  }

  return (
    <article className="ad-card" onClick={handleCardClick}>
      <div className="ad-photo-wrapper" onMouseMove={handleMouseMove}>
        <img src={activePhotoUrl} alt="" className="ad-photo" />
        <button
          type="button"
          className={`ad-fav-button ${isFavorite ? 'is-active' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
        >
          <span className="ad-fav-heart" />
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
        <div className="ad-price">{formattedPrice}</div>
        <div className="ad-title">
          {ad.brand?.name} {ad.model?.name}
        </div>
        <div className="ad-meta">
          {ad.year} • {formattedMileage} км
        </div>
      </div>
    </article>
  )
}

