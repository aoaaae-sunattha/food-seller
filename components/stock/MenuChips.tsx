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
      {menus.map(m => (
        <button
          key={m.id}
          onClick={() => toggle(m.nameTh)}
          className={`px-4 py-2 rounded-full border ${
            selected.includes(m.nameTh) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700'
          }`}
        >
          {m.nameTh}
        </button>
      ))}
      <button
        onClick={() => toggle('อื่นๆ')}
        className={`px-4 py-2 rounded-full border ${
          selected.includes('อื่นๆ') ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700'
        }`}
      >
        {t.stock.other}
      </button>
    </div>
  )
}
