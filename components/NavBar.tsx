'use client'
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

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-white/90 backdrop-blur-xl border border-slate-200/50 shadow-2xl shadow-slate-200/50 rounded-3xl flex justify-around items-center py-3 px-4 z-[100]">
      {NAV_ITEMS.map(item => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            id={`nav-bar-${item.key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`}
            className={`flex flex-col items-center gap-1.5 transition-all duration-300 relative ${
              isActive ? 'text-amber-600 scale-110' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className={`text-2xl transition-transform ${isActive ? 'drop-shadow-sm' : ''}`}>
              {item.icon}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-tighter ${isActive ? 'opacity-100' : 'opacity-0 scale-75'}`}>
              {t.nav[item.key]}
            </span>
            {isActive && (
              <span className="absolute -bottom-1 w-1 h-1 bg-amber-600 rounded-full" />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
