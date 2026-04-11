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
      setIngredients(config.ingredients)
      setQuantities(stock.quantities)
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">{t.manageStock.title}</h1>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
        >
          {showAdd ? t.common.cancel : t.manageStock.add}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-4 rounded-xl shadow border-2 border-blue-500 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 block font-bold uppercase">{t.manageStock.name} (TH)</label>
              <input 
                className="w-full border rounded px-3 py-2"
                value={newIng.nameTh}
                onChange={e => setNewIng({ ...newIng, nameTh: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block font-bold uppercase">{t.manageStock.name} (FR)</label>
              <input 
                className="w-full border rounded px-3 py-2"
                value={newIng.nameFr}
                onChange={e => setNewIng({ ...newIng, nameFr: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 block font-bold uppercase">{t.manageStock.unit}</label>
              <input 
                className="w-full border rounded px-3 py-2"
                value={newIng.unit}
                onChange={e => setNewIng({ ...newIng, unit: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block font-bold uppercase">{t.manageStock.threshold}</label>
              <input 
                type="number"
                className="w-full border rounded px-3 py-2"
                value={newIng.threshold}
                onChange={e => setNewIng({ ...newIng, threshold: Number(e.target.value) })}
              />
            </div>
          </div>
          <button 
            onClick={handleAdd}
            disabled={saving || !newIng.nameTh}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold disabled:opacity-50"
          >
            {saving ? t.common.loading : t.common.save}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow divide-y overflow-hidden">
        {ingredients.map(ing => {
          const qty = quantities[ing.nameTh] ?? 0
          const isLow = qty <= ing.threshold
          return (
            <div key={ing.id} className="p-4 flex justify-between items-center">
              <div>
                <p className="font-bold">{ing.nameTh}</p>
                <p className="text-xs text-gray-400">{ing.nameFr} · {ing.unit}</p>
              </div>
              <div className="text-right space-y-1">
                <p className={`font-bold text-lg ${isLow ? 'text-red-600' : 'text-green-600'}`}>
                  {qty} {ing.unit}
                </p>
                <p className="text-[10px] text-gray-400">alert ≤ {ing.threshold}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
