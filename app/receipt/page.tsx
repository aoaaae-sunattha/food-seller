'use client'
import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import UploadZone from '@/components/receipt/UploadZone'
import ItemReviewTable from '@/components/receipt/ItemReviewTable'
import type { ReceiptItem } from '@/types'

export default function ReceiptPage() {
  const { t } = useLanguage()
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [store, setStore] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [total, setTotal] = useState<number>(0)
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [discount, setDiscount] = useState<number>(0)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  
  // Modal & History State
  const [showModal, setShowModal] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalItems, setModalItems] = useState<any[]>([])
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    try {
      const res = await fetch('/api/sheets/purchases')
      if (res.ok) {
        const data = await res.json()
        setHistory(data)
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
    setModalItems([]) // Clear previous items
    
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

  async function fetchDetails(summary: any) {
    setSelectedReceipt(summary)
    setShowModal(true)
    setModalLoading(true)
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

  function handleDelete(id: string) {
    setDeleteConfirmId(id)
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
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Failed to delete receipt')
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
          // Detect discount lines: by flag, negative total, or name containing REMISE/DISCOUNT/COUPON
          const isDiscountLine = (item: any) =>
            item.isDiscount ||
            Number(item.total) < 0 ||
            /remise|discount|coupon|r[eé]duction/i.test(String(item.nameFr || ''))

          // Extract and sum ALL discounts
          const extractedDiscount = data.items
            .filter(isDiscountLine)
            .reduce((sum: number, item: any) => sum + Math.abs(Number(item.total)), 0)

          setDiscount(extractedDiscount)

          const mappedItems: ReceiptItem[] = data.items
            .filter((item: any) => !isDiscountLine(item)) // REMOVE ALL DISCOUNT LINES
            .map((item: any) => {
              const qty = Number(item.qty) || 1
              const printedPrice = Number(item.pricePerUnit)
              const printedLineTotal = Number(item.total)
              
              // Logic to handle missing fields gracefully
              let lineTotal = printedLineTotal
              let pricePerUnit = printedPrice

              if (isNaN(lineTotal) && !isNaN(pricePerUnit)) {
                lineTotal = Number((qty * pricePerUnit).toFixed(2))
              } else if (isNaN(pricePerUnit) && !isNaN(lineTotal)) {
                pricePerUnit = Number((lineTotal / qty).toFixed(2))
              } else if (isNaN(lineTotal) && isNaN(pricePerUnit)) {
                lineTotal = 0
                pricePerUnit = 0
              }

              return {
                nameFr: item.nameFr || '',
                nameTh: '',
                qty,
                unit: item.unit || 'pc',
                pricePerUnit,             // Initial TTC
                total: lineTotal,         // Initial Total
                netPrice: pricePerUnit,    // Printed base is HT
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
      } else {
        throw new Error(`OCR failed: ${data.details || data.error || res.status}`)
      }
    } catch (err: any) {
      console.error('OCR failed:', err)
      alert(err.message || t.common.error)
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    setLoading(true)
    try {
      const itemsGrossTotalSum = items.reduce((sum, item) => sum + item.total, 0)
      const calculatedVat = total - (itemsGrossTotalSum - discount)

      const formData = new FormData()
      formData.append('date', date)
      formData.append('store', store)
      formData.append('total', total.toString())
      formData.append('vat', calculatedVat.toString())
      formData.append('discount', discount.toString())
      formData.append('items', JSON.stringify(items))
      if (file) formData.append('image', file)

      const res = await fetch('/api/sheets/purchases', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        setDone(true)
        fetchHistory()
      } else {
        const err = await res.json().catch(() => ({}))
        throw new Error(`บันทึกใบเสร็จไม่สำเร็จ: ${err.details || err.error || res.status}`)
      }
    } catch (err: any) {
      console.error('Save failed:', err)
      alert(err.message || t.common.error)
    } finally {
      setLoading(false)
    }
  }

  function handleReconcile() {
    if (items.length === 0 || total <= 0) return

    // Sum of the ORIGINAL printed subtotals (Net HT)
    const currentHTSum = items.reduce((sum, item) => sum + (item.netPrice * item.qty), 0)
    if (currentHTSum === 0) return

    // The ratio needed to make HT sum equal to the final paid amount
    const ratio = total / currentHTSum
    const calculatedVatRate = Number(((ratio - 1) * 100).toFixed(2))

    const adjustedItems = items.map(item => {
      // The netPrice (HT) stays as the raw printed price per piece
      const htPrice = item.netPrice
      const qty = item.qty

      // Calculate the final TTC per piece and line total
      const newPriceTTC = Number((htPrice * ratio).toFixed(2))
      const newTotalTTC = Number((newPriceTTC * qty).toFixed(2))
      
      // Calculate the "adjustment" as a discount (positive or negative)
      const lineDiscrepancy = (htPrice * qty) - newTotalTTC

      return {
        ...item,
        pricePerUnit: newPriceTTC,    // This is the TTC/u
        total: newTotalTTC,           // Adjusted line total
        netPrice: htPrice,            // Always the printed price per unit
        vatRate: calculatedVatRate,
        vatAmount: 0,
        discount: Number(lineDiscrepancy.toFixed(2)),
        isDiscount: false
      }
    })

    setItems(adjustedItems)
  }

  if (done) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in-95 duration-700 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full" />
      
      <div className="bg-white p-12 rounded-[4rem] shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center space-y-8 text-center max-w-sm w-full relative z-10 group">
        <div className="relative">
          <div className="w-32 h-32 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center text-6xl shadow-inner relative z-10 group-hover:scale-110 transition-transform duration-500">
            ✅
          </div>
          {/* Animated success rings */}
          <div className="absolute -inset-4 border-4 border-emerald-100 rounded-[3rem] animate-ping opacity-20" />
          <div className="absolute -inset-8 border-2 border-emerald-50 rounded-[3.5rem] animate-pulse opacity-40" />
          
          {/* Floating particle deco */}
          <div className="absolute -top-4 -right-4 w-8 h-8 bg-amber-100 rounded-full blur-xl animate-bounce" />
          <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-emerald-100 rounded-full blur-lg animate-pulse" />
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
            {t.common.save} <br/> 
            <span className="text-emerald-500 underline decoration-emerald-100 underline-offset-8">Success!</span>
          </h2>
          <p className="text-slate-400 font-bold uppercase tracking-[0.15em] text-[10px]">
            Receipt recorded to Google Sheets
          </p>
        </div>

        <div className="w-full pt-4">
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-lg shadow-xl shadow-slate-900/20 hover:bg-emerald-600 hover:shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-3 group"
          >
            Awesome, thanks!
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )

  const itemsNetTotalSum = items.reduce((sum, item) => sum + (item.netPrice * item.qty), 0)
  const itemsGrossTotalSum = items.reduce((sum, item) => sum + item.total, 0)
  const calculatedVat = total - (itemsGrossTotalSum - discount)

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h1 className="text-2xl font-black text-slate-800 tracking-tight">{t.nav.receipt}</h1>
      
      {/* OCR Processing Modal */}
      {loading && !items.length && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-xl bg-slate-900/40 animate-in fade-in duration-500">
          <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center space-y-8 text-center max-w-sm w-full border border-white/20 relative overflow-hidden group">
            {/* Animated Scanning Beam Effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
              <div className="absolute inset-x-0 h-1 bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
            </div>

            <div className="relative">
              <div className="w-24 h-24 bg-amber-50 rounded-[2rem] flex items-center justify-center text-5xl shadow-inner relative z-10">
                🧾
              </div>
              <div className="absolute inset-0 bg-amber-200 blur-2xl rounded-full opacity-20 scale-150 animate-pulse" />
              {/* Outer spinning rings */}
              <div className="absolute -inset-4 border-2 border-dashed border-amber-200 rounded-full animate-[spin_10s_linear_infinite]" />
              <div className="absolute -inset-8 border border-slate-100 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
            </div>

            <div className="space-y-3 relative z-10">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center justify-center gap-2">
                Processing
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                </span>
              </h2>
              <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] animate-pulse">
                Gemini Vision AI is analyzing your receipt
              </p>
            </div>

            <div className="w-full bg-slate-50 h-3 rounded-full overflow-hidden border border-slate-100 p-0.5">
              <div className="h-full bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.4)] animate-[progress_3s_ease-in-out_infinite]" />
            </div>

            <div className="grid grid-cols-2 gap-4 w-full pt-2">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase">Extracting</p>
                <p className="text-xs font-bold text-slate-600">Raw Items</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase">Calculating</p>
                <p className="text-xs font-bold text-slate-600">VAT & Disc</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!preview ? (
        <div className="bg-white p-2 rounded-[2.5rem] shadow-sm border border-slate-100">
          <UploadZone onFile={handleFile} preview={preview} />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">วันที่ (Date)</label>
                <input 
                  type="date"
                  className="w-full border border-slate-200 rounded-2xl px-4 py-4 text-lg font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all shadow-inner"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">ยอดรวมที่จ่ายจริง (Final Total Paid)</label>
                <input 
                  type="number"
                  step="0.01"
                  className="w-full border border-slate-200 rounded-2xl px-4 py-4 text-lg font-bold text-amber-600 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all shadow-inner"
                  value={total}
                  onChange={e => setTotal(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{t.receipt.store}</label>
              <input 
                id="receipt-store-input"
                className="w-full border border-slate-200 rounded-2xl px-4 py-4 text-lg font-bold text-slate-800 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all shadow-inner"
                value={store}
                onChange={e => setStore(e.target.value)}
                placeholder="e.g. Carrefour, Tang Frères"
              />
            </div>
            
            <div className="pt-2">
              {loading ? (
                <div className="text-center py-12 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                  <p className="text-slate-400 font-bold animate-pulse">{t.common.loading}</p>
                </div>
              ) : (
                <>
                  <ItemReviewTable 
                    items={items} 
                    onChange={setItems} 
                    showAdvanced={Math.abs(itemsGrossTotalSum - discount - total) > 0.01}
                  />
                  
                  {items.length > 0 && (
                    <div className="mt-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                      <div className="flex justify-between items-center text-slate-500 font-medium">
                        <span>รวมราคาหน้าเคาน์เตอร์ (Sum of Items)</span>
                        <span>€{itemsGrossTotalSum.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500 font-medium">
                        <span>ส่วนลด (Discount)</span>
                        <span className="text-red-500">-€{discount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500 font-medium">
                        <span>ภาษี / ส่วนต่าง (VAT / Discrepancy)</span>
                        <span className={calculatedVat < 0 ? 'text-red-500' : ''}>€{calculatedVat.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-slate-200 font-black">
                        <span className="text-slate-800 uppercase tracking-wider">ยอดรวมสุทธิ (Final Total Paid)</span>
                        <div className="flex flex-col items-end">
                          <span className="text-2xl text-slate-900">€{total.toFixed(2)}</span>
                          {Math.abs(itemsGrossTotalSum - discount - total) > 0.01 && (
                            <button
                              onClick={handleReconcile}
                              className="mt-2 text-[10px] bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full hover:bg-amber-200 transition-colors uppercase tracking-widest font-black"
                            >
                              Adjust VAT (€{calculatedVat.toFixed(2)}) into items
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              id="receipt-cancel-btn"
              onClick={() => { setPreview(null); setFile(null); setItems([]); setStore(''); setTotal(0) }}
              className="flex-1 bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95"
            >
              {t.common.cancel}
            </button>
            <button 
              id="receipt-confirm-btn"
              onClick={handleConfirm}
              disabled={loading || items.length === 0}
              className="flex-1 bg-amber-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? t.common.loading : t.receipt.confirm}
            </button>
          </div>
        </div>
      )}

      {/* History Section */}
      <div className="mt-12 space-y-4">
        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          History (ประวัติการซื้อ)
        </h2>
        
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
          {history.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium italic">
              No receipt history yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-widest border-b border-slate-100">
                    <th className="text-left py-4 px-6">Date</th>
                    <th className="text-left py-4 px-6">Store</th>
                    <th className="text-right py-4 px-6">Total Paid</th>
                    <th className="text-right py-4 px-6 text-amber-600">VAT</th>
                    <th className="text-right py-4 px-6 text-red-500">Discount</th>
                    <th className="text-center py-4 px-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.map((h, i) => (
                    <React.Fragment key={h.id || i}>
                      <tr className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-4 px-6 font-bold text-slate-700">{h.date}</td>
                        <td className="py-4 px-6 text-slate-600 font-medium">{h.store}</td>
                        <td className="py-4 px-6 text-right font-black text-slate-900 whitespace-nowrap">€{Number(h.total || 0).toFixed(2)}</td>
                        <td className="py-4 px-6 text-right font-bold text-amber-600 whitespace-nowrap">
                          {Number(h.vat || 0) !== 0 ? `€${Number(h.vat).toFixed(2)}` : '-'}
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-red-500 whitespace-nowrap">
                          {Number(h.discount || 0) !== 0 ? `-€${Math.abs(Number(h.discount)).toFixed(2)}` : '-'}
                        </td>
                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-3">
                            <button 
                              onClick={() => toggleDetails(h)}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full font-black text-[10px] uppercase tracking-wider transition-colors shadow-sm ${
                                expandedId === h.id ? 'bg-amber-600 text-white shadow-amber-600/20' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              }`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={expandedId === h.id ? "M5 15l7-7 7 7" : "M4 6h16M4 12h16M4 18h7"} />
                              </svg>
                              {expandedId === h.id ? 'Hide' : 'Details'}
                            </button>
                            {h.driveUrl && (
                              <a 
                                href={h.driveUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 px-3 py-1.5 rounded-full font-black text-[10px] uppercase tracking-wider hover:bg-slate-100 transition-colors shadow-sm"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Image
                              </a>
                            )}
                            <button 
                              onClick={() => handleDelete(h.id)}
                              className="p-2 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                              title="Delete Receipt"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === h.id && (
                        <tr className="bg-slate-50/30">
                          <td colSpan={6} className="p-6">
                                  <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-300">
                                    {modalLoading ? (
                                      <div className="p-8 flex justify-center items-center gap-3">
                                        <div className="w-5 h-5 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Loading Extract...</p>
                                      </div>
                                    ) : modalItems.length === 0 ? (
                                      <div className="p-8 text-center text-slate-400 font-medium italic text-xs">
                                        No details found. Try viewing the original image.
                                      </div>
                                    ) : (() => {
                                      const hasDisc = modalItems.some(item => item.discount && item.discount !== 0);
                                      const itemsSubTotal = modalItems.reduce((sum, item) => sum + item.total, 0);
                                      return (
                                        <>
                                          <table className="w-full text-xs">
                                            <thead>
                                              <tr className="bg-slate-50/50 text-slate-400 font-black uppercase text-[8px] tracking-widest border-b border-slate-50">
                                                <th className="text-left py-3 px-4">Item (FR / TH)</th>
                                                <th className="text-center py-3 px-2">Qty</th>
                                                <th className="text-right py-3 px-4">Price/u</th>
                                                {hasDisc && (
                                                  <th className="text-right py-3 px-2">Disc</th>
                                                )}
                                                <th className="text-right py-3 px-4">Total</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                              {modalItems.map((item, idx) => (
                                                <tr key={idx}>
                                                  <td className="py-3 px-4">
                                                    <div className="font-bold text-slate-700">{item.nameFr}</div>
                                                    <div className="text-amber-600 font-medium">{item.nameTh}</div>
                                                  </td>
                                                  <td className="py-3 px-2 text-center text-slate-500 font-bold">
                                                    {item.qty} {item.unit}
                                                  </td>
                                                  <td className="py-3 px-4 text-right text-slate-500">€{item.pricePerUnit.toFixed(2)}</td>
                                                  {hasDisc && (
                                                    <td className="py-3 px-2 text-right text-red-400 font-medium">{item.discount ? `-€${item.discount.toFixed(2)}` : '-'}</td>
                                                  )}
                                                  <td className="py-3 px-4 text-right font-black text-slate-800">€{item.total.toFixed(2)}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                              <tfoot className="bg-slate-50/50 font-bold text-slate-700">
                                                <tr>
                                                  <td colSpan={hasDisc ? 4 : 3} className="py-3 px-4 text-right uppercase tracking-tighter text-[9px]">Sum of Items</td>
                                                  <td className="py-3 px-4 text-right">€{Number(itemsSubTotal || 0).toFixed(2)}</td>
                                                </tr>
                                                {Number(h.discount || 0) !== 0 && (
                                                  <tr>
                                                    <td colSpan={hasDisc ? 4 : 3} className="py-3 px-4 text-right uppercase tracking-tighter text-[9px]">Discount</td>
                                                    <td className="py-3 px-4 text-right text-red-500">-€{Math.abs(Number(h.discount)).toFixed(2)}</td>
                                                  </tr>
                                                )}
                                                {Number(h.vat || 0) !== 0 && (
                                                  <tr>
                                                    <td colSpan={hasDisc ? 4 : 3} className="py-3 px-4 text-right uppercase tracking-tighter text-[9px]">VAT / Adjustments</td>
                                                    <td className="py-3 px-4 text-right text-amber-600">€{Number(h.vat).toFixed(2)}</td>
                                                  </tr>
                                                )}
                                                <tr className="border-t border-slate-200">
                                                  <td colSpan={hasDisc ? 4 : 3} className="py-3 px-4 text-right uppercase tracking-tighter text-[9px] font-black">Total Paid (TTC)</td>
                                                  <td className="py-3 px-4 text-right font-black text-slate-900">€{Number(h.total || 0).toFixed(2)}</td>
                                                </tr>
                                              </tfoot>                                          </table>
                                        </>
                                      );
                                    })()}
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 backdrop-blur-sm bg-slate-900/50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-[1.5rem] flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800">Delete Receipt?</h3>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">This will permanently remove the receipt and all its items. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 active:scale-[0.98]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setShowModal(false)} 
          />
          <div className="relative bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-8 duration-400">
            {/* Modal Header */}
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">{selectedReceipt?.store}</h3>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{selectedReceipt?.date} • €{Number(selectedReceipt?.total || 0).toFixed(2)}</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100 transition-all active:scale-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 pt-6">
              {modalLoading ? (
                <div className="py-20 flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Details...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
                    {modalItems.length === 0 ? (
                      <div className="p-12 text-center text-slate-400 font-medium italic">
                        No item details found for this receipt.
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b border-slate-100">
                            <th className="text-left py-4 px-6">Item (🇫🇷 / 🇹🇭)</th>
                            <th className="text-center py-4 px-4">Qty</th>
                            <th className="text-right py-4 px-6">Price/u</th>
                            <th className="text-right py-4 px-6">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {modalItems.map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-6">
                                <div className="font-bold text-slate-700">{item.nameFr}</div>
                                <div className="text-amber-600 font-bold text-xs">{item.nameTh}</div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-black text-[10px]">
                                  {item.qty} {item.unit}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-right font-bold text-slate-500">€{item.pricePerUnit.toFixed(2)}</td>
                              <td className="py-4 px-6 text-right font-black text-slate-900">€{item.total.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {selectedReceipt?.driveUrl && (
                    <a 
                      href={selectedReceipt.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-slate-100 text-slate-600 py-5 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-200 transition-all active:scale-[0.98]"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      View Original Receipt Image
                    </a>
                  )}
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-8 bg-slate-50/80 backdrop-blur-md border-t border-slate-100 flex gap-4">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
