import { NextRequest, NextResponse } from 'next/server'
import { extractReceiptItems } from '../../../lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const items = await extractReceiptItems(buffer, file.type || 'image/jpeg')
    return NextResponse.json({ items })
  } catch (error) {
    console.error('OCR error:', error)
    return NextResponse.json({ error: 'Failed to extract items' }, { status: 500 })
  }
}
