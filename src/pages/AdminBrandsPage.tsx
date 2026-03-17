import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'
import { supabase } from '../supabaseClient'
import type { Brand, Model, ModelGeneration } from '../types'
import { AdminGuard } from '../auth/AdminGuard'
import { uploadImageToS3 } from '../s3Upload'
import { useToast } from '../ui/toast/ToastContext'
import { FileButtonInput } from '../ui/FileButtonInput'
import { AdminTabs } from './admin/AdminTabs'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export function AdminBrandsPage() {
  const { t } = useTranslation()
  const [brands, setBrands] = useState<Brand[]>([])
  const [models, setModels] = useState<Model[]>([])
  const [generations, setGenerations] = useState<ModelGeneration[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const toast = useToast()
  const [editingBrandId, setEditingBrandId] = useState<number | null>(null)
  const [editingBrandName, setEditingBrandName] = useState('')
  const [editingLogoFile, setEditingLogoFile] = useState<File | null>(null)
  const [expandedBrandIds, setExpandedBrandIds] = useState<Record<number, boolean>>({})
  const [expandedModelIds, setExpandedModelIds] = useState<Record<number, boolean>>({})
  const [modelDraftByBrand, setModelDraftByBrand] = useState<
    Record<number, { name: string; file: File | null }>
  >({})
  const [generationDraftByModel, setGenerationDraftByModel] = useState<
    Record<number, { title: string; file: File | null }>
  >({})

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: brandData }, { data: modelData }, { data: genData }] = await Promise.all([
        supabase.from('brands').select('*').order('sort_order', { ascending: true }).order('name'),
        supabase.from('models').select('*').order('brand_id').order('sort_order', { ascending: true }).order('name'),
        supabase
          .from('model_generations')
          .select('*')
          .order('model_id')
          .order('sort_order', { ascending: true })
          .order('title'),
      ])

      setBrands((brandData as Brand[]) ?? [])
      setModels((modelData as Model[]) ?? [])
      setGenerations((genData as ModelGeneration[]) ?? [])
      setLoading(false)
    }
    void load()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    let logoUrl: string | null = null

    if (file) {
      logoUrl = await uploadImageToS3(file, 'brands')
      if (!logoUrl) {
        toast.push({
          variant: 'error',
          title: t('admin.logoUploadFailedTitle'),
          message: t('admin.uploadCheckHint'),
        })
      }
    }

    const { data, error } = await supabase
      .from('brands')
      .insert({ name: name.trim(), logo_url: logoUrl, sort_order: brands.length })
      .select()
      .single()
    setSaving(false)
    if (!error && data) {
      setBrands((prev) => [...prev, data as Brand])
      setName('')
      setFile(null)
      toast.push({ variant: 'success', title: t('admin.brandAdded'), message: (data as Brand).name })
    } else if (error) {
      toast.push({ variant: 'error', title: t('admin.brandAddError'), message: error.message })
    }
  }

  const modelsByBrand = useMemo(() => {
    const map = new Map<number, Model[]>()
    for (const m of models) {
      const arr = map.get(m.brand_id) ?? []
      arr.push(m)
      map.set(m.brand_id, arr)
    }
    return map
  }, [models])

  const generationsByModel = useMemo(() => {
    const map = new Map<number, ModelGeneration[]>()
    for (const g of generations) {
      const arr = map.get(g.model_id) ?? []
      arr.push(g)
      map.set(g.model_id, arr)
    }
    return map
  }, [generations])

  const startEditBrand = (b: Brand) => {
    setEditingBrandId(b.id)
    setEditingBrandName(b.name)
    setEditingLogoFile(null)
  }

  const cancelEditBrand = () => {
    setEditingBrandId(null)
    setEditingBrandName('')
    setEditingLogoFile(null)
  }

  const saveEditBrand = async (brand: Brand) => {
    const nextName = editingBrandName.trim()
    if (!nextName) return

    let nextLogoUrl = brand.logo_url ?? null
    if (editingLogoFile) {
      const uploaded = await uploadImageToS3(editingLogoFile, 'brands')
      if (!uploaded) {
        toast.push({
          variant: 'error',
          title: t('admin.logoUploadFailedTitle'),
          message: t('admin.uploadCheckHint'),
        })
        return
      }
      nextLogoUrl = uploaded
    }

    const { error } = await supabase
      .from('brands')
      .update({ name: nextName, logo_url: nextLogoUrl })
      .eq('id', brand.id)

    if (error) {
      toast.push({ variant: 'error', title: t('admin.saveFailed'), message: error.message })
      return
    }

    setBrands((prev) =>
      prev.map((x) => (x.id === brand.id ? { ...x, name: nextName, logo_url: nextLogoUrl } : x)),
    )
    cancelEditBrand()
    toast.push({ variant: 'success', title: t('admin.brandUpdated'), message: nextName })
  }

  const deleteBrand = async (brand: Brand) => {
    if (!confirm(t('admin.confirmDeleteBrand', { name: brand.name }))) return
    const { error: modelsError } = await supabase.from('models').delete().eq('brand_id', brand.id)
    if (modelsError) {
      toast.push({ variant: 'error', title: t('admin.saveFailed'), message: modelsError.message })
      return
    }
    const { error } = await supabase.from('brands').delete().eq('id', brand.id)
    if (error) {
      toast.push({ variant: 'error', title: t('admin.saveFailed'), message: error.message })
      return
    }
    setModels((prev) => prev.filter((m) => m.brand_id !== brand.id))
    setBrands((prev) => prev.filter((b) => b.id !== brand.id))
    toast.push({ variant: 'success', title: t('admin.brandDeleted'), message: brand.name })
  }

  const persistBrandOrder = async (ordered: Brand[]) => {
    for (let idx = 0; idx < ordered.length; idx += 1) {
      const b = ordered[idx]
      const { error } = await supabase
        .from('brands')
        .update({ sort_order: idx })
        .eq('id', b.id)
      if (error) {
        toast.push({
          variant: 'error',
          title: t('admin.orderSaveFailed'),
          message: error.message,
        })
        break
      }
    }
  }

  const onBrandDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setBrands((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id)
      const newIndex = prev.findIndex((b) => b.id === over.id)
      const next = arrayMove(prev, oldIndex, newIndex)
      void persistBrandOrder(next)
      return next
    })
  }

  const toggleExpand = (brandId: number) => {
    setExpandedBrandIds((prev) => ({ ...prev, [brandId]: !prev[brandId] }))
  }

  const toggleModelExpand = (modelId: number) => {
    setExpandedModelIds((prev) => ({ ...prev, [modelId]: !prev[modelId] }))
  }

  const addModel = async (brand: Brand) => {
    const draft = modelDraftByBrand[brand.id] ?? { name: '', file: null }
    const modelName = draft.name.trim()
    if (!modelName) return

    let imageUrl: string | null = null
    if (draft.file) {
      imageUrl = await uploadImageToS3(draft.file, 'models')
      if (!imageUrl) {
        toast.push({ variant: 'error', title: t('admin.saveFailed'), message: t('admin.uploadCheckHint') })
        return
      }
    }

    const brandModels = modelsByBrand.get(brand.id) ?? []
    const { data, error } = await supabase
      .from('models')
      .insert({ brand_id: brand.id, name: modelName, image_url: imageUrl, sort_order: brandModels.length })
      .select()
      .single()

    if (error || !data) {
      toast.push({ variant: 'error', title: t('admin.brandAddError'), message: error?.message ?? 'Unknown error' })
      return
    }

    setModels((prev) => [...prev, data as Model])
    setModelDraftByBrand((prev) => ({ ...prev, [brand.id]: { name: '', file: null } }))
    toast.push({ variant: 'success', title: t('admin.modelAdded'), message: modelName })
  }

  const persistModelOrder = async (_brandId: number, orderedModels: Model[]) => {
    for (let idx = 0; idx < orderedModels.length; idx += 1) {
      const m = orderedModels[idx]
      const { error } = await supabase
        .from('models')
        .update({ sort_order: idx })
        .eq('id', m.id)
      if (error) {
        toast.push({
          variant: 'error',
          title: t('admin.orderSaveFailedModels'),
          message: error.message,
        })
        break
      }
    }
  }

  const onModelDragEnd = (brandId: number) => (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const brandModels = (modelsByBrand.get(brandId) ?? []).slice()
    const oldIndex = brandModels.findIndex((m) => m.id === active.id)
    const newIndex = brandModels.findIndex((m) => m.id === over.id)
    const nextBrandModels = arrayMove(brandModels, oldIndex, newIndex)
    setModels((prev) => {
      const rest = prev.filter((m) => m.brand_id !== brandId)
      const next = [...rest, ...nextBrandModels]
      void persistModelOrder(brandId, nextBrandModels)
      return next
    })
  }

  const deleteModel = async (m: Model) => {
    if (!confirm(t('admin.confirmDeleteModel', { name: m.name }))) return
    const { error } = await supabase.from('models').delete().eq('id', m.id)
    if (error) {
      toast.push({ variant: 'error', title: t('admin.saveFailed'), message: error.message })
      return
    }
    setModels((prev) => prev.filter((x) => x.id !== m.id))
    toast.push({ variant: 'success', title: t('admin.modelDeleted'), message: m.name })
  }

  const addGeneration = async (model: Model) => {
    const draft = generationDraftByModel[model.id] ?? { title: '', file: null }
    const title = draft.title.trim()
    if (!title) return

    let imageUrl: string | null = null
    if (draft.file) {
      imageUrl = await uploadImageToS3(draft.file, 'models')
      if (!imageUrl) {
        toast.push({ variant: 'error', title: t('admin.saveFailed'), message: t('admin.uploadCheckHint') })
        return
      }
    }

    const existing = generationsByModel.get(model.id) ?? []
    const { data, error } = await supabase
      .from('model_generations')
      .insert({ model_id: model.id, title, image_url: imageUrl, sort_order: existing.length })
      .select()
      .single()

    if (error || !data) {
      toast.push({ variant: 'error', title: t('admin.brandAddError'), message: error?.message ?? 'Unknown error' })
      return
    }

    setGenerations((prev) => [...prev, data as ModelGeneration])
    setGenerationDraftByModel((prev) => ({ ...prev, [model.id]: { title: '', file: null } }))
    toast.push({ variant: 'success', title: t('admin.generationAdded'), message: title })
  }

  const deleteGeneration = async (g: ModelGeneration) => {
    if (!confirm(t('admin.confirmDeleteGeneration', { name: g.title }))) return
    const { error } = await supabase.from('model_generations').delete().eq('id', g.id)
    if (error) {
      toast.push({ variant: 'error', title: t('admin.saveFailed'), message: error.message })
      return
    }
    setGenerations((prev) => prev.filter((x) => x.id !== g.id))
    toast.push({ variant: 'success', title: t('admin.generationDeleted'), message: g.title })
  }

  const persistGenerationOrder = async (_modelId: number, ordered: ModelGeneration[]) => {
    for (let idx = 0; idx < ordered.length; idx += 1) {
      const g = ordered[idx]
      const { error } = await supabase
        .from('model_generations')
        .update({ sort_order: idx })
        .eq('id', g.id)
      if (error) {
        toast.push({
          variant: 'error',
          title: t('admin.orderSaveFailedGenerations'),
          message: error.message,
        })
        break
      }
    }
  }

  const onGenerationDragEnd = (modelId: number) => (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const items = (generationsByModel.get(modelId) ?? []).slice()
    const oldIndex = items.findIndex((g) => g.id === active.id)
    const newIndex = items.findIndex((g) => g.id === over.id)
    const nextItems = arrayMove(items, oldIndex, newIndex)
    setGenerations((prev) => {
      const rest = prev.filter((x) => x.model_id !== modelId)
      const next = [...rest, ...nextItems]
      void persistGenerationOrder(modelId, nextItems)
      return next
    })
  }

  function SortableRow({ id, children }: { id: number; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.65 : 1,
    }
    return (
      <li ref={setNodeRef} style={style} className="admin-edit-row">
        <div className="admin-edit-row-body">{children}</div>
        <button type="button" className="drag-handle" {...attributes} {...listeners} aria-label={t('admin.dragAria')}>
          ⋮⋮
        </button>
      </li>
    )
  }

  return (
    <AdminGuard>
      <MainLayout>
        <Header />
        <main className="admin-main">
          <section className="admin-card">
            <AdminTabs />
            <h1 className="admin-title">{t('admin.brandsTitle')}</h1>
            <form className="admin-inline-form" onSubmit={handleSubmit}>
              <input
                type="text"
                placeholder={t('admin.newBrandPlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <FileButtonInput
                accept="image/*"
                onFileSelected={setFile}
                selectedFileName={file?.name ?? null}
              />
              <button type="submit" className="primary-button" disabled={saving}>
                {t('admin.add')}
              </button>
            </form>
            {loading ? (
              <p>{t('common.loading')}</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onBrandDragEnd}>
                <SortableContext items={brands.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  <ul className="admin-list admin-edit-list">
                    {brands.map((b) => {
                      const isEditing = editingBrandId === b.id
                      const brandModels = modelsByBrand.get(b.id) ?? []
                      const expanded = !!expandedBrandIds[b.id]
                      const draft = modelDraftByBrand[b.id] ?? { name: '', file: null }
                      return (
                        <SortableRow key={b.id} id={b.id}>
                          <div className="admin-brand-row">
                            <div className="admin-brand-main">
                              <div className="admin-thumb">
                                {b.logo_url ? <img src={b.logo_url} alt="" /> : <div className="admin-thumb-empty" />}
                              </div>

                              {isEditing ? (
                                <div className="admin-brand-edit">
                                  <input
                                    type="text"
                                    value={editingBrandName}
                                    onChange={(e) => setEditingBrandName(e.target.value)}
                                  />
                                  <FileButtonInput
                                    accept="image/*"
                                    onFileSelected={setEditingLogoFile}
                                    selectedFileName={editingLogoFile?.name ?? null}
                                    buttonText={t('admin.chooseLogo')}
                                  />
                                  <div className="admin-actions">
                                    <button type="button" className="link-button" onClick={() => void saveEditBrand(b)}>
                                      {t('common.save')}
                                    </button>
                                    <button type="button" className="link-button" onClick={cancelEditBrand}>
                                      {t('common.cancel')}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="admin-brand-title">
                                  <div className="admin-brand-name">{b.name}</div>
                                  <div className="admin-actions">
                                    <button type="button" className="link-button" onClick={() => startEditBrand(b)}>
                                      {t('common.edit')}
                                    </button>
                                    <button type="button" className="link-button" onClick={() => deleteBrand(b)}>
                                      {t('common.delete')}
                                    </button>
                                    <button type="button" className="link-button" onClick={() => toggleExpand(b.id)}>
                                      {expanded ? t('admin.modelsToggleHide') : t('admin.modelsToggle', { count: brandModels.length })}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {expanded ? (
                              <div className="admin-models-block">
                                <div className="admin-models-add">
                                  <input
                                    type="text"
                                    placeholder={t('admin.newModelPlaceholder')}
                                    value={draft.name}
                                    onChange={(e) =>
                                      setModelDraftByBrand((prev) => ({
                                        ...prev,
                                        [b.id]: { ...draft, name: e.target.value },
                                      }))
                                    }
                                  />
                                  <FileButtonInput
                                    accept="image/*"
                                    onFileSelected={(f) =>
                                      setModelDraftByBrand((prev) => ({
                                        ...prev,
                                        [b.id]: { ...draft, file: f },
                                      }))
                                    }
                                    selectedFileName={draft.file?.name ?? null}
                                  />
                                  <button type="button" className="primary-button" onClick={() => void addModel(b)}>
                                    {t('admin.addModel')}
                                  </button>
                                </div>

                                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onModelDragEnd(b.id)}>
                                  <SortableContext items={brandModels.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                                    <ul className="admin-list admin-edit-list admin-models-list">
                                      {brandModels.map((m) => (
                                        <SortableRow key={m.id} id={m.id}>
                                          <div className="admin-model-row">
                                            <div className="admin-thumb">
                                              {m.image_url ? <img src={m.image_url} alt="" /> : <div className="admin-thumb-empty" />}
                                            </div>
                                            <div className="admin-model-name">{m.name}</div>
                                            <div className="admin-actions">
                                              <button type="button" className="link-button" onClick={() => toggleModelExpand(m.id)}>
                                                {expandedModelIds[m.id]
                                                  ? t('admin.generationsToggleHide')
                                                  : t('admin.generationsToggle', { count: (generationsByModel.get(m.id) ?? []).length })}
                                              </button>
                                              <button type="button" className="link-button" onClick={() => deleteModel(m)}>
                                                {t('common.delete')}
                                              </button>
                                            </div>
                                          </div>

                                          {expandedModelIds[m.id] ? (
                                            <div className="admin-generations-block">
                                              <div className="admin-generations-add">
                                                {(() => {
                                                  const gd = generationDraftByModel[m.id] ?? { title: '', file: null }
                                                  return (
                                                    <>
                                                      <input
                                                        type="text"
                                                        placeholder={t('admin.generationTitlePlaceholder')}
                                                        value={gd.title}
                                                        onChange={(e) =>
                                                          setGenerationDraftByModel((prev) => ({
                                                            ...prev,
                                                            [m.id]: { ...gd, title: e.target.value },
                                                          }))
                                                        }
                                                      />
                                                      <FileButtonInput
                                                        accept="image/*"
                                                        onFileSelected={(f) =>
                                                          setGenerationDraftByModel((prev) => ({
                                                            ...prev,
                                                            [m.id]: { ...gd, file: f },
                                                          }))
                                                        }
                                                        selectedFileName={gd.file?.name ?? null}
                                                        buttonText={t('admin.choosePhoto')}
                                                      />
                                                      <button
                                                        type="button"
                                                        className="primary-button"
                                                        onClick={() => void addGeneration(m)}
                                                      >
                                                        {t('admin.addGeneration')}
                                                      </button>
                                                    </>
                                                  )
                                                })()}
                                              </div>

                                              <DndContext
                                                sensors={sensors}
                                                collisionDetection={closestCenter}
                                                onDragEnd={onGenerationDragEnd(m.id)}
                                              >
                                                <SortableContext
                                                  items={(generationsByModel.get(m.id) ?? []).map((g) => g.id)}
                                                  strategy={verticalListSortingStrategy}
                                                >
                                                  <ul className="admin-list admin-edit-list admin-generations-list">
                                                    {(generationsByModel.get(m.id) ?? []).map((g) => (
                                                      <SortableRow key={g.id} id={g.id}>
                                                        <div className="admin-generation-row">
                                                          <div className="admin-thumb">
                                                            {g.image_url ? (
                                                              <img src={g.image_url} alt="" />
                                                            ) : (
                                                              <div className="admin-thumb-empty" />
                                                            )}
                                                          </div>
                                                          <div className="admin-generation-title">{g.title}</div>
                                                          <div className="admin-actions">
                                                            <button
                                                              type="button"
                                                              className="link-button"
                                                              onClick={() => void deleteGeneration(g)}
                                                            >
                                                              {t('common.delete')}
                                                            </button>
                                                          </div>
                                                        </div>
                                                      </SortableRow>
                                                    ))}
                                                  </ul>
                                                </SortableContext>
                                              </DndContext>
                                            </div>
                                          ) : null}
                                        </SortableRow>
                                      ))}
                                    </ul>
                                  </SortableContext>
                                </DndContext>
                              </div>
                            ) : null}
                          </div>
                        </SortableRow>
                      )
                    })}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </section>
        </main>
      </MainLayout>
    </AdminGuard>
  )
}

