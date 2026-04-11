'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import type { Ingredient } from '@/types'

export default function ManageStockPage() {
  const { t } = useLanguage()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newIng, setNewIng] = useState<Partial<Ingredient>>({ nameTh: '', nameFr: '', unit: 'kg', threshold: 1 })

  useEffect(() => {
    Promise.all([
      fetch('/api/sheets/config').then(r => r.json()),
      fetch('/api/sheets/stock').then(r => r.json()),
    ]).then(([config, stock]) => {
      setIngredients(config.ingredients ?? [])
      setQuantities(stock.quantities ?? {})
      setLoading(false)
    })
  }, [])

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
        setIngredients([...ingredients, { ...newIng, id } as Ingredient])
        setShowAdd(false)
        setNewIng({ nameTh: '', nameFr: '', unit: 'kg', threshold: 1 })
      }
    } catch (err) {
      console.error(err); alert(t.common.error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-center py-8">{t.common.loading}</p>

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 text-slate-800">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-black tracking-tight">{t.manageStock.title}</h1>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 shadow-sm ${
            showAdd ? 'bg-white border border-slate-200 text-slate-500' : 'bg-amber-600 text-white shadow-amber-600/20'
          }`}
        >
          {showAdd ? t.common.cancel : `+ ${t.manageStock.add}`}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-amber-100 space-y-6 animate-in zoom-in-95 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.manageStock.name} (TH)</label>
              <input 
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                value={newIng.nameTh}
                onChange={e => setNewIng({ ...newIng, nameTh: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.manageStock.name} (FR)</label>
              <input 
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                value={newIng.nameFr}
                onChange={e => setNewIng({ ...newIng, nameFr: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.manageStock.unit}</label>
              <input 
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                value={newIng.unit}
                onChange={e => setNewIng({ ...newIng, unit: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.manageStock.threshold}</label>
              <input 
                type="number"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                value={newIng.threshold}
                onChange={e => setNewIng({ ...newIng, threshold: Number(e.target.value) })}
              />
            </div>
          </div>
          <button 
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

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
        {ingredients.map(ing => {
          const qty = quantities[ing.nameTh] ?? 0
          const isLow = qty <= ing.threshold
          return (
            <div key={ing.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
              <div>
                <p className="font-black text-slate-700 text-lg">{ing.nameTh}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ing.nameFr} · {ing.unit}</p>
              </div>
              <div className="text-right space-y-1">
                <div className={`text-lg font-black ${isLow ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {qty} {ing.unit}
                </div>
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">alert ≤ {ing.threshold}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
