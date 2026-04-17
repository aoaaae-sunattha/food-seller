'use client'
import { useState, useEffect, useCallback } from 'react'
import { NumberInput } from '@/components/NumberInput'
import { useLanguage } from '@/hooks/useLanguage'
import BulkImportZone from '@/components/stock/BulkImportZone'
import type { Ingredient } from '@/types'
import { 
  Boxes, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Check, 
  AlertTriangle,
  Zap,
  ArrowRight,
  ChevronRight,
  Settings,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

const UNITS = ['kg','g','mg','l','ml','pcs','box','bottle','can','pack','bag','bunch','tray','tbsp','tsp']
const BLANK_ING: Partial<Ingredient> = { nameTh: '', nameFr: '', unit: 'kg', threshold: 1 }

export default function ManageStockPage() {
  const { t } = useLanguage()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [success, setSuccess] = useState(false)
  const [bulkResult, setBulkResult] = useState<{added: number, updated: number, skipped: number} | null>(null)
  const [newIng, setNewIng] = useState<Partial<Ingredient>>(BLANK_ING)

  const [editingQtyId, setEditingQtyId] = useState<string | null>(null)
  const [editQtyValue, setEditQtyValue] = useState<number>(0)
  const [editUnitValue, setEditUnitValue] = useState<string>('kg')

  const [editingIngId, setEditingIngId] = useState<string | null>(null)
  const [editIngForm, setEditIngForm] = useState<Partial<Ingredient>>(BLANK_ING)

  const refreshData = useCallback(() => {
    return Promise.all([
      fetch('/api/sheets/config').then(r => r.json()),
      fetch('/api/sheets/stock').then(r => r.json()),
    ]).then(([config, stock]) => {
      setIngredients(config.ingredients ?? [])
      setQuantities(stock.quantities ?? {})
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  function showSuccess() {
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  async function handleAdd() {
    setSaving(true)
    try {
      const res = await fetch('/api/sheets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newIng, type: 'ingredient' })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setIngredients([...ingredients, { ...newIng, id: data.id } as Ingredient])
        setShowAdd(false)
        setNewIng(BLANK_ING)
        showSuccess()
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleIngUpdate() {
    if (!editingIngId) return
    setSaving(true)
    try {
      const res = await fetch('/api/sheets/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editIngForm, id: editingIngId, type: 'ingredient' })
      })
      if (res.ok) {
        setIngredients(ingredients.map(i => i.id === editingIngId ? { ...i, ...editIngForm } as Ingredient : i))
        setEditingIngId(null)
        showSuccess()
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleIngDelete(ing: Ingredient) {
    if (!confirm(`ลบ "${ing.nameTh}" ออกจากระบบ?`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/sheets/config?id=${ing.id}&type=ingredient`, { method: 'DELETE' })
      if (res.ok) {
        setIngredients(ingredients.filter(i => i.id !== ing.id))
        showSuccess()
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleQtyEdit(ing: Ingredient) {
    const current = quantities[ing.nameTh] ?? 0
    const delta = editQtyValue - current
    const unitChanged = editUnitValue !== ing.unit
    if (delta === 0 && !unitChanged) { setEditingQtyId(null); return }
    setSaving(true)
    try {
      if (unitChanged) {
        await fetch('/api/sheets/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...ing, unit: editUnitValue, type: 'ingredient' })
        })
        setIngredients(ingredients.map(i => i.id === ing.id ? { ...i, unit: editUnitValue } : i))
      }
      
      await fetch('/api/sheets/stock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredient: ing.nameTh, qty: editQtyValue, unit: editUnitValue })
      })
      
      setQuantities({ ...quantities, [ing.nameTh]: editQtyValue })
      setEditingQtyId(null)
      showSuccess()
    } catch (err: any) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 min-h-[60vh]">
      <div className="w-12 h-12 bg-cinnabar/10 rounded-xl flex items-center justify-center text-cinnabar animate-bounce mb-4">
        <Zap size={24} fill="currentColor" />
      </div>
      <p className="text-slate-400 font-semibold tracking-wide animate-pulse">{t.common.loading}</p>
    </div>
  )

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10 pb-40">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-4xl font-bold text-slate-deep tracking-tight">{t.manageStock.title}</h1>
           <p className="text-slate-500 text-base mt-2">Configure and manage your ingredients.</p>
        </div>
        <div className="flex items-center gap-4">
          {(success || bulkResult) && (
            <span className="badge-base badge-success py-2.5 px-4 text-sm animate-in slide-in-from-right-4">
               {bulkResult ? `${bulkResult.added} added, ${bulkResult.updated} updated` : 'Changes Saved!'}
            </span>
          )}
          <button
            onClick={() => setShowAdd(!showAdd)}
            className={cn(
              "btn-primary h-12",
              showAdd ? "bg-slate-200 text-slate-600 shadow-none" : ""
            )}
          >
            {showAdd ? <X size={22} /> : <Plus size={22} />}
            <span className="hidden sm:inline text-base">{showAdd ? t.common.cancel : t.manageStock.add}</span>
          </button>
        </div>
      </div>

      <BulkImportZone 
        ingredients={ingredients} 
        onImportComplete={(added, updated, skipped) => {
          setBulkResult({ added, updated, skipped })
          refreshData()
          setTimeout(() => setBulkResult(null), 5000)
        }}
      />

      {/* Add form */}
      {showAdd && (
        <div className="card-base border-cinnabar/30 shadow-lg shadow-cinnabar/5 animate-in zoom-in-95 duration-300 space-y-8">
          <div className="flex items-center gap-3 text-cinnabar font-bold text-lg mb-2">
             <Plus size={24} /> New Ingredient
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="flex flex-col gap-2.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">{t.manageStock.name} (TH)</label>
              <input
                className="w-full h-14 bg-mist-gray border-none rounded-xl px-5 text-xl font-bold text-slate-deep focus:ring-2 focus:ring-cinnabar/20 outline-none transition-all"
                value={newIng.nameTh}
                onChange={e => setNewIng({ ...newIng, nameTh: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">{t.manageStock.name} (FR)</label>
              <input
                className="w-full h-14 bg-mist-gray border-none rounded-xl px-5 text-xl font-bold text-slate-deep focus:ring-2 focus:ring-cinnabar/20 outline-none transition-all"
                value={newIng.nameFr}
                onChange={e => setNewIng({ ...newIng, nameFr: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">{t.manageStock.unit}</label>
              <select
                className="w-full h-14 bg-mist-gray border-none rounded-xl px-5 text-xl font-bold text-slate-deep focus:ring-2 focus:ring-cinnabar/20 outline-none transition-all appearance-none cursor-pointer"
                value={newIng.unit}
                onChange={e => setNewIng({ ...newIng, unit: e.target.value })}
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">{t.manageStock.threshold}</label>
              <NumberInput
                className="w-full h-14 bg-mist-gray border-none rounded-xl px-5 text-xl font-bold text-slate-deep focus:ring-2 focus:ring-cinnabar/20 outline-none transition-all"
                value={newIng.threshold ?? 0}
                onChange={val => setNewIng({ ...newIng, threshold: val })}
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !newIng.nameTh}
            className="btn-primary w-full h-16 text-lg"
          >
            {saving ? <span className="flex items-center gap-3"><Loader2 size={24} className="animate-spin" /> {t.common.loading}</span> : t.common.save}
          </button>
        </div>
      )}

      {/* Ingredient list */}
      <div className="card-base p-0 overflow-hidden divide-y divide-subtle-border">
        {ingredients.map(ing => {
          const qty = quantities[ing.nameTh] ?? 0
          const isLow = qty <= ing.threshold
          const isEditingQty = editingQtyId === ing.id
          const isEditingIng = editingIngId === ing.id

          return (
            <div key={ing.id}>
              {isEditingIng ? (
                <div className="p-10 bg-amber/5 space-y-8 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="flex flex-col gap-2.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Name (TH)</label>
                      <input
                        className="w-full h-14 bg-white border border-subtle-border rounded-xl px-5 text-lg font-bold text-slate-deep outline-none focus:border-cinnabar"
                        value={editIngForm.nameTh}
                        onChange={e => setEditIngForm({ ...editIngForm, nameTh: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-2.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Name (FR)</label>
                      <input
                        className="w-full h-14 bg-white border border-subtle-border rounded-xl px-5 text-lg font-bold text-slate-deep outline-none focus:border-cinnabar"
                        value={editIngForm.nameFr}
                        onChange={e => setEditIngForm({ ...editIngForm, nameFr: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-10">
                     <div className="flex flex-col gap-2.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                        <select
                          className="w-full h-14 bg-white border border-subtle-border rounded-xl px-5 text-lg font-bold text-slate-deep outline-none cursor-pointer"
                          value={editIngForm.unit}
                          onChange={e => setEditIngForm({ ...editIngForm, unit: e.target.value })}
                        >
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                     </div>
                     <div className="flex flex-col gap-2.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Threshold</label>
                        <NumberInput
                          className="w-full h-14 bg-white border border-subtle-border rounded-xl px-5 text-lg font-bold text-slate-deep outline-none"
                          value={editIngForm.threshold ?? 1}
                          onChange={val => setEditIngForm({ ...editIngForm, threshold: val })}
                        />
                     </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => setEditingIngId(null)} className="btn-secondary flex-1 h-14 text-base">Cancel</button>
                    <button onClick={handleIngUpdate} disabled={saving} className="btn-primary flex-1 h-14 text-base">{saving ? 'Saving...' : 'Update'}</button>
                  </div>
                </div>
              ) : (
                <div className="p-8 flex flex-wrap justify-between items-center gap-6 hover:bg-mist-gray/30 transition-colors group">
                  <div className="flex items-center gap-6 min-w-[240px]">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
                      isLow ? "bg-error-red/10 text-error-red" : "bg-emerald/10 text-emerald"
                    )}>
                      <Boxes size={28} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-deep text-xl">{ing.nameTh}</p>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">{ing.nameFr} · {ing.unit}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-10">
                     <div className="text-right">
                        {isEditingQty ? (
                          <div className="flex items-center gap-3 animate-in slide-in-from-right-2">
                            <NumberInput
                              className="w-28 h-12 border border-cinnabar/30 rounded-xl px-4 text-right font-bold text-slate-deep bg-white text-lg"
                              value={editQtyValue}
                              onChange={val => setEditQtyValue(val)}
                            />
                            <button onClick={() => handleQtyEdit(ing)} disabled={saving} className="w-12 h-12 bg-cinnabar text-white rounded-xl flex items-center justify-center active:scale-90"><Check size={22} /></button>
                            <button onClick={() => setEditingQtyId(null)} className="w-12 h-12 bg-mist-gray text-slate-400 rounded-xl flex items-center justify-center active:scale-90"><X size={22} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-6">
                             <div className="text-right hidden sm:block">
                                <div className={cn("font-bold text-2xl", isLow ? "text-error-red" : "text-emerald")}>{qty} {ing.unit}</div>
                                <div className="text-[14px] font-bold text-slate-400 uppercase tracking-tighter">Threshold: {ing.threshold}</div>
                             </div>
                             <button 
                               onClick={() => { setEditingQtyId(ing.id); setEditQtyValue(qty); setEditUnitValue(ing.unit) }}
                               className="w-11 h-11 bg-mist-gray text-slate-400 hover:text-cinnabar hover:bg-cinnabar/5 rounded-xl flex items-center justify-center transition-all"
                             >
                               <Edit2 size={20} />
                             </button>
                          </div>
                        )}
                     </div>

                     <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingIngId(ing.id); setEditIngForm({ nameTh: ing.nameTh, nameFr: ing.nameFr, unit: ing.unit, threshold: ing.threshold }) }}
                          className="w-11 h-11 bg-mist-gray text-slate-400 hover:text-slate-deep rounded-xl flex items-center justify-center transition-all"
                          title="Settings"
                        >
                          <Settings size={20} />
                        </button>
                        <button
                          onClick={() => handleIngDelete(ing)}
                          className="w-11 h-11 bg-mist-gray text-slate-300 hover:text-error-red hover:bg-error-red/10 rounded-xl flex items-center justify-center transition-all"
                          title="Delete"
                        >
                          <Trash2 size={20} />
                        </button>
                     </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
