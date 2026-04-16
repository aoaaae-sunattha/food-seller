'use client'
import { useState, useEffect, useRef } from 'react'
import { NumberInput } from '@/components/NumberInput'
import QuickAddIngredient from '@/components/stock/QuickAddIngredient'
import { useLanguage } from '@/hooks/useLanguage'
import type { MenuTemplate, Ingredient, MenuIngredient } from '@/types'
import { ExternalLink, X, Plus, Trash2, Edit2, ChevronDown } from 'lucide-react'

// Minimal RFC-4180 CSV line parser — handles quoted fields with commas inside
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

export default function ManageMenusPage() {
  const { t } = useLanguage()
  const [menus, setMenus] = useState<MenuTemplate[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [dbUrl, setDbUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newMenu, setNewMenu] = useState<Partial<MenuTemplate>>({ nameTh: '', nameFr: '', pricePerBox: 0, ingredients: [] })
  const csvInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/sheets/url').then(r => r.json()).then(d => setDbUrl(d.url)).catch(() => {})
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
      const finalIngredients: MenuIngredient[] = []
      for (const mi of (newMenu.ingredients || [])) {
        if (!mi.ingredientId) continue
        
        // Check if ingredient already exists by nameTh or ID
        const existing = ingredients.find(ing => ing.id === mi.ingredientId || ing.nameTh === mi.ingredientId)
        const unit = (mi as any).tempUnit
        const nameFr = (mi as any).tempNameFr || mi.ingredientId
        
        if (existing) {
          // If the unit was changed in the form, update the master ingredient
          if (unit && unit !== existing.unit) {
            console.log('Updating existing ingredient unit:', existing.nameTh, 'to', unit)
            await fetch('/api/sheets/config', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...existing, unit, type: 'ingredient' })
            })
          }
          finalIngredients.push({ ingredientId: existing.id, defaultQty: mi.defaultQty })
        } else {
          // It's a brand new typed name - create it first!
          const newUnit = unit || 'kg'
          console.log('Creating brand new ingredient:', mi.ingredientId, 'with unit', newUnit, 'and nameFr', nameFr)
          const res = await fetch('/api/sheets/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nameTh: mi.ingredientId, nameFr: nameFr, unit: newUnit, threshold: 1, type: 'ingredient' })
          })
          const data = await res.json().catch(() => ({}))
          if (res.ok) {
            finalIngredients.push({ ingredientId: data.id, defaultQty: mi.defaultQty })
          } else if (res.status === 409 && data.id) {
            // Already exists — reuse the existing ingredient id
            finalIngredients.push({ ingredientId: data.id, defaultQty: mi.defaultQty })
          } else {
            throw new Error(`บันทึกวัตถุดิบไม่สำเร็จ: ${data.error || res.status}`)
          }
        }
      }

      const res = await fetch('/api/sheets/config', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...(editingId ? { id: editingId } : {}), 
          ...newMenu, 
          ingredients: finalIngredients, 
          type: 'menu' 
        })
      })
      if (res.ok) {
        if (editingId) {
          setMenus(menus.map(m => m.id === editingId ? { ...newMenu, id: editingId, ingredients: finalIngredients } as MenuTemplate : m))
        } else {
          const { id } = await res.json()
          setMenus([...menus, { ...newMenu, id, ingredients: finalIngredients } as MenuTemplate])
        }
        setShowAdd(false)
        setEditingId(null)
        setNewMenu({ nameTh: '', nameFr: '', pricePerBox: 0, ingredients: [] })
        // Refresh ingredients list for next time
        fetch('/api/sheets/config').then(r => r.json()).then(data => setIngredients(data.ingredients ?? []))
      } else {
        const err = await res.json().catch(() => ({}))
        if (res.status === 409) {
          throw new Error(`เมนู "${newMenu.nameTh}" มีอยู่แล้ว`)
        }
        throw new Error(`บันทึกเมนูไม่สำเร็จ: ${err.details || err.error || res.status}`)
      }
    } catch (err: any) {
      console.error(err); alert(err.message || t.common.error)
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(menu: MenuTemplate) {
    setEditingId(menu.id)
    setNewMenu({
      nameTh: menu.nameTh,
      nameFr: menu.nameFr || '',
      pricePerBox: menu.pricePerBox,
      ingredients: [...menu.ingredients]
    })
    setShowAdd(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this menu?')) return
    try {
      const res = await fetch(`/api/sheets/config?id=${id}&type=menu`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setMenus(menus.filter(m => m.id !== id))
      } else {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Delete failed')
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  const addIngredientRow = () => {
    setNewMenu({
      ...newMenu,
      ingredients: [...(newMenu.ingredients || []), { ingredientId: '', defaultQty: 0, tempUnit: 'kg', tempNameFr: '' } as any]
    })
  }

  const updateIngredient = (idx: number, patch: Partial<MenuIngredient>) => {
    const next = [...(newMenu.ingredients || [])]
    next[idx] = { ...next[idx], ...patch }
    setNewMenu({ ...newMenu, ingredients: next })
  }

  const downloadIngredientTemplate = () => {
    const current = newMenu.ingredients || []
    let csv = 'nameTh,nameFr,unit,qty\n'
    if (current.length > 0) {
      current.forEach(mi => {
        const ing = ingredients.find(i => i.id === mi.ingredientId || i.nameTh === mi.ingredientId)
        const nameTh = ing?.nameTh || mi.ingredientId
        const nameFr = (mi as any).tempNameFr || ing?.nameFr || ''
        const unit = (mi as any).tempUnit || ing?.unit || 'kg'
        csv += `${nameTh},${nameFr},${unit},${mi.defaultQty}\n`
      })
    } else {
      csv += 'กระเทียม,Ail,tbsp,5\nพริกขี้หนู,Piment,pcs,3\nน้ำมันพืช,Huile,ml,15\n'
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ingredients_${newMenu.nameTh || 'menu'}.csv`
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleIngredientCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = (event.target?.result as string).replace(/^\uFEFF/, '')
      const lines = text.split('\n').filter(l => l.trim() !== '').slice(1)
      const parsed: Array<MenuIngredient & { tempUnit: string; tempNameFr: string }> = []
      for (const line of lines) {
        const parts = parseCSVLine(line)
        const nameTh = parts[0]?.trim()
        const nameFr = parts[1]?.trim() || ''
        const unit = parts[2]?.trim() || 'kg'
        const qty = Number(parts[3]) || 0
        if (!nameTh) continue
        const existing = ingredients.find(i => i.nameTh.trim().toLowerCase() === nameTh.toLowerCase())
        parsed.push({
          ingredientId: existing?.id || nameTh,
          defaultQty: qty,
          tempUnit: unit,
          tempNameFr: nameFr || existing?.nameFr || ''
        } as any)
      }
      if (parsed.length > 0) setNewMenu(m => ({ ...m, ingredients: parsed }))
      // Reset so the same file can be re-loaded if needed
      if (csvInputRef.current) csvInputRef.current.value = ''
    }
    reader.readAsText(file)
  }

  const toggleAdd = () => {
    if (showAdd) {
      setEditingId(null)
      setNewMenu({ nameTh: '', nameFr: '', pricePerBox: 0, ingredients: [] })
    }
    setShowAdd(!showAdd)
  }

  if (loading) return <p className="text-center py-8">{t.common.loading}</p>

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-40 text-slate-800">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-black tracking-tight">{t.manageMenus.title}</h1>
        <div className="flex items-center gap-3">
          {dbUrl && (
            <a
              href={dbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-slate-500 bg-white border border-slate-200 hover:border-amber-300 hover:text-amber-600 transition-all shadow-sm"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Database</span>
            </a>
          )}
          <button
            id="manage-menus-add-toggle"
            onClick={toggleAdd}
            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 shadow-sm ${
              showAdd ? 'bg-white border border-slate-200 text-slate-500' : 'bg-amber-600 text-white shadow-amber-600/20'
            }`}
          >
            {showAdd ? t.common.cancel : `+ ${t.manageMenus.add}`}
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-amber-100 space-y-6 animate-in zoom-in-95 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[14px] font-black text-slate-400 uppercase tracking-widest px-1">{t.manageMenus.nameTh}</label>
              <input 
                id="new-menu-name"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                value={newMenu.nameTh}
                onChange={e => setNewMenu({ ...newMenu, nameTh: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[14px] font-black text-slate-400 uppercase tracking-widest px-1">{t.manageMenus.nameFr}</label>
              <input 
                id="new-menu-name-fr"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                value={newMenu.nameFr}
                onChange={e => setNewMenu({ ...newMenu, nameFr: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[14px] font-black text-slate-400 uppercase tracking-widest px-1">{t.manageMenus.price}</label>
              <NumberInput 
                id="new-menu-price"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all"
                value={newMenu.pricePerBox ?? 0}
                placeholder="0"
                onChange={val => setNewMenu({ ...newMenu, pricePerBox: val })}
              />
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-[14px] font-black text-slate-400 uppercase tracking-widest">{t.manageMenus.ingredients}</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={downloadIngredientTemplate}
                  className="text-[14px] font-black text-slate-400 uppercase tracking-widest hover:text-amber-600 transition-colors"
                >
                  {t.manageMenus.loadCsvTemplate}
                </button>
                <button
                  type="button"
                  onClick={() => csvInputRef.current?.click()}
                  className="text-[14px] font-black text-amber-600 uppercase tracking-widest hover:text-amber-700 transition-colors"
                >
                  📂 {t.manageMenus.loadCsv}
                </button>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleIngredientCSV}
                  className="hidden"
                  data-testid="menu-csv-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              {newMenu.ingredients?.map((mi, i) => {
                const foundIng = ingredients.find(ing => ing.id === mi.ingredientId || ing.nameTh === mi.ingredientId)
                return (
                <div key={i} className="flex gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100 items-center">
                  <div className="flex-1 flex flex-col">
                    <input 
                      list="menu-ing-list"
                      className="w-full bg-transparent px-2 py-1 text-sm font-bold text-slate-700 outline-none border-b border-transparent focus:border-amber-500/20"
                      placeholder="Search or Type Ingredient..."
                      value={foundIng?.nameTh || mi.ingredientId}
                      onChange={e => {
                        const val = e.target.value
                        const existing = ingredients.find(ing => ing.nameTh === val)
                        updateIngredient(i, { 
                          ingredientId: val, 
                          tempUnit: existing?.unit || (mi as any).tempUnit || 'kg' 
                        } as any)
                      }}
                    />
                    {foundIng && (
                      <span className="px-2 text-[14px] font-bold text-slate-400 uppercase tracking-wide leading-none mt-1">
                        {foundIng.nameFr}
                      </span>
                    )}
                  </div>
                  
                  <select
                    className="w-20 bg-amber-50 border border-amber-200 rounded px-1 py-0.5 text-[14px] font-black text-amber-600 outline-none cursor-pointer"
                    value={(mi as any).tempUnit || foundIng?.unit || 'kg'}
                    onChange={e => updateIngredient(i, { tempUnit: e.target.value } as any)}
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="mg">mg</option>
                    <option value="l">l</option>
                    <option value="ml">ml</option>
                    <option value="pcs">pcs</option>
                    <option value="box">box</option>
                    <option value="bottle">bottle</option>
                    <option value="can">can</option>
                    <option value="pack">pack</option>
                    <option value="bag">bag</option>
                    <option value="bunch">bunch</option>
                    <option value="tray">tray</option>
                    <option value="tbsp">tbsp</option>
                    <option value="tsp">tsp</option>
                  </select>

                  <NumberInput 
                    className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-1 text-sm text-right font-black text-amber-600 outline-none focus:border-amber-500 shadow-sm"
                    value={mi.defaultQty}
                    onChange={val => updateIngredient(i, { defaultQty: val })}
                  />
                  
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...(newMenu.ingredients || [])]
                      next.splice(i, 1)
                      setNewMenu({ ...newMenu, ingredients: next })
                    }}
                    className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    title="Remove Ingredient"
                  >
                    <X size={16} />
                  </button>
                </div>
              )})}
            </div>

            <datalist id="menu-ing-list">
              {ingredients.map(ing => (
                <option key={ing.id} value={ing.nameTh}>{ing.nameFr} ({ing.unit})</option>
              ))}
            </datalist>
            <div className="flex justify-between items-center pt-2">
              <button 
                id="new-menu-add-ing-row"
                onClick={addIngredientRow}
                className="text-amber-600 text-sm font-black uppercase tracking-widest flex items-center gap-1 hover:text-amber-700 transition-colors"
              >
                {t.stock.addIngredient}
              </button>
              
              <button 
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="text-slate-400 text-[14px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-slate-600 transition-colors"
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

      <div className="card-base p-0 overflow-hidden divide-y divide-subtle-border">
        {menus.map(menu => (
          <div key={menu.id} id={`menu-item-${menu.id}`} className="p-8 flex justify-between items-center hover:bg-mist-gray/30 transition-colors group">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-amber-100">
                🍜
              </div>
              <div>
                <p className="font-bold text-slate-deep text-xl">{menu.nameTh}</p>
                {menu.nameFr && (
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wide leading-none mb-1">{menu.nameFr}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="badge-base bg-slate-100 text-slate-500 py-0.5 px-2 text-[14px] uppercase font-bold tracking-wider">
                    {menu.ingredients.length} {t.manageMenus.ingredients}
                  </span>
                  <span className="text-sm font-bold text-amber-600">€{menu.pricePerBox}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                id={`menu-edit-${menu.id}`}
                onClick={() => handleEdit(menu)}
                className="w-11 h-11 bg-mist-gray text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl flex items-center justify-center transition-all"
                title="Edit"
              >
                <Edit2 size={20} />
              </button>
              <button
                id={`menu-delete-${menu.id}`}
                onClick={() => handleDelete(menu.id)}
                className="w-11 h-11 bg-mist-gray text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl flex items-center justify-center transition-all"
                title="Delete"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
