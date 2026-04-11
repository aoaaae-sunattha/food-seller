import { NextRequest, NextResponse } from 'next/server'
import { readRows } from '../../../../lib/sheets'
import type { StockQuantity, Ingredient } from '../../../../types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day // Monday
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
    const weekStart = startOfWeek(now).toISOString().slice(0, 10)

    const [salesRows, purchaseRows, stockRows, configRows] = await Promise.all([
      readRows(accessToken, 'sales'),
      readRows(accessToken, 'purchases'),
      readRows(accessToken, 'stock'),
      readRows(accessToken, 'config'),
    ])

    // Weekly income: sum column 7 (total) for rows in this week
    const weeklyIncome = salesRows
      .filter(r => r[0] >= weekStart)
      .reduce((sum, r) => sum + Number(r[7]), 0)

    // Weekly expenses: sum column 7 (total) from purchases this week
    const weeklyExpenses = purchaseRows
      .filter(r => r[0] >= weekStart)
      .reduce((sum, r) => sum + Number(r[7]), 0)

    // Stock quantities
    const quantities: Record<string, number> = {}
    for (const r of purchaseRows) {
      const name = r[3]; if (name) quantities[name] = (quantities[name] || 0) + Number(r[4])
    }
    for (const r of stockRows) {
      const name = r[1]; if (name) quantities[name] = (quantities[name] || 0) - Number(r[2])
    }

    const ingredients: Ingredient[] = configRows
      .filter(r => r[0] === 'ingredient')
      .map(r => ({ id: r[1], nameTh: r[2], nameFr: r[3], unit: r[4], threshold: Number(r[5]) }))

    const lowStock: StockQuantity[] = ingredients
      .filter(ing => (quantities[ing.nameTh] || 0) <= ing.threshold)
      .map(ing => ({ ingredient: ing, currentQty: quantities[ing.nameTh] || 0 }))

    return NextResponse.json({ weeklyIncome, weeklyExpenses, lowStock })
  } catch (error) {
    console.error('Dashboard GET error:', error)
    return NextResponse.json({ error: 'Failed to aggregate dashboard data' }, { status: 500 })
  }
}
