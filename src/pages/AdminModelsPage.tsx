import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'
import { supabase } from '../supabaseClient'
import type { Brand, Model } from '../types'
import { AdminGuard } from '../auth/AdminGuard'
import { uploadImageToS3 } from '../s3Upload'
import { useToast } from '../ui/toast/ToastContext'
import { FileButtonInput } from '../ui/FileButtonInput'

export function AdminModelsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [brandId, setBrandId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const toast = useToast()

  useEffect(() => {
    const load = async () => {
      const [{ data: brandData }, { data: modelData }] = await Promise.all([
        supabase.from('brands').select('*').order('sort_order', { ascending: true }).order('name'),
        supabase.from('models').select('*').order('brand_id').order('sort_order', { ascending: true }).order('name'),
      ])
      const brandsList = (brandData as Brand[]) ?? []
      setBrands(brandsList)
      setModels((modelData as Model[]) ?? [])
      if (!brandId && brandsList[0]) {
        setBrandId(brandsList[0].id)
      }
    }
    void load()
  }, [brandId])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!brandId || !name.trim()) return
    let imageUrl: string | null = null

    if (file) {
      imageUrl = await uploadImageToS3(file, 'models')
      if (!imageUrl) {
        toast.push({
          variant: 'error',
          title: 'Не удалось загрузить фото модели',
          message: 'Проверьте настройки S3 и функцию подписи.',
        })
      }
    }

    const { data, error } = await supabase
      .from('models')
      .insert({ brand_id: brandId, name: name.trim(), image_url: imageUrl })
      .select()
      .single()
    if (!error && data) {
      setModels((prev) => [...prev, data as Model].sort((a, b) => a.name.localeCompare(b.name)))
      setName('')
      setFile(null)
      toast.push({ variant: 'success', title: 'Модель добавлена', message: (data as Model).name })
    } else if (error) {
      toast.push({ variant: 'error', title: 'Ошибка добавления модели', message: error.message })
    }
  }

  const visibleModels = models.filter((m) => (brandId ? m.brand_id === brandId : true))

  return (
    <AdminGuard>
      <MainLayout>
        <Header />
        <main className="admin-main">
          <section className="admin-card">
            <h1 className="admin-title">Модели автомобилей</h1>
            <form className="admin-inline-form" onSubmit={handleSubmit}>
              <select
                value={brandId ?? ''}
                onChange={(e) => setBrandId(Number(e.target.value) || null)}
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Новая модель"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <FileButtonInput
                accept="image/*"
                onFileSelected={setFile}
                selectedFileName={file?.name ?? null}
              />
              <button type="submit" className="primary-button">
                Добавить
              </button>
            </form>
            <ul className="admin-list">
              {visibleModels.map((m) => (
                <li key={m.id}>{m.name}</li>
              ))}
            </ul>
          </section>
        </main>
      </MainLayout>
    </AdminGuard>
  )
}

