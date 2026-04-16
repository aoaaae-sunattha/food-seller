'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/hooks/useLanguage'
import { 
  LayoutDashboard, 
  ScanLine, 
  Package, 
  TrendingUp, 
  Settings, 
  Zap,
  Boxes,
  ChefHat
} from 'lucide-react'
import { cn } from '@/lib/utils'
import LanguageSelector from './LanguageSelector'

const NAV_ITEMS = [
  { href: '/',                icon: LayoutDashboard, key: 'dashboard'     },
  { href: '/receipt',         icon: ScanLine,        key: 'receipt'       },
  { href: '/manage-stock',    icon: Boxes,           key: 'manageStock'   },
  { href: '/stock-deduction', icon: Package,         key: 'stockDeduction'},
  { href: '/daily-sales',     icon: TrendingUp,      key: 'dailySales'    },
  { href: '/manage-menus',    icon: ChefHat,         key: 'manageMenus'   },
] as const

export default function NavBar() {
  const pathname = usePathname()
  const { t } = useLanguage()

  return (
    <nav className="fixed left-0 top-0 h-screen bg-surface-white border-r border-subtle-border flex flex-col py-8 z-50 transition-all duration-300 w-[80px] lg:w-[240px]">
      {/* Logo Section */}
      <div className="px-6 mb-12 flex items-center gap-4">
        <div className="w-12 h-12 bg-cinnabar rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-cinnabar/20">
          <Zap size={28} fill="currentColor" />
        </div>
        <span className="font-bold text-2xl text-slate-deep tracking-tight hidden lg:block">Siam Manager</span>
      </div>

      <div className="px-6 mb-6 text-xs font-bold text-slate-400 uppercase tracking-widest hidden lg:block">
        {t.nav.menu || 'Menu'}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 flex flex-col gap-2 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-200 group",
                isActive 
                  ? "bg-cinnabar text-white shadow-xl shadow-cinnabar/20" 
                  : "text-slate-500 hover:text-slate-deep hover:bg-mist-gray"
              )}
            >
              <Icon size={24} className={cn("shrink-0", isActive ? "text-white" : "group-hover:text-cinnabar")} />
              <span className={cn(
                "font-bold text-base whitespace-nowrap transition-opacity hidden lg:block",
                isActive ? "text-white" : "text-slate-500"
              )}>
                {t.nav[item.key]}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Footer Section */}
      <div className="px-3 flex flex-col gap-2">
        <div className="px-3 py-6 lg:px-0 flex justify-center lg:justify-start lg:px-6">
           <LanguageSelector />
        </div>
        
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-500 hover:text-slate-deep hover:bg-mist-gray transition-all",
            pathname === '/settings' && "bg-mist-gray text-slate-deep"
          )}
        >
          <Settings size={24} className="shrink-0 group-hover:text-cinnabar" />
          <span className="font-bold text-base hidden lg:block">Settings</span>
        </Link>
      </div>
    </nav>
  )
}
