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
    // Columns might be 9 (with ID) or 8 (legacy without ID)
    const history = rows.map(row => {
      const hasId = row.length === 9
      return {
        id: hasId ? row[0] : `legacy-${row[0]}-${row[1]}`, // fallback ID if missing
        date: hasId ? row[1] : row[0],
        menu: hasId ? row[2] : row[1],
        boxes: Number(hasId ? row[3] : row[2]),
        pricePerBox: Number(hasId ? row[4] : row[3]),
        total: Number(hasId ? row[5] : row[4]),
        cash: Number(hasId ? row[6] : row[5]),
        card: Number(hasId ? row[7] : row[6]),
        totalRecorded: Number(hasId ? row[8] : row[7]),
      }
    }).reverse()

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
    const rows = menuSales.map((s, idx) => [
      randomUUID().slice(0, 8),
      date, 
      s.menu, 
      s.boxes, 
      s.pricePerBox, 
      s.boxes * s.pricePerBox, 
      idx === 0 ? cash : 0, // Only first row gets the cash total
      idx === 0 ? card : 0, // Only first row gets the card total
      idx === 0 ? total : 0 // Only first row gets the recorded total
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

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const reason = searchParams.get('reason') || 'No reason provided'
    
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const rows = await readRows(accessToken, 'sales')
    const deletedRow = rows.find(r => r[0] === id)
    const filteredRows = rows.filter(row => row[0] !== id)

    const header = ['id', 'date', 'menu', 'boxes', 'price_per_box', 'subtotal', 'cash', 'card', 'total']
    await updateTab(accessToken, 'sales', header, filteredRows)

    // Log deletion (optional: append to a 'logs' tab if it existed, but we'll return it for the UI log)
    return NextResponse.json({ ok: true, deletedItem: deletedRow, reason })
  } catch (error: any) {
    console.error('Sales DELETE error:', error.message)
    return NextResponse.json({ error: 'Failed to delete sales' }, { status: 500 })
  }
}
