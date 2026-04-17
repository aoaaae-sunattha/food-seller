'use client'
import { NumberInput } from '@/components/NumberInput';
import type { Ingredient, StockReason } from '@/types'

interface Props {
  menuName: string
  rows: DeductionRow[]
  onRowChange: (index: number, patch: Partial<DeductionRow>) => void
  onAddRow: () => void
  onRemoveRow: (index: number) => void
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

export default function IngredientSection({ menuName, rows, onRowChange, onAddRow, onRemoveRow, allIngredients, quantities, t }: Props) {
  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 space-y-4 animate-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center px-2">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">{menuName}</h2>
        <button 
          id={`stock-add-row-${menuName}`}
          onClick={onAddRow}
          className="text-[14px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg hover:bg-amber-100 transition-colors"
        >
          {t.stock.addIngredient}
        </button>
      </div>
      
      <div className="space-y-3">
        {rows.map((row, i) => {
          const currentStock = quantities[row.ingredientName] || 0
          return (
            <div key={i} data-testid={`stock-row-${i}`} className="flex flex-col gap-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-50 relative group">
              <button 
                onClick={() => onRemoveRow(i)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-300 hover:text-rose-500 hover:border-rose-100 shadow-sm opacity-0 group-hover:opacity-100 transition-all z-10"
              >
                ✕
              </button>
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <input 
                    id={`stock-item-name-${menuName}-${i}`}
                    data-testid={`stock-item-name-${i}`}
                    list="ing-suggestions"
                    className="w-full bg-transparent font-bold text-slate-800 outline-none text-base border-b border-transparent focus:border-amber-500/20"
                    placeholder="Type or Choose Ingredient..."
                    value={row.ingredientName}
                    onChange={e => {
                      const val = e.target.value
                      const existing = allIngredients.find(ing => ing.nameTh === val)
                      onRowChange(i, { 
                        ingredientName: val,
                        unit: existing?.unit || row.unit || 'kg'
                      })
                    }}
                  />
                </div>
                <div className="w-24 text-right">
                  <span className="text-[14px] font-bold text-slate-400 uppercase tracking-tighter block">
                    {allIngredients.some(ing => ing.nameTh === row.ingredientName) ? t.stock.currentQty : t.manageStock.unit}
                  </span>
                  {allIngredients.some(ing => ing.nameTh === row.ingredientName) ? (
                    <span className={`text-sm font-black ${currentStock <= 0 ? 'text-rose-500' : 'text-slate-600'}`}>
                      {currentStock} {row.unit}
                    </span>
                  ) : (
                    <>
                      <input 
                        list="unit-suggestions"
                        className="w-full bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-right text-sm font-black text-amber-600 outline-none"
                        placeholder="kg/pcs..."
                        value={row.unit}
                        onChange={e => onRowChange(i, { unit: e.target.value })}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-3 items-center pt-9">
                <div className="flex-1 relative">
                  <span className="absolute -top-5 left-1 text-[14px] font-black text-slate-300 uppercase tracking-tighter">{t.stock.amountUsed}</span>
                  <NumberInput 
                    id={`stock-item-qty-${menuName}-${i}`}
                    className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 py-2 font-black text-amber-600 outline-none focus:border-amber-500 shadow-sm transition-all"
                    value={row.amountUsed}
                    onChange={val => onRowChange(i, { amountUsed: val })}
                  />
                </div>
                <div className="flex-1 relative">
                  <span className="absolute -top-5 left-1 text-[14px] font-black text-slate-300 uppercase tracking-tighter">{t.stock.reason}</span>
                  <select 
                    id={`stock-item-reason-${menuName}-${i}`}
                    className="w-full h-11 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 outline-none cursor-pointer uppercase tracking-tight shadow-sm"
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

      <datalist id="ing-suggestions">
        {allIngredients.map(ing => (
          <option key={ing.id} value={ing.nameTh}>{ing.nameFr} ({ing.unit})</option>
        ))}
      </datalist>
    </div>
  )
}
