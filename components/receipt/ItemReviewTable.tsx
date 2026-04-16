'use client'
import { NumberInput } from '@/components/NumberInput';
import { useLanguage } from '@/hooks/useLanguage';
import type { ReceiptItem } from '@/types'
import { Trash2, Plus, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  items: ReceiptItem[]
  onChange: (items: ReceiptItem[]) => void
  showAdvanced?: boolean
}

export default function ItemReviewTable({ items, onChange, showAdvanced = false }: Props) {
  const { t } = useLanguage()

  function updateLine(index: number, patch: Partial<ReceiptItem>) {
    const item = items[index]
    const newItem = { ...item, ...patch }
    
    if (patch.qty !== undefined || patch.pricePerUnit !== undefined) {
      newItem.total = Number((newItem.qty * newItem.pricePerUnit).toFixed(2))
    }
    
    if (patch.netPrice !== undefined || patch.vatRate !== undefined) {
      newItem.pricePerUnit = Number((newItem.netPrice * (1 + (newItem.vatRate / 100))).toFixed(2))
      newItem.total = Number((newItem.qty * newItem.pricePerUnit).toFixed(2))
      newItem.vatAmount = Number((newItem.total - (newItem.netPrice * newItem.qty)).toFixed(2))
    } else if (patch.pricePerUnit !== undefined && !showAdvanced) {
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
    <div className="overflow-x-auto rounded-xl border border-subtle-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-mist-gray text-[14px] font-bold text-slate-400 uppercase tracking-widest border-bottom border-subtle-border">
            <th className="text-left py-4 px-4">{t.receipt.itemFr}</th>
            <th className="text-left py-4 px-4">{t.receipt.itemTh}</th>
            <th className="text-center py-4 px-2">{t.receipt.qty}</th>
            <th className="text-right py-4 px-4">Rate</th>
            <th className="text-right py-4 px-4">Total</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-subtle-border">
          {items.map((item, i) => (
            <tr key={i} className={cn(
              "group transition-colors hover:bg-mist-gray/30",
              item.isDiscount && "bg-error-red/5"
            )}>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {item.isDiscount && (
                    <span className="badge-base badge-danger scale-75 origin-left">DISC</span>
                  )}
                  <input
                    className="bg-transparent border-none focus:ring-0 rounded-lg py-1 w-full font-medium text-slate-500 outline-none"
                    value={item.nameFr}
                    onChange={e => updateLine(i, { nameFr: e.target.value })}
                  />
                </div>
              </td>
              <td className="py-3 px-4">
                <input
                  className="bg-mist-gray/50 border border-transparent focus:border-cinnabar focus:bg-white rounded-lg px-3 py-1.5 w-full font-bold text-slate-deep outline-none transition-all"
                  value={item.nameTh}
                  placeholder="Thai name..."
                  onChange={e => updateLine(i, { nameTh: e.target.value })}
                />
              </td>
              <td className="py-3 px-2">
                <NumberInput
                  className="bg-transparent border-none text-center font-bold text-slate-600 outline-none w-full"
                  value={item.qty}
                  onChange={val => updateLine(i, { qty: val })}
                />
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center justify-end gap-1">
                   <span className="text-slate-300 font-bold">€</span>
                   <NumberInput
                    className="bg-mist-gray/50 border border-transparent focus:border-cinnabar focus:bg-white rounded-lg px-2 py-1.5 w-20 text-right font-bold text-slate-deep outline-none"
                    value={item.pricePerUnit}
                    onChange={val => updateLine(i, { pricePerUnit: val })}
                  />
                </div>
              </td>
              <td className={cn(
                "py-3 px-4 text-right font-bold text-base",
                item.isDiscount ? "text-error-red" : "text-slate-deep"
              )}>
                €{Math.abs(item.total).toFixed(2)}
              </td>
              <td className="py-3 px-2 text-center">
                <button
                  onClick={() => deleteLine(i)}
                  className="w-8 h-8 rounded-lg text-slate-300 hover:text-error-red hover:bg-error-red/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
