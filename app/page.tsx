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

  if (loading) return <p className="text-center mt-8">{t.common.loading}</p>
  if (!data) return <p className="text-center mt-8 text-red-500">{t.common.error}</p>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
          <p className="text-sm text-gray-500">{t.dashboard.weeklyIncome}</p>
          <p className="text-2xl font-bold text-green-600">€{data.weeklyIncome.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
          <p className="text-sm text-gray-500">{t.dashboard.weeklyExpenses}</p>
          <p className="text-2xl font-bold text-red-600">€{data.weeklyExpenses.toFixed(2)}</p>
        </div>
      </div>

      {data.lowStock.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <span>⚠️</span> {t.dashboard.lowStock}
          </h2>
          <ul className="space-y-2">
            {data.lowStock.map(({ ingredient, currentQty }) => (
              <li key={ingredient.id} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-700">{ingredient.nameTh}</span>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                  currentQty <= 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {currentQty} {ingredient.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
