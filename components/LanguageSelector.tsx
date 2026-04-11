'use client'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/types'

const FLAGS: { lang: Language; flag: string }[] = [
  { lang: 'th', flag: '🇹🇭' },
  { lang: 'fr', flag: '🇫🇷' },
  { lang: 'en', flag: '🇬🇧' },
]

export default function LanguageSelector() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="flex gap-1">
      {FLAGS.map(({ lang: l, flag }) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`text-xl px-1 rounded ${lang === l ? 'ring-2 ring-blue-500' : ''}`}
          aria-label={l}
        >
          {flag}
        </button>
      ))}
    </div>
  )
}
