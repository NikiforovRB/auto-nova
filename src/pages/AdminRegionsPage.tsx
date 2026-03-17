import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { MainLayout } from '../shared/MainLayout'
import { Header } from '../shared/Header'
import { supabase } from '../supabaseClient'
import type { Region } from '../types'
import { AdminGuard } from '../auth/AdminGuard'
import { useToast } from '../ui/toast/ToastContext'
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
import { AdminTabs } from './admin/AdminTabs'
import { useTranslation } from 'react-i18next'

export function AdminRegionsPage() {
  const { t } = useTranslation()
  const [regions, setRegions] = useState<Region[]>([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('regions')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name')
      if (!error) setRegions((data as Region[]) ?? [])
      setLoading(false)
    }
    void load()
  }, [])

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    const nextName = name.trim()
    if (!nextName) return
    const { data, error } = await supabase
      .from('regions')
      .insert({ name: nextName, sort_order: regions.length })
      .select()
      .single()
    if (error || !data) {
      toast.push({ variant: 'error', title: t('admin.regionAddError'), message: error?.message ?? 'Unknown error' })
      return
    }
    setRegions((prev) => [...prev, data as Region])
    setName('')
    toast.push({ variant: 'success', title: t('admin.regionAdded'), message: nextName })
  }

  const startEdit = (r: Region) => {
    setEditingId(r.id)
    setEditingName(r.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const saveEdit = async (r: Region) => {
    const nextName = editingName.trim()
    if (!nextName) return
    const { error } = await supabase.from('regions').update({ name: nextName }).eq('id', r.id)
    if (error) {
      toast.push({ variant: 'error', title: t('admin.saveFailed'), message: error.message })
      return
    }
    setRegions((prev) => prev.map((x) => (x.id === r.id ? { ...x, name: nextName } : x)))
    cancelEdit()
    toast.push({ variant: 'success', title: t('admin.regionSaved'), message: nextName })
  }

  const deleteRegion = async (r: Region) => {
    if (!confirm(t('admin.confirmDeleteRegion', { name: r.name }))) return
    const { error } = await supabase.from('regions').delete().eq('id', r.id)
    if (error) {
      toast.push({ variant: 'error', title: t('admin.saveFailed'), message: error.message })
      return
    }
    setRegions((prev) => prev.filter((x) => x.id !== r.id))
    toast.push({ variant: 'success', title: t('admin.regionDeleted'), message: r.name })
  }

  const persistOrder = async (ordered: Region[]) => {
    for (let i = 0; i < ordered.length; i += 1) {
      const r = ordered[i]
      const { error } = await supabase.from('regions').update({ sort_order: i }).eq('id', r.id)
      if (error) {
        toast.push({ variant: 'error', title: t('admin.orderSaveFailed'), message: error.message })
        break
      }
    }
  }

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setRegions((prev) => {
      const oldIndex = prev.findIndex((r) => r.id === active.id)
      const newIndex = prev.findIndex((r) => r.id === over.id)
      const next = arrayMove(prev, oldIndex, newIndex)
      void persistOrder(next)
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
            <h1 className="admin-title">{t('admin.regionsTitle')}</h1>
            <form className="admin-inline-form" onSubmit={handleAdd}>
              <input
                type="text"
                placeholder={t('admin.newRegionPlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button type="submit" className="primary-button">
                {t('admin.add')}
              </button>
            </form>

            {loading ? (
              <p>{t('common.loading')}</p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={regions.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                  <ul className="admin-list admin-edit-list">
                    {regions.map((r) => {
                      const isEditing = editingId === r.id
                      return (
                        <SortableRow key={r.id} id={r.id}>
                          <div className="admin-brand-row">
                            <div className="admin-brand-main">
                              {isEditing ? (
                                <div className="admin-brand-edit">
                                  <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                  />
                                  <div className="admin-actions">
                                    <button type="button" className="link-button" onClick={() => void saveEdit(r)}>
                                      {t('common.save')}
                                    </button>
                                    <button type="button" className="link-button" onClick={cancelEdit}>
                                      {t('common.cancel')}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="admin-brand-title">
                                  <div className="admin-brand-name">{r.name}</div>
                                  <div className="admin-actions">
                                    <button type="button" className="link-button" onClick={() => startEdit(r)}>
                                      {t('common.edit')}
                                    </button>
                                    <button type="button" className="link-button" onClick={() => deleteRegion(r)}>
                                      {t('common.delete')}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
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

