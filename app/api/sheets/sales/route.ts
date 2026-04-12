import { NextRequest, NextResponse } from 'next/server'
import { appendRows, readRows } from '../../../../lib/sheets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rows = await readRows(accessToken, 'sales')
    // Columns: id, date, menu, boxes, pricePerBox, total, cash, card, totalRecorded
    const history = rows.map(row => ({
      id: row[0],
      date: row[1],
      menu: row[2],
      boxes: Number(row[3]),
      pricePerBox: Number(row[4]),
      total: Number(row[5]),
      cash: Number(row[6]),
      card: Number(row[7]),
      totalRecorded: Number(row[8]),
    })).reverse()

    return NextResponse.json({ history })
  } catch (error: any) {
    console.error('Sales GET error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch sales history' }, { status: 500 })
  }
}

import { randomUUID } from 'crypto'
import { updateTab } from '../../../../lib/sheets'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { date, menuSales, cash, card }: {
      date: string
      menuSales: { menu: string; boxes: number; pricePerBox: number }[]
      cash: number
      card: number
    } = await req.json()

    const total = cash + card
    const rows = menuSales.map(s => [
      randomUUID().slice(0, 8),
      date, s.menu, s.boxes, s.pricePerBox, s.boxes * s.pricePerBox, cash, card, total,
    ])

    await appendRows(accessToken, 'sales', rows)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Sales POST error:', error.message)
    return NextResponse.json({ error: 'Failed to record sales' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, date, menu, boxes, pricePerBox, cash, card } = body

    const rows = await readRows(accessToken, 'sales')
    const updatedRows = rows.map(row => {
      if (row[0] === id) {
        const total = Number(boxes) * Number(pricePerBox)
        const totalRecorded = Number(cash) + Number(card)
        return [id, date, menu, boxes, pricePerBox, total, cash, card, totalRecorded]
      }
      return row
    })

    const header = ['id', 'date', 'menu', 'boxes', 'price_per_box', 'subtotal', 'cash', 'card', 'total']
    await updateTab(accessToken, 'sales', header, updatedRows)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Sales PUT error:', error.message)
    return NextResponse.json({ error: 'Failed to update sales' }, { status: 500 })
  }
}
