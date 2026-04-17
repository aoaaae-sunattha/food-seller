import { NextRequest, NextResponse } from 'next/server'
import { readRows } from '../../../../lib/sheets'
import type { StockQuantity, Ingredient, MenuTemplate } from '../../../../types'
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
    console.log('--- API Debug: GET /api/sheets/dashboard ---')
    console.log('Session present:', !!session)
    console.log('AccessToken present:', !!accessToken)

    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
    const weekStart = startOfWeek(now).toISOString().slice(0, 10)

    const [salesRows, purchaseRows, configRows, inventoryRows] = await Promise.all([
      readRows(accessToken, 'sales'),
      readRows(accessToken, 'purchases'),
      readRows(accessToken, 'config'),
      readRows(accessToken, 'inventory'),
    ])

    // Weekly income: sum totalRecorded (column 9, index 8) for rows in this week
    const weeklyIncome = salesRows
      .filter(r => r[1] >= weekStart)
      .reduce((sum, r) => sum + Number(r[8] || 0), 0)

    // Weekly expenses: sum total (column 10, index 9) from purchases this week
    const weeklyExpenses = purchaseRows
      .filter(r => r[0] >= weekStart)
      .reduce((sum, r) => sum + Number(r[9] || 0), 0)

    // Stock quantities from Inventory tab
    const quantities: Record<string, number> = {}
    for (const r of inventoryRows) {
      const name = r[0]
      const qty = Number(r[1])
      if (name && !isNaN(qty)) quantities[name] = qty
    }

    const ingredients: Ingredient[] = []
    const menus: MenuTemplate[] = []

    for (const row of configRows) {
      if (row[0] === 'ingredient') {
        ingredients.push({
          id: row[1],
          nameTh: row[2],
          nameFr: row[3],
          unit: row[4],
          threshold: Number(row[5]),
        })
      } else if (row[0] === 'menu') {
        let nameFr = '', price = 0
        if (row[5] && row[5].includes(':')) {
          nameFr = row[3] || '', price = Number(row[4]) || 0
        } else if (row[4] && row[4].includes(':')) {
          nameFr = '', price = Number(row[3]) || 0
        }
        menus.push({ id: row[1], nameTh: row[2], nameFr, pricePerBox: price, ingredients: [] })
      }
    }

    const lowStock: StockQuantity[] = [
      ...ingredients
        .filter(ing => (quantities[ing.nameTh] || 0) <= ing.threshold)
        .map(ing => ({ ingredient: ing, currentQty: quantities[ing.nameTh] || 0 }))
    ]

    return NextResponse.json({ weeklyIncome, weeklyExpenses, lowStock })
  } catch (error: any) {
    console.error('Dashboard GET error:', error.message)
    return NextResponse.json({ 
      error: 'Failed to aggregate dashboard data',
      details: error.message
    }, { status: 500 })
  }
}
