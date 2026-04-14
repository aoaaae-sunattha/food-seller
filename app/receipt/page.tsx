'use client'
import { useState } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import UploadZone from '@/components/receipt/UploadZone'
import ItemReviewTable from '@/components/receipt/ItemReviewTable'
import type { ReceiptItem } from '@/types'

export default function ReceiptPage() {
  const { t } = useLanguage()
  const [preview, setPreview] = useState<string | null>(null)
  const [store, setStore] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [total, setTotal] = useState<number>(0)
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file))
    setLoading(true)
    
    const formData = new FormData()
    formData.append('image', file)

    try {
      const res = await fetch('/api/ocr', { method: 'POST', body: formData })
      const data = await res.json()
      if (res.ok) {
        if (data.items) {
          const mappedItems: ReceiptItem[] = data.items.map((item: any) => {
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
              vatAmount: 0
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
      const res = await fetch('/api/sheets/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          store,
          items,
        }),
      })
      if (res.ok) {
        setDone(true)
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

      return {
        ...item,
        pricePerUnit: newPriceTTC,    // This is the TTC/u
        total: newTotalTTC,           // Adjusted line total
        netPrice: htPrice,            // Always the printed price per unit
        vatRate: calculatedVatRate,
        vatAmount: Number((newTotalTTC - (htPrice * qty)).toFixed(2))
      }
    })

    setItems(adjustedItems)
  }

  if (done) return (
    <div className="flex flex-col items-center justify-center py-12 animate-in zoom-in-95 duration-500">
      <div className="bg-white p-12 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center space-y-6 text-center max-w-sm w-full">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-5xl shadow-inner animate-bounce">
          ✅
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">{t.common.save}</h2>
          <p className="text-slate-400 font-medium">Receipt has been recorded successfully.</p>
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

  const itemsNetTotalSum = items.reduce((sum, item) => sum + (item.netPrice * item.qty), 0)
  const itemsGrossTotalSum = items.reduce((sum, item) => sum + item.total, 0)
  const globalVat = total - itemsNetTotalSum

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h1 className="text-2xl font-black text-slate-800 tracking-tight">{t.nav.receipt}</h1>
      
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
                  <ItemReviewTable items={items} onChange={setItems} />
                  
                  {items.length > 0 && (
                    <div className="mt-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                      <div className="flex justify-between items-center text-slate-500 font-medium">
                        <span>รวมราคาหน้าเคาน์เตอร์ (Net Total HT)</span>
                        <span>€{itemsNetTotalSum.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-500 font-medium">
                        <span>ภาษีส่วนต่าง (VAT / Discrepancy)</span>
                        <span className={globalVat < 0 ? 'text-red-500' : ''}>€{globalVat.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-slate-200 font-black">
                        <span className="text-slate-800 uppercase tracking-wider">ยอดรวมสุทธิ (Final TTC)</span>
                        <div className="flex flex-col items-end">
                          <span className="text-2xl text-slate-900">€{total.toFixed(2)}</span>
                          {Math.abs(itemsGrossTotalSum - total) > 0.01 && (
                            <button
                              onClick={handleReconcile}
                              className="mt-2 text-[10px] bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full hover:bg-amber-200 transition-colors uppercase tracking-widest font-black"
                            >
                              Distribute VAT (€{globalVat.toFixed(2)}) into item prices
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
              onClick={() => { setPreview(null); setItems([]); setStore(''); setTotal(0) }}
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
              {t.receipt.confirm}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
