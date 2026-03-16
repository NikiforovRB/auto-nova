import { useEffect, useState } from 'react'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'
import { supabase } from '../supabaseClient'
import type { Ad } from '../types'
import { AdminGuard } from '../auth/AdminGuard'

export function AdminAdsPage() {
  const [ads, setAds] = useState<Ad[]>([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('ads')
        .select('*, brand:brands(name), model:models(name)')
        .order('created_at', { ascending: false })
      setAds((data as Ad[]) ?? [])
    }
    void load()
  }, [])

  const updateStatus = async (id: number, status: string) => {
    await supabase.from('ads').update({ status }).eq('id', id)
    setAds((prev) => prev.map((ad) => (ad.id === id ? { ...ad, status } : ad)))
  }

  return (
    <AdminGuard>
      <MainLayout>
        <Header />
        <main className="admin-main">
          <section className="admin-card">
            <h1 className="admin-title">Объявления</h1>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Марка/модель</th>
                  <th>Статус</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => (
                  <tr key={ad.id}>
                    <td>{ad.id}</td>
                    <td>
                      {ad.brand?.name} {ad.model?.name}
                    </td>
                    <td>{ad.status}</td>
                    <td>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => updateStatus(ad.id, 'active')}
                      >
                        Опубликовать
                      </button>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => updateStatus(ad.id, 'hidden')}
                      >
                        Скрыть
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </main>
      </MainLayout>
    </AdminGuard>
  )
}

