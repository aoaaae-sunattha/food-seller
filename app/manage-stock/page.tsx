'use client'
import { useState, useEffect, useCallback } from 'react'
import { NumberInput } from '@/components/NumberInput'
import { useLanguage } from '@/hooks/useLanguage'
import BulkImportZone from '@/components/stock/BulkImportZone'
import type { Ingredient } from '@/types'

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

  // Quantity inline edit
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null)
  const [editQtyValue, setEditQtyValue] = useState<number>(0)
  const [editUnitValue, setEditUnitValue] = useState<string>('kg')

  // Full ingredient edit
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
      if (res.status === 409) throw new Error(`วัตถุดิบ "${newIng.nameTh}" มีอยู่แล้ว`)
      if (res.ok) {
        setIngredients([...ingredients, { ...newIng, id: data.id } as Ingredient])
        setShowAdd(false)
        setNewIng(BLANK_ING)
        showSuccess()
      } else {
        throw new Error(`บันทึกไม่สำเร็จ: ${data.details || data.error || res.status}`)
      }
    } catch (err: any) {
      console.error(err); alert(err.message || t.common.error)
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
      if (!res.ok) throw new Error('อัปเดตไม่สำเร็จ')
      setIngredients(ingredients.map(i => i.id === editingIngId ? { ...i, ...editIngForm } as Ingredient : i))
      setEditingIngId(null)
      showSuccess()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleIngDelete(ing: Ingredient) {
    if (!confirm(`ลบ "${ing.nameTh}" ออกจากระบบ?`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/sheets/config?id=${ing.id}&type=ingredient`, { method: 'DELETE' })
      if (!res.ok) throw new Error('ลบไม่สำเร็จ')
      setIngredients(ingredients.filter(i => i.id !== ing.id))
      showSuccess()
    } catch (err: any) {
      alert(err.message)
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
      const date = new Date().toISOString().slice(0, 10)
      if (unitChanged) {
        const res = await fetch('/api/sheets/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...ing, unit: editUnitValue, type: 'ingredient' })
        })
        if (!res.ok) throw new Error('อัปเดตหน่วยไม่สำเร็จ')
        setIngredients(ingredients.map(i => i.id === ing.id ? { ...i, unit: editUnitValue } : i))
      }
      if (delta !== 0) {
        const unit = editUnitValue
        let res: Response
        if (delta > 0) {
          res = await fetch('/api/sheets/purchases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, store: 'Manual', items: [{ nameFr: ing.nameFr, nameTh: ing.nameTh, qty: delta, unit, pricePerUnit: 0, total: 0 }] })
          })
        } else {
          res = await fetch('/api/sheets/stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: [{ date, ingredient: ing.nameTh, amount_used: Math.abs(delta), unit, reason: 'manual_adjustment', menu: '' }] })
          })
        }
        if (!res.ok) throw new Error('บันทึกปริมาณไม่สำเร็จ')
        setQuantities({ ...quantities, [ing.nameTh]: editQtyValue })
      }
      setEditingQtyId(null)
      showSuccess()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-center py-8">{t.common.loading}</p>

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-40 text-slate-800">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-black tracking-tight">{t.manageStock.title}</h1>
        <div className="flex items-center gap-3">
          {(success || bulkResult) && (
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg uppercase tracking-widest animate-in fade-in zoom-in duration-300">
              {bulkResult ? (
                `✅ ${bulkResult.added} ${t.bulkImport.added}, ${bulkResult.updated} ${t.bulkImport.updated}` + 
                (bulkResult.skipped > 0 ? `, ${bulkResult.skipped} ${t.bulkImport.skipped}` : '')
              ) : (
                `✅ ${t.common.save} Success`
              )}
            </span>
          )}
          <button
            id="manage-stock-add-toggle"
            onClick={() => setShowAdd(!showAdd)}
            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 shadow-sm ${
              showAdd ? 'bg-white border border-slate-200 text-slate-500' : 'bg-amber-600 text-white shadow-amber-600/20'
            }`}
          >
            {showAdd ? t.common.cancel : `+ ${t.manageStock.add}`}
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
        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-amber-100 space-y-6 animate-in zoom-in-95 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.manageStock.name} (TH)</label>
              <input
                id="new-ing-name-th"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                value={newIng.nameTh}
                onChange={e => setNewIng({ ...newIng, nameTh: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.manageStock.name} (FR)</label>
              <input
                id="new-ing-name-fr"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                value={newIng.nameFr}
                onChange={e => setNewIng({ ...newIng, nameFr: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.manageStock.unit}</label>
              <select
                id="new-ing-unit"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all cursor-pointer"
                value={newIng.unit}
                onChange={e => setNewIng({ ...newIng, unit: e.target.value })}
              >
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.manageStock.threshold}</label>
              <NumberInput
                id="new-ing-threshold"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                value={newIng.threshold ?? 0}
                onChange={val => setNewIng({ ...newIng, threshold: val })}
              />
            </div>
          </div>
          <button
            id="new-ing-save-btn"
            onClick={handleAdd}
            disabled={saving || !newIng.nameTh}
            className="w-full bg-amber-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                {t.common.loading}
              </span>
            ) : t.common.save}
          </button>
        </div>
      )}

      {/* Ingredient list */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
        {ingredients.map(ing => {
          const qty = quantities[ing.nameTh] ?? 0
          const isLow = qty <= ing.threshold
          const isEditingQty = editingQtyId === ing.id
          const isEditingIng = editingIngId === ing.id

          return (
            <div key={ing.id}>
              {/* Full edit form row */}
              {isEditingIng ? (
                <div className="p-6 bg-amber-50/40 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">ชื่อ (TH)</label>
                      <input
                        className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 bg-white outline-none focus:ring-2 focus:ring-amber-500/20"
                        value={editIngForm.nameTh}
                        onChange={e => setEditIngForm({ ...editIngForm, nameTh: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">ชื่อ (FR)</label>
                      <input
                        className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 bg-white outline-none focus:ring-2 focus:ring-amber-500/20"
                        value={editIngForm.nameFr}
                        onChange={e => setEditIngForm({ ...editIngForm, nameFr: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">หน่วย</label>
                      <select
                        className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 bg-white outline-none cursor-pointer"
                        value={editIngForm.unit}
                        onChange={e => setEditIngForm({ ...editIngForm, unit: e.target.value })}
                      >
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">แจ้งเตือนเมื่อเหลือ</label>
                      <NumberInput
                        className="w-full border border-amber-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 bg-white outline-none"
                        value={editIngForm.threshold ?? 1}
                        onChange={val => setEditIngForm({ ...editIngForm, threshold: val })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingIngId(null)}
                      className="flex-1 bg-white text-slate-500 py-2 rounded-xl font-bold text-xs border border-slate-200 hover:bg-slate-50 transition-all"
                    >
                      {t.common.cancel}
                    </button>
                    <button
                      onClick={handleIngUpdate}
                      disabled={saving || !editIngForm.nameTh}
                      className="flex-[2] bg-amber-600 text-white py-2 rounded-xl font-bold text-xs shadow-md hover:bg-amber-700 transition-all disabled:opacity-50"
                    >
                      {saving ? t.common.loading : t.common.save}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  {/* Left: name + actions */}
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-black text-slate-700 text-lg">{ing.nameTh}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ing.nameFr} · {ing.unit}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => { setEditingIngId(ing.id); setEditIngForm({ nameTh: ing.nameTh, nameFr: ing.nameFr, unit: ing.unit, threshold: ing.threshold }) }}
                        className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleIngDelete(ing)}
                        disabled={saving}
                        className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Right: qty (tappable) */}
                  <div className="text-right space-y-1">
                    {isEditingQty ? (
                      <div className="flex items-center gap-2">
                        <NumberInput
                          className="w-24 border border-amber-300 rounded-xl px-3 py-1.5 text-right font-black text-slate-800 bg-amber-50 outline-none focus:ring-2 focus:ring-amber-500/20"
                          value={editQtyValue}
                          onChange={val => setEditQtyValue(val)}
                        />
                        <select
                          className="border border-amber-300 rounded-xl px-2 py-1.5 text-xs font-black text-amber-700 bg-amber-50 outline-none cursor-pointer"
                          value={editUnitValue}
                          onChange={e => setEditUnitValue(e.target.value)}
                        >
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <button
                          onClick={() => handleQtyEdit(ing)}
                          disabled={saving}
                          className="px-3 py-1.5 bg-amber-600 text-white text-[10px] font-black rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                        >✓</button>
                        <button
                          onClick={() => setEditingQtyId(null)}
                          className="px-3 py-1.5 bg-slate-100 text-slate-500 text-[10px] font-black rounded-lg hover:bg-slate-200 transition-colors"
                        >✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingQtyId(ing.id); setEditQtyValue(qty); setEditUnitValue(ing.unit) }}
                        className={`text-lg font-black hover:opacity-70 transition-opacity ${isLow ? 'text-rose-600' : 'text-emerald-600'}`}
                      >
                        {qty} {ing.unit}
                      </button>
                    )}
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">alert ≤ {ing.threshold}</p>
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
