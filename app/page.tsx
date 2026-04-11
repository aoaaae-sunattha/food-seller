'use client'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import type { DashboardData } from '@/types'

export default function DashboardPage() {
  const { t } = useLanguage()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sheets/dashboard')
      .then(r => r.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to fetch dashboard data:', err)
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
      <div className="text-4xl mb-4">🍜</div>
      <p className="text-slate-400 font-medium">{t.common.loading}</p>
    </div>
  )
  
  if (!data) return (
    <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100">
      <div className="text-4xl mb-4">❌</div>
      <p className="text-rose-500 font-bold">{t.common.error}</p>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Income */}
        <div className="bg-white rounded-[2rem] shadow-sm shadow-slate-200/50 border border-slate-100 p-8 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <span className="text-6xl">💰</span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t.dashboard.weeklyIncome}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-slate-900 leading-none">€{data.weeklyIncome.toFixed(2)}</span>
          </div>
          <div className="mt-4 h-1 w-12 bg-emerald-500 rounded-full" />
        </div>

        {/* Weekly Expenses */}
        <div className="bg-white rounded-[2rem] shadow-sm shadow-slate-200/50 border border-slate-100 p-8 relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
            <span className="text-6xl">🧾</span>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t.dashboard.weeklyExpenses}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-slate-900 leading-none">€{data.weeklyExpenses.toFixed(2)}</span>
          </div>
          <div className="mt-4 h-1 w-12 bg-rose-500 rounded-full" />
        </div>
      </div>

      {/* Low Stock Alerts */}
      <div className="bg-white rounded-[2rem] shadow-sm shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="p-8 pb-4">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-3">
            <span className="bg-amber-100 p-2 rounded-xl text-xl">⚠️</span>
            {t.dashboard.lowStock}
          </h2>
        </div>
        
        {data.lowStock.length > 0 ? (
          <div className="divide-y divide-slate-50 px-4 pb-4">
            {data.lowStock.map(({ ingredient, currentQty }) => {
              const isCritical = currentQty <= 0
              return (
                <div key={ingredient.id} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors rounded-2xl">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700">{ingredient.nameTh}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{ingredient.nameFr}</span>
                  </div>
                  <span className={`text-sm font-black px-4 py-1.5 rounded-full shadow-sm ${
                    isCritical 
                      ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                      : 'bg-amber-100 text-amber-700 border border-amber-200'
                  }`}>
                    {currentQty} {ingredient.unit}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center">
            <span className="text-4xl mb-2 opacity-20">✨</span>
            <p className="text-slate-400 font-medium italic">Everything is in stock!</p>
          </div>
        )}
      </div>
    </div>
  )
}
