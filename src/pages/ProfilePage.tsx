import { FormEvent, useEffect, useState } from 'react'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../supabaseClient'
import type { Ad, Profile, Region } from '../types'
import { uploadImageToS3 } from '../s3Upload'
import { useNavigate } from 'react-router-dom'
import { FileButtonInput } from '../ui/FileButtonInput'

export function ProfilePage() {
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
            .select('*, brand:brands(*), model:models(*)')
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

  if (!user) {
    return (
      <MainLayout>
        <Header />
        <main className="profile-main">
          <section className="profile-card">
            <h1 className="profile-title">Мой профиль</h1>
            <p>Необходимо войти в аккаунт.</p>
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
            <h1 className="profile-title">Мой профиль</h1>
            <p>Загрузка…</p>
          </section>
        </main>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Header />
      <main className="profile-main">
        <section className="profile-card">
          <h1 className="profile-title">Мой профиль</h1>
          {isAdmin ? (
            <button
              type="button"
              className="admin-panel-button"
              onClick={() => navigate('/admin/brands')}
              style={{ marginBottom: 12 }}
            >
              Перейти в панель администратора
            </button>
          ) : null}
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="profile-avatar-row">
              <div className="profile-avatar">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" />
                ) : (
                  <div className="avatar-circle-large">
                    {user.email?.[0]?.toUpperCase() ?? 'A'}
                  </div>
                )}
              </div>
              <FileButtonInput
                accept="image/*"
                onFileSelected={setAvatarFile}
                selectedFileName={avatarFile?.name ?? null}
                buttonText="Выбрать аватар"
              />
            </div>

            <div className="profile-content">
              <div className="profile-row">
                <span className="label">Email</span>
                <span>{user.email}</span>
              </div>
              <label className="profile-field">
                <span className="label">Имя</span>
                <input
                  type="text"
                  value={profile.first_name ?? ''}
                  onChange={(e) =>
                    setProfile({ ...profile, first_name: e.target.value })
                  }
                />
              </label>
              <label className="profile-field">
                <span className="label">Фамилия</span>
                <input
                  type="text"
                  value={profile.last_name ?? ''}
                  onChange={(e) =>
                    setProfile({ ...profile, last_name: e.target.value })
                  }
                />
              </label>
              <label className="profile-field">
                <span className="label">Телефон</span>
                <input
                  type="tel"
                  value={profile.phone ?? ''}
                  onChange={(e) =>
                    setProfile({ ...profile, phone: e.target.value })
                  }
                />
              </label>
              <label className="profile-field">
                <span className="label">Регион</span>
                <select
                  value={profile.region_id ?? ''}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      region_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                >
                  <option value="">Не выбран</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="primary-button" disabled={saving}>
                Сохранить
              </button>
              <button
                type="button"
                className="profile-logout-button"
                onClick={async () => {
                  await supabase.auth.signOut()
                  navigate('/')
                }}
              >
                Выйти
              </button>
            </div>
          </form>
        </section>

        <section className="profile-card">
          <h2 className="profile-title">Мои объявления</h2>
          {ads.length ? (
            <ul className="admin-list">
              {ads.map((ad) => (
                <li key={ad.id}>
                  {ad.brand?.name} {ad.model?.name} — {ad.price} ₽
                </li>
              ))}
            </ul>
          ) : (
            <p>У вас пока нет объявлений.</p>
          )}
        </section>
      </main>
    </MainLayout>
  )
}

