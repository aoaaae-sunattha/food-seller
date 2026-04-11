'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import type { MenuTemplate } from '@/types'

interface MenuSale {
  menu: string
  boxes: number
  pricePerBox: number
}

export default function DailySalesPage() {
  const { t } = useLanguage()
  const [menus, setMenus] = useState<MenuTemplate[]>([])
  const [menuSales, setMenuSales] = useState<MenuSale[]>([])
  const [cash, setCash] = useState<number>(0)
  const [card, setCard] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch('/api/sheets/config')
      .then(r => r.json())
      .then((data: { ingredients: any[], menus: MenuTemplate[] }) => {
        setMenus(data.menus)
        setMenuSales(data.menus.map((m: MenuTemplate) => ({ menu: m.nameTh, boxes: 0, pricePerBox: m.pricePerBox })))
        setLoading(false)
      })
  }, [])

  const handleBoxChange = (idx: number, val: number) => {
    const next = [...menuSales]
    next[idx].boxes = val
    setMenuSales(next)
  }

  const handlePriceChange = (idx: number, val: number) => {
    const next = [...menuSales]
    next[idx].pricePerBox = val
    setMenuSales(next)
  }

  const totalSales = menuSales.reduce((sum, s) => sum + (s.boxes * s.pricePerBox), 0)
  const totalRecorded = cash + card

  async function handleSave() {
    setSaving(true)
    const date = new Date().toISOString().split('T')[0]
    try {
      const res = await fetch('/api/sheets/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          menuSales: menuSales.filter(s => s.boxes > 0),
          cash,
          card,
        })
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
      <p className="text-4xl">💰</p>
      <p className="text-xl font-bold">{t.common.save}</p>
      <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-lg">OK</button>
    </div>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t.sales.title}</h1>
      
      <div className="space-y-3 pb-8">
        {menuSales.map((sale, i) => (
          <div key={sale.menu} className="bg-white p-4 rounded-xl shadow border border-gray-100 flex items-center gap-3">
            <div className="flex-1 font-bold">{sale.menu}</div>
            <div className="w-16">
              <input 
                type="number"
                className="w-full border rounded px-1 py-2 text-center"
                value={sale.boxes}
                onChange={e => handleBoxChange(i, Number(e.target.value))}
              />
              <span className="text-[10px] text-gray-400 block text-center uppercase">{t.sales.boxes}</span>
            </div>
            <div className="w-20">
              <input 
                type="number"
                className="w-full border rounded px-1 py-2 text-right"
                value={sale.pricePerBox}
                onChange={e => handlePriceChange(i, Number(e.target.value))}
              />
              <span className="text-[10px] text-gray-400 block text-right uppercase">€/box</span>
            </div>
            <div className="w-16 text-right font-bold text-blue-600">
              €{(sale.boxes * sale.pricePerBox).toFixed(1)}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 p-4 rounded-xl space-y-4 border border-blue-100">
        <div className="flex justify-between items-center text-blue-800 font-bold">
          <span>Total Sales</span>
          <span className="text-xl">€{totalSales.toFixed(2)}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-blue-800 font-bold uppercase">{t.sales.cash}</label>
            <input 
              type="number"
              className="w-full border border-blue-200 rounded px-2 py-3 text-right font-bold text-lg"
              value={cash}
              onChange={e => setCash(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-xs text-blue-800 font-bold uppercase">{t.sales.card}</label>
            <input 
              type="number"
              className="w-full border border-blue-200 rounded px-2 py-3 text-right font-bold text-lg"
              value={card}
              onChange={e => setCard(Number(e.target.value))}
            />
          </div>
        </div>

        <div className={`flex justify-between items-center text-xs ${totalRecorded !== totalSales ? 'text-red-500' : 'text-gray-400'}`}>
          <span>Recorded: €{totalRecorded.toFixed(2)}</span>
          {totalRecorded !== totalSales && (
            <span>Diff: €{(totalRecorded - totalSales).toFixed(2)}</span>
          )}
        </div>
      </div>

      <button 
        onClick={handleSave}
        disabled={saving || totalSales === 0}
        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50"
      >
        {saving ? t.common.loading : t.sales.save}
      </button>
    </div>
  )
}
