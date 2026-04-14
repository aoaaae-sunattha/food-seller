import { NextRequest, NextResponse } from 'next/server'
import { appendRows, readRows, updateTab, uploadReceiptImage } from '../../../../lib/sheets'
import type { ReceiptItem } from '../../../../types'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rows = await readRows(accessToken, 'receipt_summaries')
    // date, store, total, drive_url, id
    const summaries = rows.map(row => ({
      date: row[0],
      store: row[1],
      total: Number(row[2]),
      driveUrl: row[3],
      id: row[4]
    }))

    return NextResponse.json(summaries)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const date = formData.get('date') as string
    const store = formData.get('store') as string
    const total = Number(formData.get('total'))
    const itemsJson = formData.get('items') as string
    const imageFile = formData.get('image') as File | null
    const items: ReceiptItem[] = JSON.parse(itemsJson)

    const receiptId = uuidv4()
    let driveUrl = ''

    // 1. Upload Image to Drive if provided
    if (imageFile) {
      const buffer = Buffer.from(await imageFile.arrayBuffer())
      driveUrl = await uploadReceiptImage(
        accessToken, 
        buffer, 
        `receipt_${date}_${store.replace(/\s+/g, '_')}_${receiptId.slice(0,8)}.jpg`, 
        imageFile.type
      )
    }

    // 2. Save Receipt Summary
    await appendRows(accessToken, 'receipt_summaries', [
      [date, store, total, driveUrl, receiptId]
    ])

    // 3. Save Individual Items
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
      item.total,         // Line total TTC
      receiptId           // Link to summary
    ])
    await appendRows(accessToken, 'purchases', rows)

    return NextResponse.json({ ok: true, driveUrl, id: receiptId })
  } catch (error: any) {
    console.error('Purchases POST error:', error.message)
    return NextResponse.json({ 
      error: 'Failed to record purchases',
      details: error.message
    }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    // 1. Get current summaries
    const summaries = await readRows(accessToken, 'receipt_summaries')
    const filteredSummaries = summaries.filter(row => row[4] !== id)

    // 2. Update summary tab
    await updateTab(accessToken, 'receipt_summaries', ['date','store','total','drive_url','id'], filteredSummaries)

    // 3. (Optional) Filter purchases too
    const purchases = await readRows(accessToken, 'purchases')
    const filteredPurchases = purchases.filter(row => row[11] !== id) // receiptId is at index 11
    await updateTab(accessToken, 'purchases', ['date','store','item_fr','item_th','qty','unit','price','net_price','vat_rate','vat_amount','total','receipt_id'], filteredPurchases)

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
