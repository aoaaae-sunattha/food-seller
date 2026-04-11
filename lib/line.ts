type StockCommand = { type: 'stock'; ingredient: string; amount: number; unit: string }
type SalesCommand = { type: 'sales'; menu: string; boxes: number }
export type LineCommand = StockCommand | SalesCommand | null

export function parseLineCommand(text: string): LineCommand {
  // ตัดสต็อก <ingredient> <amount> <unit>
  const stockMatch = text.match(/^ตัดสต็อก\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(\S+)$/)
  if (stockMatch) {
    return { type: 'stock', ingredient: stockMatch[1], amount: Number(stockMatch[2]), unit: stockMatch[3] }
  }

  // ยอดขาย <menu> <boxes> กล่อง
  const salesMatch = text.match(/^ยอดขาย\s+(.+?)\s+(\d+)\s+กล่อง$/)
  if (salesMatch) {
    return { type: 'sales', menu: salesMatch[1], boxes: Number(salesMatch[2]) }
  }

  return null
}
