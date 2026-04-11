import { NextRequest, NextResponse } from 'next/server'
import { readRows, appendRows } from '../../../../lib/sheets'
import type { StockDeductionRow } from '../../../../types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [purchaseRows, stockRows] = await Promise.all([
      readRows(accessToken, 'purchases'),
      readRows(accessToken, 'stock'),
    ])

    const quantities: Record<string, number> = {}

    // Add purchases (column 3 = item_th, column 4 = qty)
    for (const row of purchaseRows) {
      const name = row[3]
      const qty = Number(row[4])
      if (name && !isNaN(qty)) quantities[name] = (quantities[name] || 0) + qty
    }

    // Subtract deductions (column 1 = ingredient, column 2 = amount_used)
    for (const row of stockRows) {
      const name = row[1]
      const qty = Number(row[2])
      if (name && !isNaN(qty)) quantities[name] = (quantities[name] || 0) - qty
    }

    return NextResponse.json({ quantities })
  } catch (error) {
    console.error('Stock GET error:', error)
    return NextResponse.json({ error: 'Failed to compute quantities' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { rows }: { rows: StockDeductionRow[] } = await req.json()

    const data = rows.map(r => [
      r.date, r.ingredient, r.amount_used, r.unit, r.reason, r.menu,
    ])

    await appendRows(accessToken, 'stock', data)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Stock POST error:', error)
    return NextResponse.json({ error: 'Failed to record deductions' }, { status: 500 })
  }
}
