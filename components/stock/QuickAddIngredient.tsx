'use client'
import { useState } from 'react'
import { NumberInput } from '@/components/NumberInput'
import { useLanguage } from '@/hooks/useLanguage'
import type { Ingredient } from '@/types'

interface Props {
  onAdded: (ing: Ingredient) => void
  onCancel: () => void
}

export default function QuickAddIngredient({ onAdded, onCancel }: Props) {
  const { t } = useLanguage()
  const [saving, setSaving] = useState(false)
  const [newIng, setNewIng] = useState<Partial<Ingredient>>({ nameTh: '', nameFr: '', unit: 'kg', threshold: 1 })

  async function handleAdd() {
    setSaving(true)
    try {
      const res = await fetch('/api/sheets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newIng, type: 'ingredient' })
      })
      if (res.ok) {
        const { id } = await res.json()
        onAdded({ ...newIng, id } as Ingredient)
      }
    } catch (err) {
      console.error(err); alert(t.common.error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 space-y-4 animate-in zoom-in-95 duration-200 mt-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-amber-800 uppercase tracking-tighter px-1">{t.manageStock.name} (TH)</label>
          <input 
            className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 bg-white focus:ring-2 focus:ring-amber-500/20 outline-none"
            value={newIng.nameTh}
            onChange={e => setNewIng({ ...newIng, nameTh: e.target.value })}
            placeholder="เช่น ผักบุ้ง"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-amber-800 uppercase tracking-tighter px-1">{t.manageStock.name} (FR)</label>
          <input 
            className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 bg-white focus:ring-2 focus:ring-amber-500/20 outline-none"
            value={newIng.nameFr}
            onChange={e => setNewIng({ ...newIng, nameFr: e.target.value })}
            placeholder="e.g. Liseron d'eau"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-amber-800 uppercase tracking-tighter px-1">{t.manageStock.unit}</label>
          <input 
            list="unit-suggestions"
            className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 bg-white focus:ring-2 focus:ring-amber-500/20 outline-none"
            value={newIng.unit}
            onChange={e => setNewIng({ ...newIng, unit: e.target.value })}
            placeholder="kg, pcs, box..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-amber-800 uppercase tracking-tighter px-1">{t.manageStock.threshold}</label>
          <NumberInput 
            className="w-full border border-amber-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 bg-white focus:ring-2 focus:ring-amber-500/20 outline-none"
            value={newIng.threshold ?? 0}
            onChange={val => setNewIng({ ...newIng, threshold: val })}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={onCancel}
          className="flex-1 bg-white text-slate-500 py-2 rounded-xl font-bold text-xs border border-slate-200 hover:bg-slate-50 transition-all"
        >
          {t.common.cancel}
        </button>
        <button 
          onClick={handleAdd}
          disabled={saving || !newIng.nameTh}
          className="flex-[2] bg-amber-600 text-white py-2 rounded-xl font-bold text-xs shadow-md shadow-amber-600/10 hover:bg-amber-700 transition-all disabled:opacity-50"
        >
          {saving ? t.common.loading : t.common.save}
        </button>
      </div>
    </div>
  )
}
