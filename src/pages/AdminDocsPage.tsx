import { useEffect, useState } from 'react'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'
import { supabase } from '../supabaseClient'
import { AdminGuard } from '../auth/AdminGuard'
import { useToast } from '../ui/toast/ToastContext'
import { AdminTabs } from './admin/AdminTabs'

export function AdminDocsPage() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [privacy, setPrivacy] = useState('')
  const [personalData, setPersonalData] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: pData, error: pErr }, { data: dData, error: dErr }] = await Promise.all([
        supabase.from('site_documents').select('content').eq('key', 'privacy').maybeSingle(),
        supabase.from('site_documents').select('content').eq('key', 'personal_data').maybeSingle(),
      ])
      if (pErr || dErr) {
        toast.push({
          variant: 'error',
          title: 'Не удалось загрузить документы',
          message: (pErr ?? dErr)?.message ?? 'Unknown error',
        })
      }
      setPrivacy((pData?.content as string) ?? '')
      setPersonalData((dData?.content as string) ?? '')
      setLoading(false)
    }
    void load()
  }, [])

  const save = async () => {
    setSaving(true)
    const updates = [
      { key: 'privacy' as const, content: privacy, updated_at: new Date().toISOString() },
      { key: 'personal_data' as const, content: personalData, updated_at: new Date().toISOString() },
    ]
    const { error } = await supabase.from('site_documents').upsert(updates, { onConflict: 'key' })
    setSaving(false)
    if (error) {
      toast.push({ variant: 'error', title: 'Не удалось сохранить', message: error.message })
    } else {
      toast.push({ variant: 'success', title: 'Документы сохранены', message: 'Изменения применены.' })
    }
  }

  return (
    <AdminGuard>
      <MainLayout>
        <Header />
        <main className="admin-main">
          <section className="admin-card">
            <AdminTabs />
            <h1 className="admin-title">Документы</h1>
            {loading ? (
              <p>Загрузка…</p>
            ) : (
              <div className="admin-docs">
                <label className="profile-field">
                  <span className="label">Политика конфиденциальности</span>
                  <textarea
                    value={privacy}
                    onChange={(e) => setPrivacy(e.target.value)}
                    rows={10}
                  />
                </label>
                <label className="profile-field">
                  <span className="label">Политика обработки персональных данных</span>
                  <textarea
                    value={personalData}
                    onChange={(e) => setPersonalData(e.target.value)}
                    rows={10}
                  />
                </label>
                <button type="button" className="primary-button" onClick={() => void save()} disabled={saving}>
                  {saving ? 'Сохраняем…' : 'Сохранить'}
                </button>
              </div>
            )}
          </section>
        </main>
      </MainLayout>
    </AdminGuard>
  )
}

