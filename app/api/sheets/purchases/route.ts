import { NextRequest, NextResponse } from 'next/server'
import { appendRows } from '@/lib/sheets'
import type { ReceiptItem } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { date, store, items }: { date: string; store: string; items: ReceiptItem[] } = await req.json()

    const rows = items.map(item => [
      date, store, item.nameFr, item.nameTh, item.qty, item.unit, item.pricePerUnit, item.total,
    ])

    await appendRows('purchases', rows)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Purchases POST error:', error)
    return NextResponse.json({ error: 'Failed to record purchases' }, { status: 500 })
  }
}
