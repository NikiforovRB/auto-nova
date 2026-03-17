import { useEffect, useState } from 'react'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'
import { supabase } from '../supabaseClient'
import { useTranslation } from 'react-i18next'

export function PersonalDataPolicyPage() {
  const { t } = useTranslation()
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('site_documents')
        .select('content')
        .eq('key', 'personal_data')
        .maybeSingle()
      if (!error && data?.content != null) setContent(String(data.content))
      setLoading(false)
    }
    void load()
  }, [])

  return (
    <MainLayout>
      <Header />
      <main className="doc-main">
        <section className="doc-card">
          <h1 className="doc-title">{t('docs.personalDataTitle')}</h1>
          {loading ? (
            <p className="doc-muted">{t('common.loading')}</p>
          ) : content.trim() ? (
            <div className="doc-content">{content}</div>
          ) : (
            <p className="doc-muted">
              {t('docs.emptyHint')}
            </p>
          )}
        </section>
      </main>
    </MainLayout>
  )
}

