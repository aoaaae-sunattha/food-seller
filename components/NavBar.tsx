'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/hooks/useLanguage'

const NAV_ITEMS = [
  { href: '/',                icon: '🏠', key: 'dashboard'     },
  { href: '/receipt',         icon: '🧾', key: 'receipt'       },
  { href: '/stock-deduction', icon: '📦', key: 'stockDeduction'},
  { href: '/daily-sales',     icon: '💰', key: 'dailySales'    },
  { href: '/manage-stock',    icon: '🗂️', key: 'manageStock'   },
  { href: '/manage-menus',    icon: '🍜', key: 'manageMenus'   },
] as const

export default function NavBar() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <nav className={`fixed left-6 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-xl border border-slate-200/50 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] flex flex-col items-start py-8 px-4 z-[100] transition-all duration-500 overflow-hidden ${
      isExpanded ? 'w-48' : 'w-20'
    }`}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="mb-8 self-center w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all active:scale-90"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>

      <div className="flex flex-col gap-6 w-full">
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-bar-${item.key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`}
              className={`flex items-center gap-4 transition-all duration-300 w-full rounded-2xl p-2 ${
                isActive ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className={`text-2xl min-w-[2rem] flex justify-center transition-transform ${isActive ? 'drop-shadow-sm scale-110' : ''}`}>
                {item.icon}
              </span>
              <span className={`text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all duration-300 ${
                isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
              }`}>
                {t.nav[item.key]}
              </span>
              {isActive && (
                <span className="absolute left-0 w-1 h-8 bg-amber-600 rounded-r-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
