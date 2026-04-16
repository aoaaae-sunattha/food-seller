'use client'
import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import UploadZone from '@/components/receipt/UploadZone'
import ItemReviewTable from '@/components/receipt/ItemReviewTable'
import type { ReceiptItem } from '@/types'
import { 
  ScanLine, 
  History, 
  Trash2, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  FileText,
  Zap,
  Loader2,
  X,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ReceiptPage() {
  const { t } = useLanguage()
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [store, setStore] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [total, setTotal] = useState<number>(0)
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  
  // Details state
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalItems, setModalItems] = useState<any[]>([])
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    try {
      const res = await fetch('/api/sheets/purchases')
      if (res.ok) {
        const data = await res.json()
        const sorted = data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setHistory(sorted)
      }
    } catch (e) {
      console.error('Failed to fetch history', e)
    }
  }

  async function toggleDetails(summary: any) {
    if (expandedId === summary.id) {
      setExpandedId(null)
      return
    }

    setExpandedId(summary.id)
    setModalLoading(true)
    setModalItems([]) 
    
    try {
      const res = await fetch(`/api/sheets/purchases?id=${summary.id}`)
      if (res.ok) {
        const data = await res.json()
        setModalItems(data)
      }
    } catch (e) {
      console.error('Failed to fetch details', e)
    } finally {
      setModalLoading(false)
    }
  }

  async function confirmDelete() {
    if (!deleteConfirmId) return
    const id = deleteConfirmId
    setDeleteConfirmId(null)
    setLoading(true)
    try {
      const res = await fetch('/api/sheets/purchases', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      if (res.ok) {
        await fetchHistory()
      }
    } catch (e) {
      alert('Failed to delete receipt')
    } finally {
      setLoading(false)
    }
  }

  async function handleFile(file: File) {
    setFile(file)
    setPreview(URL.createObjectURL(file))
    setLoading(true)
    
    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch('/api/ocr', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        if (data.items) {
          const isDiscountLine = (item: any) =>
            item.isDiscount ||
            Number(item.total) < 0 ||
            /remise|discount|coupon|r[eé]duction/i.test(String(item.nameFr || ''))

          const mappedItems: ReceiptItem[] = data.items
            .filter((item: any) => !isDiscountLine(item))
            .map((item: any) => {
              const qty = Number(item.qty) || 1
              let pricePerUnit = Number(item.pricePerUnit) || 0
              let lineTotal = Number(item.total) || 0

              if (lineTotal === 0 && pricePerUnit !== 0) lineTotal = Number((qty * pricePerUnit).toFixed(2))
              else if (pricePerUnit === 0 && lineTotal !== 0) pricePerUnit = Number((lineTotal / qty).toFixed(2))

              return {
                nameFr: item.nameFr || '',
                nameTh: item.nameTh || '', 
                suggestedTh: item.nameTh || '',
                qty,
                unit: item.unit || 'pc',
                pricePerUnit,
                total: lineTotal,
                netPrice: pricePerUnit,
                vatRate: 0,
                vatAmount: 0,
                discount: 0,
                isDiscount: false
              }
            })
          setItems(mappedItems)
        }
        if (data.store) setStore(data.store)
        if (data.date) setDate(data.date)
        if (data.total) setTotal(data.total)
      }
    } catch (err: any) {
      console.error('OCR failed:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    setLoading(true)
    try {
      const itemsGrossTotalSum = items.reduce((sum, item) => sum + item.total, 0)
      const discrepancy = total - itemsGrossTotalSum

      const formData = new FormData()
      formData.append('date', date)
      formData.append('store', store)
      formData.append('total', total.toString())
      formData.append('discrepancy', discrepancy.toString())
      formData.append('items', JSON.stringify(items))
      if (file) formData.append('image', file)

      const res = await fetch('/api/sheets/purchases', { method: 'POST', body: formData })
      if (res.ok) {
        setDone(true)
        fetchHistory()
      }
    } catch (err: any) {
      console.error('Save failed:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleReconcile() {
    if (items.length === 0 || total <= 0) return
    const currentItemsSum = items.reduce((sum, item) => sum + item.total, 0)
    if (currentItemsSum === 0) return
    const ratio = total / currentItemsSum
    const adjustedItems = items.map(item => {
      const qty = item.qty
      const currentLineTotal = item.total
      const newTotal = Number((currentLineTotal * ratio).toFixed(2))
      const newPricePerUnit = Number((newTotal / qty).toFixed(2))
      const lineDiscrepancy = currentLineTotal - newTotal
      return {
        ...item,
        pricePerUnit: newPricePerUnit,
        total: newTotal,
        discount: Number(lineDiscrepancy.toFixed(2)),
      }
    })
    setItems(adjustedItems)
  }

  const itemsGrossTotalSum = items.reduce((sum, item) => sum + item.total, 0)
  const discrepancy = total - itemsGrossTotalSum

  if (done) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-700">
      <div className="card-base max-w-md w-full text-center space-y-8">
        <div className="w-24 h-24 bg-emerald/10 text-emerald rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 size={48} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-deep">{t.common.save} Success!</h2>
          <p className="text-slate-500 text-base mt-2">Receipt has been recorded to Google Sheets.</p>
        </div>
        <button onClick={() => window.location.reload()} className="btn-primary w-full h-14 text-lg">
           Awesome, next! <ArrowRight size={20} />
        </button>
      </div>
    </div>
  )

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-10">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold text-slate-deep tracking-tight">{t.nav.receipt}</h1>
        <div className="w-12 h-12 bg-cinnabar/10 text-cinnabar rounded-full flex items-center justify-center">
          <ScanLine size={24} />
        </div>
      </div>
      
      {/* OCR Loading State */}
      {loading && !items.length && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md bg-slate-900/20 px-6">
          <div className="card-base max-w-md w-full text-center space-y-8 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-cinnabar/20 overflow-hidden">
                <div className="h-full bg-cinnabar w-1/3 animate-[progress_2s_infinite]" />
             </div>
             <div className="w-20 h-20 bg-cinnabar/10 text-cinnabar rounded-2xl flex items-center justify-center mx-auto">
                <Loader2 size={40} className="animate-spin" />
             </div>
             <div>
                <h3 className="text-2xl font-bold text-slate-deep">Analyzing Receipt</h3>
                <p className="text-slate-500 text-base mt-2">Gemini Vision AI is extracting items...</p>
             </div>
          </div>
        </div>
      )}

      {!preview ? (
        <div className="card-base p-3">
          <UploadZone onFile={handleFile} preview={preview} />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="card-base space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Purchase Date</label>
                <input 
                  type="date"
                  className="w-full h-16 bg-mist-gray border-none rounded-xl px-5 text-xl font-bold text-slate-deep focus:ring-2 focus:ring-cinnabar/20 outline-none transition-all"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">Total Amount Paid</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 font-bold text-cinnabar text-xl">€</span>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full h-16 bg-mist-gray border-none rounded-xl pl-10 pr-5 text-xl font-bold text-slate-deep focus:ring-2 focus:ring-cinnabar/20 outline-none transition-all"
                    value={total}
                    onChange={e => setTotal(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">{t.receipt.store}</label>
              <input 
                className="w-full h-16 bg-mist-gray border-none rounded-xl px-5 text-xl font-bold text-slate-deep focus:ring-2 focus:ring-cinnabar/20 outline-none transition-all"
                value={store}
                onChange={e => setStore(e.target.value)}
                placeholder="Store name..."
              />
            </div>
            
            <div className="pt-6">
              <ItemReviewTable items={items} onChange={setItems} showAdvanced={Math.abs(discrepancy) > 0.01} />
              
              {items.length > 0 && Math.abs(discrepancy) > 0.01 && (
                <div className="mt-8 bg-periwinkle/30 p-6 rounded-2xl border border-periwinkle/50 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <AlertCircle className="text-cinnabar" size={24} />
                      <div className="text-sm font-semibold text-slate-600">
                        Discrepancy detected: <span className="font-bold text-cinnabar text-lg">€{discrepancy.toFixed(2)}</span>
                      </div>
                   </div>
                   <button 
                    onClick={handleReconcile}
                    className="text-sm font-bold bg-cinnabar text-white px-4 py-2 rounded-xl active:scale-95 transition-all shadow-md shadow-cinnabar/20"
                   >
                     RECONCILE NOW
                   </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-6">
            <button 
              onClick={() => { setPreview(null); setFile(null); setItems([]); setStore(''); setTotal(0) }}
              className="btn-secondary flex-1 h-16 text-lg"
            >
              Discard
            </button>
            <button 
              onClick={handleConfirm}
              disabled={loading || items.length === 0}
              className="btn-primary flex-1 h-16 text-lg"
            >
              {loading ? <Loader2 className="animate-spin" /> : t.receipt.confirm}
            </button>
          </div>
        </div>
      )}

      {/* History Section */}
      <div className="space-y-6 pt-6">
        <div className="flex items-center justify-between ml-1">
          <h2 className="text-2xl font-bold text-slate-deep flex items-center gap-3">
            <History size={24} className="text-cinnabar" />
            Purchase History
          </h2>
        </div>
        
        <div className="card-base p-0 overflow-hidden">
          {history.length === 0 ? (
            <div className="p-16 text-center text-slate-400 font-medium italic text-lg">No receipts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-mist-gray text-sm font-bold text-slate-400 uppercase tracking-widest border-bottom border-subtle-border">
                    <th className="text-left py-5 px-8">Date</th>
                    <th className="text-left py-5 px-8">Store</th>
                    <th className="text-right py-5 px-8">Total</th>
                    <th className="text-center py-5 px-8">Status</th>
                    <th className="text-right py-5 px-8">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle-border">
                  {history.map((h) => (
                    <React.Fragment key={h.id}>
                      <tr className="hover:bg-mist-gray/30 transition-colors group">
                        <td className="py-5 px-8 text-base font-bold text-slate-700">{h.date}</td>
                        <td className="py-5 px-8 text-base font-semibold text-slate-600">{h.store}</td>
                        <td className="py-5 px-8 text-right text-base font-bold text-slate-deep">€{Number(h.total).toFixed(2)}</td>
                        <td className="py-5 px-8 text-center">
                          <span className={cn(
                            "badge-base py-1.5 px-4 text-sm",
                            Number(h.discrepancy) === 0 ? "badge-success" : "badge-warning"
                          )}>
                            {Number(h.discrepancy) === 0 ? 'CLEARED' : 'ADJUSTED'}
                          </span>
                        </td>
                        <td className="py-5 px-8 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button 
                              onClick={() => toggleDetails(h)}
                              className={cn(
                                "w-11 h-11 rounded-xl flex items-center justify-center transition-all",
                                expandedId === h.id ? "bg-cinnabar text-white" : "bg-mist-gray text-slate-500 hover:text-cinnabar"
                              )}
                            >
                              {expandedId === h.id ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
                            </button>
                            {h.driveUrl && (
                              <a href={h.driveUrl} target="_blank" className="w-11 h-11 bg-mist-gray text-slate-500 hover:text-cinnabar rounded-xl flex items-center justify-center">
                                <ImageIcon size={22} />
                              </a>
                            )}
                            <button onClick={() => setDeleteConfirmId(h.id)} className="w-11 h-11 bg-mist-gray text-slate-300 hover:text-error-red hover:bg-error-red/10 rounded-xl flex items-center justify-center transition-all">
                              <Trash2 size={22} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === h.id && (
                        <tr>
                          <td colSpan={5} className="bg-mist-gray/20 px-8 py-6">
                            <div className="card-base bg-white border-none shadow-none p-6 overflow-hidden animate-in slide-in-from-top-2 duration-300">
                               {modalLoading ? (
                                 <div className="py-12 flex items-center justify-center gap-4">
                                   <Loader2 size={24} className="animate-spin text-cinnabar" />
                                   <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Extracting...</span>
                                 </div>
                               ) : (
                                 <table className="w-full text-sm">
                                   <thead>
                                     <tr className="text-sm font-bold text-slate-400 uppercase border-bottom border-subtle-border">
                                       <th className="text-left pb-4">Item</th>
                                       <th className="text-center pb-4">Qty</th>
                                       <th className="text-right pb-4">Price</th>
                                       <th className="text-right pb-4">Total</th>
                                     </tr>
                                   </thead>
                                   <tbody className="divide-y divide-subtle-border">
                                     {modalItems.map((item, idx) => (
                                       <tr key={idx}>
                                         <td className="py-4">
                                           <div className="font-bold text-slate-deep text-base">{item.nameTh}</div>
                                           <div className="text-sm text-slate-400 font-medium">{item.nameFr}</div>
                                         </td>
                                         <td className="py-4 text-center font-bold text-slate-500 text-base">{item.qty} {item.unit}</td>
                                         <td className="py-4 text-right font-medium text-slate-500 text-base">€{item.pricePerUnit.toFixed(2)}</td>
                                         <td className="py-4 text-right font-bold text-slate-deep text-lg">€{item.total.toFixed(2)}</td>
                                       </tr>
                                     ))}
                                   </tbody>
                                 </table>
                               )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="card-base max-w-sm w-full space-y-6">
              <div className="w-14 h-14 bg-error-red/10 text-error-red rounded-2xl flex items-center justify-center mx-auto">
                 <AlertCircle size={32} />
              </div>
              <div className="text-center">
                 <h3 className="text-lg font-bold text-slate-deep">Delete Receipt?</h3>
                 <p className="text-sm text-slate-500 mt-1">This action cannot be undone and will remove all records from Google Sheets.</p>
              </div>
              <div className="flex gap-3">
                 <button onClick={() => setDeleteConfirmId(null)} className="btn-secondary flex-1">Cancel</button>
                 <button onClick={confirmDelete} className="btn-primary bg-error-red flex-1">Delete</button>
              </div>
           </div>
        </div>
      )}
    </div>
  )
}
