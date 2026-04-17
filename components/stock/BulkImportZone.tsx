'use client'
import { useState, useRef } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import type { Ingredient } from '@/types'
import { FileUp, Download, X, AlertTriangle, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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

function csvField(val: string | number): string {
  const s = String(val ?? '')
  return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
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
        csv += `${csvField(i.nameTh)},${csvField(i.nameFr)},${csvField(i.unit)},${i.threshold}\n`
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
      const text = (event.target?.result as string).replace(/^\uFEFF/, '')
      const lines = text.split('\n').filter(l => l.trim() !== '')

      const parsed: ParsedItem[] = lines.slice(1).map(line => {
        const parts = parseCSVLine(line)
        const nameTh = parts[0] || ''
        const nameFr = parts[1] || ''
        const unit = parts[2] || 'kg'
        const thresholdRaw = parts[3]

        let status: ParsedItem['status'] = 'new'
        let isValid = true

        if (!nameTh) {
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
  const warningCount = items.filter(i => i.status === 'warning').length

  if (!show) return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={() => setShow(true)}
        className="btn-secondary h-10 px-4 text-sm"
      >
        <FileUp size={16} /> {t.bulkImport.title}
      </button>
      <button
        onClick={downloadTemplate}
        className="flex items-center gap-1.5 text-[14px] font-bold text-slate-400 uppercase tracking-widest hover:text-cinnabar transition-colors"
      >
        <Download size={10} /> {t.bulkImport.downloadTemplate}
      </button>
    </div>
  )

  return (
    <div className="card-base border-cinnabar/20 shadow-xl shadow-cinnabar/5 space-y-6 animate-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-deep flex items-center gap-2">
           <FileUp className="text-cinnabar" size={22} />
           {t.bulkImport.title}
        </h2>
        <button
          onClick={() => { setShow(false); setItems([]); }}
          className="w-10 h-10 bg-mist-gray text-slate-400 hover:text-error-red rounded-full flex items-center justify-center transition-all active:scale-90"
        >
          <X size={20} />
        </button>
      </div>

      <div
        className="border-2 border-dashed border-subtle-border rounded-2xl p-12 text-center bg-mist-gray/30 hover:border-cinnabar hover:bg-cinnabar/5 transition-all cursor-pointer group"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          id="bulk-import-input"
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300 group-hover:text-cinnabar group-hover:scale-110 transition-all shadow-sm">
           <FileUp size={28} />
        </div>
        <p className="font-bold text-slate-600">{t.bulkImport.dropzone}</p>
        <p className="text-[14px] font-bold text-slate-400 mt-1 uppercase tracking-widest">CSV Format Only</p>
      </div>

      {items.length > 0 && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="max-h-96 overflow-auto space-y-2 pr-2 scrollbar-thin">
            {items.map((it, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "flex gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100 items-center transition-all",
                  !it.isValid && "bg-error-red/5 border-error-red/10 shadow-inner"
                )}
              >
                <div className="w-20 shrink-0">
                  <span className={cn(
                    "badge-base scale-75 origin-left",
                    it.status === 'new' ? "badge-success" :
                    it.status === 'update' ? "bg-cinnabar/10 text-cinnabar" :
                    it.status === 'warning' ? "badge-warning" :
                    "badge-danger"
                  )}>
                    {t.bulkImport[it.status]}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-deep truncate">{it.nameTh}</div>
                  <div className="text-[14px] text-slate-400 font-medium truncate uppercase tracking-wide">{it.nameFr}</div>
                </div>

                <div className="flex items-center gap-4 shrink-0 px-2">
                  <div className="text-center min-w-[50px]">
                    <div className="text-[14px] font-black text-amber-600 uppercase">{it.unit}</div>
                    <div className="text-[14px] text-slate-400 font-bold uppercase tracking-tighter">Unit</div>
                  </div>
                  <div className="text-right min-w-[50px]">
                    <div className="text-[14px] font-black text-slate-600">{it.threshold}</div>
                    <div className="text-[14px] text-slate-400 font-bold uppercase tracking-tighter">Limit</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex flex-col gap-4">
             {warningCount > 0 && (
              <div className="flex items-center gap-2 text-sm font-bold text-amber bg-amber/5 p-3 rounded-lg border border-amber/10">
                <AlertTriangle size={16} />
                {t.bulkImport.warningNote.replace('{{count}}', String(warningCount))}
              </div>
            )}
            <button
              onClick={handleProcess}
              disabled={loading || validCount === 0}
              className="btn-primary w-full h-14 text-base"
            >
              {loading ? <Loader2 className="animate-spin" /> : (
                <span className="flex items-center gap-2">
                   <Check size={20} /> {t.bulkImport.importCount.replace('{{count}}', String(validCount))}
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
