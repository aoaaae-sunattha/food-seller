'use client'
import type { Ingredient, StockReason } from '@/types'

interface Props {
  menuName: string
  rows: DeductionRow[]
  onRowChange: (index: number, patch: Partial<DeductionRow>) => void
  onAddRow: () => void
  allIngredients: Ingredient[]
  quantities: Record<string, number>
  t: any
}

export interface DeductionRow {
  ingredientName: string
  amountUsed: number
  unit: string
  reason: StockReason
}

export default function IngredientSection({ menuName, rows, onRowChange, onAddRow, allIngredients, quantities, t }: Props) {
  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">{menuName}</h2>
        <button 
          onClick={onAddRow}
          className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg hover:bg-amber-100 transition-colors"
        >
          + {t.stock.addIngredient}
        </button>
      </div>
      
      <div className="space-y-3">
        {rows.map((row, i) => {
          const currentStock = quantities[row.ingredientName] || 0
          return (
            <div key={i} className="flex flex-col gap-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-50">
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <select 
                    className="w-full bg-transparent font-bold text-slate-800 outline-none text-base cursor-pointer"
                    value={row.ingredientName}
                    onChange={e => onRowChange(i, { 
                      ingredientName: e.target.value,
                      unit: allIngredients.find(ing => ing.nameTh === e.target.value)?.unit || ''
                    })}
                  >
                    <option value="">Choose Ingredient</option>
                    {allIngredients.map(ing => (
                      <option key={ing.id} value={ing.nameTh}>{ing.nameTh}</option>
                    ))}
                  </select>
                </div>
                <div className="w-24 text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter block">{t.stock.currentQty}</span>
                  <span className={`text-xs font-black ${currentStock <= 0 ? 'text-rose-500' : 'text-slate-600'}`}>
                    {currentStock} {row.unit}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 items-center pt-1">
                <div className="flex-1 relative">
                  <span className="absolute -top-3 left-1 text-[9px] font-black text-slate-300 uppercase tracking-tighter">{t.stock.amountUsed}</span>
                  <input 
                    type="number"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 font-black text-amber-600 outline-none focus:border-amber-500 shadow-sm transition-all"
                    value={row.amountUsed}
                    onChange={e => onRowChange(i, { amountUsed: Number(e.target.value) })}
                  />
                </div>
                <div className="flex-1 relative">
                  <span className="absolute -top-3 left-1 text-[9px] font-black text-slate-300 uppercase tracking-tighter">{t.stock.reason}</span>
                  <select 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 outline-none cursor-pointer uppercase tracking-tight shadow-sm"
                    value={row.reason}
                    onChange={e => onRowChange(i, { reason: e.target.value as StockReason })}
                  >
                    <option value="ใช้ทำอาหาร">{t.stock.reasons.cooking}</option>
                    <option value="แตก/เสียหาย">{t.stock.reasons.broken}</option>
                    <option value="เสีย">{t.stock.reasons.expired}</option>
                    <option value="สูญหาย">{t.stock.reasons.lost}</option>
                  </select>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
