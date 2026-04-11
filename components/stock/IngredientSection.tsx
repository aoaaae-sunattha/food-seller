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
    <div className="bg-white rounded-xl shadow p-4 space-y-3">
      <h2 className="font-bold text-blue-800 border-b pb-1">{menuName}</h2>
      <div className="space-y-4">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 block uppercase font-bold">Ingredient</label>
              <select
                className="w-full border rounded px-1 py-2 text-sm"
                value={row.ingredientName}
                onChange={e => onRowChange(i, {
                  ingredientName: e.target.value,
                  unit: allIngredients.find(ing => ing.nameTh === e.target.value)?.unit || ''
                })}
              >
                <option value="">--</option>
                {allIngredients.map(ing => (
                  <option key={ing.id} value={ing.nameTh}>{ing.nameTh}</option>
                ))}
              </select>
              {row.ingredientName && (
                <span className="text-[10px] text-gray-400">
                  {t.stock.currentQty}: {quantities[row.ingredientName] ?? 0} {row.unit}
                </span>
              )}
            </div>
            <div className="w-20">
              <label className="text-[10px] text-gray-400 block uppercase font-bold">{t.stock.amountUsed}</label>
              <input
                type="number"
                className="w-full border rounded px-1 py-2 text-sm text-right"
                value={row.amountUsed}
                onChange={e => onRowChange(i, { amountUsed: Number(e.target.value) })}
              />
            </div>
            <div className="w-24">
              <label className="text-[10px] text-gray-400 block uppercase font-bold">{t.stock.reason}</label>
              <select
                className="w-full border rounded px-1 py-2 text-sm"
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
        ))}
      </div>
      <button onClick={onAddRow} className="text-blue-600 text-sm font-medium pt-1">
        {t.stock.addIngredient}
      </button>
    </div>
  )
}
