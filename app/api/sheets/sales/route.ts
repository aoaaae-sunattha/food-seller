import { NextRequest, NextResponse } from 'next/server'
import { appendRows } from '../../../../lib/sheets'

export async function POST(req: NextRequest) {
  try {
    const { date, menuSales, cash, card }: {
      date: string
      menuSales: { menu: string; boxes: number; pricePerBox: number }[]
      cash: number
      card: number
    } = await req.json()

    const total = cash + card
    const rows = menuSales.map(s => [
      date, s.menu, s.boxes, s.pricePerBox, s.boxes * s.pricePerBox, cash, card, total,
    ])

    await appendRows('sales', rows)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Sales POST error:', error)
    return NextResponse.json({ error: 'Failed to record sales' }, { status: 500 })
  }
}
