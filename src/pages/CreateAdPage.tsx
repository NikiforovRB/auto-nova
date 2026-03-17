import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../supabaseClient'
import type { Brand, Model, ModelGeneration, Region } from '../types'
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

export function CreateAdPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
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
  const [photos, setPhotos] = useState<
    { id: string; file: File; previewUrl: string; rotation: number }[]
  >([])
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    const load = async () => {
      const [{ data: brandsData }, { data: modelsData }, { data: regionsData }, { data: genData }] =
        await Promise.all([
          supabase.from('brands').select('*').order('sort_order', { ascending: true }).order('name'),
          supabase.from('models').select('*').order('brand_id').order('sort_order', { ascending: true }).order('name'),
          supabase.from('regions').select('*').order('name'),
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
    }

    void load()
  }, [user, navigate])

  const handlePriceChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    setPriceDigits(digits)
  }

  const handleMileageChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    setMileageDigits(digits)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !brandId || !modelId || !priceDigits || !year || !mileageDigits) return
    setSaving(true)

    const { data, error } = await supabase
      .from('ads')
      .insert({
        user_id: user.id,
        brand_id: brandId,
        model_id: modelId,
        price: Number(priceDigits),
        year: Number(year),
        mileage: Number(mileageDigits),
        generation_id: generationId,
        region_id: regionId,
        description: description || null,
        status: 'active',
      })
      .select('id')
      .single()

    if (!error && data && photos.length) {
      const adId = data.id as number
      const uploads = photos.map(async (photo, index) => {
        const url = await uploadImageToS3(photo.file, 'ads')
        if (url) {
          await supabase.from('ad_photos').insert({
            ad_id: adId,
            url,
            order_index: index,
          })
        }
      })
      await Promise.all(uploads)
    }

    setSaving(false)
    navigate('/')
  }

  const filteredModels = models.filter((m) =>
    brandId ? m.brand_id === brandId : true,
  )

  const filteredGenerations = generations.filter((g) =>
    modelId ? g.model_id === modelId : false,
  )

  const formattedPrice =
    priceDigits === ''
      ? ''
      : Number(priceDigits).toLocaleString('ru-RU')

  const formattedMileage =
    mileageDigits === ''
      ? ''
      : Number(mileageDigits).toLocaleString('ru-RU')

  const handlePhotosSelected = (files: FileList | null) => {
    if (!files || !files.length) return
    const next: { id: string; file: File; previewUrl: string; rotation: number }[] = []
    Array.from(files).forEach((file) => {
      const id = `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2)}`
      const previewUrl = URL.createObjectURL(file)
      next.push({ id, file, previewUrl, rotation: 0 })
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
      if (found) URL.revokeObjectURL(found.previewUrl)
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

  return (
    <MainLayout>
      <Header />
      <main className="profile-main">
        <section className="profile-card create-ad-card">
          <h1 className="profile-title">Новое объявление</h1>
          <form className="profile-form create-ad-form" onSubmit={handleSubmit}>
            <div className="create-ad-grid">
              <label className="profile-field">
              <span className="label">Марка</span>
              <select
                value={brandId ?? ''}
                onChange={(e) =>
                  setBrandId(e.target.value ? Number(e.target.value) : null)
                }
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
                onChange={(e) =>
                  setModelId(e.target.value ? Number(e.target.value) : null)
                }
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

              <label className="profile-field">
              <span className="label">Год выпуска</span>
              <input
                type="number"
                required
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </label>

              {modelId && filteredGenerations.length > 0 && (
                <div className="profile-field create-ad-generation">
                  <span className="label">Поколение</span>
                  <div className="generation-grid">
                    {filteredGenerations.map((g) => {
                      const active = generationId === g.id
                      return (
                        <button
                          key={g.id}
                          type="button"
                          className={`generation-card ${active ? 'is-active' : ''}`}
                          onClick={() =>
                            setGenerationId((prev) => (prev === g.id ? null : g.id))
                          }
                        >
                          {g.image_url ? (
                            <img src={g.image_url} alt="" className="generation-photo" />
                          ) : (
                            <div className="generation-photo generation-photo-empty" />
                          )}
                          <div className="generation-text">
                            <span className="generation-title">{g.title}</span>
                            {g.subtitle ? (
                              <span className="generation-subtitle">{g.subtitle}</span>
                            ) : null}
                          </div>
                          {active ? <span className="generation-check">✔</span> : null}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

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
              <select
                value={regionId ?? ''}
                onChange={(e) =>
                  setRegionId(e.target.value ? Number(e.target.value) : null)
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

              <label className="profile-field create-ad-desc">
              <span className="label">Описание</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
              </label>
            </div>

            <div className="profile-field create-ad-photos-field">
              <span className="label">Фотографии</span>
              <FileButtonInput
                multiple
                accept="image/*"
                onFilesSelected={handlePhotosSelected}
              />
              {photos.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onPhotosDragEnd}>
                  <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
                    <div className="create-ad-photos-grid">
                      {photos.map((photo, index) => (
                        <SortablePhoto key={photo.id} id={photo.id}>
                          <div className="create-ad-photo-item">
                      <div className="create-ad-photo-preview-wrapper">
                        <img
                          src={photo.previewUrl}
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
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            <button type="submit" className="primary-button create-ad-submit" disabled={saving}>
              <img src={addIcon} alt="" className="create-ad-submit-icon" aria-hidden="true" />
              {saving ? 'Сохраняем…' : 'Разместить объявление'}
            </button>
          </form>
        </section>
      </main>
    </MainLayout>
  )
}

