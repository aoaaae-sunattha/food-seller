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
    // Expecting columns: date, menu, boxes, pricePerBox, total, cash, card, totalRecorded
    const history = rows.map(row => ({
      date: row[0],
      menu: row[1],
      boxes: Number(row[2]),
      pricePerBox: Number(row[3]),
      total: Number(row[4]),
      cash: Number(row[5]),
      card: Number(row[6]),
      totalRecorded: Number(row[7]),
    })).reverse() // Show latest first

    return NextResponse.json({ history })
  } catch (error: any) {
    console.error('Sales GET error:', error.message)
    return NextResponse.json({ error: 'Failed to fetch sales history' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    console.log('--- API Debug: POST /api/sheets/sales ---')
    console.log('Session present:', !!session)
    console.log('AccessToken present:', !!accessToken)

    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

    await appendRows(accessToken, 'sales', rows)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Sales POST error:', error.message)
    return NextResponse.json({ 
      error: 'Failed to record sales',
      details: error.message,
      code: error.code
    }, { status: 500 })
  }
}
