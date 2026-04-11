import { NextRequest, NextResponse } from 'next/server'
import { Client, WebhookEvent } from '@line/bot-sdk'
import { appendRows, readRows } from '../../../lib/sheets'

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
}

const client = new Client(config)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const events: WebhookEvent[] = body.events

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const text = event.message.text
      const replyToken = event.replyToken

      if (text.startsWith('ตัดสต็อก')) {
        // Simple logic: "ตัดสต็อก ข้าว 2kg"
        const parts = text.split(' ')
        if (parts.length >= 3) {
          const ingredient = parts[1]
          const amountUsed = parseFloat(parts[2])
          const unit = parts[2].replace(/[0-9.]/g, '') || 'kg'
          const date = new Date().toISOString().split('T')[0]
          
          await appendRows('stock', [[date, ingredient, amountUsed, unit, 'ใช้ทำอาหาร', 'อื่นๆ']])
          await client.replyMessage(replyToken, { type: 'text', text: `✅ ตัดสต็อก ${ingredient} ${amountUsed}${unit} เรียบร้อยแล้ว` })
        }
      } else if (text.startsWith('ยอดขาย')) {
        // Simple logic: "ยอดขาย ผัดไทย 10"
        const parts = text.split(' ')
        if (parts.length >= 3) {
          const menuName = parts[1]
          const boxes = parseInt(parts[2])
          const date = new Date().toISOString().split('T')[0]
          
          // Get price from config
          const configRows = await readRows('config')
          const menu = configRows.find(r => r[0] === 'menu' && r[2] === menuName)
          const price = menu ? Number(menu[3]) : 12

          await appendRows('sales', [[date, menuName, boxes, price, boxes * price, 0, 0, boxes * price]])
          await client.replyMessage(replyToken, { type: 'text', text: `✅ บันทึกยอดขาย ${menuName} ${boxes} กล่อง เรียบร้อยแล้ว` })
        }
      } else {
        await client.replyMessage(replyToken, { type: 'text', text: 'Commands:\n- ตัดสต็อก [ชื่อ] [จำนวน][หน่วย]\n- ยอดขาย [ชื่อเมนู] [จำนวน]' })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
