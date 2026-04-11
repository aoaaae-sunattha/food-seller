import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ReceiptItem } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function extractReceiptItems(imageBuffer: Buffer, mimeType: string): Promise<ReceiptItem[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const prompt = `You are analyzing a French supermarket or store receipt.
Extract all purchased items and return a JSON array.
Each item must have these fields:
- nameFr: item name exactly as printed (French)
- nameTh: leave empty string ""
- qty: numeric quantity
- unit: unit string (kg, g, L, pièce, etc.)
- pricePerUnit: price per unit in euros (number)
- total: line total in euros (number)

Return ONLY valid JSON array, no markdown, no explanation.`

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType,
      },
    },
  ])

  const text = result.response.text().trim()
  // Strip markdown code fences if present
  const json = text.replace(/^\`\`\`json?\\n?/, '').replace(/\\n?\`\`\`$/, '')
  return JSON.parse(json) as ReceiptItem[]
}
