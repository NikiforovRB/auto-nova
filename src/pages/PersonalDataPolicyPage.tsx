import { useEffect, useState } from 'react'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'
import { supabase } from '../supabaseClient'

export function PersonalDataPolicyPage() {
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
          <h1 className="doc-title">Политика обработки персональных данных</h1>
          {loading ? (
            <p className="doc-muted">Загрузка…</p>
          ) : content.trim() ? (
            <div className="doc-content">{content}</div>
          ) : (
            <p className="doc-muted">
              Текст документа будет добавлен администратором в разделе «Документы».
            </p>
          )}
        </section>
      </main>
    </MainLayout>
  )
}

