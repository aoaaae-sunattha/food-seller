import { NextRequest, NextResponse } from 'next/server'
import { messagingApi, webhook } from '@line/bot-sdk'
import { appendRows, readRows } from '../../../lib/sheets'

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || '',
}

const client = new messagingApi.MessagingApiClient(config)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const events: webhook.Event[] = body.events || []

    for (const event of events) {
      if (event.type === 'message' && event.message.type === 'text') {
        const text = (event.message as any).text
        const replyToken = (event as any).replyToken

        if (!replyToken) continue

        if (text.startsWith('ตัดสต็อก')) {
          const parts = text.split(' ')
          if (parts.length >= 3) {
            const ingredient = parts[1]
            const amountUsed = parseFloat(parts[2])
            const unit = parts[2].replace(/[0-9.]/g, '') || 'kg'
            const date = new Date().toISOString().split('T')[0]
            
            await appendRows('stock', [[date, ingredient, amountUsed, unit, 'ใช้ทำอาหาร', 'อื่นๆ']])
            await client.replyMessage({ 
              replyToken,
              messages: [{ type: 'text', text: `✅ ตัดสต็อก ${ingredient} ${amountUsed}${unit} เรียบร้อยแล้ว` }]
            })
          }
        } else if (text.startsWith('ยอดขาย')) {
          const parts = text.split(' ')
          if (parts.length >= 3) {
            const menuName = parts[1]
            const boxes = parseInt(parts[2])
            const date = new Date().toISOString().split('T')[0]
            
            const configRows = await readRows('config')
            const menu = configRows.find(r => r[0] === 'menu' && r[2] === menuName)
            const price = menu ? Number(menu[3]) : 12

            await appendRows('sales', [[date, menuName, boxes, price, boxes * price, 0, 0, boxes * price]])
            await client.replyMessage({ 
              replyToken,
              messages: [{ type: 'text', text: `✅ บันทึกยอดขาย ${menuName} ${boxes} กล่อง เรียบร้อยแล้ว` }]
            })
          }
        } else {
          await client.replyMessage({ 
            replyToken,
            messages: [{ type: 'text', text: 'Commands:\n- ตัดสต็อก [ชื่อ] [จำนวน][หน่วย]\n- ยอดขาย [ชื่อเมนู] [จำนวน]' }]
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('LINE webhook error:', err)
    return NextResponse.json({ ok: true })
  }
}
