import { NextRequest, NextResponse } from 'next/server'
import { messagingApi, webhook } from '@line/bot-sdk'
import * as crypto from 'crypto'
import { appendRows, readRows } from '@/lib/sheets'
import { extractReceiptItems } from '@/lib/gemini'
import { parseLineCommand } from '@/lib/line'

const channelSecret = process.env.LINE_CHANNEL_SECRET || ''
const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''

const client = new messagingApi.MessagingApiClient({ channelAccessToken })

function validateSignature(body: string, signature: string): boolean {
  const hmac = crypto.createHmac('sha256', channelSecret)
  hmac.update(body)
  const expected = hmac.digest('base64')
  return expected === signature
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-line-signature') || ''

  if (!validateSignature(rawBody, signature)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  let events: webhook.Event[] = []
  try {
    events = JSON.parse(rawBody).events || []
  } catch {
    return new NextResponse('Bad Request', { status: 400 })
  }

  const date = new Date().toISOString().split('T')[0]

  for (const event of events) {
    if (event.type !== 'message') continue
    const replyToken = (event as any).replyToken
    if (!replyToken) continue

    // Text commands
    if (event.message.type === 'text') {
      const text = (event.message as webhook.TextMessageContent).text
      const cmd = parseLineCommand(text)

      if (cmd?.type === 'stock') {
        await appendRows('stock', [[date, cmd.ingredient, cmd.amount, cmd.unit, 'ใช้ทำอาหาร', 'LINE']])
        await client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: `✅ ตัดสต็อก ${cmd.ingredient} ${cmd.amount} ${cmd.unit}` }],
        })
      } else if (cmd?.type === 'sales') {
        const configRows = await readRows('config')
        const menuRow = configRows.find(r => r[0] === 'menu' && r[2] === cmd.menu)
        const price = menuRow ? Number(menuRow[3]) : 0
        await appendRows('sales', [[date, cmd.menu, cmd.boxes, price, cmd.boxes * price, 0, 0, cmd.boxes * price]])
        await client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: `✅ บันทึกยอดขาย ${cmd.menu} ${cmd.boxes} กล่อง` }],
        })
      } else {
        await client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: 'Commands:\n- ตัดสต็อก [ชื่อ] [จำนวน] [หน่วย]\n- ยอดขาย [ชื่อเมนู] [จำนวน] กล่อง' }],
        })
      }
    }

    // Image — receipt OCR
    if (event.message.type === 'image') {
      const messageId = (event.message as webhook.ImageMessageContent).id
      const stream = await client.getMessageContent(messageId)
      const chunks: Buffer[] = []
      for await (const chunk of stream as AsyncIterable<Buffer>) chunks.push(chunk)
      const buffer = Buffer.concat(chunks)
      const items = await extractReceiptItems(buffer, 'image/jpeg')
      const summary = items.map(i => `${i.nameFr} x${i.qty} = €${i.total}`).join('\n')
      await client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: `🧾 พบ ${items.length} รายการ:\n${summary}\n\nกรุณายืนยันในแอป` }],
      })
    }
  }

  return NextResponse.json({ ok: true })
}
