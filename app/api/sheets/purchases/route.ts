import { NextRequest, NextResponse } from 'next/server'
import { appendRows } from '../../../../lib/sheets'
import type { ReceiptItem } from '../../../../types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    console.log('--- API Debug: POST /api/sheets/purchases ---')
    console.log('Session present:', !!session)
    console.log('AccessToken present:', !!accessToken)

    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { date, store, items }: { date: string; store: string; items: ReceiptItem[] } = await req.json()

    const rows = items.map(item => [
      date, 
      store, 
      item.nameFr, 
      item.nameTh, 
      item.qty, 
      item.unit, 
      item.pricePerUnit, // Price TTC
      item.netPrice,     // Price HT
      item.vatRate, 
      item.vatAmount, 
      item.total         // Line total TTC
    ])
    await appendRows(accessToken, 'purchases', rows)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Purchases POST error:', error.message)
    return NextResponse.json({ 
      error: 'Failed to record purchases',
      details: error.message,
      code: error.code
    }, { status: 500 })
  }
}
