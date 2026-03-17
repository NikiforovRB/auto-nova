import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../supabaseClient'
import { useFavorites } from '../favorites/FavoritesContext'
import logoImg from '../assets/logo1.png'
import heartIcon from '../assets/heart.svg'
import geoIcon from '../assets/geo.svg'
import addBlueIcon from '../assets/add-blue.svg'
import simpleAvatar from '../assets/simple.svg'
import type { Region } from '../types'

type SearchPreviewItem = {
  id: number
  price: number
  brand?: { name: string } | null
  model?: { name: string } | null
  photos?: { url: string; order_index: number | null }[] | null
}

export function Header() {
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchItems, setSearchItems] = useState<SearchPreviewItem[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [regionId, setRegionId] = useState<number | null>(() => {
    const raw = localStorage.getItem('autonova_region_id')
    return raw ? Number(raw) || null : null
  })
  const { user, isAdmin, profile } = useAuth()
  const { favoritesCount } = useFavorites()
  const navigate = useNavigate()
  const searchWrapRef = useRef<HTMLDivElement | null>(null)

  const handleCreateAd = () => {
    if (!user) {
      navigate('/login')
      return
    }
    navigate('/ads/new')
  }

  const normalizedQuery = useMemo(() => query.trim().toLowerCase(), [query])

  useEffect(() => {
    const loadRegions = async () => {
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name')
      if (!error) {
        const list = (data as Region[]) ?? []
        setRegions(list)
        if (!regionId && list[0]) {
          setRegionId(list[0].id)
        }
      }
    }
    void loadRegions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (regionId) localStorage.setItem('autonova_region_id', String(regionId))
  }, [regionId])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const el = searchWrapRef.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) {
        setSearchOpen(false)
        if (query.trim()) {
          setQuery('')
          setSearchItems([])
          setSearchLoading(false)
        }
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [query])

  useEffect(() => {
    if (normalizedQuery.length < 3) {
      setSearchItems([])
      setSearchOpen(false)
      setSearchLoading(false)
      return
    }

    const timer = window.setTimeout(() => {
      const load = async () => {
        setSearchLoading(true)
        try {
          // Use neutral view name to avoid adblockers; fallback to ads if view is missing.
          const baseSelect = `
            id,
            price,
            brand:brands(name),
            model:models(name),
            photos:ad_photos(url, order_index)
          `

          const run = async (table: 'listings' | 'ads') =>
            supabase
              .from(table)
              .select(baseSelect)
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(80)

          let { data, error } = await run('listings')
          if (error) {
            ;({ data, error } = await run('ads'))
          }
          if (error) {
            console.error('Search failed', error)
            setSearchItems([])
            setSearchOpen(true)
            return
          }

          const rows = (data as unknown as SearchPreviewItem[]) ?? []
          const filtered = rows
            .map((x) => {
              const title = `${x.brand?.name ?? ''} ${x.model?.name ?? ''}`.trim()
              return { ...x, _title: title }
            })
            .filter((x) => x._title.toLowerCase().includes(normalizedQuery))
            .slice(0, 5)
            .map(({ _title, ...rest }) => rest)

          setSearchItems(filtered)
          setSearchOpen(true)
        } finally {
          setSearchLoading(false)
        }
      }

      void load()
    }, 250)

    return () => window.clearTimeout(timer)
  }, [normalizedQuery])

  return (
    <header className="header-shell">
      <div className="top-bar">
        <div className="top-bar-left">
          <div className="region-select-wrapper">
            <img src={geoIcon} alt="" className="region-icon" aria-hidden="true" />
            <select
              className="region-select"
              value={regionId ?? ''}
              onChange={(e) => setRegionId(e.target.value ? Number(e.target.value) : null)}
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="top-bar-right">
          <button
            type="button"
            className="create-ad-link"
            onClick={handleCreateAd}
          >
            <img src={addBlueIcon} alt="" className="create-ad-link-icon" aria-hidden="true" />
            Разместить объявление
          </button>
        </div>
      </div>

      <div className="site-header">
        <button
          type="button"
          className="logo-button"
          onClick={() => navigate('/')}
          aria-label="На главную AUTONOVA"
        >
          <img src={logoImg} alt="AUTONOVA" className="logo-image" />
        </button>

        <div className="header-actions-top">
          <button
            type="button"
            className="create-ad-link create-ad-link-inline"
            onClick={handleCreateAd}
          >
            <img src={addBlueIcon} alt="" className="create-ad-link-icon" aria-hidden="true" />
            Разместить объявление
          </button>
        </div>

        <div className="search-wrapper" ref={searchWrapRef}>
          <input
            type="search"
            className="search-input"
            placeholder="Поиск по объявлениям"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (normalizedQuery.length >= 3) setSearchOpen(true)
            }}
          />
          {searchOpen && normalizedQuery.length >= 3 && (
            <div className="search-dropdown" role="listbox" aria-label="Результаты поиска">
              {searchLoading ? (
                <div className="search-dropdown-row search-muted">Ищем…</div>
              ) : searchItems.length ? (
                searchItems.map((item) => {
                  const title = `${item.brand?.name ?? ''} ${item.model?.name ?? ''}`.trim()
                  const photoUrl =
                    item.photos
                      ?.slice()
                      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))[0]
                      ?.url ?? 'https://via.placeholder.com/120x80?text=AUTONOVA'
                  const priceText = new Intl.NumberFormat('ru-RU', {
                    style: 'currency',
                    currency: 'RUB',
                    maximumFractionDigits: 0,
                  }).format(item.price)

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="search-dropdown-item"
                      onClick={() => {
                        setSearchOpen(false)
                        navigate(`/ads/${item.id}`)
                      }}
                    >
                      <img src={photoUrl} alt="" className="search-item-photo" aria-hidden="true" />
                      <div className="search-item-text">
                        <div className="search-item-title">{title || `Объявление #${item.id}`}</div>
                        <div className="search-item-price">{priceText}</div>
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="search-dropdown-row search-muted">Ничего не найдено</div>
              )}
            </div>
          )}
        </div>

        <div className="header-actions-bottom">
          <button
            type="button"
            className="icon-button"
            onClick={() => navigate('/favorites')}
          >
            <img src={heartIcon} alt="" className="icon-heart-img" aria-hidden="true" />
            <span className="icon-label">
              {favoritesCount > 0 ? `Избранное • ${favoritesCount}` : 'Избранное'}
            </span>
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
                <img src={simpleAvatar} alt="" className="avatar-image" />
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

