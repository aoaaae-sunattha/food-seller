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

    // Stock quantities for ingredients
    const quantities: Record<string, number> = {}
    for (const r of purchaseRows) {
      const name = r[3]; if (name) quantities[name] = (quantities[name] || 0) + Number(r[4])
    }
    for (const r of stockRows) {
      const name = r[1]; if (name) quantities[name] = (quantities[name] || 0) - Number(r[2])
    }

    // Stock quantities for menus (boxes prepared)
    const menuQuantities: Record<string, number> = {}
    // We don't have a "Menu Purchase" but we might have "Stock Additions" for menus?
    // Looking at stockRows, if r[5] (menu) is set but r[1] (ingredient) is empty, it might be a menu addition?
    // Actually, current system doesn't seem to have "Menu Production" rows yet.
    // However, Sales deduct from menus.
    for (const r of salesRows) {
      const name = r[2]
      const boxes = Number(r[3])
      if (name && !isNaN(boxes)) menuQuantities[name] = (menuQuantities[name] || 0) - boxes
    }

    // We need a way to see "Boxes Prepared". 
    // Let's assume stockRows with reason 'production' or similar adds to menuQuantities.
    // For now, let's just use the config parsing to get both.

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
        let nameFr = '', price = 0, ingredientStr = ''
        if (row[5] && row[5].includes(':')) {
          nameFr = row[3] || '', price = Number(row[4]) || 0, ingredientStr = row[5]
        } else if (row[4] && row[4].includes(':')) {
          nameFr = '', price = Number(row[3]) || 0, ingredientStr = row[4]
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
      details: error.message,
      code: error.code
    }, { status: 500 })
  }
}
