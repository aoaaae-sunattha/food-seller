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
  AlertCircle,
  Plus,
  Search,
  Utensils,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MenuSale {
  id: string
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

  const [showAddMenu, setShowAddMenu] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [priceError, setPriceError] = useState(false)

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState<SaleHistoryItem | null>(null)
  const [deleteReason, setDeleteReason] = useState('')

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
      setMenuSales(menus.map((m: MenuTemplate) => ({ id: crypto.randomUUID(), menu: m.nameTh, boxes: 0, pricePerBox: m.pricePerBox })))
      setHistory(salesData.history ?? [])
      setLoading(false)
    })
  }, [])

  const handleBoxChange = (id: string, val: number) => {
    setMenuSales(prev => prev.map(s => s.id === id ? { ...s, boxes: val } : s))
    if (priceError) setPriceError(false)
  }

  const handlePriceChange = (id: string, val: number) => {
    setMenuSales(prev => prev.map(s => s.id === id ? { ...s, pricePerBox: val } : s))
    if (priceError) setPriceError(false)
  }

  const removeRow = (id: string) => {
    setMenuSales(prev => prev.filter(s => s.id !== id))
    if (priceError) setPriceError(false)
  }

  const addRow = (menuName: string, price: number) => {
    setMenuSales(prev => [...prev, {
      id: crypto.randomUUID(),
      menu: menuName,
      boxes: 0,
      pricePerBox: price
    }])
    if (priceError) setPriceError(false)
  }

  const totalSales = menuSales.reduce((sum, s) => sum + (s.boxes * s.pricePerBox), 0)

  const filteredMenus = menus.filter(m =>
    m.nameTh.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const totalRecorded = cash + card

  async function handleSave() {
    const salesToSave = menuSales.filter(s => s.boxes > 0)
    const hasZeroPrice = salesToSave.some(s => s.pricePerBox <= 0)

    if (hasZeroPrice) {
      setPriceError(true)
      return
    }

    setSaving(true)
    const date = new Date().toISOString().split('T')[0]
    try {
      const res = await fetch('/api/sheets/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, menuSales: salesToSave, cash, card })
      })
      if (res.ok) {
        setDone(true)
        setPriceError(false)
        setTimeout(() => setDone(false), 3000)
        setCash(0)
        setCard(0)
        setMenuSales(menus.map(m => ({ id: crypto.randomUUID(), menu: m.nameTh, boxes: 0, pricePerBox: m.pricePerBox })))
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

  function openDeleteConfirm(item: SaleHistoryItem) {
    setItemToDelete(item)
    setDeleteReason('')
  }

  async function confirmDelete() {
    if (!itemToDelete || !deleteReason.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/sheets/sales?id=${itemToDelete.id}&reason=${encodeURIComponent(deleteReason)}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setDeletedLogs(prev => [{ item: itemToDelete, reason: deleteReason, timestamp: new Date().toLocaleTimeString() }, ...prev])
        const hRes = await fetch('/api/sheets/sales')
        const hData = await hRes.json()
        setHistory(hData.history ?? [])
        setItemToDelete(null)
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
          <div key={sale.id} data-testid={`sale-row-${i}`} className="card-base flex items-center gap-6 group hover:border-cinnabar/30 transition-all p-8">
            <div className="w-14 h-14 bg-mist-gray rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-cinnabar/10 group-hover:text-cinnabar transition-colors shrink-0">
               <ShoppingBag size={28} />
            </div>
            <div className="flex-1">
               <p className="font-bold text-slate-deep text-xl">{sale.menu}</p>
               {sale.boxes > 0 && sale.pricePerBox <= 0 && (
                 <p className="text-orange-500 font-bold text-sm mt-1">
                   There is no price assigned, please add (Or remove the menu before submitting)
                 </p>
               )}
            </div>
            <div className="flex items-center gap-8">
               <div className="w-24 text-center">
                  <label className="block text-[14px] font-bold text-slate-400 uppercase mb-2 tracking-widest">Boxes</label>
                  <NumberInput
                    data-testid={`sale-boxes-${i}`}
                    className="w-full h-12 bg-mist-gray border-none rounded-xl text-center font-bold text-slate-deep focus:ring-2 focus:ring-cinnabar/20 outline-none text-lg"
                    value={sale.boxes}
                    onChange={val => handleBoxChange(sale.id, val)}
                  />
               </div>
               <div className="w-28 text-right">
                  <label className="block text-[14px] font-bold text-slate-400 uppercase mb-2 tracking-widest">€/Box</label>
                  <NumberInput
                    data-testid={`sale-price-${i}`}
                    className="w-full h-12 bg-mist-gray border-none rounded-xl text-right px-4 font-bold text-slate-deep focus:ring-2 focus:ring-cinnabar/20 outline-none text-lg"
                    value={sale.pricePerBox}
                    onChange={val => handlePriceChange(sale.id, val)}
                  />
               </div>
               <div className="w-24 text-right font-bold text-cinnabar text-2xl">
                 €{(sale.boxes * sale.pricePerBox).toFixed(1)}
               </div>
               <button
                 onClick={() => removeRow(sale.id)}
                 className="p-2 text-slate-300 hover:text-error-red transition-colors"
                 title="Remove from today's list"
               >
                 <Trash2 size={20} />
               </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Menu Button */}
      <div className="relative">
        <button
          className="w-full py-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-cinnabar hover:text-cinnabar transition-all flex items-center justify-center gap-2"
          onClick={() => setShowAddMenu(true)}
        >
          <Plus size={24} /> Add Menu or Custom Entry
        </button>

        {showAddMenu && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
              onClick={() => setShowAddMenu(false)}
            />
            
            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 slide-in-from-top-4 duration-300">
              <div className="p-6 border-b border-mist-gray">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
                  <input
                    autoFocus
                    className="w-full h-14 bg-mist-gray rounded-2xl pl-12 pr-12 outline-none focus:ring-2 focus:ring-cinnabar/20 font-bold text-xl text-slate-deep placeholder:text-slate-400"
                    placeholder="Search menus or type custom name..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') setShowAddMenu(false)
                    }}
                  />
                  <button 
                    onClick={() => setShowAddMenu(false)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-300 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="max-h-[50vh] overflow-y-auto p-3 space-y-1 custom-scrollbar">
                {filteredMenus.length > 0 ? (
                  <div className="px-3 pt-2 pb-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Available Menus</p>
                  </div>
                ) : searchTerm && !filteredMenus.length ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                       <Search className="text-slate-300" size={32} />
                    </div>
                    <p className="text-slate-500 font-bold text-lg">No menus found matching "{searchTerm}"</p>
                  </div>
                ) : null}

                {filteredMenus.map(m => {
                  const isAdded = menuSales.some(s => s.menu === m.nameTh)
                  return (
                    <button
                      key={m.id}
                      onClick={() => { addRow(m.nameTh, m.pricePerBox); setShowAddMenu(false); setSearchTerm('') }}
                      className="w-full text-left p-4 hover:bg-mist-gray rounded-xl font-bold text-slate-deep flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                          <Utensils size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span>{m.nameTh}</span>
                          {isAdded && <span className="text-[10px] text-emerald font-black uppercase tracking-tighter">Already in list</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="badge-base bg-slate-100 text-slate-500 py-1.5 px-3">€{m.pricePerBox}</span>
                        <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" size={18} />
                      </div>
                    </button>
                  )
                })}

                {searchTerm && !filteredMenus.some(m => m.nameTh.toLowerCase() === searchTerm.toLowerCase()) && (
                  <div className="mt-4 pt-4 border-t border-mist-gray">
                    <div className="px-3 pb-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Custom Entry</p>
                    </div>
                    <button
                      onClick={() => { addRow(searchTerm, 12.0); setShowAddMenu(false); setSearchTerm('') }}
                      className="w-full text-left p-4 bg-cinnabar/5 hover:bg-cinnabar/10 text-cinnabar rounded-xl font-bold flex items-center justify-between group transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-cinnabar/10 rounded-xl flex items-center justify-center">
                          <Plus size={20} />
                        </div>
                        <div className="flex flex-col">
                          <span>Add "{searchTerm}"</span>
                          <span className="text-[10px] opacity-70">Custom item with default €12 price</span>
                        </div>
                      </div>
                      <ArrowRight size={18} />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="bg-slate-50 p-4 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest px-6">
                <span>Press ESC to close</span>
                <span className="flex items-center gap-1.5"><History size={12} /> {filteredMenus.length} items found</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Summary Card */}
      <div className="card-base bg-slate-deep text-white border-none shadow-xl shadow-slate-900/20 space-y-10 p-10 relative overflow-hidden">
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Estimated Revenue</p>
            <div className="text-5xl font-bold text-white tracking-tight">€{totalSales.toFixed(2)}</div>
          </div>
          <div className={cn(
            "badge-base py-2 px-4 text-sm -mt-[14px]",
            totalRecorded === totalSales ? "bg-emerald/20 text-emerald" : "bg-amber/20 text-amber"
          )}>
            {totalRecorded === totalSales ? "BALANCED" : "GAP: €" + (totalRecorded - totalSales).toFixed(2)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <div className="space-y-3">
            <label className="flex items-center gap-3 text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">
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
            <label className="flex items-center gap-3 text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">
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

      {priceError && (
        <div className="flex items-center gap-4 p-6 bg-error-red/10 border-2 border-error-red/30 rounded-2xl text-error-red animate-in zoom-in-95 duration-300 shadow-lg shadow-error-red/5">
           <div className="w-12 h-12 bg-error-red text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-error-red/20">
             <AlertCircle size={28} />
           </div>
           <div>
             <p className="font-bold text-lg leading-tight">Price Missing</p>
             <p className="text-error-red/80 font-semibold mt-1">Please set up the price or remove this menu before submit</p>
           </div>
        </div>
      )}

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
        {history.length > 0 && (
          <section className="space-y-8">
            <h2 className="text-2xl font-bold text-slate-deep flex items-center gap-3 ml-1">
               <ShoppingBag size={24} className="text-cinnabar" />
               Daily Menu Sales History
            </h2>
            <div className="card-base p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-mist-gray text-sm font-bold text-slate-400 uppercase tracking-widest">
                      <th className="py-5 px-8">Date</th>
                      <th className="py-5 px-8">Menu Item</th>
                      <th className="py-5 px-8 text-center">Boxes</th>
                      <th className="py-5 px-8 text-right">Price</th>
                      <th className="py-5 px-8 text-right">Subtotal</th>
                      <th className="py-5 px-8 text-right w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-subtle-border">
                    {history.map((h) => {
                      const isEditing = editingId === h.id
                      return (
                        <tr key={h.id} className="hover:bg-mist-gray/30 transition-colors group">
                          <td className="py-5 px-8 text-sm font-bold text-slate-400 uppercase tracking-widest">{h.date}</td>
                          <td className="py-5 px-8 font-bold text-slate-deep text-lg">{h.menu}</td>
                          <td className="py-5 px-8 text-center">
                             {isEditing ? (
                               <NumberInput
                                 className="w-20 h-10 border border-cinnabar/30 rounded-lg text-center font-bold bg-white"
                                 value={editForm.boxes ?? 0}
                                 onChange={val => setEditForm({ ...editForm, boxes: val })}
                               />
                             ) : (
                               <span className="badge-base bg-slate-100 text-slate-600 font-bold px-3 py-1">{h.boxes}</span>
                             )}
                          </td>
                          <td className="py-5 px-8 text-right font-medium text-slate-500">
                             {isEditing ? (
                               <NumberInput
                                 className="w-24 h-10 border border-cinnabar/30 rounded-lg text-right px-3 font-bold bg-white"
                                 value={editForm.pricePerBox ?? 0}
                                 onChange={val => setEditForm({ ...editForm, pricePerBox: val })}
                               />
                             ) : (
                               `€${h.pricePerBox.toFixed(1)}`
                             )}
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
                                   <button onClick={() => openDeleteConfirm(h)} className="w-10 h-10 bg-mist-gray text-slate-300 hover:text-error-red rounded-xl flex items-center justify-center"><Trash2 size={18} /></button>
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
            </div>
          </section>
        )}

        {/* Payment History */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold text-slate-deep flex items-center gap-3 ml-1">
             <CreditCard size={24} className="text-cinnabar" />
             Payment Settlement History
          </h2>
          <div className="card-base p-0 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-deep text-sm font-bold text-slate-400 uppercase tracking-widest">
                  <th className="text-left py-5 px-8">Date</th>
                  <th className="text-right py-5 px-8">Cash</th>
                  <th className="text-right py-5 px-8">Card</th>
                  <th className="text-right py-5 px-8">Total Settlement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle-border">
                {paymentHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-mist-gray/30 transition-colors">
                    <td className="py-5 px-8 text-sm font-bold text-slate-400 uppercase tracking-widest">{h.date}</td>
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
                <tr className="bg-error-red/10 text-[14px] font-black uppercase text-error-red/70 tracking-widest">
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
                      <p className="text-[14px] uppercase tracking-widest opacity-60 font-bold">{log.item.date}</p>
                    </td>
                    <td className="px-6 py-4 italic font-medium">"{log.reason}"</td>
                    <td className="px-6 py-4 text-right text-[14px] font-bold opacity-60 uppercase">{log.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          {/* Backdrop (non-clickable) */}
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            {/* Top Close Button */}
            <button 
              onClick={() => setItemToDelete(null)}
              className="absolute top-5 right-5 w-10 h-10 bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full flex items-center justify-center transition-colors z-20"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="p-8 text-center border-b border-mist-gray">
              <div className="w-20 h-20 bg-error-red/10 text-error-red rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-deep tracking-tight mb-2">Delete Record?</h3>
              <p className="text-slate-500 font-medium">
                Are you sure you want to delete the sale for <span className="text-slate-deep font-bold">"{itemToDelete.menu}"</span>? 
                This action cannot be undone.
              </p>
            </div>

            <div className="p-8 space-y-6 bg-slate-50/50">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Reason for deletion</label>
                <input
                  autoFocus
                  className={`w-full h-14 bg-white border ${!deleteReason.trim() ? 'border-error-red focus:ring-error-red/20' : 'border-slate-200 focus:ring-slate-400/20'} rounded-2xl px-5 outline-none font-bold text-lg text-slate-deep placeholder:text-slate-300 transition-all`}
                  placeholder="e.g., Wrong quantity, duplicate entry..."
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 h-16 bg-white border-2 border-slate-200 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  disabled={saving || !deleteReason.trim()}
                  className="flex-1 h-16 bg-error-red text-white font-bold rounded-2xl shadow-lg shadow-error-red/30 hover:bg-error-red/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Trash2 size={20} /> Delete</>}
                </button>
              </div>
            </div>
            
            <div className="bg-slate-100/50 p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
              Safety Check: History will be logged
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
