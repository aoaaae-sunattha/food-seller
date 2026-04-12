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
  return (
    <div className="-mx-4 overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-y-2 px-4">
        <thead>
          <tr className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
            <th className="text-left py-2 px-2">French Name</th>
            <th className="text-left py-2 px-2">Thai Name</th>
            <th className="text-right py-2 px-2">Qty</th>
            <th className="text-left py-2 px-2">Unit</th>
            <th className="text-right py-2 px-2">Total</th>
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
                  onChange={e => onChange(update(items, i, { nameFr: e.target.value }))}
                />
              </td>
              <td className="py-1 px-1">
                <input
                  id={`receipt-item-th-${i}`}
                  className="bg-white border border-slate-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-lg px-2 py-2 w-full font-bold text-slate-800 outline-none transition-all shadow-sm"
                  value={item.nameTh}
                  placeholder="Thai name..."
                  onChange={e => onChange(update(items, i, { nameTh: e.target.value }))}
                />
              </td>
              <td className="py-1 px-1">
                <NumberInput
                  id={`receipt-item-qty-${i}`}
                  className="bg-transparent border-0 focus:ring-2 focus:ring-amber-500/20 rounded-lg px-2 py-2 w-16 text-right font-medium text-slate-600 outline-none"
                  value={item.qty}
                  onChange={val => onChange(update(items, i, { qty: val }))}
                />
              </td>
              <td className="py-1 px-1">
                <input
                  className="bg-transparent border-0 focus:ring-2 focus:ring-amber-500/20 rounded-lg px-2 py-2 w-16 font-medium text-slate-500 outline-none uppercase text-xs tracking-tighter"
                  list="unit-suggestions"
                  value={item.unit}
                  onChange={e => onChange(update(items, i, { unit: e.target.value }))}
                />
              </td>
              <td className="py-1 px-2 last:rounded-r-xl text-right font-black text-slate-900">
                €{item.total.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
