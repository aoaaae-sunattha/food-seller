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
    <div className="text-center mt-12 space-y-4">
      <p className="text-4xl">✅</p>
      <p className="text-xl font-bold">{t.common.save}</p>
      <button 
        onClick={() => window.location.reload()}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg"
      >
        OK
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t.nav.receipt}</h1>
      
      {!preview ? (
        <UploadZone onFile={handleFile} preview={preview} />
      ) : (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl shadow space-y-3">
            <div>
              <label className="text-sm text-gray-500">{t.receipt.store}</label>
              <input 
                className="w-full border rounded px-3 py-2 mt-1"
                value={store}
                onChange={e => setStore(e.target.value)}
                placeholder="e.g. Carrefour, Tang Frères"
              />
            </div>
            
            {loading ? (
              <p className="text-center py-4">{t.common.loading}</p>
            ) : (
              <ItemReviewTable items={items} onChange={setItems} />
            )}
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => { setPreview(null); setItems([]); setStore('') }}
              className="flex-1 bg-gray-200 py-3 rounded-xl font-bold"
            >
              {t.common.cancel}
            </button>
            <button 
              onClick={handleConfirm}
              disabled={loading || items.length === 0}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold disabled:opacity-50"
            >
              {t.receipt.confirm}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
