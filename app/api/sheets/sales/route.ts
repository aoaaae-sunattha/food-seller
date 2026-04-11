import { NextRequest, NextResponse } from 'next/server'
import { appendRows } from '../../../../lib/sheets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
