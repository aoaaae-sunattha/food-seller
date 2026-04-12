'use client'
import {  useState, useEffect  } from 'react'
import { NumberInput } from '@/components/NumberInput'
import { useLanguage } from '@/hooks/useLanguage'
import type { MenuTemplate } from '@/types'

interface MenuSale {
  menu: string
  boxes: number
  pricePerBox: number
}

interface SaleHistoryItem {
  date: string
  menu: string
  boxes: number
  pricePerBox: number
  total: number
  cash: number
  card: number
  totalRecorded: number
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
  const [history, setHistory] = useState<SaleHistoryItem[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/sheets/config').then(r => r.json()),
      fetch('/api/sheets/sales').then(r => r.json()).catch(() => ({ history: [] }))
    ]).then(([configData, salesData]) => {
      const menus = configData.menus ?? []
      setMenus(menus)
      setMenuSales(menus.map((m: MenuTemplate) => ({ menu: m.nameTh, boxes: 0, pricePerBox: m.pricePerBox })))
      setHistory(salesData.history ?? [])
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
      if (res.ok) {
        setDone(true)
        setTimeout(() => setDone(false), 3000)
        // Reset form
        setCash(0)
        setCard(0)
        setMenuSales(menus.map(m => ({ menu: m.nameTh, boxes: 0, pricePerBox: m.pricePerBox })))
        // Refresh history
        const hRes = await fetch('/api/sheets/sales')
        const hData = await hRes.json()
        setHistory(hData.history ?? [])
      } else {
        const err = await res.json().catch(() => ({}))
        throw new Error(`บันทึกยอดขายไม่สำเร็จ: ${err.details || err.error || res.status}`)
      }
    } catch (err: any) {
      console.error(err); alert(err.message || t.common.error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-center py-8">{t.common.loading}</p>

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
      <div className="flex justify-between items-center px-1">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">{t.sales.title}</h1>
        {done && (
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg uppercase tracking-widest animate-in fade-in zoom-in duration-300">
            ✅ {t.common.save} Success
          </span>
        )}
      </div>
      
      <div className="space-y-4 pb-8">
...
        <div className={`flex justify-between items-center text-[10px] font-black uppercase tracking-widest px-1 relative z-10 ${totalRecorded !== totalSales ? 'text-amber-400' : 'text-slate-500'}`}>
          <span>Total Recorded: €{totalRecorded.toFixed(2)}</span>
          {totalRecorded !== totalSales && (
            <span className="bg-amber-400/10 px-2 py-1 rounded-lg">Gap: €{(totalRecorded - totalSales).toFixed(2)}</span>
          )}
        </div>
      </div>

      <button 
        id="sales-save-btn"
        onClick={handleSave}
        disabled={saving || totalSales === 0}
        className="w-full bg-amber-600 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-amber-600/30 hover:bg-amber-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            {t.common.loading}
          </span>
        ) : t.sales.save}
      </button>

      {/* History Table */}
      <div className="pt-12 space-y-6">
        <h2 className="text-xl font-black text-slate-800 px-1">{t.sales.history}</h2>
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-bold border-collapse">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4">{t.receipt.store || 'Date'}</th>
                  <th className="px-6 py-4">{t.manageMenus.name}</th>
                  <th className="px-6 py-4 text-center">{t.receipt.qty}</th>
                  <th className="px-6 py-4 text-right">{t.sales.cash}</th>
                  <th className="px-6 py-4 text-right">{t.sales.card}</th>
                  <th className="px-6 py-4 text-right">{t.sales.total}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {history.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-400 text-[10px] font-black uppercase tracking-tighter whitespace-nowrap">{h.date}</td>
                    <td className="px-6 py-4 text-slate-700 font-black">{h.menu}</td>
                    <td className="px-6 py-4 text-center text-slate-600">{h.boxes}</td>
                    <td className="px-6 py-4 text-right text-slate-500 font-medium">€{h.cash.toFixed(1)}</td>
                    <td className="px-6 py-4 text-right text-slate-500 font-medium">€{h.card.toFixed(1)}</td>
                    <td className="px-6 py-4 text-right text-amber-600 font-black">€{h.total.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
        {menuSales.map((sale, i) => (
          <div key={sale.menu} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-all">
            <div className="flex-1 font-black text-slate-700 text-lg">{sale.menu}</div>
            <div className="w-20">
              <div className="relative">
                <NumberInput 
                  id={`sales-qty-${sale.menu}`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-center font-black text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  value={sale.boxes}
                  onChange={val => handleBoxChange(i, val)}
                />
                <span className="absolute -top-4 left-0 w-full text-[9px] font-black text-slate-300 uppercase tracking-tighter text-center">{t.sales.boxes}</span>
              </div>
            </div>
            <div className="w-24">
              <div className="relative">
                <NumberInput 
                  id={`sales-price-${sale.menu}`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-right font-black text-slate-600 focus:bg-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  value={sale.pricePerBox}
                  onChange={val => handlePriceChange(i, val)}
                />
                <span className="absolute -top-4 left-0 w-full text-[9px] font-black text-slate-300 uppercase tracking-tighter text-right pr-1">€/box</span>
              </div>
            </div>
            <div className="w-20 text-right font-black text-amber-600 text-lg">
              €{(sale.boxes * sale.pricePerBox).toFixed(1)}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] space-y-6 shadow-2xl shadow-slate-900/20 border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
          <span className="text-8xl">💰</span>
        </div>
        
        <div className="flex justify-between items-end relative z-10">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Estimated Revenue</p>
            <span className="text-4xl font-black text-white leading-none">€{totalSales.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">{t.sales.cash}</label>
            <NumberInput 
              id="sales-cash-amount"
              className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-4 text-right font-black text-2xl text-white focus:bg-white/20 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all"
              value={cash}
              onChange={val => setCash(val)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">{t.sales.card}</label>
            <NumberInput 
              id="sales-card-amount"
              className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-4 text-right font-black text-2xl text-white focus:bg-white/20 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all"
              value={card}
              onChange={val => setCard(val)}
            />
          </div>
        </div>

        <div className={`flex justify-between items-center text-[10px] font-black uppercase tracking-widest px-1 relative z-10 ${totalRecorded !== totalSales ? 'text-amber-400' : 'text-slate-500'}`}>
          <span>Total Recorded: €{totalRecorded.toFixed(2)}</span>
          {totalRecorded !== totalSales && (
            <span className="bg-amber-400/10 px-2 py-1 rounded-lg">Gap: €{(totalRecorded - totalSales).toFixed(2)}</span>
          )}
        </div>
      </div>

      <button 
        id="sales-save-btn"
        onClick={handleSave}
        disabled={saving || totalSales === 0}
        className="w-full bg-amber-600 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl shadow-amber-600/30 hover:bg-amber-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            {t.common.loading}
          </span>
        ) : t.sales.save}
      </button>
    </div>
  )
}
