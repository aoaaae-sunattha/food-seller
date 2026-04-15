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

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (id) {
      // Fetch details for a specific receipt from receipt_extract
      let rows = await readRows(accessToken, 'receipt_extract')
      let items = rows
        .filter(row => row[10] === id)
        .map(row => ({
          nameFr: row[2],
          nameTh: row[3],
          qty: Number(row[4]),
          unit: row[5],
          pricePerUnit: Number(row[6]),
          vatRate: Number(row[7]),
          discount: Number(row[8]),
          total: Number(row[9])
        }))
      
      // Fallback to 'purchases' if 'receipt_extract' is empty for this ID
      if (items.length === 0) {
        rows = await readRows(accessToken, 'purchases')
        items = rows
          .filter(row => row[10] === id)
          .map(row => ({
            nameFr: row[2],
            nameTh: row[3],
            qty: Number(row[4]),
            unit: row[5],
            pricePerUnit: Number(row[6]),
            vatRate: Number(row[7]),
            discount: Number(row[8]),
            total: Number(row[9])
          }))
      }

      return NextResponse.json(items)
    }

    const rows = await readRows(accessToken, 'receipt_summaries')
    // date, store, total, discrepancy, drive_url, id
    const summaries = rows.map(row => {
      const hasNewFormat = row.length >= 6
      return {
        date: row[0],
        store: row[1],
        total: Number(row[2] || 0),
        discrepancy: hasNewFormat ? Number(row[3] || 0) : 0,
        driveUrl: hasNewFormat ? row[4] : row[3],
        id: hasNewFormat ? row[5] : row[4]
      }
    })

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
    const discrepancy = Number(formData.get('discrepancy') || 0)
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

    // 2. Save Receipt Summary (date, store, total, discrepancy, drive_url, id)
    await appendRows(accessToken, 'receipt_summaries', [
      [date, store, total, discrepancy, driveUrl, receiptId]
    ])

    // 3. Save Individual Items to Purchases
    const rows = items.map(item => [
      date, 
      store, 
      item.nameFr, 
      item.nameTh, 
      item.qty, 
      item.unit, 
      item.pricePerUnit, 
      item.vatRate,
      item.discount,
      item.total,         
      receiptId           
    ])
    await appendRows(accessToken, 'purchases', rows)

    // 4. Save to Receipt Extract (Raw extraction per user request)
    await appendRows(accessToken, 'receipt_extract', rows)

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

    const { id, all } = await req.json()
    
    if (all) {
      // Clear all receipt related data
      await updateTab(accessToken, 'receipt_summaries', ['date','store','total','discrepancy','drive_url','id'], [])
      await updateTab(accessToken, 'purchases', ['date','store','name_fr','name_th','qty','unit','price','vat_rate','discount','total','receipt_id'], [])
      await updateTab(accessToken, 'receipt_extract', ['date','store','name_fr','name_th','qty','unit','price','vat_rate','discount','total','receipt_id'], [])
      return NextResponse.json({ ok: true })
    }

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    // 1. Get current summaries
    const summaries = await readRows(accessToken, 'receipt_summaries')
    
    // Handle both old format (6 cols) and older format (5 cols)
    const filteredSummaries = summaries.filter(row => {
      const rowId = row.length >= 6 ? row[5] : row[4]
      return rowId !== id
    })

    // 2. Update summary tab
    await updateTab(accessToken, 'receipt_summaries', ['date','store','total','discrepancy','drive_url','id'], filteredSummaries)

    // 3. (Optional) Filter purchases too
    const purchases = await readRows(accessToken, 'purchases')
    const filteredPurchases = purchases.filter(row => row[10] !== id) // receiptId is now at index 10
    await updateTab(accessToken, 'purchases', ['date','store','name_fr','name_th','qty','unit','price','vat_rate','discount','total','receipt_id'], filteredPurchases)

    // 4. Filter receipt_extract
    const extracts = await readRows(accessToken, 'receipt_extract')
    const filteredExtracts = extracts.filter(row => row[10] !== id) // receiptId is now at index 10
    await updateTab(accessToken, 'receipt_extract', ['date','store','name_fr','name_th','qty','unit','price','vat_rate','discount','total','receipt_id'], filteredExtracts)

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
