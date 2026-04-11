'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Language } from '@/types'
import th from '@/i18n/th.json'
import fr from '@/i18n/fr.json'
import en from '@/i18n/en.json'

const translations = { th, fr, en }

export function useLanguage() {
  const [lang, setLangState] = useState<Language>('th')

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Language | null
    if (saved && ['th', 'fr', 'en'].includes(saved)) setLangState(saved)
  }, [])

  const setLang = useCallback((l: Language) => {
    localStorage.setItem('lang', l)
    setLangState(l)
  }, [])

  const t = translations[lang] as typeof th

  return { lang, setLang, t }
}
