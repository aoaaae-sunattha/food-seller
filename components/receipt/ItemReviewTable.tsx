'use client'
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 border-b">
            <th className="text-left py-1 min-w-[120px]">FR</th>
            <th className="text-left py-1 min-w-[120px]">TH</th>
            <th className="text-right py-1">Qty</th>
            <th className="text-left py-1">Unit</th>
            <th className="text-right py-1">€/u</th>
            <th className="text-right py-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b">
              <td className="py-2 pr-1">
                <input
                  className="border rounded px-1 w-full"
                  value={item.nameFr}
                  onChange={e => onChange(update(items, i, { nameFr: e.target.value }))}
                />
              </td>
              <td className="py-2 pr-1">
                <input
                  className="border rounded px-1 w-full"
                  value={item.nameTh}
                  onChange={e => onChange(update(items, i, { nameTh: e.target.value }))}
                />
              </td>
              <td className="py-2 pr-1">
                <input
                  type="number"
                  className="border rounded px-1 w-16 text-right"
                  value={item.qty}
                  onChange={e => onChange(update(items, i, { qty: Number(e.target.value) }))}
                />
              </td>
              <td className="py-2 pr-1">
                <input
                  className="border rounded px-1 w-16"
                  value={item.unit}
                  onChange={e => onChange(update(items, i, { unit: e.target.value }))}
                />
              </td>
              <td className="py-2 px-1 text-right">€{item.pricePerUnit.toFixed(2)}</td>
              <td className="py-2 px-1 text-right">€{item.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
