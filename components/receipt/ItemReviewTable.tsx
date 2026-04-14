'use client'
import { NumberInput } from '@/components/NumberInput';
import type { ReceiptItem } from '@/types'

interface Props {
  items: ReceiptItem[]
  onChange: (items: ReceiptItem[]) => void
}

function update(items: ReceiptItem[], index: number, patch: Partial<ReceiptItem>): ReceiptItem[] {
  return items.map((item, i) => i === index ? { ...item, ...patch } : item)
}

export default function ItemReviewTable({ items, onChange }: Props) {
  function updateLine(index: number, patch: Partial<ReceiptItem>) {
    const item = items[index]
    const newItem = { ...item, ...patch }
    
    // Auto-recalculate fields if base values change
    if (patch.qty !== undefined || patch.pricePerUnit !== undefined) {
      newItem.total = Number((newItem.qty * newItem.pricePerUnit).toFixed(2))
    }
    
    if (patch.netPrice !== undefined || patch.vatRate !== undefined) {
      // TTC = HT * (1 + Rate/100)
      newItem.pricePerUnit = Number((newItem.netPrice * (1 + (newItem.vatRate / 100))).toFixed(2))
      newItem.total = Number((newItem.qty * newItem.pricePerUnit).toFixed(2))
      newItem.vatAmount = Number((newItem.total - (newItem.netPrice * newItem.qty)).toFixed(2))
    } else if (patch.pricePerUnit !== undefined) {
      // If user edits TTC directly, recalculate VAT rate keeping HT fixed
      const rate = ((newItem.pricePerUnit / newItem.netPrice) - 1) * 100
      newItem.vatRate = Number(rate.toFixed(2))
      newItem.vatAmount = Number((newItem.total - (newItem.netPrice * newItem.qty)).toFixed(2))
    }

    onChange(items.map((it, i) => i === index ? newItem : it))
  }

  function deleteLine(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div className="-mx-4 overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-y-2 px-4">
        <thead>
          <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
            <th className="text-left py-2 px-2">French Name</th>
            <th className="text-left py-2 px-2">Thai Name</th>
            <th className="text-right py-2 px-2">Qty</th>
            <th className="text-left py-2 px-2">Unit</th>
            <th className="text-right py-2 px-2">TTC/u (ชิ้นละ)</th>
            <th className="text-right py-2 px-2">Line Total</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="group bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <td className="py-1 px-1 first:rounded-l-xl">
                <input
                  id={`receipt-item-fr-${i}`}
                  className="bg-transparent border-0 focus:ring-2 focus:ring-amber-500/20 rounded-lg px-2 py-2 w-full font-medium text-slate-700 outline-none"
                  value={item.nameFr}
                  onChange={e => updateLine(i, { nameFr: e.target.value })}
                />
              </td>
              <td className="py-1 px-1">
                <input
                  id={`receipt-item-th-${i}`}
                  className="bg-white border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-lg px-2 py-2 w-full font-bold text-slate-800 outline-none transition-all shadow-sm"
                  value={item.nameTh}
                  placeholder="Thai name..."
                  onChange={e => updateLine(i, { nameTh: e.target.value })}
                />
              </td>
              <td className="py-1 px-1">
                <NumberInput
                  id={`receipt-item-qty-${i}`}
                  className="bg-transparent border-0 focus:ring-2 focus:ring-amber-500/20 rounded-lg px-2 py-2 w-16 text-right font-medium text-slate-600 outline-none"
                  value={item.qty}
                  onChange={val => updateLine(i, { qty: val })}
                />
              </td>
              <td className="py-1 px-1">
                <input
                  className="bg-transparent border-0 focus:ring-2 focus:ring-amber-500/20 rounded-lg px-2 py-2 w-16 font-medium text-slate-500 outline-none uppercase text-xs tracking-tighter"
                  list="unit-suggestions"
                  value={item.unit}
                  onChange={e => updateLine(i, { unit: e.target.value })}
                />
              </td>
              <td className="py-1 px-1">
                <NumberInput
                  id={`receipt-item-price-${i}`}
                  className="bg-amber-100/50 border border-amber-200 focus:bg-white focus:ring-2 focus:ring-amber-500/20 rounded-lg px-2 py-2 w-24 text-right font-black text-slate-800 outline-none transition-all"
                  value={item.pricePerUnit}
                  onChange={val => updateLine(i, { pricePerUnit: val })}
                />
              </td>
              <td className="py-1 px-1 text-right font-black text-slate-900">
                €{item.total.toFixed(2)}
              </td>
              <td className="py-1 px-2 last:rounded-r-xl text-center">
                <button
                  onClick={() => deleteLine(i)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                  aria-label="Delete row"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
