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
      if (data.items) setItems(data.items)
    } catch (err) {
      console.error('OCR failed:', err)
      alert(t.common.error)
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
          date: new Date().toISOString().split('T')[0],
          store,
          items,
        }),
      })
      if (res.ok) setDone(true)
    } catch (err) {
      console.error('Save failed:', err)
      alert(t.common.error)
    } finally {
      setLoading(false)
    }
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
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">{t.receipt.store}</label>
              <input 
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
                <ItemReviewTable items={items} onChange={setItems} />
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => { setPreview(null); setItems([]); setStore('') }}
              className="flex-1 bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95"
            >
              {t.common.cancel}
            </button>
            <button 
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
