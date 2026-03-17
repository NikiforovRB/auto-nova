import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../supabaseClient'
import type { Ad, Brand, Model, ModelGeneration, Region } from '../types'
import { uploadImageToS3 } from '../s3Upload'
import { FileButtonInput } from '../ui/FileButtonInput'
import addIcon from '../assets/add.svg'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type PhotoItem =
  | { id: string; kind: 'existing'; url: string; rotation: number }
  | { id: string; kind: 'new'; file: File; previewUrl: string; rotation: number }

export function EditAdPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const adId = id ? Number(id) : NaN

  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [generations, setGenerations] = useState<ModelGeneration[]>([])
  const [regions, setRegions] = useState<Region[]>([])

  const [brandId, setBrandId] = useState<number | null>(null)
  const [modelId, setModelId] = useState<number | null>(null)
  const [generationId, setGenerationId] = useState<number | null>(null)
  const [regionId, setRegionId] = useState<number | null>(null)
  const [priceDigits, setPriceDigits] = useState('')
  const [year, setYear] = useState('')
  const [mileageDigits, setMileageDigits] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<PhotoItem[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    if (!Number.isFinite(adId)) {
      navigate('/')
      return
    }

    const load = async () => {
      setLoading(true)
      setErrorMessage(null)

      const [{ data: brandsData }, { data: modelsData }, { data: regionsData }, { data: genData }] =
        await Promise.all([
          supabase.from('brands').select('*').order('sort_order', { ascending: true }).order('name'),
          supabase.from('models').select('*').order('brand_id').order('sort_order', { ascending: true }).order('name'),
          supabase.from('regions').select('*').order('sort_order', { ascending: true }).order('name'),
          supabase
            .from('model_generations')
            .select('*')
            .order('model_id')
            .order('sort_order', { ascending: true })
            .order('title'),
        ])

      setBrands((brandsData as Brand[]) ?? [])
      setModels((modelsData as Model[]) ?? [])
      setRegions((regionsData as Region[]) ?? [])
      setGenerations((genData as ModelGeneration[]) ?? [])

      const { data: adData, error: adError } = await supabase
        .from('ads')
        .select('*')
        .eq('id', adId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (adError || !adData) {
        setErrorMessage('Объявление не найдено или недоступно для редактирования.')
        setLoading(false)
        return
      }

      const ad = adData as Ad
      setBrandId(ad.brand_id ?? null)
      setModelId(ad.model_id ?? null)
      setGenerationId(ad.generation_id ?? null)
      setRegionId(ad.region_id ?? null)
      setPriceDigits(String(Math.trunc(Number(ad.price ?? 0))))
      setYear(String(ad.year ?? ''))
      setMileageDigits(String(ad.mileage ?? ''))
      setDescription(ad.description ?? '')

      const { data: photosData } = await supabase
        .from('ad_photos')
        .select('*')
        .eq('ad_id', adId)
        .order('order_index', { ascending: true })

      const existing: PhotoItem[] =
        ((photosData ?? []) as { id: number; url: string }[]).map((p) => ({
          id: `existing-${p.id}`,
          kind: 'existing',
          url: p.url,
          rotation: 0,
        })) ?? []

      setPhotos(existing)
      setLoading(false)
    }

    void load()
  }, [user, navigate, adId])

  const handlePriceChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    setPriceDigits(digits)
  }

  const handleMileageChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    setMileageDigits(digits)
  }

  const formattedPrice = priceDigits === '' ? '' : Number(priceDigits).toLocaleString('ru-RU')
  const formattedMileage = mileageDigits === '' ? '' : Number(mileageDigits).toLocaleString('ru-RU')

  const filteredModels = models.filter((m) => (brandId ? m.brand_id === brandId : true))
  const filteredGenerations = generations.filter((g) => (modelId ? g.model_id === modelId : false))

  const handlePhotosSelected = (files: FileList | null) => {
    if (!files || !files.length) return
    const next: PhotoItem[] = []
    Array.from(files).forEach((file) => {
      const id = `new-${Date.now()}-${file.name}-${Math.random().toString(36).slice(2)}`
      const previewUrl = URL.createObjectURL(file)
      next.push({ id, kind: 'new', file, previewUrl, rotation: 0 })
    })
    setPhotos((prev) => [...prev, ...next])
  }

  const movePhoto = (id: string, direction: -1 | 1) => {
    setPhotos((prev) => {
      const index = prev.findIndex((p) => p.id === id)
      if (index === -1) return prev
      const target = index + direction
      if (target < 0 || target >= prev.length) return prev
      const copy = [...prev]
      const [item] = copy.splice(index, 1)
      copy.splice(target, 0, item)
      return copy
    })
  }

  const rotatePhoto = (id: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p)),
    )
  }

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const found = prev.find((p) => p.id === id)
      if (found?.kind === 'new') URL.revokeObjectURL(found.previewUrl)
      return prev.filter((p) => p.id !== id)
    })
  }

  const onPhotosDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setPhotos((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id)
      const newIndex = prev.findIndex((p) => p.id === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  function SortablePhoto({ id, children }: { id: string; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.7 : 1,
    }
    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        {children}
      </div>
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !Number.isFinite(adId) || !brandId || !modelId || !priceDigits || !year || !mileageDigits) return
    setSaving(true)

    const { error: updError } = await supabase
      .from('ads')
      .update({
        brand_id: brandId,
        model_id: modelId,
        generation_id: generationId,
        region_id: regionId,
        price: Number(priceDigits),
        year: Number(year),
        mileage: Number(mileageDigits),
        description: description || null,
      })
      .eq('id', adId)
      .eq('user_id', user.id)

    if (updError) {
      setSaving(false)
      setErrorMessage(updError.message)
      return
    }

    // Replace photos list according to current order.
    // Existing URLs are kept; new files are uploaded.
    const finalUrls: string[] = []
    for (const p of photos) {
      if (p.kind === 'existing') {
        finalUrls.push(p.url)
      } else {
        const url = await uploadImageToS3(p.file, 'ads')
        if (url) finalUrls.push(url)
      }
    }

    await supabase.from('ad_photos').delete().eq('ad_id', adId)
    if (finalUrls.length) {
      await supabase.from('ad_photos').insert(
        finalUrls.map((url, idx) => ({
          ad_id: adId,
          url,
          order_index: idx,
        })),
      )
    }

    setSaving(false)
    navigate('/profile')
  }

  if (loading) {
    return (
      <MainLayout>
        <Header />
        <main className="profile-main">
          <section className="profile-card create-ad-card">Загрузка…</section>
        </main>
      </MainLayout>
    )
  }

  if (errorMessage) {
    return (
      <MainLayout>
        <Header />
        <main className="profile-main">
          <section className="profile-card create-ad-card">{errorMessage}</section>
        </main>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <Header />
      <main className="profile-main">
        <section className="profile-card create-ad-card">
          <h1 className="profile-title">Редактировать объявление</h1>
          <form className="profile-form create-ad-form" onSubmit={handleSubmit}>
            <div className="create-ad-grid">
              <label className="profile-field">
                <span className="label">Марка</span>
                <select
                  value={brandId ?? ''}
                  onChange={(e) => {
                    const next = e.target.value ? Number(e.target.value) : null
                    setBrandId(next)
                    setModelId(null)
                    setGenerationId(null)
                  }}
                  required
                >
                  <option value="">Выберите марку</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="profile-field">
                <span className="label">Модель</span>
                <select
                  value={modelId ?? ''}
                  onChange={(e) => {
                    const next = e.target.value ? Number(e.target.value) : null
                    setModelId(next)
                    setGenerationId(null)
                  }}
                  required
                >
                  <option value="">Выберите модель</option>
                  {filteredModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>

              {modelId && filteredGenerations.length > 0 && (
                <div className="profile-field">
                  <span className="label">Поколение</span>
                  <div className="generation-grid">
                    {filteredGenerations.map((g) => {
                      const active = generationId === g.id
                      return (
                        <button
                          key={g.id}
                          type="button"
                          className={`generation-card ${active ? 'is-active' : ''}`}
                          onClick={() => setGenerationId((prev) => (prev === g.id ? null : g.id))}
                        >
                          {g.image_url ? (
                            <img src={g.image_url} alt="" className="generation-photo" />
                          ) : (
                            <div className="generation-photo generation-photo-empty" />
                          )}
                          <div className="generation-text">
                            <span className="generation-title">{g.title}</span>
                            {g.subtitle ? <span className="generation-subtitle">{g.subtitle}</span> : null}
                          </div>
                          {active ? <span className="generation-check">✔</span> : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <label className="profile-field">
                <span className="label">Год выпуска</span>
                <input type="number" required value={year} onChange={(e) => setYear(e.target.value)} />
              </label>

              <label className="profile-field">
                <span className="label">Пробег, км</span>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  value={formattedMileage}
                  onChange={(e) => handleMileageChange(e.target.value)}
                />
              </label>

              <label className="profile-field">
                <span className="label">Цена, ₽</span>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  value={formattedPrice}
                  onChange={(e) => handlePriceChange(e.target.value)}
                />
              </label>

              <label className="profile-field">
                <span className="label">Регион</span>
                <select value={regionId ?? ''} onChange={(e) => setRegionId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Не выбран</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="profile-field create-ad-desc">
                <span className="label">Описание</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </label>
            </div>

            <div className="profile-field create-ad-photos-field">
              <span className="label">Фотографии</span>
              <FileButtonInput multiple accept="image/*" onFilesSelected={handlePhotosSelected} />
              {photos.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onPhotosDragEnd}>
                  <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
                    <div className="create-ad-photos-grid">
                      {photos.map((photo, index) => {
                        const src = photo.kind === 'existing' ? photo.url : photo.previewUrl
                        return (
                          <SortablePhoto key={photo.id} id={photo.id}>
                            <div className="create-ad-photo-item">
                        <div className="create-ad-photo-preview-wrapper">
                          <img
                            src={src}
                            alt=""
                            className="create-ad-photo-preview"
                            style={{ transform: `rotate(${photo.rotation}deg)` }}
                          />
                        </div>
                        <div className="create-ad-photo-actions">
                          <button
                            type="button"
                            className="secondary-button create-ad-photo-btn"
                            onClick={() => movePhoto(photo.id, -1)}
                            disabled={index === 0}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="secondary-button create-ad-photo-btn"
                            onClick={() => movePhoto(photo.id, 1)}
                            disabled={index === photos.length - 1}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="secondary-button create-ad-photo-btn"
                            onClick={() => rotatePhoto(photo.id)}
                          >
                            ⟳
                          </button>
                          <button
                            type="button"
                            className="secondary-button create-ad-photo-btn create-ad-photo-delete"
                            onClick={() => removePhoto(photo.id)}
                          >
                            ✕
                          </button>
                        </div>
                            </div>
                          </SortablePhoto>
                        )
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            <button type="submit" className="primary-button create-ad-submit" disabled={saving}>
              <img src={addIcon} alt="" className="create-ad-submit-icon" aria-hidden="true" />
              {saving ? 'Сохраняем…' : 'Сохранить изменения'}
            </button>
          </form>
        </section>
      </main>
    </MainLayout>
  )
}

