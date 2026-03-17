import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../supabaseClient'
import type { Ad, Profile, Region } from '../types'
import { uploadImageToS3 } from '../s3Upload'
import { useNavigate } from 'react-router-dom'
import { FileButtonInput } from '../ui/FileButtonInput'
import simpleAvatar from '../assets/simple.svg'
import { useTranslation } from 'react-i18next'

export function ProfilePage() {
  const { t } = useTranslation()
  const { user, isAdmin, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [regions, setRegions] = useState<Region[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return

    const load = async () => {
      const [{ data: profileData }, { data: regionsData }, { data: adsData }] =
        await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single(),
          supabase.from('regions').select('*').order('name'),
          supabase
            .from('ads')
            .select('*, brand:brands(*), model:models(*), photos:ad_photos(*)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ])

      setProfile(profileData as Profile)
      setRegions((regionsData as Region[]) ?? [])
      setAds((adsData as Ad[]) ?? [])
    }

    void load()
  }, [user])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return
    setSaving(true)

    let avatarUrl = profile.avatar_url
    if (avatarFile) {
      avatarUrl = await uploadImageToS3(avatarFile, 'avatars')
    }

    const { first_name, last_name, phone, region_id } = profile

    await supabase
      .from('profiles')
      .update({
        first_name,
        last_name,
        phone,
        region_id,
        avatar_url: avatarUrl,
      })
      .eq('id', user.id)

    setProfile((prev) =>
      prev ? { ...prev, avatar_url: avatarUrl ?? prev.avatar_url } : prev,
    )
    await refreshProfile()
    setAvatarFile(null)
    setSaving(false)
  }

  const deleteAvatar = async () => {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
    setProfile((prev) => (prev ? { ...prev, avatar_url: null } : prev))
    await refreshProfile()
    setAvatarFile(null)
    setSaving(false)
  }

  if (!user) {
    return (
      <MainLayout>
        <Header />
        <main className="profile-main">
          <section className="profile-card">
            <h1 className="profile-title">{t('profilePage.title')}</h1>
            <p>{t('common.requiredLogin')}</p>
          </section>
        </main>
      </MainLayout>
    )
  }

  if (!profile) {
    return (
      <MainLayout>
        <Header />
        <main className="profile-main">
          <section className="profile-card">
            <h1 className="profile-title">{t('profilePage.title')}</h1>
            <p>{t('profilePage.loadingProfile')}</p>
          </section>
        </main>
      </MainLayout>
    )
  }

  const previewAds = ads.slice(0, 10)

  return (
    <MainLayout>
      <Header />
      <main className="profile-main">
        <div className="profile-grid">
        <section className="profile-card">
          <h1 className="profile-title">{t('profilePage.title')}</h1>
          {isAdmin ? (
            <button
              type="button"
              className="admin-panel-button"
              onClick={() => navigate('/admin/brands')}
              style={{ marginBottom: 12 }}
            >
              {t('profilePage.adminGo')}
            </button>
          ) : null}
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="profile-avatar-row">
              <div className="profile-avatar">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" />
                ) : (
                  <img src={simpleAvatar} alt="" />
                )}
              </div>
              <div className="profile-avatar-actions">
                <FileButtonInput
                  accept="image/*"
                  onFileSelected={setAvatarFile}
                  selectedFileName={avatarFile?.name ?? null}
                  buttonText={t('profilePage.avatarChoose')}
                />
                <button
                  type="button"
                  className="profile-avatar-delete"
                  onClick={() => void deleteAvatar()}
                  disabled={saving}
                >
                  {t('profilePage.avatarDelete')}
                </button>
              </div>
            </div>

            <div className="profile-content">
              <div className="profile-row">
                <span className="label">{t('profilePage.email')}</span>
                <span>{user.email}</span>
              </div>
              <label className="profile-field">
                <span className="label">{t('profilePage.firstName')}</span>
                <input
                  type="text"
                  value={profile.first_name ?? ''}
                  onChange={(e) =>
                    setProfile({ ...profile, first_name: e.target.value })
                  }
                />
              </label>
              <label className="profile-field">
                <span className="label">{t('profilePage.lastName')}</span>
                <input
                  type="text"
                  value={profile.last_name ?? ''}
                  onChange={(e) =>
                    setProfile({ ...profile, last_name: e.target.value })
                  }
                />
              </label>
              <label className="profile-field">
                <span className="label">{t('profilePage.phone')}</span>
                <input
                  type="tel"
                  value={profile.phone ?? ''}
                  onChange={(e) =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                />
              </label>
              <label className="profile-field">
                <span className="label">{t('profilePage.region')}</span>
                <select
                  value={profile.region_id ?? ''}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      region_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                >
                  <option value="">{t('profilePage.regionNone')}</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="primary-button" disabled={saving}>
                {t('common.save')}
              </button>
              <button
                type="button"
                className="profile-logout-button"
                onClick={async () => {
                  await supabase.auth.signOut()
                  navigate('/')
                }}
              >
                {t('profilePage.logout')}
              </button>
            </div>
          </form>
        </section>

        <section className="profile-card">
          <h2 className="profile-title">{t('profilePage.myAdsTitle')}</h2>
          {ads.length ? (
            <ul className="admin-list">
              {previewAds.map((ad) => {
                const firstPhoto =
                  (ad.photos ?? [])
                    .slice()
                    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))[0]
                    ?.url ?? null
                return (
                  <li key={ad.id} className="profile-ad-row">
                    <div className="profile-ad-left">
                      <button
                        type="button"
                        className="profile-ad-thumb"
                        onClick={() => navigate(`/ads/${ad.id}`)}
                        aria-label={`${ad.brand?.name ?? ''} ${ad.model?.name ?? ''}`.trim() || `#${ad.id}`}
                      >
                        {firstPhoto ? <img src={firstPhoto} alt="" /> : <div className="profile-ad-thumb-empty" />}
                      </button>
                      <div className="profile-ad-text">
                        <div className="profile-ad-title">
                          {ad.brand?.name} {ad.model?.name}
                        </div>
                        <div className="profile-ad-price">{ad.price} ₽</div>
                        <button type="button" className="link-button" onClick={() => navigate(`/ads/${ad.id}/edit`)}>
                          {t('profilePage.editAd')}
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div>
              <p>{t('profilePage.myAdsEmpty')}</p>
              <button type="button" className="primary-button" onClick={() => navigate('/ads/new')}>
                {t('profilePage.createAd')}
              </button>
            </div>
          )}

          {ads.length > 10 ? (
            <button
              type="button"
              className="secondary-button profile-show-all"
              style={{ marginTop: 12 }}
              onClick={() => navigate('/profile/ads')}
            >
              {t('profilePage.showAllAds')}
            </button>
          ) : (
            null
          )}
        </section>
        </div>
      </main>
    </MainLayout>
  )
}

