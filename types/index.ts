export type Language = 'th' | 'fr' | 'en'

export interface Ingredient {
  id: string          // row index in Config tab as string
  nameTh: string
  nameFr: string
  unit: string
  threshold: number   // low-stock alert level
}

export interface MenuTemplate {
  id: string
  nameTh: string
  nameFr: string
  pricePerBox: number // €
  ingredients: MenuIngredient[]
}

export interface MenuIngredient {
  ingredientId: string
  defaultQty: number
}

export interface ReceiptItem {
  nameFr: string
  nameTh: string      // User mapping to config
  suggestedTh?: string // AI Translation guide
  qty: number
  unit: string
  pricePerUnit: number // TTC (Gross)
  netPrice: number     // HT (Net)
  vatRate: number      // e.g. 5.5, 10, 20
  vatAmount: number
  discount: number     // € discount applied to this line
  total: number        // TTC (Gross)
  isDiscount?: boolean // true if this is a negative amount or discount
}

export interface PurchaseRow {
  date: string        // ISO date YYYY-MM-DD
  store: string
  name_fr: string
  name_th: string
  qty: number
  unit: string
  price: number       // Price per unit (TTC)
  vat_rate: number
  discount: number
  total: number       // Line total (TTC)
  receipt_id: string
}

export interface StockDeductionRow {
  date: string
  ingredient: string  // nameTh
  amount_used: number
  unit: string
  reason: StockReason
  menu: string        // menu nameTh or 'อื่นๆ'
}

export type StockReason =
  | 'ใช้ทำอาหาร'
  | 'แตก/เสียหาย'
  | 'เสีย'
  | 'สูญหาย'

export interface SalesRow {
  id: string
  date: string
  menu: string
  boxes: number
  price_per_box: number
  subtotal: number
  cash: number
  card: number
  total: number       // recorded total (cash + card)
}

export interface StockQuantity {
  ingredient: Ingredient
  currentQty: number  // Current balance from Inventory tab
}

export interface DashboardData {
  weeklyIncome: number
  weeklyExpenses: number
  lowStock: StockQuantity[]
}
