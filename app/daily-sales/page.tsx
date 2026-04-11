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
        const menus = data.menus ?? []
        setMenus(menus)
        setMenuSales(menus.map((m: MenuTemplate) => ({ menu: m.nameTh, boxes: 0, pricePerBox: m.pricePerBox })))
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
    <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in-95 duration-500">
      <div className="bg-white p-12 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center space-y-6 text-center max-w-sm w-full">
        <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center text-5xl shadow-inner animate-bounce text-amber-600">
          💰
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t.common.save}</h2>
          <p className="text-slate-400 font-medium">Daily sales have been logged successfully.</p>
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h1 className="text-2xl font-black text-slate-800 tracking-tight">{t.sales.title}</h1>
      
      <div className="space-y-4 pb-8">
        {menuSales.map((sale, i) => (
          <div key={sale.menu} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-all">
            <div className="flex-1 font-black text-slate-700 text-lg">{sale.menu}</div>
            <div className="w-20">
              <div className="relative">
                <input 
                  type="number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-center font-black text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  value={sale.boxes}
                  onChange={e => handleBoxChange(i, Number(e.target.value))}
                />
                <span className="absolute -top-4 left-0 w-full text-[9px] font-black text-slate-300 uppercase tracking-tighter text-center">{t.sales.boxes}</span>
              </div>
            </div>
            <div className="w-24">
              <div className="relative">
                <input 
                  type="number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-right font-black text-slate-600 focus:bg-white focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  value={sale.pricePerBox}
                  onChange={e => handlePriceChange(i, Number(e.target.value))}
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
            <input 
              type="number"
              className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-4 text-right font-black text-2xl text-white focus:bg-white/20 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all"
              value={cash}
              onChange={e => setCash(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">{t.sales.card}</label>
            <input 
              type="number"
              className="w-full bg-white/10 border border-white/10 rounded-2xl px-4 py-4 text-right font-black text-2xl text-white focus:bg-white/20 focus:ring-4 focus:ring-amber-500/20 outline-none transition-all"
              value={card}
              onChange={e => setCard(Number(e.target.value))}
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
