'use client'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/types'

const FLAGS: { lang: Language; flag: string; label: string }[] = [
  { lang: 'th', flag: '🇹🇭', label: 'Thai' },
  { lang: 'fr', flag: '🇫🇷', label: 'Français' },
  { lang: 'en', flag: '🇬🇧', label: 'English' },
]

export default function LanguageSelector() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
      {FLAGS.map(({ lang: l, flag, label }) => {
        const isActive = lang === l
        return (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-300 ${
              isActive 
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 font-bold' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
            aria-label={label}
          >
            <span className="text-base">{flag}</span>
            <span className={`text-[10px] uppercase tracking-tighter ${isActive ? 'opacity-100' : 'hidden md:block opacity-0 group-hover:opacity-100 transition-opacity'}`}>
              {l}
            </span>
          </button>
        )
      })}
    </div>
  )
}
