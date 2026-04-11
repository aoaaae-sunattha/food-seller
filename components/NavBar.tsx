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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 z-50">
      {NAV_ITEMS.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-col items-center text-xs gap-1 px-2 py-1 rounded ${
            pathname === item.href ? 'text-blue-600 font-bold' : 'text-gray-500'
          }`}
        >
          <span className="text-2xl">{item.icon}</span>
          <span>{t.nav[item.key]}</span>
        </Link>
      ))}
    </nav>
  )
}
