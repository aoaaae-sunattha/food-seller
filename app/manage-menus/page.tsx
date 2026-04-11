'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import type { MenuTemplate, Ingredient, MenuIngredient } from '@/types'

export default function ManageMenusPage() {
  const { t } = useLanguage()
  const [menus, setMenus] = useState<MenuTemplate[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newMenu, setNewMenu] = useState<Partial<MenuTemplate>>({ nameTh: '', pricePerBox: 12, ingredients: [] })

  useEffect(() => {
    fetch('/api/sheets/config')
      .then(r => r.json())
      .then(data => {
        setMenus(data.menus)
        setIngredients(data.ingredients)
        setLoading(false)
      })
  }, [])

  async function handleAdd() {
    setSaving(true)
    try {
      const res = await fetch('/api/sheets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newMenu, type: 'menu' })
      })
      if (res.ok) {
        const { id } = await res.json()
        setMenus([...menus, { ...newMenu, id } as MenuTemplate])
        setShowAdd(false)
        setNewMenu({ nameTh: '', pricePerBox: 12, ingredients: [] })
      }
    } catch (err) {
      console.error(err); alert(t.common.error)
    } finally {
      setSaving(false)
    }
  }

  const addIngredientRow = () => {
    setNewMenu({
      ...newMenu,
      ingredients: [...(newMenu.ingredients || []), { ingredientId: '', defaultQty: 0 }]
    })
  }

  const updateIngredient = (idx: number, patch: Partial<MenuIngredient>) => {
    const next = [...(newMenu.ingredients || [])]
    next[idx] = { ...next[idx], ...patch }
    setNewMenu({ ...newMenu, ingredients: next })
  }

  if (loading) return <p className="text-center py-8">{t.common.loading}</p>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">{t.manageMenus.title}</h1>
        <button 
          onClick={() => setShowAdd(!showAdd)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
        >
          {showAdd ? t.common.cancel : t.manageMenus.add}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-4 rounded-xl shadow border-2 border-blue-500 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 block font-bold uppercase">{t.manageMenus.name}</label>
              <input 
                className="w-full border rounded px-3 py-2"
                value={newMenu.nameTh}
                onChange={e => setNewMenu({ ...newMenu, nameTh: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block font-bold uppercase">{t.manageMenus.price}</label>
              <input 
                type="number"
                className="w-full border rounded px-3 py-2"
                value={newMenu.pricePerBox}
                onChange={e => setNewMenu({ ...newMenu, pricePerBox: Number(e.target.value) })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] text-gray-400 block font-bold uppercase">{t.manageMenus.ingredients}</label>
            {newMenu.ingredients?.map((mi, i) => (
              <div key={i} className="flex gap-2">
                <select 
                  className="flex-1 border rounded px-2 py-1 text-sm"
                  value={mi.ingredientId}
                  onChange={e => updateIngredient(i, { ingredientId: e.target.value })}
                >
                  <option value="">--</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id}>{ing.nameTh}</option>
                  ))}
                </select>
                <input 
                  type="number"
                  className="w-20 border rounded px-2 py-1 text-sm text-right"
                  value={mi.defaultQty}
                  onChange={e => updateIngredient(i, { defaultQty: Number(e.target.value) })}
                />
              </div>
            ))}
            <button onClick={addIngredientRow} className="text-blue-600 text-sm font-bold pt-1">+ {t.stock.addIngredient}</button>
          </div>

          <button 
            onClick={handleAdd}
            disabled={saving || !newMenu.nameTh}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold disabled:opacity-50"
          >
            {saving ? t.common.loading : t.common.save}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow divide-y overflow-hidden">
        {menus.map(menu => (
          <div key={menu.id} className="p-4 flex justify-between items-center">
            <div>
              <p className="font-bold">{menu.nameTh}</p>
              <p className="text-xs text-gray-400">{menu.ingredients.length} ingredients · €{menu.pricePerBox}/box</p>
            </div>
            <div className="text-right">
              <span className="text-xl text-blue-600">🍜</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
