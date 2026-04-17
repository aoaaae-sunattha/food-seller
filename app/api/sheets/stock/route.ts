import { NextRequest, NextResponse } from 'next/server'
import { readRows, appendRows, updateInventory, updateTab } from '../../../../lib/sheets'
import type { StockDeductionRow } from '../../../../types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const inventoryRows = await readRows(accessToken, 'inventory')

    const quantities: Record<string, number> = {}
    for (const row of inventoryRows) {
      const name = row[0]
      const qty = Number(row[1])
      if (name && !isNaN(qty)) quantities[name] = qty
    }

    return NextResponse.json({ quantities })
  } catch (error: any) {
    console.error('Stock GET error:', error.message)
    return NextResponse.json({ 
      error: 'Failed to fetch inventory',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { rows }: { rows: StockDeductionRow[] } = await req.json()

    // 1. Record deductions in history (Stock tab)
    const data = rows.map(r => [
      r.date, r.ingredient, r.amount_used, r.unit, r.reason, r.menu,
    ])
    await appendRows(accessToken, 'stock', data)

    // 2. Update current balances (Inventory tab)
    const adjustments = rows.map(r => ({
      ingredient: r.ingredient,
      qtyDelta: -r.amount_used,
      unit: r.unit
    }))
    await updateInventory(accessToken, adjustments)

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Stock POST error:', error.message)
    return NextResponse.json({ 
      error: 'Failed to record deductions',
      details: error.message
    }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { ingredient, qty, unit }: { ingredient: string, qty: number, unit: string } = await req.json()
    if (!ingredient) return NextResponse.json({ error: 'Missing ingredient name' }, { status: 400 })

    const inventoryRows = await readRows(accessToken, 'inventory')
    const date = new Date().toISOString().slice(0, 10)
    
    let found = false
    const updatedRows = inventoryRows.map(row => {
      if (row[0] === ingredient) {
        found = true
        return [ingredient, qty, unit, date]
      }
      return row
    })

    if (!found) {
      updatedRows.push([ingredient, qty, unit, date])
    }

    await updateTab(accessToken, 'inventory', ['ingredient','qty','unit','last_updated'], updatedRows)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Stock PUT error:', error.message)
    return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 })
  }
}
