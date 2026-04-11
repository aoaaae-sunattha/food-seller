'use client'
import {  useState, useEffect  } from 'react'
import { NumberInput } from '@/components/NumberInput'
import QuickAddIngredient from '@/components/stock/QuickAddIngredient'
import { useLanguage } from '@/hooks/useLanguage'
import type { MenuTemplate, Ingredient, MenuIngredient } from '@/types'

export default function ManageMenusPage() {
  const { t } = useLanguage()
  const [menus, setMenus] = useState<MenuTemplate[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [newMenu, setNewMenu] = useState<Partial<MenuTemplate>>({ nameTh: '', pricePerBox: 12, ingredients: [] })

  useEffect(() => {
    fetch('/api/sheets/config')
      .then(r => r.json())
      .then(data => {
        setMenus(data.menus ?? [])
        setIngredients(data.ingredients ?? [])
        setLoading(false)
      })
  }, [])

  async function handleAdd() {
    setSaving(true)
    try {
      // 1. Resolve manually typed ingredient names to real IDs
      const finalIngredients = []
      for (const mi of (newMenu.ingredients || [])) {
        if (!mi.ingredientId) continue
        
        // Check if ingredient already exists by nameTh
        const existing = ingredients.find(ing => ing.id === mi.ingredientId || ing.nameTh === mi.ingredientId)
        if (existing) {
          finalIngredients.push({ ...mi, ingredientId: existing.id })
        } else {
          // It's a brand new typed name - create it first!
          const unit = (mi as any).tempUnit || 'kg'
          const res = await fetch('/api/sheets/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nameTh: mi.ingredientId, nameFr: mi.ingredientId, unit, threshold: 1, type: 'ingredient' })
          })
          if (res.ok) {
            const { id } = await res.json()
            finalIngredients.push({ ...mi, ingredientId: id })
          }
        }
      }

      const res = await fetch('/api/sheets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newMenu, ingredients: finalIngredients, type: 'menu' })
      })
      if (res.ok) {
        const { id } = await res.json()
        setMenus([...menus, { ...newMenu, id, ingredients: finalIngredients } as MenuTemplate])
        setShowAdd(false)
        setNewMenu({ nameTh: '', pricePerBox: 12, ingredients: [] })
        // Refresh ingredients list for next time
        fetch('/api/sheets/config').then(r => r.json()).then(data => setIngredients(data.ingredients ?? []))
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-40 text-slate-800">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-black tracking-tight">{t.manageMenus.title}</h1>
        <button 
          id="manage-menus-add-toggle"
          onClick={() => setShowAdd(!showAdd)}
          className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 shadow-sm ${
            showAdd ? 'bg-white border border-slate-200 text-slate-500' : 'bg-amber-600 text-white shadow-amber-600/20'
          }`}
        >
          {showAdd ? t.common.cancel : `+ ${t.manageMenus.add}`}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-amber-100 space-y-6 animate-in zoom-in-95 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.manageMenus.name}</label>
              <input 
                id="new-menu-name"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                value={newMenu.nameTh}
                onChange={e => setNewMenu({ ...newMenu, nameTh: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.manageMenus.price}</label>
              <NumberInput 
                id="new-menu-price"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                value={newMenu.pricePerBox ?? 0}
                onChange={val => setNewMenu({ ...newMenu, pricePerBox: val })}
              />
            </div>
          </div>
          
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.manageMenus.ingredients}</label>
            <div className="space-y-2">
              {newMenu.ingredients?.map((mi, i) => (
                <div key={i} className="flex gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <input 
                    list="menu-ing-list"
                    className="flex-1 bg-transparent px-2 py-1 text-sm font-bold text-slate-700 outline-none border-b border-transparent focus:border-amber-500/20"
                    placeholder="Search or Type Ingredient..."
                    value={ingredients.find(ing => ing.id === mi.ingredientId)?.nameTh || mi.ingredientId}
                    onChange={e => updateIngredient(i, { ingredientId: e.target.value })}
                  />
                  {!ingredients.some(ing => ing.id === mi.ingredientId || ing.nameTh === mi.ingredientId) && (
                    <>
                      <input 
                        list="unit-suggestions"
                        className="w-16 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 text-[10px] font-black text-amber-600 outline-none"
                        placeholder="kg"
                        onChange={e => {
                          (mi as any).tempUnit = e.target.value
                        }}
                      />
                      <datalist id="unit-suggestions">
                        <option value="kg">Kilogram (กก.)</option>
                        <option value="g">Gram (กรัม)</option>
                        <option value="pcs">Pieces (ชิ้น)</option>
                        <option value="box">Box (กล่อง)</option>
                        <option value="bottle">Bottle (ขวด)</option>
                        <option value="l">Liter (ลิตร)</option>
                        <option value="ml">Milliliter (มล.)</option>
                        <option value="pack">Pack (แพ็ค)</option>
                        <option value="bunch">Bunch (กำ)</option>
                      </datalist>
                    </>
                  )}
                  <datalist id="menu-ing-list">
                    {ingredients.map(ing => (
                      <option key={ing.id} value={ing.nameTh}>{ing.nameFr}</option>
                    ))}
                  </datalist>
                  <NumberInput 
                    
                    className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-1 text-sm text-right font-black text-amber-600 outline-none focus:border-amber-500 shadow-sm"
                    value={mi.defaultQty}
                    onChange={val => updateIngredient(i, { defaultQty: val })}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-2">
              <button 
                id="new-menu-add-ing-row"
                onClick={addIngredientRow}
                className="text-amber-600 text-xs font-black uppercase tracking-widest flex items-center gap-1 hover:text-amber-700 transition-colors"
              >
                <span className="text-lg">+</span> {t.stock.addIngredient}
              </button>
              
              <button 
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-slate-600 transition-colors"
              >
                {showQuickAdd ? t.common.cancel : `✨ ${t.manageStock.add} (Quick)`}
              </button>
            </div>

            {showQuickAdd && (
              <QuickAddIngredient 
                onAdded={(ing) => {
                  setIngredients([...ingredients, ing])
                  setShowQuickAdd(false)
                }}
                onCancel={() => setShowQuickAdd(false)}
              />
            )}
          </div>

          <button 
            id="new-menu-save-btn"
            onClick={handleAdd}
            disabled={saving || !newMenu.nameTh}
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
        {menus.map(menu => (
          <div key={menu.id} className="p-6 flex justify-between items-center hover:bg-slate-50 transition-colors">
            <div>
              <p className="font-black text-slate-700 text-lg">{menu.nameTh}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {menu.ingredients.length} ingredients · €{menu.pricePerBox}/box
              </p>
            </div>
            <div className="text-right">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-2xl">🍜</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
