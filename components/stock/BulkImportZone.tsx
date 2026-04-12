'use client'
import { useState, useRef } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import type { Ingredient } from '@/types'

const UNITS = ['kg','g','mg','l','ml','pcs','box','bottle','can','pack','bag','bunch','tray','tbsp','tsp']

interface ParsedItem {
  nameTh: string
  nameFr: string
  unit: string
  threshold: number
  status: 'new' | 'update' | 'warning' | 'error'
  isValid: boolean
}

interface Props {
  ingredients: Ingredient[]
  onImportComplete: (added: number, updated: number, skipped: number) => void
}

export default function BulkImportZone({ ingredients, onImportComplete }: Props) {
  const { t } = useLanguage()
  const [items, setItems] = useState<ParsedItem[]>([])
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    let csv = "nameTh,nameFr,unit,threshold\n"
    if (ingredients.length > 0) {
      ingredients.forEach(i => {
        csv += `${i.nameTh},${i.nameFr},${i.unit},${i.threshold}\n`
      })
    } else {
      csv += "กระเทียม,Ail,kg,5\nพริกขี้หนู,Piment,kg,2\nน้ำมันพืช,,L,3\n"
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "ingredient_template.csv")
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(l => l.trim() !== '')
      
      const parsed: ParsedItem[] = lines.slice(1).map(line => {
        const parts = line.split(',').map(p => p.trim())
        const nameTh = parts[0] || ''
        const nameFr = parts[1] || ''
        const unit = parts[2] || 'kg'
        const thresholdRaw = parts[3]
        
        let status: ParsedItem['status'] = 'new'
        let isValid = true

        // Validation
        if (!nameTh) {
          status = 'error'
          isValid = false
        } else if (thresholdRaw && isNaN(Number(thresholdRaw))) {
          status = 'error'
          isValid = false
        } else {
          const existing = ingredients.find(i => i.nameTh.trim().toLowerCase() === nameTh.toLowerCase())
          if (existing) {
            status = 'update'
          } else if (!UNITS.includes(unit.toLowerCase())) {
            status = 'warning'
          }
        }

        return {
          nameTh,
          nameFr,
          unit,
          threshold: Number(thresholdRaw) || 1,
          status,
          isValid
        }
      })
      setItems(parsed)
    }
    reader.readAsText(file)
  }

  const handleProcess = async () => {
    const validItems = items.filter(it => it.isValid)
    if (validItems.length === 0) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/sheets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulk: true, items: validItems })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Import failed')
      
      const skipped = items.length - validItems.length
      onImportComplete(result.added || 0, result.updated || 0, skipped)
      setItems([])
      setShow(false)
    } catch (err: any) {
      alert(err.message || t.common.error)
    } finally {
      setLoading(false)
    }
  }

  const validCount = items.filter(i => i.isValid).length

  if (!show) return (
    <div className="flex flex-col items-end gap-1">
      <button 
        onClick={() => setShow(true)} 
        className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-black shadow-lg shadow-slate-200 transition-all active:scale-95 hover:bg-black"
      >
        {t.bulkImport.title} 📂
      </button>
      <button 
        onClick={downloadTemplate} 
        className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-amber-600 transition-colors"
      >
        {t.bulkImport.downloadTemplate}
      </button>
    </div>
  )

  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-black">{t.bulkImport.title}</h2>
        <button 
          onClick={() => { setShow(false); setItems([]); }} 
          className="text-slate-400 hover:text-rose-500 font-black flex items-center gap-1 text-sm uppercase tracking-widest"
        >
          {t.common.cancel} ✕
        </button>
      </div>
      
      <div 
        className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center bg-slate-50 hover:bg-slate-100 transition-colors relative cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          accept=".csv" 
          onChange={handleFileChange} 
          className="hidden" 
          data-testid="bulk-file-input"
        />
        <label htmlFor="bulk-import-input" className="cursor-pointer">
          <p className="font-black text-slate-500">{t.receipt?.upload || 'Click or drag CSV file here'}</p>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">.CSV ONLY</p>
        </label>
      </div>

      {items.length > 0 && (
        <div className="space-y-4">
          <div className="max-h-60 overflow-auto rounded-2xl border border-slate-100 shadow-inner">
            <table className="w-full text-left text-sm font-bold border-collapse">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3">{t.bulkImport.status}</th>
                  <th className="px-4 py-3">{t.manageStock.name} (TH)</th>
                  <th className="px-4 py-3">{t.manageStock.unit}</th>
                  <th className="px-4 py-3">{t.manageStock.threshold}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((it, idx) => (
                  <tr key={idx} className={`hover:bg-slate-50 transition-colors ${!it.isValid ? 'bg-rose-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest
                        ${it.status === 'new' ? 'bg-emerald-100 text-emerald-700' : 
                          it.status === 'update' ? 'bg-amber-100 text-amber-700' : 
                          it.status === 'warning' ? 'bg-yellow-100 text-yellow-700' : 
                          'bg-rose-100 text-rose-700'}`}
                      >
                        {t.bulkImport[it.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{it.nameTh}</p>
                      {it.nameFr && <p className="text-[10px] text-slate-400">{it.nameFr}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{it.unit}</td>
                    <td className="px-4 py-3 text-slate-600">{it.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button 
            onClick={handleProcess} 
            disabled={loading || validCount === 0} 
            className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-slate-200 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                {t.common.loading}
              </span>
            ) : t.bulkImport.importCount.replace('{{count}}', String(validCount))}
          </button>
        </div>
      )}
    </div>
  )
}
