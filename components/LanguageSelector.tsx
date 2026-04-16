'use client'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/types'
import { cn } from '@/lib/utils'

const FLAGS: { lang: Language; flag: string; label: string }[] = [
  { lang: 'th', flag: '🇹🇭', label: 'Thai' },
  { lang: 'fr', flag: '🇫🇷', label: 'Français' },
  { lang: 'en', flag: '🇬🇧', label: 'English' },
]

export default function LanguageSelector() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="flex bg-mist-gray p-1 rounded-xl border border-subtle-border">
      {FLAGS.map(({ lang: l, flag, label }) => {
        const isActive = lang === l
        return (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200",
                isActive 
                  ? "bg-white text-slate-deep shadow-sm ring-1 ring-subtle-border font-bold" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
            )}
            aria-label={label}
          >
            <span className="text-base grayscale-[0.2]">{flag}</span>
            <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                isActive ? "opacity-100" : "opacity-0 lg:group-hover:opacity-100"
            )}>
              {l}
            </span>
          </button>
        )
      })}
    </div>
  )
}
