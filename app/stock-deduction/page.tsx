'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import MenuChips from '@/components/stock/MenuChips'
import QuickAddIngredient from '@/components/stock/QuickAddIngredient'
import IngredientSection, { DeductionRow } from '@/components/stock/IngredientSection'
import type { MenuTemplate, Ingredient, StockDeductionRow } from '@/types'

export default function StockDeductionPage() {
  const { t } = useLanguage()
  const [menus, setMenus] = useState<MenuTemplate[]>([])
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])
  const [selectedMenus, setSelectedMenus] = useState<string[]>([])
  const [deductions, setDeductions] = useState<Record<string, DeductionRow[]>>({})
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/sheets/config').then(r => r.json()),
      fetch('/api/sheets/stock').then(r => r.json()),
    ]).then(([config, stock]: [{ ingredients: Ingredient[], menus: MenuTemplate[] }, { quantities: Record<string, number> }]) => {
      setMenus(config.menus ?? [])
      setAllIngredients(config.ingredients ?? [])
      setQuantities(stock.quantities ?? {})
      setLoading(false)
    })
  }, [])

  // Pre-fill ingredients when menu selection changes
  useEffect(() => {
    const nextDeductions = { ...deductions }
    selectedMenus.forEach(menuName => {
      if (!nextDeductions[menuName]) {
        const template = menus.find(m => m.nameTh === menuName)
        if (template) {
          nextDeductions[menuName] = template.ingredients.map(ti => {
            const ing = allIngredients.find(ai => ai.id === ti.ingredientId)
            return {
              ingredientName: ing?.nameTh || '',
              amountUsed: ti.defaultQty,
              unit: ing?.unit || 'kg',
              reason: 'ใช้ทำอาหาร' as const
            }
            })
            } else {
            nextDeductions[menuName] = [{ ingredientName: '', amountUsed: 0, unit: 'kg', reason: 'ใช้ทำอาหาร' as const }]
            }
            }
            })
            setDeductions(nextDeductions)
            }, [selectedMenus, menus, allIngredients])
  async function handleSave() {
    setSaving(true)
    const date = new Date().toISOString().split('T')[0]
    
    // 1. Identify and create any new ingredients typed manually
    const existingNames = allIngredients.map(ing => ing.nameTh)
    const allDeductionRows = Object.values(deductions).flat()
    const uniqueNewRows = allDeductionRows
      .filter(d => d.ingredientName && !existingNames.includes(d.ingredientName))
      // deduplicate by name
      .filter((row, idx, self) => self.findIndex(r => r.ingredientName === row.ingredientName) === idx)

    const newlyCreatedIngs: Ingredient[] = []
    for (const row of uniqueNewRows) {
      try {
        const res = await fetch('/api/sheets/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nameTh: row.ingredientName, nameFr: row.ingredientName, unit: row.unit || 'kg', threshold: 1, type: 'ingredient' })
        })
        if (res.ok) {
          const { id } = await res.json()
          newlyCreatedIngs.push({ id, nameTh: row.ingredientName, nameFr: row.ingredientName, unit: row.unit || 'kg', threshold: 1 })
        }
      } catch (err) { console.error('Quick save failed for', row.ingredientName, err) }
    }

    const rows: StockDeductionRow[] = []
    selectedMenus.forEach(menuName => {
      deductions[menuName]?.forEach(d => {
        if (d.ingredientName && d.amountUsed > 0) {
          rows.push({
            date,
            ingredient: d.ingredientName,
            amount_used: d.amountUsed,
            unit: d.unit,
            reason: d.reason,
            menu: menuName
          })
        }
      })
    })

    try {
      const res = await fetch('/api/sheets/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
      })
      if (res.ok) {
        setDone(true)
      } else {
        const err = await res.json().catch(() => ({}))
        throw new Error(`บันทึกการตัดสต็อกไม่สำเร็จ: ${err.details || err.error || res.status}`)
      }
    } catch (err: any) {
      console.error(err); alert(err.message || t.common.error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-center py-8">{t.common.loading}</p>
  if (done) return (
    <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in-95 duration-500">
      <div className="bg-white p-12 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center space-y-6 text-center max-w-sm w-full">
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-5xl shadow-inner animate-bounce text-blue-600">
          📦
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t.common.save}</h2>
          <p className="text-slate-400 font-medium">Stock levels have been adjusted successfully.</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-slate-800 transition-all active:scale-95"
        >
          Great, thanks!
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-48">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">{t.nav.stockDeduction}</h1>
        <button 
          id="stock-quick-add-toggle"
          onClick={() => setShowQuickAdd(!showQuickAdd)}
          className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-slate-600 transition-colors"
        >
          {showQuickAdd ? t.common.cancel : `✨ ${t.manageStock.add} (Quick)`}
        </button>
      </div>

      {showQuickAdd && (
        <QuickAddIngredient 
          onAdded={(ing) => {
            setAllIngredients([...allIngredients, ing])
            setShowQuickAdd(false)
          }}
          onCancel={() => setShowQuickAdd(false)}
        />
      )}
      
      <section className="space-y-4">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{t.stock.selectMenus}</label>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
          <MenuChips menus={menus} selected={selectedMenus} onChange={setSelectedMenus} t={t} />
        </div>
      </section>

      <section className="space-y-6">
        {selectedMenus.map(menuName => (
          <IngredientSection
            key={menuName}
            menuName={menuName}
            allIngredients={allIngredients}
            quantities={quantities}
            rows={deductions[menuName] || []}
            t={t}
            onRowChange={(idx, patch) => {
              const menuRows = [...(deductions[menuName] || [])]
              menuRows[idx] = { ...menuRows[idx], ...patch }
              setDeductions({ ...deductions, [menuName]: menuRows })
            }}
            onAddRow={() => {
              setDeductions({
                ...deductions,
                [menuName]: [...(deductions[menuName] || []), { ingredientName: '', amountUsed: 0, unit: 'kg', reason: 'ใช้ทำอาหาร' as const }]
              })
            }}
            onRemoveRow={(idx) => {
              const menuRows = [...(deductions[menuName] || [])]
              menuRows.splice(idx, 1)
              setDeductions({ ...deductions, [menuName]: menuRows })
            }}
          />
        ))}
      </section>

      {selectedMenus.length > 0 && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 w-full max-w-lg px-6 z-50">
          <button 
            id="stock-deduct-submit-btn"
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-amber-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-amber-600/30 hover:bg-amber-700 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                {t.common.loading}
              </span>
            ) : t.stock.deduct}
          </button>
        </div>
      )}
    </div>
  )
}
