import { useEffect, useState } from 'react'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'
import { supabase } from '../supabaseClient'
import { AdminGuard } from '../auth/AdminGuard'
import { useToast } from '../ui/toast/ToastContext'
import { AdminTabs } from './admin/AdminTabs'
import { useTranslation } from 'react-i18next'

export function AdminDocsPage() {
  const { t } = useTranslation()
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
          title: t('admin.loadDocsError'),
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
      toast.push({ variant: 'error', title: t('admin.saveFailed'), message: error.message })
    } else {
      toast.push({ variant: 'success', title: t('admin.docsSaved'), message: t('admin.changesApplied') })
    }
  }

  return (
    <AdminGuard>
      <MainLayout>
        <Header />
        <main className="admin-main">
          <section className="admin-card">
            <AdminTabs />
            <h1 className="admin-title">{t('admin.docsTitle')}</h1>
            {loading ? (
              <p>{t('common.loading')}</p>
            ) : (
              <div className="admin-docs">
                <label className="profile-field">
                  <span className="label">{t('docs.privacyTitle')}</span>
                  <textarea
                    value={privacy}
                    onChange={(e) => setPrivacy(e.target.value)}
                    rows={10}
                  />
                </label>
                <label className="profile-field">
                  <span className="label">{t('docs.personalDataTitle')}</span>
                  <textarea
                    value={personalData}
                    onChange={(e) => setPersonalData(e.target.value)}
                    rows={10}
                  />
                </label>
                <button type="button" className="primary-button" onClick={() => void save()} disabled={saving}>
                  {saving ? t('createAd.saving') : t('common.save')}
                </button>
              </div>
            )}
          </section>
        </main>
      </MainLayout>
    </AdminGuard>
  )
}

