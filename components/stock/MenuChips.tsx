'use client'
import type { MenuTemplate } from '@/types'

interface Props {
  menus: MenuTemplate[]
  selected: string[]
  onChange: (selected: string[]) => void
  t: any
}

export default function MenuChips({ menus, selected, onChange, t }: Props) {
  const toggle = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter(n => n !== name))
    } else {
      onChange([...selected, name])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {menus.map(m => {
        const isSelected = selected.includes(m.nameTh)
        return (
          <button
            key={m.id}
            onClick={() => toggle(m.nameTh)}
            className={`px-5 py-2.5 rounded-2xl border font-bold transition-all active:scale-95 ${
              isSelected 
                ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-amber-200 hover:bg-amber-50/30'
            }`}
          >
            {m.nameTh}
          </button>
        )
      })}
      <button
        onClick={() => toggle('อื่นๆ')}
        className={`px-5 py-2.5 rounded-2xl border font-bold transition-all active:scale-95 ${
          selected.includes('อื่นๆ') 
            ? 'bg-slate-800 text-white border-slate-800 shadow-md shadow-slate-800/20' 
            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
        }`}
      >
        {t.stock.other}
      </button>
    </div>
  )
}
