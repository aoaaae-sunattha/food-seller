'use client'
import {  useState, useEffect  } from 'react'
import { NumberInput } from '@/components/NumberInput'
import { useLanguage } from '@/hooks/useLanguage'
import type { MenuTemplate } from '@/types'
import { 
  TrendingUp, 
  Banknote, 
  CreditCard, 
  History, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Check, 
  ArrowRight,
  PieChart,
  ShoppingBag,
  Zap,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MenuSale {
  menu: string
  boxes: number
  pricePerBox: number
}

interface SaleHistoryItem {
  id: string
  date: string
  menu: string
  boxes: number
  pricePerBox: number
  total: number
  cash: number
  card: number
  totalRecorded: number
}

interface DeleteLog {
  item: SaleHistoryItem
  reason: string
  timestamp: string
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
  const [deletedLogs, setDeletedLogs] = useState<DeleteLog[]>([])

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<SaleHistoryItem>>({})

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
        body: JSON.stringify({ date, menuSales: menuSales.filter(s => s.boxes > 0), cash, card })
      })
      if (res.ok) {
        setDone(true)
        setTimeout(() => setDone(false), 3000)
        setCash(0)
        setCard(0)
        setMenuSales(menus.map(m => ({ menu: m.nameTh, boxes: 0, pricePerBox: m.pricePerBox })))
        const hRes = await fetch('/api/sheets/sales')
        const hData = await hRes.json()
        setHistory(hData.history ?? [])
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate() {
    if (!editingId) return
    setSaving(true)
    try {
      const res = await fetch('/api/sheets/sales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      if (res.ok) {
        setEditingId(null)
        const hRes = await fetch('/api/sheets/sales')
        const hData = await hRes.json()
        setHistory(hData.history ?? [])
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(item: SaleHistoryItem) {
    const reason = prompt(`${t.sales.delete} "${item.menu}"? ${t.sales.reason}:`)
    if (reason === null) return
    setSaving(true)
    try {
      const res = await fetch(`/api/sheets/sales?id=${item.id}&reason=${encodeURIComponent(reason)}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setDeletedLogs(prev => [{ item, reason, timestamp: new Date().toLocaleTimeString() }, ...prev])
        const hRes = await fetch('/api/sheets/sales')
        const hData = await hRes.json()
        setHistory(hData.history ?? [])
      }
    } catch (err: any) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 min-h-[60vh]">
      <div className="w-12 h-12 bg-cinnabar/10 rounded-xl flex items-center justify-center text-cinnabar animate-bounce mb-4">
        <Zap size={24} fill="currentColor" />
      </div>
      <p className="text-slate-400 font-semibold tracking-wide animate-pulse">{t.common.loading}</p>
    </div>
  )

  const paymentHistory = history.filter(h => h.totalRecorded > 0)

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10 pb-32">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-4xl font-bold text-slate-deep tracking-tight">{t.sales.title}</h1>
           <p className="text-slate-500 text-base mt-2">Record daily menu sales and payments.</p>
        </div>
        {done && (
          <span className="badge-base badge-success py-2.5 px-4 text-sm animate-in slide-in-from-right-4">
             {t.common.save} Success!
          </span>
        )}
      </div>
      
      {/* Menu Input Form */}
      <div className="grid grid-cols-1 gap-5">
        {menuSales.map((sale, i) => (
          <div key={sale.menu} className="card-base flex items-center gap-6 group hover:border-cinnabar/30 transition-all p-8">
            <div className="w-14 h-14 bg-mist-gray rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-cinnabar/10 group-hover:text-cinnabar transition-colors shrink-0">
               <ShoppingBag size={28} />
            </div>
            <div className="flex-1 font-bold text-slate-deep text-xl">{sale.menu}</div>
            <div className="flex items-center gap-8">
               <div className="w-24 text-center">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Boxes</label>
                  <NumberInput 
                    className="w-full h-12 bg-mist-gray border-none rounded-xl text-center font-bold text-slate-deep focus:ring-2 focus:ring-cinnabar/20 outline-none text-lg"
                    value={sale.boxes}
                    onChange={val => handleBoxChange(i, val)}
                  />
               </div>
               <div className="w-28 text-right">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-widest">€/Box</label>
                  <NumberInput 
                    className="w-full h-12 bg-mist-gray border-none rounded-xl text-right px-4 font-bold text-slate-deep focus:ring-2 focus:ring-cinnabar/20 outline-none text-lg"
                    value={sale.pricePerBox}
                    onChange={val => handlePriceChange(i, val)}
                  />
               </div>
               <div className="w-24 text-right font-bold text-cinnabar text-2xl">
                 €{(sale.boxes * sale.pricePerBox).toFixed(1)}
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Summary Card */}
      <div className="card-base bg-slate-deep text-white border-none shadow-xl shadow-slate-900/20 space-y-10 p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5">
           <Banknote size={200} />
        </div>
        
        <div className="flex justify-between items-end relative z-10">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Estimated Revenue</p>
            <div className="text-5xl font-bold text-white tracking-tight">€{totalSales.toFixed(2)}</div>
          </div>
          <div className={cn(
            "badge-base py-2 px-4 text-sm",
            totalRecorded === totalSales ? "bg-emerald/20 text-emerald" : "bg-amber/20 text-amber"
          )}>
            {totalRecorded === totalSales ? "BALANCED" : "GAP: €" + (totalRecorded - totalSales).toFixed(2)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
               <Banknote size={18} className="text-cinnabar" /> {t.sales.cash}
            </label>
            <div className="relative">
               <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-xl">€</span>
               <NumberInput 
                className="w-full h-16 bg-white/5 border border-white/10 rounded-xl pl-12 pr-5 text-3xl font-bold text-white focus:bg-white/10 focus:ring-2 focus:ring-cinnabar/50 outline-none transition-all"
                value={cash}
                onChange={val => setCash(val)}
              />
            </div>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
               <CreditCard size={18} className="text-cinnabar" /> {t.sales.card}
            </label>
            <div className="relative">
               <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-xl">€</span>
               <NumberInput 
                className="w-full h-16 bg-white/5 border border-white/10 rounded-xl pl-12 pr-5 text-3xl font-bold text-white focus:bg-white/10 focus:ring-2 focus:ring-cinnabar/50 outline-none transition-all"
                value={card}
                onChange={val => setCard(val)}
              />
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={handleSave}
        disabled={saving || totalSales === 0}
        className="btn-primary w-full h-20 text-xl shadow-2xl shadow-cinnabar/20"
      >
        {saving ? "Saving..." : t.sales.save} <ArrowRight size={24} />
      </button>

      {/* History Tables */}
      <div className="pt-16 space-y-16">
        {/* Items History */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold text-slate-deep flex items-center gap-3 ml-1">
             <ShoppingBag size={24} className="text-cinnabar" />
             Menu Sales History
          </h2>
          <div className="card-base p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-mist-gray text-xs font-bold text-slate-400 uppercase tracking-widest border-bottom border-subtle-border">
                  <th className="text-left py-5 px-8">{t.manageMenus.name}</th>
                  <th className="text-center py-5 px-8">Qty</th>
                  <th className="text-right py-5 px-8">Rate</th>
                  <th className="text-right py-5 px-8">Total</th>
                  <th className="text-right py-5 px-8">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle-border">
                {history.map((h) => {
                  const isEditing = editingId === h.id
                  return (
                    <tr key={h.id} className="hover:bg-mist-gray/30 transition-colors group">
                      <td className="py-5 px-8">
                        {isEditing ? (
                          <input className="w-full h-11 bg-white border border-cinnabar/30 rounded-xl px-4 text-base font-bold" value={editForm.menu} onChange={e => setEditForm({...editForm, menu: e.target.value})} />
                        ) : (
                          <div>
                            <div className="font-bold text-slate-deep text-base">{h.menu}</div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">{h.date}</div>
                          </div>
                        )}
                      </td>
                      <td className="py-5 px-8 text-center font-bold text-slate-500 text-base">
                        {isEditing ? (
                          <NumberInput className="w-20 h-11 bg-white border border-cinnabar/30 rounded-xl text-center font-bold" value={editForm.boxes ?? 0} onChange={val => setEditForm({...editForm, boxes: val})} />
                        ) : h.boxes}
                      </td>
                      <td className="py-5 px-8 text-right font-medium text-slate-400 text-base">
                        {isEditing ? (
                          <NumberInput className="w-20 h-11 bg-white border border-cinnabar/30 rounded-xl text-right pr-3 font-bold" value={editForm.pricePerBox ?? 0} onChange={val => setEditForm({...editForm, pricePerBox: val})} />
                        ) : `€${h.pricePerBox.toFixed(1)}`}
                      </td>
                      <td className="py-5 px-8 text-right font-bold text-cinnabar text-lg">€{h.total.toFixed(1)}</td>
                      <td className="py-5 px-8 text-right">
                         <div className="flex justify-end gap-3">
                           {isEditing ? (
                             <>
                               <button onClick={handleUpdate} className="w-10 h-10 bg-emerald/10 text-emerald rounded-xl flex items-center justify-center active:scale-90"><Check size={20} /></button>
                               <button onClick={() => setEditingId(null)} className="w-10 h-10 bg-mist-gray text-slate-400 rounded-xl flex items-center justify-center active:scale-90"><X size={20} /></button>
                             </>
                           ) : (
                             <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={() => { setEditingId(h.id); setEditForm(h); }} className="w-10 h-10 bg-mist-gray text-slate-400 hover:text-cinnabar rounded-xl flex items-center justify-center"><Edit2 size={18} /></button>
                               <button onClick={() => handleDelete(h)} className="w-10 h-10 bg-mist-gray text-slate-300 hover:text-error-red rounded-xl flex items-center justify-center"><Trash2 size={18} /></button>
                             </div>
                           )}
                         </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Payments History */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold text-slate-deep flex items-center gap-3 ml-1">
             <CreditCard size={24} className="text-cinnabar" />
             Payment Settlement History
          </h2>
          <div className="card-base p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-deep text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <th className="text-left py-5 px-8">Date</th>
                  <th className="text-right py-5 px-8">Cash</th>
                  <th className="text-right py-5 px-8">Card</th>
                  <th className="text-right py-5 px-8">Total Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle-border">
                {paymentHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-mist-gray/30 transition-colors">
                    <td className="py-5 px-8 text-xs font-bold text-slate-400 uppercase tracking-widest">{h.date}</td>
                    <td className="py-5 px-8 text-right font-medium text-slate-600 text-base">€{h.cash.toFixed(1)}</td>
                    <td className="py-5 px-8 text-right font-medium text-slate-600 text-base">€{h.card.toFixed(1)}</td>
                    <td className="py-5 px-8 text-right font-bold text-emerald text-xl">€{h.totalRecorded.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Deletion Log */}
      {deletedLogs.length > 0 && (
        <div className="pt-12 space-y-6">
          <h2 className="text-xl font-bold text-error-red flex items-center gap-2 ml-1">
             <AlertCircle size={20} />
             System Deletion Audit
          </h2>
          <div className="card-base bg-error-red/5 border-error-red/10 p-0 overflow-hidden">
            <table className="w-full text-left text-sm font-bold border-collapse">
              <thead>
                <tr className="bg-error-red/10 text-[10px] font-black uppercase text-error-red/70 tracking-widest">
                  <th className="px-6 py-4">Original Entry</th>
                  <th className="px-6 py-4">Deletion Reason</th>
                  <th className="px-6 py-4 text-right">Audit Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-error-red/10">
                {deletedLogs.map((log, i) => (
                  <tr key={i} className="text-error-red/80">
                    <td className="px-6 py-4">
                      <span className="line-through">{log.item.menu}</span>
                      <p className="text-[9px] uppercase tracking-widest opacity-60 font-bold">{log.item.date}</p>
                    </td>
                    <td className="px-6 py-4 italic font-medium">"{log.reason}"</td>
                    <td className="px-6 py-4 text-right text-[10px] font-bold opacity-60 uppercase">{log.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
