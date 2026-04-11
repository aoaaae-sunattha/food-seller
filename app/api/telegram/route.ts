import { NextRequest, NextResponse } from 'next/server'
import { appendRows, readRows } from '@/lib/sheets'
import { extractReceiptItems } from '@/lib/gemini'
import { parseTelegramCommand } from '@/lib/telegram'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

async function sendTelegramMessage(chatId: number, text: string) {
  await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json()
    const message = update.message
    if (!message) return NextResponse.json({ ok: true })

    const chatId = message.chat.id
    const date = new Date().toISOString().split('T')[0]

    // Handle Text Commands
    if (message.text) {
      const text = message.text
      const cmd = parseTelegramCommand(text)

      if (cmd?.type === 'stock') {
        // Pass undefined for accessToken to use ADC fallback
        await appendRows(undefined, 'stock', [[date, cmd.ingredient, cmd.amount, cmd.unit, 'ใช้ทำอาหาร', 'Telegram']])
        await sendTelegramMessage(chatId, `✅ ตัดสต็อก ${cmd.ingredient} ${cmd.amount} ${cmd.unit} เรียบร้อยแล้ว`)
      } else if (cmd?.type === 'sales') {
        // Pass undefined for accessToken to use ADC fallback
        const configRows = await readRows(undefined, 'config')
        const menuRow = configRows.find(r => r[0] === 'menu' && r[2] === cmd.menu)
        const price = menuRow ? Number(menuRow[3]) : 0
        await appendRows(undefined, 'sales', [[date, cmd.menu, cmd.boxes, price, cmd.boxes * price, 0, 0, cmd.boxes * price]])
        await sendTelegramMessage(chatId, `✅ บันทึกยอดขาย ${cmd.menu} ${cmd.boxes} กล่อง เรียบร้อยแล้ว`)
      } else if (text === '/start' || text === '/help') {
        await sendTelegramMessage(chatId, 'คำสั่งที่ใช้ได้:\n- ตัดสต็อก [ชื่อ] [จำนวน] [หน่วย]\n- ยอดขาย [ชื่อเมนู] [จำนวน] กล่อง\n- ส่งรูปใบเสร็จเพื่อสแกน')
      }
    }

    // Handle Image — receipt OCR
    if (message.photo && message.photo.length > 0) {
      const photo = message.photo[message.photo.length - 1]
      const fileId = photo.file_id

      const fileRes = await fetch(`${TELEGRAM_API_BASE}/getFile?file_id=${fileId}`)
      const fileData = await fileRes.json()
      const filePath = fileData.result.file_path

      const imgRes = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`)
      const buffer = Buffer.from(await imgRes.arrayBuffer())

      const items = await extractReceiptItems(buffer, 'image/jpeg')
      const summary = items.map(i => `${i.nameFr} x${i.qty} = €${i.total}`).join('\n')
      
      await sendTelegramMessage(chatId, `🧾 พบ ${items.length} รายการ:\n${summary}\n\nกรุณายืนยันความถูกต้องในแอป`)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Telegram webhook error:', err)
    return NextResponse.json({ ok: true })
  }
}
