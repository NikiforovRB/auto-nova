import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import logoImg from '../assets/logo1.png'
import heartIcon from '../assets/heart.svg'
import geoIcon from '../assets/geo.svg'

export function Header() {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState('moscow')
  const { user, isAdmin, profile } = useAuth()
  const navigate = useNavigate()

  const handleCreateAd = () => {
    if (!user) {
      navigate('/login')
      return
    }
    navigate('/ads/new')
  }

  return (
    <header className="header-shell">
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="region-select-wrapper">
            <img src={geoIcon} alt="" className="region-icon" aria-hidden="true" />
            <select
              className="region-select"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="moscow">Москва</option>
              <option value="moscow-region">Московская область</option>
              <option value="spb">Санкт-Петербург</option>
              <option value="krasnodar">Краснодарский край</option>
              <option value="ekb">Свердловская область</option>
            </select>
          </div>
        </div>
        <div className="top-bar-right">
          <button
            type="button"
            className="primary-button create-ad-button"
            onClick={handleCreateAd}
          >
            Разместить объявление
          </button>
        </div>
      </div>

      <div className="site-header">
        <div className="header-left">
          <button
            type="button"
            className="logo-button"
            onClick={() => navigate('/')}
            aria-label="На главную AUTONOVA"
          >
            <img src={logoImg} alt="AUTONOVA" className="logo-image" />
          </button>
          <div className="search-wrapper">
            <input
              type="search"
              className="search-input"
              placeholder="Поиск по объявлениям"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="header-right">
          <button type="button" className="icon-button">
            <img src={heartIcon} alt="" className="icon-heart-img" aria-hidden="true" />
            <span className="icon-label">Избранное</span>
          </button>

          <button
            type="button"
            className="profile-button"
            onClick={() => navigate(user ? '/profile' : '/login')}
          >
            <span className="avatar-circle">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="avatar-image" />
              ) : (
                user?.email?.[0]?.toUpperCase() ?? 'A'
              )}
            </span>
            <span className="profile-label">
              {user ? (
                <>
                  <span>Мой профиль</span>
                  {isAdmin ? <span className="profile-subtitle">Администратор</span> : null}
                </>
              ) : (
                'Войти'
              )}
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}

