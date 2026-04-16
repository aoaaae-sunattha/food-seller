'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/hooks/useLanguage'
import type { DashboardData } from '@/types'
import { 
  TrendingUp, 
  ClipboardList, 
  AlertTriangle, 
  ExternalLink,
  ChevronRight,
  TrendingDown,
  Boxes,
  Zap,
  Bell,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const { t } = useLanguage()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dbUrl, setDbUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/sheets/url').then(r => r.json()).then(d => setDbUrl(d.url)).catch(() => {})

    fetch('/api/sheets/dashboard')
      .then(async r => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.details || d.error || r.statusText)
        return d
      })
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch((err: any) => {
        console.error('Failed to fetch dashboard data:', err)
        setData({ error: err.message } as any)
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 min-h-[60vh]">
      <div className="w-12 h-12 bg-cinnabar/10 rounded-xl flex items-center justify-center text-cinnabar animate-bounce mb-4">
        <Zap size={24} fill="currentColor" />
      </div>
      <p className="text-slate-400 font-semibold tracking-wide animate-pulse">{t.common.loading}</p>
    </div>
  )
  
  if (!data || (data as any).error) return (
    <div className="max-w-md mx-auto mt-20 p-8 card-base text-center">
      <div className="w-16 h-16 bg-error-red/10 text-error-red rounded-full flex items-center justify-center mx-auto mb-6">
        <AlertTriangle size={32} />
      </div>
      <h2 className="text-xl font-bold text-slate-deep mb-2">{t.common.error}</h2>
      <p className="text-slate-500 text-sm mb-6">{(data as any)?.error || 'Could not connect to Google Sheets'}</p>
      <button onClick={() => window.location.reload()} className="btn-primary w-full">Try Again</button>
    </div>
  )

  const lowStockCount = (data.lowStock ?? []).length

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Page Header */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-4xl font-bold text-slate-deep tracking-tight">{t.nav.dashboard}</h1>
          <p className="text-slate-500 text-base mt-2">Real-time kitchen operations at a glance.</p>
        </div>
        <div className="flex gap-3">
          <div className="w-12 h-12 rounded-full border border-subtle-border flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer transition-colors">
            <Bell size={20} />
          </div>
          {dbUrl && (
            <a 
              href={dbUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn-secondary h-12 px-6"
            >
              <ExternalLink size={18} />
              <span className="hidden sm:inline">Google Sheets</span>
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Top Row: Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card-base relative overflow-hidden group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2 text-base font-semibold text-slate-500">
                <TrendingUp size={20} className="text-cinnabar" />
                {t.dashboard.weeklyIncome}
              </div>
              <div className="w-10 h-10 rounded-full border border-subtle-border flex items-center justify-center text-slate-400 group-hover:bg-cinnabar group-hover:text-white transition-all cursor-pointer">
                <ChevronRight size={16} />
              </div>
            </div>
            <div className="text-[2.5rem] font-bold text-slate-deep leading-none">
              €{(data.weeklyIncome ?? 0).toFixed(2)}
            </div>
            <div className="flex items-center gap-2 mt-6 text-sm font-semibold text-emerald">
               <TrendingUp size={14} />
               <span>+12.5% from last week</span>
            </div>
          </div>

          <div className="card-base relative overflow-hidden group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2 text-base font-semibold text-slate-500">
                <TrendingDown size={20} className="text-slate-400" />
                {t.dashboard.weeklyExpenses}
              </div>
              <div className="w-10 h-10 rounded-full border border-subtle-border flex items-center justify-center text-slate-400 group-hover:bg-cinnabar group-hover:text-white transition-all cursor-pointer">
                <ChevronRight size={16} />
              </div>
            </div>
            <div className="text-[2.5rem] font-bold text-slate-deep leading-none">
              €{(data.weeklyExpenses ?? 0).toFixed(2)}
            </div>
            <div className="flex items-center gap-2 mt-6 text-sm font-semibold text-slate-400">
               <span>84 receipts processed</span>
            </div>
          </div>

          <div className="card-base relative overflow-hidden group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2 text-base font-semibold text-slate-500">
                <AlertTriangle size={20} className={lowStockCount > 0 ? "text-error-red" : "text-emerald"} />
                {t.dashboard.lowStock}
              </div>
              <Link href="/manage-stock" className="w-10 h-10 rounded-full border border-subtle-border flex items-center justify-center text-slate-400 group-hover:bg-cinnabar group-hover:text-white transition-all cursor-pointer">
                <ChevronRight size={16} />
              </Link>
            </div>
            <div className={cn(
              "text-[2.5rem] font-bold leading-none",
              lowStockCount > 0 ? "text-error-red" : "text-emerald"
            )}>
              {lowStockCount} items
            </div>
            <div className="flex items-center gap-2 mt-6 text-sm font-semibold text-slate-400">
               <span>{lowStockCount > 0 ? "Order required within 24h" : "All stock levels healthy"}</span>
            </div>
          </div>
        </div>

        {/* Middle Row: Overview & Data */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 card-base">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xl font-bold text-slate-deep flex items-center gap-2">
                <TrendingUp size={22} className="text-cinnabar" />
                Sales Overview
              </h3>
              <div className="bg-mist-gray px-4 py-2 rounded-lg text-sm font-bold text-slate-500 border border-subtle-border">
                THIS WEEK
              </div>
            </div>
            {/* Chart Placeholder */}
            <div className="h-[240px] flex items-end gap-4 px-2">
               {[40, 65, 50, 90, 0, 0, 0].map((val, i) => (
                 <div key={i} className="flex-1 flex flex-col items-center gap-4">
                   <div 
                    className={cn(
                      "w-full rounded-t-xl transition-all duration-500",
                      i === 3 ? "bg-cinnabar shadow-lg shadow-cinnabar/20" : "bg-subtle-border"
                    )} 
                    style={{ height: `${val}%` }} 
                   />
                   <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">
                     {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}
                   </span>
                 </div>
               ))}
            </div>
          </div>

          <div className="flex flex-col gap-8">
             <div className="card-base bg-periwinkle border-none flex-1">
                <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Business Performance</div>
                <div className="text-3xl font-bold text-slate-deep mt-6">Growth Index</div>
                <div className="flex items-center gap-2 mt-3">
                   <TrendingUp size={20} className="text-emerald" />
                   <span className="text-xl font-bold text-emerald">87.4%</span>
                </div>
                <div className="mt-10">
                  <button className="w-full h-12 bg-white/50 hover:bg-white rounded-xl text-sm font-bold transition-colors">FULL ANALYSIS</button>
                </div>
             </div>
             <div className="card-base bg-champagne border-none flex-1">
                <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Stock Efficiency</div>
                <div className="text-3xl font-bold text-slate-deep mt-6">Utilization</div>
                <div className="flex items-center gap-2 mt-3">
                   <Zap size={20} className="text-amber" />
                   <span className="text-xl font-bold text-amber">92.1%</span>
                </div>
             </div>
          </div>
        </div>

        {/* Bottom Row: Detailed Alerts */}
        <div className="card-base">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-slate-deep flex items-center gap-2">
              <ClipboardList size={22} className="text-cinnabar" />
              {t.dashboard.lowStock}
            </h3>
            {lowStockCount > 0 && (
              <span className="badge-base badge-danger py-1.5 text-sm">ACTION REQUIRED</span>
            )}
          </div>
          
          {lowStockCount > 0 ? (
            <div className="flex flex-col">
              {data.lowStock.map(({ ingredient, currentQty }, i) => (
                <div key={ingredient.id} className={cn(
                  "flex items-center gap-4 py-4",
                  i !== data.lowStock.length - 1 && "border-bottom border-subtle-border"
                )}>
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
                    currentQty <= 0 ? "bg-error-red/10 text-error-red" : "bg-amber/10 text-amber"
                  )}>
                    <Boxes size={22} />
                  </div>
                  <div className="flex-1 min-width-0">
                    <div className="font-bold text-slate-deep">{ingredient.nameTh}</div>
                    <div className="text-sm text-slate-500 font-medium">{ingredient.nameFr}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-slate-deep text-lg">{currentQty} {ingredient.unit}</div>
                    <div className="text-[14px] font-bold text-slate-400 uppercase tracking-wider">Remaining</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
               <div className="w-16 h-16 bg-emerald/10 text-emerald rounded-full flex items-center justify-center mx-auto mb-4">
                 <Zap size={28} fill="currentColor" />
               </div>
               <p className="text-slate-400 font-semibold">All stock levels are optimal.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
