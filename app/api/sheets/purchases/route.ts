import { NextRequest, NextResponse } from 'next/server'
import { appendRows } from '../../../../lib/sheets'
import type { ReceiptItem } from '../../../../types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { date, store, items }: { date: string; store: string; items: ReceiptItem[] } = await req.json()

    const rows = items.map(item => [
      date, store, item.nameFr, item.nameTh, item.qty, item.unit, item.pricePerUnit, item.total,
    ])

    await appendRows(accessToken, 'purchases', rows)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Purchases POST error:', error)
    return NextResponse.json({ error: 'Failed to record purchases' }, { status: 500 })
  }
}
