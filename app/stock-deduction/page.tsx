'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import MenuChips from '@/components/stock/MenuChips'
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
  const [done, setDone] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/sheets/config').then(r => r.json()),
      fetch('/api/sheets/stock').then(r => r.json()),
    ]).then(([config, stock]: [{ ingredients: Ingredient[], menus: MenuTemplate[] }, { quantities: Record<string, number> }]) => {
      setMenus(config.menus)
      setAllIngredients(config.ingredients)
      setQuantities(stock.quantities)
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
              unit: ing?.unit || '',
              reason: 'ใช้ทำอาหาร' as const
            }
          })
        } else {
          nextDeductions[menuName] = [{ ingredientName: '', amountUsed: 0, unit: '', reason: 'ใช้ทำอาหาร' as const }]
        }
      }
    })
    setDeductions(nextDeductions)
  }, [selectedMenus, menus, allIngredients])

  async function handleSave() {
    setSaving(true)
    const date = new Date().toISOString().split('T')[0]
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
      if (res.ok) setDone(true)
    } catch (err) {
      console.error(err); alert(t.common.error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-center py-8">{t.common.loading}</p>
  if (done) return (
    <div className="text-center mt-12 space-y-4">
      <p className="text-4xl">📦</p>
      <p className="text-xl font-bold">{t.common.save}</p>
      <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-lg">OK</button>
    </div>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t.nav.stockDeduction}</h1>
      
      <section className="space-y-3">
        <label className="text-sm text-gray-500 font-bold">{t.stock.selectMenus}</label>
        <MenuChips menus={menus} selected={selectedMenus} onChange={setSelectedMenus} t={t} />
      </section>

      <section className="space-y-4 pb-12">
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
                [menuName]: [...(deductions[menuName] || []), { ingredientName: '', amountUsed: 0, unit: '', reason: 'ใช้ทำอาหาร' as const }]
              })
            }}
          />
        ))}
      </section>

      {selectedMenus.length > 0 && (
        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold sticky bottom-4 shadow-lg disabled:opacity-50"
        >
          {saving ? t.common.loading : t.stock.deduct}
        </button>
      )}
    </div>
  )
}
