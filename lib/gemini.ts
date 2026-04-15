import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ReceiptItem } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface ReceiptOCRResponse {
  store: string
  date: string // ISO format YYYY-MM-DD
  total: number // Final total amount paid
  items: Array<{
    nameFr: string
    qty: number
    unit: string
    pricePerUnit: number // Raw printed price per 1 unit
    total: number // Raw printed line total (usually qty * pricePerUnit)
    isDiscount: boolean // true if this is a discount line like 'REMISE IMMEDIATE'
  }>
}

export async function extractReceiptItems(imageBuffer: Buffer, mimeType: string): Promise<ReceiptOCRResponse> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `You are a data extraction expert for French receipts.
  Extract the raw data exactly as printed. 

  For line items, look for the pattern: [Name] [Qty] * [UnitPrice] = [LineTotal]
  Example 1: "POMMES BRAEBURN 1 * 2.49" -> Name: POMMES BRAEBURN, Qty: 1, PricePerUnit: 2.49, Total: 2.49
  Example 2: "LAIT DEMI-ÉCRÉMÉ 2 * 1.15" -> Name: LAIT DEMI-ÉCRÉMÉ, Qty: 2, PricePerUnit: 1.15, Total: 2.30
  Example 3: "REMISE IMMEDIATE -0.50" -> Name: REMISE IMMEDIATE, Qty: 1, PricePerUnit: -0.50, Total: -0.50, isDiscount: true

  Return a JSON object with these fields:
  - store: name of the store
  - date: purchase date (YYYY-MM-DD)
  - total: the final total paid amount (bottom of receipt)
  - items: array of items, each with:
    - nameFr: product name
    - qty: quantity (default to 1 if not clear)
    - unit: unit (kg, g, L, piece, etc.)
    - pricePerUnit: the price for 1 unit as printed
    - total: the line subtotal as printed
    - isDiscount: true if it's a discount, rebate, or coupon

  IMPORTANT: Return ONLY strictly valid JSON. 
  Ensure all property names are double-quoted. 
  No comments, no trailing commas, no markdown code blocks. 
  Just the JSON object itself starting with '{' and ending with '}'.`

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
  
  // Find the first '{' and last '}' to extract the JSON block
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  
  if (start === -1 || end === -1) {
    throw new Error(`Failed to find JSON in model response: ${text}`)
  }

  const jsonStr = text.substring(start, end + 1)
  
  try {
    return JSON.parse(jsonStr) as ReceiptOCRResponse
  } catch (err) {
    console.error('Initial JSON parse failed, attempting cleanup:', err)
    // Attempt basic cleanup for common LLM JSON errors (like trailing commas)
    const cleaned = jsonStr
      .replace(/,\s*([}\]])/g, '$1') // Remove trailing commas
      .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":') // Ensure double quotes on keys
    
    try {
      return JSON.parse(cleaned) as ReceiptOCRResponse
    } catch (innerErr) {
      throw new Error(`JSON parse failed after cleanup: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`)
    }
  }
}
