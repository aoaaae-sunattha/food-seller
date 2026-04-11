# Restaurant Manager — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tablet-optimized Thai restaurant management web app with receipt scanning, stock tracking, daily sales, and Google Sheets storage.

**Architecture:** Next.js App Router for frontend + API routes. Google Sheets as the database (one spreadsheet per month, auto-created). Gemini Vision API for receipt OCR. NextAuth.js + Google OAuth for auth. LINE Bot reuses the same API routes.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, `googleapis`, `@google/generative-ai`, `next-auth`, `@line/bot-sdk`, Jest + Testing Library

---

## File Map

```
app/
  layout.tsx                        # Root layout: auth session + language provider
  page.tsx                          # Screen 1: Dashboard
  receipt/page.tsx                  # Screen 2: Upload Receipt
  stock-deduction/page.tsx          # Screen 3: Stock Deduction
  daily-sales/page.tsx              # Screen 4: Daily Sales
  manage-stock/page.tsx             # Screen 5: Manage Stock Items
  manage-menus/page.tsx             # Screen 6: Manage Menus
  api/
    auth/[...nextauth]/route.ts     # NextAuth handler
    ocr/route.ts                    # POST image → Gemini → extracted items
    sheets/
      config/route.ts               # GET/POST ingredients + menus (Config tab)
      purchases/route.ts            # POST purchase rows
      stock/route.ts                # GET current quantities / POST deductions
      sales/route.ts                # POST daily sales row
      dashboard/route.ts            # GET weekly totals + low-stock alerts
    line/route.ts                   # LINE Bot webhook

lib/
  auth.ts                           # NextAuth config (Google provider + Sheets scope)
  sheets.ts                         # Sheets API client + getOrCreateMonthSheet()
  gemini.ts                         # Gemini Vision client: extractReceiptItems()

components/
  LanguageSelector.tsx              # 🇹🇭🇫🇷🇬🇧 flag picker, saves to localStorage
  NavBar.tsx                        # Bottom nav bar (6 icons)
  receipt/
    UploadZone.tsx                  # Camera / file input with preview
    ItemReviewTable.tsx             # Editable table of extracted receipt items
  stock/
    MenuChips.tsx                   # Pill chip multi-select for menus
    IngredientSection.tsx           # Collapsible per-menu ingredient rows

hooks/
  useLanguage.ts                    # Read/write language pref from localStorage

i18n/
  th.json                           # Thai UI strings
  fr.json                           # French UI strings
  en.json                           # English UI strings

types/index.ts                      # All shared TypeScript types

__tests__/
  lib/sheets.test.ts
  lib/gemini.test.ts
  api/ocr.test.ts
  api/config.test.ts
  api/purchases.test.ts
  api/stock.test.ts
  api/sales.test.ts
  api/dashboard.test.ts
  api/line.test.ts
  components/LanguageSelector.test.tsx
  components/MenuChips.test.tsx
  components/ItemReviewTable.test.tsx
```

---

## Task 1: Project Bootstrap

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `jest.config.ts`, `jest.setup.ts`, `.env.local.example`

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd /Users/yellow-pro/restaurant-manager
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

Expected: project files created, `npm run dev` works.

- [ ] **Step 2: Install dependencies**

```bash
npm install googleapis @google/generative-ai next-auth @line/bot-sdk
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest @types/jest
```

- [ ] **Step 3: Configure Jest**

Create `jest.config.ts`:
```typescript
import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  testPathPattern: '__tests__',
}

export default config
```

Create `jest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Create `.env.local.example`**

```bash
# Google OAuth + Sheets
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Gemini
GEMINI_API_KEY=

# LINE Bot
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=

# Sheets
GOOGLE_SPREADSHEET_ID_TEMPLATE=   # optional: ID of a template sheet to copy Config from
```

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev
```
Expected: `ready on http://localhost:3000`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: bootstrap Next.js project with dependencies"
```

---

## Task 2: Shared TypeScript Types

**Files:**
- Create: `types/index.ts`

- [ ] **Step 1: Write the types**

Create `types/index.ts`:
```typescript
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
  pricePerBox: number // €
  ingredients: MenuIngredient[]
}

export interface MenuIngredient {
  ingredientId: string
  defaultQty: number
}

export interface ReceiptItem {
  nameFr: string
  nameTh: string      // user fills this in during review
  qty: number
  unit: string
  pricePerUnit: number
  total: number
}

export interface PurchaseRow {
  date: string        // ISO date YYYY-MM-DD
  store: string
  item_fr: string
  item_th: string
  qty: number
  unit: string
  price: number
  total: number
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
  date: string
  menu: string
  boxes: number
  price_per_box: number
  subtotal: number
  cash: number
  card: number
  total: number
}

export interface StockQuantity {
  ingredient: Ingredient
  currentQty: number  // sum of purchases - sum of deductions
}

export interface DashboardData {
  weeklyIncome: number
  weeklyExpenses: number
  lowStock: StockQuantity[]
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: i18n Strings + Language Hook

**Files:**
- Create: `i18n/th.json`, `i18n/fr.json`, `i18n/en.json`, `hooks/useLanguage.ts`, `components/LanguageSelector.tsx`
- Create: `__tests__/components/LanguageSelector.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/components/LanguageSelector.test.tsx`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import LanguageSelector from '@/components/LanguageSelector'

beforeEach(() => localStorage.clear())

test('renders three flag buttons', () => {
  render(<LanguageSelector />)
  expect(screen.getByText('🇹🇭')).toBeInTheDocument()
  expect(screen.getByText('🇫🇷')).toBeInTheDocument()
  expect(screen.getByText('🇬🇧')).toBeInTheDocument()
})

test('saves selected language to localStorage', () => {
  render(<LanguageSelector />)
  fireEvent.click(screen.getByText('🇫🇷'))
  expect(localStorage.getItem('lang')).toBe('fr')
})

test('highlights active language', () => {
  localStorage.setItem('lang', 'fr')
  render(<LanguageSelector />)
  const frBtn = screen.getByText('🇫🇷').closest('button')!
  expect(frBtn).toHaveClass('ring-2')
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest LanguageSelector --no-coverage
```
Expected: `Cannot find module '@/components/LanguageSelector'`

- [ ] **Step 3: Create i18n files**

Create `i18n/th.json`:
```json
{
  "nav": {
    "dashboard": "หน้าหลัก",
    "receipt": "สแกนใบเสร็จ",
    "stockDeduction": "ตัดสต็อก",
    "dailySales": "บันทึกยอดขาย",
    "manageStock": "จัดการสต็อก",
    "manageMenus": "จัดการเมนู"
  },
  "dashboard": {
    "weeklyIncome": "รายได้สัปดาห์นี้",
    "weeklyExpenses": "ค่าใช้จ่ายสัปดาห์นี้",
    "lowStock": "สต็อกใกล้หมด"
  },
  "receipt": {
    "upload": "อัปโหลดใบเสร็จ",
    "store": "ร้านค้า",
    "confirm": "ยืนยัน",
    "itemFr": "ชื่อ (ฝรั่งเศส)",
    "itemTh": "ชื่อ (ไทย)",
    "qty": "จำนวน",
    "unit": "หน่วย",
    "price": "ราคา/หน่วย",
    "total": "รวม"
  },
  "stock": {
    "deduct": "ตัดสต็อก",
    "selectMenus": "เลือกเมนูวันนี้",
    "other": "✦ อื่นๆ",
    "currentQty": "คงเหลือ",
    "amountUsed": "ใช้ไป",
    "reason": "เหตุผล",
    "addIngredient": "+ เพิ่มวัตถุดิบ",
    "reasons": {
      "cooking": "ใช้ทำอาหาร",
      "broken": "แตก/เสียหาย",
      "expired": "เสีย",
      "lost": "สูญหาย"
    }
  },
  "sales": {
    "title": "บันทึกยอดขาย",
    "boxes": "กล่อง",
    "pricePerBox": "ราคา/กล่อง",
    "cash": "เงินสด",
    "card": "บัตรเครดิต",
    "save": "บันทึก"
  },
  "manageStock": {
    "title": "จัดการวัตถุดิบ",
    "add": "เพิ่มวัตถุดิบ",
    "name": "ชื่อ",
    "unit": "หน่วย",
    "threshold": "แจ้งเตือนเมื่อเหลือ",
    "delete": "ลบ",
    "confirmDelete": "ยืนยันการลบ?"
  },
  "manageMenus": {
    "title": "จัดการเมนู",
    "add": "เพิ่มเมนู",
    "name": "ชื่อเมนู",
    "price": "ราคา/กล่อง (€)",
    "ingredients": "วัตถุดิบ",
    "defaultQty": "ปริมาณต่อหม้อ"
  },
  "common": {
    "save": "บันทึก",
    "cancel": "ยกเลิก",
    "edit": "แก้ไข",
    "delete": "ลบ",
    "loading": "กำลังโหลด...",
    "error": "เกิดข้อผิดพลาด"
  }
}
```

Create `i18n/fr.json`:
```json
{
  "nav": {
    "dashboard": "Tableau de bord",
    "receipt": "Scanner reçu",
    "stockDeduction": "Déduire stock",
    "dailySales": "Ventes du jour",
    "manageStock": "Gérer le stock",
    "manageMenus": "Gérer les menus"
  },
  "dashboard": {
    "weeklyIncome": "Revenus cette semaine",
    "weeklyExpenses": "Dépenses cette semaine",
    "lowStock": "Stock faible"
  },
  "receipt": {
    "upload": "Télécharger le reçu",
    "store": "Magasin",
    "confirm": "Confirmer",
    "itemFr": "Nom (français)",
    "itemTh": "Nom (thaï)",
    "qty": "Qté",
    "unit": "Unité",
    "price": "Prix/unité",
    "total": "Total"
  },
  "stock": {
    "deduct": "Déduire stock",
    "selectMenus": "Menus d'aujourd'hui",
    "other": "✦ Autre",
    "currentQty": "En stock",
    "amountUsed": "Utilisé",
    "reason": "Raison",
    "addIngredient": "+ Ajouter ingrédient",
    "reasons": {
      "cooking": "Cuisine",
      "broken": "Cassé/endommagé",
      "expired": "Périmé",
      "lost": "Perdu"
    }
  },
  "sales": {
    "title": "Ventes du jour",
    "boxes": "boîtes",
    "pricePerBox": "Prix/boîte",
    "cash": "Espèces",
    "card": "Carte",
    "save": "Enregistrer"
  },
  "manageStock": {
    "title": "Gérer les ingrédients",
    "add": "Ajouter",
    "name": "Nom",
    "unit": "Unité",
    "threshold": "Alerte si ≤",
    "delete": "Supprimer",
    "confirmDelete": "Confirmer la suppression ?"
  },
  "manageMenus": {
    "title": "Gérer les menus",
    "add": "Ajouter un menu",
    "name": "Nom du menu",
    "price": "Prix/boîte (€)",
    "ingredients": "Ingrédients",
    "defaultQty": "Qté par lot"
  },
  "common": {
    "save": "Enregistrer",
    "cancel": "Annuler",
    "edit": "Modifier",
    "delete": "Supprimer",
    "loading": "Chargement...",
    "error": "Une erreur s'est produite"
  }
}
```

Create `i18n/en.json`:
```json
{
  "nav": {
    "dashboard": "Dashboard",
    "receipt": "Scan Receipt",
    "stockDeduction": "Deduct Stock",
    "dailySales": "Daily Sales",
    "manageStock": "Manage Stock",
    "manageMenus": "Manage Menus"
  },
  "dashboard": {
    "weeklyIncome": "Weekly Income",
    "weeklyExpenses": "Weekly Expenses",
    "lowStock": "Low Stock"
  },
  "receipt": {
    "upload": "Upload Receipt",
    "store": "Store",
    "confirm": "Confirm",
    "itemFr": "Name (French)",
    "itemTh": "Name (Thai)",
    "qty": "Qty",
    "unit": "Unit",
    "price": "Price/unit",
    "total": "Total"
  },
  "stock": {
    "deduct": "Deduct Stock",
    "selectMenus": "Today's Menus",
    "other": "✦ Other",
    "currentQty": "In Stock",
    "amountUsed": "Used",
    "reason": "Reason",
    "addIngredient": "+ Add Ingredient",
    "reasons": {
      "cooking": "Cooking",
      "broken": "Broken/Damaged",
      "expired": "Expired",
      "lost": "Lost"
    }
  },
  "sales": {
    "title": "Daily Sales",
    "boxes": "boxes",
    "pricePerBox": "Price/box",
    "cash": "Cash",
    "card": "Card",
    "save": "Save"
  },
  "manageStock": {
    "title": "Manage Ingredients",
    "add": "Add Ingredient",
    "name": "Name",
    "unit": "Unit",
    "threshold": "Alert when ≤",
    "delete": "Delete",
    "confirmDelete": "Confirm delete?"
  },
  "manageMenus": {
    "title": "Manage Menus",
    "add": "Add Menu",
    "name": "Menu Name",
    "price": "Price/box (€)",
    "ingredients": "Ingredients",
    "defaultQty": "Qty per batch"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "edit": "Edit",
    "delete": "Delete",
    "loading": "Loading...",
    "error": "An error occurred"
  }
}
```

- [ ] **Step 4: Create useLanguage hook**

Create `hooks/useLanguage.ts`:
```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Language } from '@/types'
import th from '@/i18n/th.json'
import fr from '@/i18n/fr.json'
import en from '@/i18n/en.json'

const translations = { th, fr, en }

export function useLanguage() {
  const [lang, setLangState] = useState<Language>('th')

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Language | null
    if (saved && ['th', 'fr', 'en'].includes(saved)) setLangState(saved)
  }, [])

  const setLang = useCallback((l: Language) => {
    localStorage.setItem('lang', l)
    setLangState(l)
  }, [])

  const t = translations[lang] as typeof th

  return { lang, setLang, t }
}
```

- [ ] **Step 5: Create LanguageSelector component**

Create `components/LanguageSelector.tsx`:
```typescript
'use client'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/types'

const FLAGS: { lang: Language; flag: string }[] = [
  { lang: 'th', flag: '🇹🇭' },
  { lang: 'fr', flag: '🇫🇷' },
  { lang: 'en', flag: '🇬🇧' },
]

export default function LanguageSelector() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="flex gap-1">
      {FLAGS.map(({ lang: l, flag }) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`text-xl px-1 rounded ${lang === l ? 'ring-2 ring-blue-500' : ''}`}
          aria-label={l}
        >
          {flag}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Run test — expect PASS**

```bash
npx jest LanguageSelector --no-coverage
```
Expected: 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add i18n/ hooks/ components/LanguageSelector.tsx __tests__/components/LanguageSelector.test.tsx
git commit -m "feat: add i18n strings, useLanguage hook, LanguageSelector"
```

---

## Task 4: Google Sheets Client

**Files:**
- Create: `lib/sheets.ts`
- Create: `__tests__/lib/sheets.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/sheets.test.ts`:
```typescript
import { getSheetTitle, buildMonthTitle } from '@/lib/sheets'

test('buildMonthTitle returns Thai month spreadsheet name', () => {
  // April 2026 = เมษายน พ.ศ. 2569 (2026 + 543)
  const title = buildMonthTitle(new Date('2026-04-11'))
  expect(title).toBe('ร้านอาหาร — เมษายน 2569')
})

test('buildMonthTitle for January 2027', () => {
  const title = buildMonthTitle(new Date('2027-01-15'))
  expect(title).toBe('ร้านอาหาร — มกราคม 2570')
})

test('getSheetTitle returns tab name', () => {
  expect(getSheetTitle('purchases')).toBe('Purchases')
  expect(getSheetTitle('stock')).toBe('Stock')
  expect(getSheetTitle('sales')).toBe('Daily Sales')
  expect(getSheetTitle('config')).toBe('Config')
  expect(getSheetTitle('summary')).toBe('Monthly Summary')
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest sheets --no-coverage
```
Expected: `Cannot find module '@/lib/sheets'`

- [ ] **Step 3: Implement lib/sheets.ts**

Create `lib/sheets.ts`:
```typescript
import { google } from 'googleapis'
import { JWT } from 'google-auth-library'

// --- Pure helpers (testable without network) ---

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

export function buildMonthTitle(date: Date): string {
  const month = THAI_MONTHS[date.getMonth()]
  const year = date.getFullYear() + 543
  return `ร้านอาหาร — ${month} ${year}`
}

type TabKey = 'purchases' | 'stock' | 'sales' | 'config' | 'summary'

const TAB_NAMES: Record<TabKey, string> = {
  purchases: 'Purchases',
  stock: 'Stock',
  sales: 'Daily Sales',
  config: 'Config',
  summary: 'Monthly Summary',
}

export function getSheetTitle(tab: TabKey): string {
  return TAB_NAMES[tab]
}

// --- Google Sheets API client ---

function getAuth() {
  // Uses Application Default Credentials in production (Vercel env)
  // or GOOGLE_APPLICATION_CREDENTIALS locally
  return new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

export function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

/**
 * Finds or creates the spreadsheet for the given month.
 * On first creation: adds all 5 tabs and copies Config rows from previous month.
 * Returns the spreadsheet ID.
 */
export async function getOrCreateMonthSheet(date: Date = new Date()): Promise<string> {
  const sheets = getSheetsClient()
  const drive = google.drive({ version: 'v3', auth: getAuth() })
  const title = buildMonthTitle(date)

  // Search for existing spreadsheet with this title
  const search = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.spreadsheet' and name='${title}' and trashed=false`,
    fields: 'files(id,name)',
  })

  if (search.data.files && search.data.files.length > 0) {
    return search.data.files[0].id!
  }

  // Create new spreadsheet
  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: [
        { properties: { title: 'Purchases' } },
        { properties: { title: 'Stock' } },
        { properties: { title: 'Daily Sales' } },
        { properties: { title: 'Monthly Summary' } },
        { properties: { title: 'Config' } },
      ],
    },
  })
  const newId = created.data.spreadsheetId!

  // Add headers
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: newId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: 'Purchases!A1', values: [['date','store','item_fr','item_th','qty','unit','price','total']] },
        { range: 'Stock!A1', values: [['date','ingredient','amount_used','unit','reason','menu']] },
        { range: 'Daily Sales!A1', values: [['date','menu','boxes','price_per_box','subtotal','cash','card','total']] },
      ],
    },
  })

  // Copy Config from previous month if it exists
  const prevDate = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  const prevTitle = buildMonthTitle(prevDate)
  const prevSearch = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.spreadsheet' and name='${prevTitle}' and trashed=false`,
    fields: 'files(id)',
  })
  if (prevSearch.data.files && prevSearch.data.files.length > 0) {
    const prevId = prevSearch.data.files[0].id!
    const prevConfig = await sheets.spreadsheets.values.get({
      spreadsheetId: prevId,
      range: 'Config!A:Z',
    })
    if (prevConfig.data.values && prevConfig.data.values.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: newId,
        range: 'Config!A1',
        valueInputOption: 'RAW',
        requestBody: { values: prevConfig.data.values },
      })
    }
  }

  return newId
}

/**
 * Appends rows to a tab in the current month's spreadsheet.
 */
export async function appendRows(tab: TabKey, rows: unknown[][]): Promise<void> {
  const sheets = getSheetsClient()
  const spreadsheetId = await getOrCreateMonthSheet()
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${TAB_NAMES[tab]}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  })
}

/**
 * Reads all rows from a tab (excluding header row).
 */
export async function readRows(tab: TabKey): Promise<string[][]> {
  const sheets = getSheetsClient()
  const spreadsheetId = await getOrCreateMonthSheet()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB_NAMES[tab]}!A2:Z`,
  })
  return (res.data.values as string[][]) || []
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx jest sheets --no-coverage
```
Expected: 3 tests pass (pure helpers only; API calls are not unit-tested).

- [ ] **Step 5: Commit**

```bash
git add lib/sheets.ts __tests__/lib/sheets.test.ts
git commit -m "feat: add Google Sheets client with month auto-creation"
```

---

## Task 5: NextAuth Setup

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create lib/auth.ts**

```typescript
import GoogleProvider from 'next-auth/providers/google'
import type { NextAuthOptions } from 'next-auth'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken
      return session
    },
  },
}
```

- [ ] **Step 2: Create auth API route**

Create `app/api/auth/[...nextauth]/route.ts`:
```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

- [ ] **Step 3: Wrap root layout with SessionProvider**

Edit `app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import './globals.css'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import SessionProviderWrapper from '@/components/SessionProviderWrapper'

export const metadata: Metadata = {
  title: 'ร้านอาหาร Manager',
  description: 'Restaurant management system',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="th">
      <body>
        <SessionProviderWrapper session={session}>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
```

Create `components/SessionProviderWrapper.tsx`:
```typescript
'use client'
import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'

export default function SessionProviderWrapper({
  children,
  session,
}: {
  children: React.ReactNode
  session: Session | null
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/auth.ts app/api/auth/ components/SessionProviderWrapper.tsx app/layout.tsx
git commit -m "feat: add NextAuth with Google OAuth and Sheets scope"
```

---

## Task 6: Gemini OCR

**Files:**
- Create: `lib/gemini.ts`
- Create: `app/api/ocr/route.ts`
- Create: `__tests__/api/ocr.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/api/ocr.test.ts`:
```typescript
import { POST } from '@/app/api/ocr/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/gemini', () => ({
  extractReceiptItems: jest.fn().mockResolvedValue([
    { nameFr: 'Riz jasmin', nameTh: '', qty: 5, unit: 'kg', pricePerUnit: 2.5, total: 12.5 },
  ]),
}))

test('POST /api/ocr returns extracted items', async () => {
  const formData = new FormData()
  formData.append('image', new Blob(['fake'], { type: 'image/jpeg' }), 'receipt.jpg')

  const req = new NextRequest('http://localhost/api/ocr', {
    method: 'POST',
    body: formData,
  })

  const res = await POST(req)
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.items).toHaveLength(1)
  expect(data.items[0].nameFr).toBe('Riz jasmin')
})

test('POST /api/ocr returns 400 when no image', async () => {
  const formData = new FormData()
  const req = new NextRequest('http://localhost/api/ocr', {
    method: 'POST',
    body: formData,
  })
  const res = await POST(req)
  expect(res.status).toBe(400)
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx jest ocr --no-coverage
```
Expected: `Cannot find module '@/app/api/ocr/route'`

- [ ] **Step 3: Create lib/gemini.ts**

```typescript
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
  const json = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '')
  return JSON.parse(json) as ReceiptItem[]
}
```

- [ ] **Step 4: Create app/api/ocr/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { extractReceiptItems } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('image') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const items = await extractReceiptItems(buffer, file.type || 'image/jpeg')
  return NextResponse.json({ items })
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx jest ocr --no-coverage
```
Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/gemini.ts app/api/ocr/ __tests__/api/ocr.test.ts
git commit -m "feat: add Gemini Vision OCR for receipt extraction"
```

---

## Task 7: Config API (Ingredients + Menus)

**Files:**
- Create: `app/api/sheets/config/route.ts`
- Create: `__tests__/api/config.test.ts`

The Config tab layout:
- Rows 1–N: ingredients — columns: `type=ingredient | id | nameTh | nameFr | unit | threshold`
- Rows after: menus — columns: `type=menu | id | nameTh | pricePerBox | ingredientId:qty,ingredientId:qty,...`

- [ ] **Step 1: Write failing tests**

Create `__tests__/api/config.test.ts`:
```typescript
import { GET, POST } from '@/app/api/sheets/config/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/sheets', () => ({
  readRows: jest.fn().mockResolvedValue([
    ['ingredient', 'i1', 'ข้าว', 'Riz', 'kg', '5'],
    ['menu', 'm1', 'ผัดไทย', '12', 'i1:0.2'],
  ]),
  appendRows: jest.fn().mockResolvedValue(undefined),
  getOrCreateMonthSheet: jest.fn().mockResolvedValue('sheet-id'),
}))

jest.mock('@/lib/sheets', () => ({
  readRows: jest.fn(),
  appendRows: jest.fn(),
  getOrCreateMonthSheet: jest.fn().mockResolvedValue('sheet-id'),
}))

const { readRows, appendRows } = require('@/lib/sheets')

beforeEach(() => {
  readRows.mockResolvedValue([
    ['ingredient', 'i1', 'ข้าว', 'Riz', 'kg', '5'],
    ['menu', 'm1', 'ผัดไทย', '12', 'i1:0.2'],
  ])
  appendRows.mockResolvedValue(undefined)
})

test('GET /api/sheets/config returns ingredients and menus', async () => {
  const req = new NextRequest('http://localhost/api/sheets/config')
  const res = await GET(req)
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.ingredients).toHaveLength(1)
  expect(data.ingredients[0].nameTh).toBe('ข้าว')
  expect(data.menus).toHaveLength(1)
  expect(data.menus[0].nameTh).toBe('ผัดไทย')
  expect(data.menus[0].pricePerBox).toBe(12)
})

test('POST /api/sheets/config adds ingredient', async () => {
  const req = new NextRequest('http://localhost/api/sheets/config', {
    method: 'POST',
    body: JSON.stringify({ type: 'ingredient', nameTh: 'กระเทียม', nameFr: 'Ail', unit: 'kg', threshold: 1 }),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(200)
  expect(appendRows).toHaveBeenCalledWith('config', expect.arrayContaining([
    expect.arrayContaining(['ingredient', expect.any(String), 'กระเทียม', 'Ail', 'kg', '1']),
  ]))
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx jest config --no-coverage
```

- [ ] **Step 3: Implement route**

Create `app/api/sheets/config/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { readRows, appendRows, getOrCreateMonthSheet } from '@/lib/sheets'
import { google } from 'googleapis'
import type { Ingredient, MenuTemplate } from '@/types'
import { randomUUID } from 'crypto'

function parseConfig(rows: string[][]): { ingredients: Ingredient[]; menus: MenuTemplate[] } {
  const ingredients: Ingredient[] = []
  const menus: MenuTemplate[] = []

  for (const row of rows) {
    if (row[0] === 'ingredient') {
      ingredients.push({
        id: row[1],
        nameTh: row[2],
        nameFr: row[3],
        unit: row[4],
        threshold: Number(row[5]),
      })
    } else if (row[0] === 'menu') {
      const ingredientPairs = (row[4] || '').split(',').filter(Boolean).map(pair => {
        const [ingredientId, qty] = pair.split(':')
        return { ingredientId, defaultQty: Number(qty) }
      })
      menus.push({
        id: row[1],
        nameTh: row[2],
        pricePerBox: Number(row[3]),
        ingredients: ingredientPairs,
      })
    }
  }

  return { ingredients, menus }
}

export async function GET(_req: NextRequest) {
  const rows = await readRows('config')
  return NextResponse.json(parseConfig(rows))
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const id = randomUUID().slice(0, 8)

  if (body.type === 'ingredient') {
    await appendRows('config', [[
      'ingredient', id, body.nameTh, body.nameFr, body.unit, String(body.threshold),
    ]])
    return NextResponse.json({ id })
  }

  if (body.type === 'menu') {
    const ingredientStr = (body.ingredients || [])
      .map((i: { ingredientId: string; defaultQty: number }) => `${i.ingredientId}:${i.defaultQty}`)
      .join(',')
    await appendRows('config', [[
      'menu', id, body.nameTh, String(body.pricePerBox), ingredientStr,
    ]])
    return NextResponse.json({ id })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx jest config --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add app/api/sheets/config/ __tests__/api/config.test.ts
git commit -m "feat: add Config API for ingredients and menus"
```

---

## Task 8: Purchases API

**Files:**
- Create: `app/api/sheets/purchases/route.ts`
- Create: `__tests__/api/purchases.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/api/purchases.test.ts`:
```typescript
import { POST } from '@/app/api/sheets/purchases/route'
import { NextRequest } from 'next/server'

const { appendRows } = require('@/lib/sheets')

jest.mock('@/lib/sheets', () => ({
  appendRows: jest.fn().mockResolvedValue(undefined),
}))

test('POST /api/sheets/purchases appends rows for all items', async () => {
  const body = {
    date: '2026-04-11',
    store: 'Carrefour',
    items: [
      { nameFr: 'Riz', nameTh: 'ข้าว', qty: 5, unit: 'kg', pricePerUnit: 2, total: 10 },
      { nameFr: 'Ail', nameTh: 'กระเทียม', qty: 1, unit: 'kg', pricePerUnit: 3, total: 3 },
    ],
  }
  const req = new NextRequest('http://localhost/api/sheets/purchases', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(200)
  expect(appendRows).toHaveBeenCalledWith('purchases', [
    ['2026-04-11', 'Carrefour', 'Riz', 'ข้าว', 5, 'kg', 2, 10],
    ['2026-04-11', 'Carrefour', 'Ail', 'กระเทียม', 1, 'kg', 3, 3],
  ])
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx jest purchases --no-coverage
```

- [ ] **Step 3: Implement**

Create `app/api/sheets/purchases/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { appendRows } from '@/lib/sheets'
import type { ReceiptItem } from '@/types'

export async function POST(req: NextRequest) {
  const { date, store, items }: { date: string; store: string; items: ReceiptItem[] } = await req.json()

  const rows = items.map(item => [
    date, store, item.nameFr, item.nameTh, item.qty, item.unit, item.pricePerUnit, item.total,
  ])

  await appendRows('purchases', rows)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx jest purchases --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add app/api/sheets/purchases/ __tests__/api/purchases.test.ts
git commit -m "feat: add Purchases API route"
```

---

## Task 9: Stock API

**Files:**
- Create: `app/api/sheets/stock/route.ts`
- Create: `__tests__/api/stock.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/api/stock.test.ts`:
```typescript
import { GET, POST } from '@/app/api/sheets/stock/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/sheets', () => ({
  readRows: jest.fn(),
  appendRows: jest.fn().mockResolvedValue(undefined),
}))

const { readRows, appendRows } = require('@/lib/sheets')

test('GET returns current quantities computed from purchases minus deductions', async () => {
  // purchases tab: date,store,item_fr,item_th,qty,unit,price,total
  // stock tab: date,ingredient,amount_used,unit,reason,menu
  // We mock both via readRows called with different tab keys
  readRows.mockImplementation((tab: string) => {
    if (tab === 'purchases') return Promise.resolve([
      ['2026-04-01', 'Carrefour', 'Riz', 'ข้าว', '10', 'kg', '2', '20'],
    ])
    if (tab === 'stock') return Promise.resolve([
      ['2026-04-02', 'ข้าว', '3', 'kg', 'ใช้ทำอาหาร', 'ผัดไทย'],
    ])
    return Promise.resolve([])
  })

  const req = new NextRequest('http://localhost/api/sheets/stock')
  const res = await GET(req)
  expect(res.status).toBe(200)
  const data = await res.json()
  // ข้าว: bought 10, used 3 → 7
  expect(data.quantities['ข้าว']).toBe(7)
})

test('POST appends deduction rows', async () => {
  const body = {
    rows: [
      { date: '2026-04-11', ingredient: 'ข้าว', amount_used: 2, unit: 'kg', reason: 'ใช้ทำอาหาร', menu: 'ผัดไทย' },
    ],
  }
  const req = new NextRequest('http://localhost/api/sheets/stock', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(200)
  expect(appendRows).toHaveBeenCalledWith('stock', [
    ['2026-04-11', 'ข้าว', 2, 'kg', 'ใช้ทำอาหาร', 'ผัดไทย'],
  ])
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx jest stock --no-coverage
```

- [ ] **Step 3: Implement**

Create `app/api/sheets/stock/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { readRows, appendRows } from '@/lib/sheets'
import type { StockDeductionRow } from '@/types'

export async function GET(_req: NextRequest) {
  const [purchaseRows, stockRows] = await Promise.all([
    readRows('purchases'),
    readRows('stock'),
  ])

  const quantities: Record<string, number> = {}

  // Add purchases (column 3 = item_th, column 4 = qty)
  for (const row of purchaseRows) {
    const name = row[3]
    const qty = Number(row[4])
    if (name) quantities[name] = (quantities[name] || 0) + qty
  }

  // Subtract deductions (column 1 = ingredient, column 2 = amount_used)
  for (const row of stockRows) {
    const name = row[1]
    const qty = Number(row[2])
    if (name) quantities[name] = (quantities[name] || 0) - qty
  }

  return NextResponse.json({ quantities })
}

export async function POST(req: NextRequest) {
  const { rows }: { rows: StockDeductionRow[] } = await req.json()

  const data = rows.map(r => [
    r.date, r.ingredient, r.amount_used, r.unit, r.reason, r.menu,
  ])

  await appendRows('stock', data)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx jest stock --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add app/api/sheets/stock/ __tests__/api/stock.test.ts
git commit -m "feat: add Stock API with quantity computation"
```

---

## Task 10: Sales API

**Files:**
- Create: `app/api/sheets/sales/route.ts`
- Create: `__tests__/api/sales.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/api/sales.test.ts`:
```typescript
import { POST } from '@/app/api/sheets/sales/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/sheets', () => ({
  appendRows: jest.fn().mockResolvedValue(undefined),
}))

const { appendRows } = require('@/lib/sheets')

test('POST appends sales row with computed totals', async () => {
  const body = {
    date: '2026-04-11',
    menuSales: [
      { menu: 'ผัดไทย', boxes: 15, pricePerBox: 12 },
      { menu: 'แกงเขียวหวาน', boxes: 8, pricePerBox: 14 },
    ],
    cash: 200,
    card: 68,
  }
  const req = new NextRequest('http://localhost/api/sheets/sales', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
  const res = await POST(req)
  expect(res.status).toBe(200)
  expect(appendRows).toHaveBeenCalledWith('sales', [
    ['2026-04-11', 'ผัดไทย', 15, 12, 180, 200, 68, 268],
    ['2026-04-11', 'แกงเขียวหวาน', 8, 14, 112, 200, 68, 268],
  ])
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx jest sales --no-coverage
```

- [ ] **Step 3: Implement**

Create `app/api/sheets/sales/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { appendRows } from '@/lib/sheets'

export async function POST(req: NextRequest) {
  const { date, menuSales, cash, card }: {
    date: string
    menuSales: { menu: string; boxes: number; pricePerBox: number }[]
    cash: number
    card: number
  } = await req.json()

  const total = cash + card
  const rows = menuSales.map(s => [
    date, s.menu, s.boxes, s.pricePerBox, s.boxes * s.pricePerBox, cash, card, total,
  ])

  await appendRows('sales', rows)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx jest sales --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add app/api/sheets/sales/ __tests__/api/sales.test.ts
git commit -m "feat: add Daily Sales API route"
```

---

## Task 11: Dashboard API

**Files:**
- Create: `app/api/sheets/dashboard/route.ts`
- Create: `__tests__/api/dashboard.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/api/dashboard.test.ts`:
```typescript
import { GET } from '@/app/api/sheets/dashboard/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/sheets', () => ({ readRows: jest.fn() }))
jest.mock('@/app/api/sheets/config/route', () => ({ GET: jest.fn() }))

const { readRows } = require('@/lib/sheets')

// Today is 2026-04-11 (Saturday). Week = Mon Apr 6 – Sun Apr 12.
jest.useFakeTimers().setSystemTime(new Date('2026-04-11'))

beforeEach(() => {
  readRows.mockImplementation((tab: string) => {
    if (tab === 'sales') return Promise.resolve([
      ['2026-04-09', 'ผัดไทย', '10', '12', '120', '100', '20', '120'],
      ['2026-04-10', 'ผัดไทย', '5', '12', '60', '60', '0', '60'],
    ])
    if (tab === 'purchases') return Promise.resolve([
      ['2026-04-08', 'Carrefour', 'Riz', 'ข้าว', '10', 'kg', '2', '20'],
    ])
    if (tab === 'stock') return Promise.resolve([])
    if (tab === 'config') return Promise.resolve([
      ['ingredient', 'i1', 'ข้าว', 'Riz', 'kg', '5'],
    ])
    return Promise.resolve([])
  })
})

test('GET returns weekly income, expenses and low stock', async () => {
  const req = new NextRequest('http://localhost/api/sheets/dashboard')
  const res = await GET(req)
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.weeklyIncome).toBe(180)  // 120 + 60
  expect(data.weeklyExpenses).toBe(20) // 1 purchase this week
  expect(data.lowStock).toBeInstanceOf(Array)
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx jest dashboard --no-coverage
```

- [ ] **Step 3: Implement**

Create `app/api/sheets/dashboard/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { readRows } from '@/lib/sheets'
import type { StockQuantity, Ingredient } from '@/types'

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day // Monday
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET(_req: NextRequest) {
  const now = new Date()
  const weekStart = startOfWeek(now).toISOString().slice(0, 10)

  const [salesRows, purchaseRows, stockRows, configRows] = await Promise.all([
    readRows('sales'),
    readRows('purchases'),
    readRows('stock'),
    readRows('config'),
  ])

  // Weekly income: sum column 7 (total) for rows in this week
  const weeklyIncome = salesRows
    .filter(r => r[0] >= weekStart)
    .reduce((sum, r) => sum + Number(r[7]), 0)

  // Weekly expenses: sum column 7 (total) from purchases this week
  const weeklyExpenses = purchaseRows
    .filter(r => r[0] >= weekStart)
    .reduce((sum, r) => sum + Number(r[7]), 0)

  // Stock quantities
  const quantities: Record<string, number> = {}
  for (const r of purchaseRows) {
    const name = r[3]; if (name) quantities[name] = (quantities[name] || 0) + Number(r[4])
  }
  for (const r of stockRows) {
    const name = r[1]; if (name) quantities[name] = (quantities[name] || 0) - Number(r[2])
  }

  const ingredients: Ingredient[] = configRows
    .filter(r => r[0] === 'ingredient')
    .map(r => ({ id: r[1], nameTh: r[2], nameFr: r[3], unit: r[4], threshold: Number(r[5]) }))

  const lowStock: StockQuantity[] = ingredients
    .filter(ing => (quantities[ing.nameTh] || 0) <= ing.threshold)
    .map(ing => ({ ingredient: ing, currentQty: quantities[ing.nameTh] || 0 }))

  return NextResponse.json({ weeklyIncome, weeklyExpenses, lowStock })
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx jest dashboard --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add app/api/sheets/dashboard/ __tests__/api/dashboard.test.ts
git commit -m "feat: add Dashboard API with weekly totals and low-stock alerts"
```

---

## Task 12: Root Layout + NavBar

**Files:**
- Create: `components/NavBar.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create NavBar**

Create `components/NavBar.tsx`:
```typescript
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/hooks/useLanguage'

const NAV_ITEMS = [
  { href: '/',                icon: '🏠', key: 'dashboard'     },
  { href: '/receipt',         icon: '🧾', key: 'receipt'       },
  { href: '/stock-deduction', icon: '📦', key: 'stockDeduction'},
  { href: '/daily-sales',     icon: '💰', key: 'dailySales'    },
  { href: '/manage-stock',    icon: '🗂️', key: 'manageStock'   },
  { href: '/manage-menus',    icon: '🍜', key: 'manageMenus'   },
] as const

export default function NavBar() {
  const pathname = usePathname()
  const { t } = useLanguage()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-2 z-50">
      {NAV_ITEMS.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-col items-center text-xs gap-1 px-2 py-1 rounded ${
            pathname === item.href ? 'text-blue-600 font-bold' : 'text-gray-500'
          }`}
        >
          <span className="text-2xl">{item.icon}</span>
          <span>{t.nav[item.key]}</span>
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: Add NavBar to layout**

Edit `app/layout.tsx` — add NavBar inside body, add `pb-20` to main content area:
```typescript
import type { Metadata } from 'next'
import './globals.css'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import SessionProviderWrapper from '@/components/SessionProviderWrapper'
import NavBar from '@/components/NavBar'
import LanguageSelector from '@/components/LanguageSelector'

export const metadata: Metadata = {
  title: 'ร้านอาหาร Manager',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="th">
      <body className="bg-gray-50 min-h-screen">
        <SessionProviderWrapper session={session}>
          <header className="flex items-center justify-between px-4 py-3 bg-white border-b">
            <span className="font-bold text-lg">🍜 ร้านอาหาร</span>
            <LanguageSelector />
          </header>
          <main className="pb-24 px-4 py-4 max-w-2xl mx-auto">
            {children}
          </main>
          <NavBar />
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/NavBar.tsx app/layout.tsx
git commit -m "feat: add NavBar and root layout"
```

---

## Task 13: Dashboard Screen

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Implement**

Replace `app/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import type { DashboardData } from '@/types'

export default function DashboardPage() {
  const { t } = useLanguage()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sheets/dashboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-center mt-8">{t.common.loading}</p>
  if (!data) return <p className="text-center mt-8 text-red-500">{t.common.error}</p>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">{t.dashboard.weeklyIncome}</p>
          <p className="text-2xl font-bold text-green-600">€{data.weeklyIncome.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">{t.dashboard.weeklyExpenses}</p>
          <p className="text-2xl font-bold text-red-600">€{data.weeklyExpenses.toFixed(2)}</p>
        </div>
      </div>

      {data.lowStock.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold mb-2">{t.dashboard.lowStock}</h2>
          <ul className="space-y-1">
            {data.lowStock.map(({ ingredient, currentQty }) => (
              <li key={ingredient.id} className="flex justify-between items-center">
                <span>{ingredient.nameTh}</span>
                <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                  currentQty <= 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {currentQty} {ingredient.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add Dashboard screen"
```

---

## Task 14: Upload Receipt Screen

**Files:**
- Create: `components/receipt/UploadZone.tsx`
- Create: `components/receipt/ItemReviewTable.tsx`
- Create: `app/receipt/page.tsx`
- Create: `__tests__/components/ItemReviewTable.test.tsx`

- [ ] **Step 1: Write failing test for ItemReviewTable**

Create `__tests__/components/ItemReviewTable.test.tsx`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import ItemReviewTable from '@/components/receipt/ItemReviewTable'
import type { ReceiptItem } from '@/types'

const items: ReceiptItem[] = [
  { nameFr: 'Riz jasmin', nameTh: '', qty: 5, unit: 'kg', pricePerUnit: 2, total: 10 },
]

test('renders item row', () => {
  render(<ItemReviewTable items={items} onChange={jest.fn()} />)
  expect(screen.getByDisplayValue('Riz jasmin')).toBeInTheDocument()
  expect(screen.getByDisplayValue('5')).toBeInTheDocument()
})

test('calls onChange when nameTh is edited', () => {
  const onChange = jest.fn()
  render(<ItemReviewTable items={items} onChange={onChange} />)
  const nameThInput = screen.getAllByRole('textbox')[1] // second input = nameTh
  fireEvent.change(nameThInput, { target: { value: 'ข้าว' } })
  expect(onChange).toHaveBeenCalledWith(
    expect.arrayContaining([expect.objectContaining({ nameTh: 'ข้าว' })])
  )
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx jest ItemReviewTable --no-coverage
```

- [ ] **Step 3: Create UploadZone**

Create `components/receipt/UploadZone.tsx`:
```typescript
'use client'
import { useRef } from 'react'

interface Props {
  onFile: (file: File) => void
  preview: string | null
}

export default function UploadZone({ onFile, preview }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition"
      onClick={() => inputRef.current?.click()}
    >
      {preview ? (
        <img src={preview} alt="receipt" className="max-h-48 mx-auto rounded" />
      ) : (
        <div className="space-y-2">
          <p className="text-4xl">📷</p>
          <p className="text-gray-500">แตะเพื่อถ่ายรูปหรือเลือกไฟล์</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]) }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Create ItemReviewTable**

Create `components/receipt/ItemReviewTable.tsx`:
```typescript
'use client'
import type { ReceiptItem } from '@/types'

interface Props {
  items: ReceiptItem[]
  onChange: (items: ReceiptItem[]) => void
}

function update(items: ReceiptItem[], index: number, patch: Partial<ReceiptItem>): ReceiptItem[] {
  return items.map((item, i) => i === index ? { ...item, ...patch } : item)
}

export default function ItemReviewTable({ items, onChange }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 border-b">
            <th className="text-left py-1">FR</th>
            <th className="text-left py-1">TH</th>
            <th className="text-right py-1">Qty</th>
            <th className="text-left py-1">Unit</th>
            <th className="text-right py-1">€/u</th>
            <th className="text-right py-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b">
              <td>
                <input
                  className="border rounded px-1 w-full"
                  value={item.nameFr}
                  onChange={e => onChange(update(items, i, { nameFr: e.target.value }))}
                />
              </td>
              <td>
                <input
                  className="border rounded px-1 w-full"
                  value={item.nameTh}
                  onChange={e => onChange(update(items, i, { nameTh: e.target.value }))}
                />
              </td>
              <td>
                <input
                  type="number"
                  className="border rounded px-1 w-16 text-right"
                  value={item.qty}
                  onChange={e => onChange(update(items, i, { qty: Number(e.target.value) }))}
                />
              </td>
              <td>
                <input
                  className="border rounded px-1 w-16"
                  value={item.unit}
                  onChange={e => onChange(update(items, i, { unit: e.target.value }))}
                />
              </td>
              <td className="text-right px-1">€{item.pricePerUnit.toFixed(2)}</td>
              <td className="text-right px-1">€{item.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npx jest ItemReviewTable --no-coverage
```

- [ ] **Step 6: Create receipt page**

Create `app/receipt/page.tsx`:
```typescript
'use client'
import { useState } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import UploadZone from '@/components/receipt/UploadZone'
import ItemReviewTable from '@/components/receipt/ItemReviewTable'
import type { ReceiptItem } from '@/types'

export default function ReceiptPage() {
  const { t } = useLanguage()
  const [preview, setPreview] = useState<string | null>(null)
  const [store, setStore] = useState('')
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file))
    setLoading(true)
    const form = new FormData()
    form.append('image', file)
    const res = await fetch('/api/ocr', { method: 'POST', body: form })
    const data = await res.json()
    setItems(data.items || [])
    setLoading(false)
  }

  async function handleConfirm() {
    setLoading(true)
    await fetch('/api/sheets/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        store,
        items,
      }),
    })
    setDone(true)
    setLoading(false)
  }

  if (done) return <p className="text-center mt-8 text-green-600 text-xl">✅ บันทึกสำเร็จ</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t.receipt.upload}</h1>

      <UploadZone onFile={handleFile} preview={preview} />

      <div>
        <label className="text-sm text-gray-600">{t.receipt.store}</label>
        <input
          className="border rounded px-3 py-2 w-full mt-1"
          value={store}
          onChange={e => setStore(e.target.value)}
        />
      </div>

      {loading && <p className="text-center">{t.common.loading}</p>}

      {items.length > 0 && (
        <>
          <ItemReviewTable items={items} onChange={setItems} />
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50"
          >
            {t.receipt.confirm}
          </button>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add components/receipt/ app/receipt/ __tests__/components/ItemReviewTable.test.tsx
git commit -m "feat: add Upload Receipt screen with Gemini OCR"
```

---

## Task 15: MenuChips + Stock Deduction Screen

**Files:**
- Create: `components/stock/MenuChips.tsx`
- Create: `components/stock/IngredientSection.tsx`
- Create: `app/stock-deduction/page.tsx`
- Create: `__tests__/components/MenuChips.test.tsx`

- [ ] **Step 1: Write failing test**

Create `__tests__/components/MenuChips.test.tsx`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import MenuChips from '@/components/stock/MenuChips'

const menus = [
  { id: 'm1', nameTh: 'ผัดไทย', pricePerBox: 12, ingredients: [] },
  { id: 'm2', nameTh: 'แกงเขียวหวาน', pricePerBox: 14, ingredients: [] },
]

test('renders all menus plus Other chip', () => {
  render(<MenuChips menus={menus} selected={[]} onChange={jest.fn()} />)
  expect(screen.getByText('ผัดไทย')).toBeInTheDocument()
  expect(screen.getByText('แกงเขียวหวาน')).toBeInTheDocument()
  expect(screen.getByText(/อื่นๆ/)).toBeInTheDocument()
})

test('selecting a chip calls onChange with its id', () => {
  const onChange = jest.fn()
  render(<MenuChips menus={menus} selected={[]} onChange={onChange} />)
  fireEvent.click(screen.getByText('ผัดไทย'))
  expect(onChange).toHaveBeenCalledWith(['m1'])
})

test('deselecting removes from selection', () => {
  const onChange = jest.fn()
  render(<MenuChips menus={menus} selected={['m1']} onChange={onChange} />)
  fireEvent.click(screen.getByText('ผัดไทย'))
  expect(onChange).toHaveBeenCalledWith([])
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx jest MenuChips --no-coverage
```

- [ ] **Step 3: Create MenuChips**

Create `components/stock/MenuChips.tsx`:
```typescript
'use client'
import type { MenuTemplate } from '@/types'

interface Props {
  menus: MenuTemplate[]
  selected: string[]  // menu ids
  onChange: (selected: string[]) => void
}

const OTHER_ID = '__other__'

export default function MenuChips({ menus, selected, onChange }: Props) {
  function toggle(id: string) {
    onChange(
      selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]
    )
  }

  const allChips = [...menus.map(m => ({ id: m.id, label: m.nameTh })), { id: OTHER_ID, label: '✦ อื่นๆ' }]

  return (
    <div className="flex flex-wrap gap-2">
      {allChips.map(chip => (
        <button
          key={chip.id}
          onClick={() => toggle(chip.id)}
          className={`px-3 py-1 rounded-full border text-sm font-medium transition ${
            selected.includes(chip.id)
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-300'
          }`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
npx jest MenuChips --no-coverage
```

- [ ] **Step 5: Create IngredientSection**

Create `components/stock/IngredientSection.tsx`:
```typescript
'use client'
import { useState } from 'react'
import type { StockDeductionRow, StockReason } from '@/types'

const REASONS: StockReason[] = ['ใช้ทำอาหาร', 'แตก/เสียหาย', 'เสีย', 'สูญหาย']

interface IngredientRowState {
  ingredient: string
  unit: string
  currentQty: number
  amountUsed: number
  reason: StockReason
}

interface Props {
  menuName: string
  rows: IngredientRowState[]
  onChange: (rows: IngredientRowState[]) => void
  allIngredients: { nameTh: string; unit: string }[]
}

export default function IngredientSection({ menuName, rows, onChange, allIngredients }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  function updateRow(index: number, patch: Partial<IngredientRowState>) {
    onChange(rows.map((r, i) => i === index ? { ...r, ...patch } : r))
  }

  function addRow() {
    onChange([...rows, { ingredient: '', unit: '', currentQty: 0, amountUsed: 0, reason: 'ใช้ทำอาหาร' }])
  }

  return (
    <div className="bg-white rounded-xl shadow">
      <button
        className="w-full flex items-center justify-between p-4 font-semibold"
        onClick={() => setCollapsed(c => !c)}
      >
        <span>{menuName}</span>
        <span>{collapsed ? '▶' : '▼'}</span>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="grid grid-cols-4 gap-2 items-center text-sm">
              {row.ingredient ? (
                <span className="col-span-1 font-medium">{row.ingredient}</span>
              ) : (
                <select
                  className="col-span-1 border rounded px-1 py-1"
                  value={row.ingredient}
                  onChange={e => {
                    const ing = allIngredients.find(a => a.nameTh === e.target.value)
                    updateRow(i, { ingredient: e.target.value, unit: ing?.unit || '' })
                  }}
                >
                  <option value="">เลือก...</option>
                  {allIngredients.map(a => <option key={a.nameTh} value={a.nameTh}>{a.nameTh}</option>)}
                </select>
              )}
              <span className="text-gray-400 text-xs">เหลือ {row.currentQty} {row.unit}</span>
              <input
                type="number"
                className="border rounded px-1 py-1 text-right"
                value={row.amountUsed}
                onChange={e => updateRow(i, { amountUsed: Number(e.target.value) })}
              />
              <select
                className="border rounded px-1 py-1"
                value={row.reason}
                onChange={e => updateRow(i, { reason: e.target.value as StockReason })}
              >
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          ))}
          <button onClick={addRow} className="text-blue-600 text-sm mt-2">+ เพิ่มวัตถุดิบ</button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create stock deduction page**

Create `app/stock-deduction/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import MenuChips from '@/components/stock/MenuChips'
import IngredientSection from '@/components/stock/IngredientSection'
import type { MenuTemplate, Ingredient } from '@/types'

interface RowState {
  ingredient: string
  unit: string
  currentQty: number
  amountUsed: number
  reason: 'ใช้ทำอาหาร' | 'แตก/เสียหาย' | 'เสีย' | 'สูญหาย'
}

export default function StockDeductionPage() {
  const { t } = useLanguage()
  const [menus, setMenus] = useState<MenuTemplate[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<string[]>([])
  const [sections, setSections] = useState<Record<string, RowState[]>>({})
  const [done, setDone] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/sheets/config').then(r => r.json()),
      fetch('/api/sheets/stock').then(r => r.json()),
    ]).then(([config, stock]) => {
      setMenus(config.menus)
      setIngredients(config.ingredients)
      setQuantities(stock.quantities)
    })
  }, [])

  function handleSelectMenus(ids: string[]) {
    setSelected(ids)
    const newSections: Record<string, RowState[]> = {}
    for (const id of ids) {
      if (id === '__other__') {
        newSections[id] = sections[id] || []
      } else {
        const menu = menus.find(m => m.id === id)!
        newSections[id] = sections[id] || menu.ingredients.map(mi => {
          const ing = ingredients.find(i => i.id === mi.ingredientId)!
          return {
            ingredient: ing?.nameTh || '',
            unit: ing?.unit || '',
            currentQty: quantities[ing?.nameTh] || 0,
            amountUsed: mi.defaultQty,
            reason: 'ใช้ทำอาหาร' as const,
          }
        })
      }
    }
    setSections(newSections)
  }

  async function handleSave() {
    const date = new Date().toISOString().slice(0, 10)
    const rows = Object.entries(sections).flatMap(([menuId, rows]) => {
      const menuName = menuId === '__other__' ? 'อื่นๆ' : menus.find(m => m.id === menuId)?.nameTh || ''
      return rows.filter(r => r.ingredient && r.amountUsed > 0).map(r => ({
        date, ingredient: r.ingredient, amount_used: r.amountUsed,
        unit: r.unit, reason: r.reason, menu: menuName,
      }))
    })
    await fetch('/api/sheets/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    })
    setDone(true)
  }

  if (done) return <p className="text-center mt-8 text-green-600 text-xl">✅ บันทึกสำเร็จ</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t.stock.deduct}</h1>
      <div>
        <p className="text-sm text-gray-500 mb-2">{t.stock.selectMenus}</p>
        <MenuChips menus={menus} selected={selected} onChange={handleSelectMenus} />
      </div>
      {selected.map(id => (
        <IngredientSection
          key={id}
          menuName={id === '__other__' ? 'อื่นๆ' : menus.find(m => m.id === id)?.nameTh || ''}
          rows={sections[id] || []}
          onChange={rows => setSections(s => ({ ...s, [id]: rows }))}
          allIngredients={ingredients}
        />
      ))}
      {selected.length > 0 && (
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold"
        >
          {t.common.save}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add components/stock/ app/stock-deduction/ __tests__/components/MenuChips.test.tsx
git commit -m "feat: add Stock Deduction screen"
```

---

## Task 16: Daily Sales Screen

**Files:**
- Create: `app/daily-sales/page.tsx`

- [ ] **Step 1: Implement**

Create `app/daily-sales/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import type { MenuTemplate } from '@/types'

interface MenuSaleEntry {
  menu: MenuTemplate
  boxes: number
  pricePerBox: number
}

export default function DailySalesPage() {
  const { t } = useLanguage()
  const [entries, setEntries] = useState<MenuSaleEntry[]>([])
  const [cash, setCash] = useState(0)
  const [card, setCard] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch('/api/sheets/config')
      .then(r => r.json())
      .then(data => {
        setEntries(data.menus.map((m: MenuTemplate) => ({ menu: m, boxes: 0, pricePerBox: m.pricePerBox })))
      })
  }, [])

  function updateEntry(index: number, patch: Partial<MenuSaleEntry>) {
    setEntries(entries.map((e, i) => i === index ? { ...e, ...patch } : e))
  }

  async function handleSave() {
    const menuSales = entries
      .filter(e => e.boxes > 0)
      .map(e => ({ menu: e.menu.nameTh, boxes: e.boxes, pricePerBox: e.pricePerBox }))
    await fetch('/api/sheets/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: new Date().toISOString().slice(0, 10), menuSales, cash, card }),
    })
    setDone(true)
  }

  if (done) return <p className="text-center mt-8 text-green-600 text-xl">✅ บันทึกสำเร็จ</p>

  const subtotal = entries.reduce((s, e) => s + e.boxes * e.pricePerBox, 0)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t.sales.title}</h1>

      <div className="bg-white rounded-xl shadow divide-y">
        {entries.map((entry, i) => (
          <div key={entry.menu.id} className="flex items-center gap-3 p-3">
            <span className="flex-1 font-medium">{entry.menu.nameTh}</span>
            <input
              type="number"
              min="0"
              className="border rounded px-2 py-1 w-20 text-right"
              value={entry.boxes}
              onChange={e => updateEntry(i, { boxes: Number(e.target.value) })}
            />
            <span className="text-sm text-gray-500">{t.sales.boxes}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="border rounded px-2 py-1 w-20 text-right"
              value={entry.pricePerBox}
              onChange={e => updateEntry(i, { pricePerBox: Number(e.target.value) })}
            />
            <span className="text-sm text-gray-500">€</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div className="flex justify-between items-center">
          <label>{t.sales.cash}</label>
          <input type="number" min="0" step="0.01" className="border rounded px-2 py-1 w-28 text-right"
            value={cash} onChange={e => setCash(Number(e.target.value))} />
        </div>
        <div className="flex justify-between items-center">
          <label>{t.sales.card}</label>
          <input type="number" min="0" step="0.01" className="border rounded px-2 py-1 w-28 text-right"
            value={card} onChange={e => setCard(Number(e.target.value))} />
        </div>
        <div className="flex justify-between font-bold pt-2 border-t">
          <span>Total</span>
          <span>€{(cash + card).toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold"
      >
        {t.sales.save}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/daily-sales/page.tsx
git commit -m "feat: add Daily Sales screen"
```

---

## Task 17: Manage Stock Items Screen

**Files:**
- Create: `app/manage-stock/page.tsx`

The Config tab uses `appendRows` for adding. For editing/deleting we need a `PUT` and `DELETE` on config. Add those now.

- [ ] **Step 1: Add PUT/DELETE to config route**

Edit `app/api/sheets/config/route.ts` — add after `POST`:
```typescript
// Add to existing file, after the POST export:

export async function PUT(req: NextRequest) {
  const { rowIndex, data }: { rowIndex: number; data: string[] } = await req.json()
  const sheets = getSheetsClient()
  const spreadsheetId = await getOrCreateMonthSheet()
  // rowIndex is 0-based data row (add 2 for 1-based + header)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Config!A${rowIndex + 2}`,
    valueInputOption: 'RAW',
    requestBody: { values: [data] },
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { rowIndex }: { rowIndex: number } = await req.json()
  const sheets = getSheetsClient()
  const spreadsheetId = await getOrCreateMonthSheet()
  // Clear the row (Sheets doesn't have a delete-row API easily, so we clear it)
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `Config!A${rowIndex + 2}:Z${rowIndex + 2}`,
  })
  return NextResponse.json({ ok: true })
}
```

Note: `getSheetsClient` and `getOrCreateMonthSheet` are already imported at top of that file.

- [ ] **Step 2: Implement manage-stock page**

Create `app/manage-stock/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import type { Ingredient } from '@/types'

interface NewIngredient { nameTh: string; nameFr: string; unit: string; threshold: number }
const EMPTY: NewIngredient = { nameTh: '', nameFr: '', unit: '', threshold: 0 }

export default function ManageStockPage() {
  const { t } = useLanguage()
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [form, setForm] = useState<NewIngredient>(EMPTY)
  const [loading, setLoading] = useState(true)

  async function reload() {
    const [cfg, stock] = await Promise.all([
      fetch('/api/sheets/config').then(r => r.json()),
      fetch('/api/sheets/stock').then(r => r.json()),
    ])
    setIngredients(cfg.ingredients)
    setQuantities(stock.quantities)
    setLoading(false)
  }

  useEffect(() => { reload() }, [])

  async function handleAdd() {
    await fetch('/api/sheets/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ingredient', ...form }),
    })
    setForm(EMPTY)
    reload()
  }

  async function handleDelete(id: string) {
    if (!confirm(t.manageStock.confirmDelete)) return
    const index = ingredients.findIndex(i => i.id === id)
    await fetch('/api/sheets/config', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIndex: index }),
    })
    reload()
  }

  if (loading) return <p className="text-center mt-8">{t.common.loading}</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t.manageStock.title}</h1>

      <div className="bg-white rounded-xl shadow divide-y">
        {ingredients.map(ing => (
          <div key={ing.id} className="flex items-center gap-2 p-3">
            <div className="flex-1">
              <p className="font-medium">{ing.nameTh} <span className="text-gray-400 text-sm">({ing.nameFr})</span></p>
              <p className="text-sm text-gray-500">
                {quantities[ing.nameTh] ?? 0} {ing.unit} — alert ≤ {ing.threshold}
              </p>
            </div>
            <button
              onClick={() => handleDelete(ing.id)}
              className="text-red-500 text-sm px-2 py-1 border border-red-300 rounded"
            >
              {t.common.delete}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <h2 className="font-semibold">{t.manageStock.add}</h2>
        <input placeholder={t.manageStock.name + ' (TH)'} className="border rounded px-3 py-2 w-full"
          value={form.nameTh} onChange={e => setForm(f => ({ ...f, nameTh: e.target.value }))} />
        <input placeholder={t.manageStock.name + ' (FR)'} className="border rounded px-3 py-2 w-full"
          value={form.nameFr} onChange={e => setForm(f => ({ ...f, nameFr: e.target.value }))} />
        <div className="flex gap-2">
          <input placeholder={t.manageStock.unit} className="border rounded px-3 py-2 flex-1"
            value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
          <input type="number" placeholder={t.manageStock.threshold} className="border rounded px-3 py-2 w-24"
            value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: Number(e.target.value) }))} />
        </div>
        <button onClick={handleAdd} className="w-full bg-blue-600 text-white py-2 rounded-xl">
          {t.manageStock.add}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/manage-stock/page.tsx app/api/sheets/config/route.ts
git commit -m "feat: add Manage Stock Items screen with add/delete"
```

---

## Task 18: Manage Menus Screen

**Files:**
- Create: `app/manage-menus/page.tsx`

- [ ] **Step 1: Implement**

Create `app/manage-menus/page.tsx`:
```typescript
'use client'
import { useEffect, useState } from 'react'
import { useLanguage } from '@/hooks/useLanguage'
import type { MenuTemplate, Ingredient } from '@/types'

interface NewMenu { nameTh: string; pricePerBox: number; ingredients: { ingredientId: string; defaultQty: number }[] }
const EMPTY_MENU: NewMenu = { nameTh: '', pricePerBox: 0, ingredients: [] }

export default function ManageMenusPage() {
  const { t } = useLanguage()
  const [menus, setMenus] = useState<MenuTemplate[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [form, setForm] = useState<NewMenu>(EMPTY_MENU)
  const [loading, setLoading] = useState(true)

  async function reload() {
    const cfg = await fetch('/api/sheets/config').then(r => r.json())
    setMenus(cfg.menus)
    setIngredients(cfg.ingredients)
    setLoading(false)
  }

  useEffect(() => { reload() }, [])

  function addIngredientRow() {
    setForm(f => ({ ...f, ingredients: [...f.ingredients, { ingredientId: '', defaultQty: 0 }] }))
  }

  function updateIngredientRow(index: number, patch: { ingredientId?: string; defaultQty?: number }) {
    setForm(f => ({
      ...f,
      ingredients: f.ingredients.map((r, i) => i === index ? { ...r, ...patch } : r),
    }))
  }

  async function handleAdd() {
    await fetch('/api/sheets/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'menu', ...form }),
    })
    setForm(EMPTY_MENU)
    reload()
  }

  async function handleDelete(id: string) {
    if (!confirm(t.manageStock.confirmDelete)) return
    const index = menus.findIndex(m => m.id === id)
    // menu rows appear after ingredient rows in Config tab
    await fetch('/api/sheets/config', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rowIndex: ingredients.length + index }),
    })
    reload()
  }

  if (loading) return <p className="text-center mt-8">{t.common.loading}</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t.manageMenus.title}</h1>

      <div className="bg-white rounded-xl shadow divide-y">
        {menus.map(menu => (
          <div key={menu.id} className="p-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{menu.nameTh}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">€{menu.pricePerBox}/กล่อง</span>
                <button
                  onClick={() => handleDelete(menu.id)}
                  className="text-red-500 text-sm px-2 py-1 border border-red-300 rounded"
                >
                  {t.common.delete}
                </button>
              </div>
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {menu.ingredients.map(mi => {
                const ing = ingredients.find(i => i.id === mi.ingredientId)
                return ing ? `${ing.nameTh} ${mi.defaultQty}${ing.unit}` : ''
              }).filter(Boolean).join(' · ')}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <h2 className="font-semibold">{t.manageMenus.add}</h2>
        <input placeholder={t.manageMenus.name} className="border rounded px-3 py-2 w-full"
          value={form.nameTh} onChange={e => setForm(f => ({ ...f, nameTh: e.target.value }))} />
        <div className="flex items-center gap-2">
          <label className="text-sm">{t.manageMenus.price}</label>
          <input type="number" step="0.01" className="border rounded px-3 py-2 w-28"
            value={form.pricePerBox} onChange={e => setForm(f => ({ ...f, pricePerBox: Number(e.target.value) }))} />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t.manageMenus.ingredients}</p>
          {form.ingredients.map((row, i) => (
            <div key={i} className="flex gap-2">
              <select className="border rounded px-2 py-1 flex-1"
                value={row.ingredientId}
                onChange={e => updateIngredientRow(i, { ingredientId: e.target.value })}>
                <option value="">เลือก...</option>
                {ingredients.map(ing => <option key={ing.id} value={ing.id}>{ing.nameTh}</option>)}
              </select>
              <input type="number" step="0.01" className="border rounded px-2 py-1 w-20"
                placeholder={t.manageMenus.defaultQty}
                value={row.defaultQty}
                onChange={e => updateIngredientRow(i, { defaultQty: Number(e.target.value) })} />
            </div>
          ))}
          <button onClick={addIngredientRow} className="text-blue-600 text-sm">+ เพิ่มวัตถุดิบ</button>
        </div>

        <button onClick={handleAdd} className="w-full bg-blue-600 text-white py-2 rounded-xl">
          {t.manageMenus.add}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/manage-menus/page.tsx
git commit -m "feat: add Manage Menus screen"
```

---

## Task 19: LINE Bot Webhook

**Files:**
- Create: `lib/line.ts`
- Create: `app/api/line/route.ts`
- Create: `__tests__/api/line.test.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/api/line.test.ts`:
```typescript
import { parseLineCommand } from '@/lib/line'

test('parses stock deduction command', () => {
  const result = parseLineCommand('ตัดสต็อก ข้าว 500 g')
  expect(result).toEqual({ type: 'stock', ingredient: 'ข้าว', amount: 500, unit: 'g' })
})

test('parses sales command', () => {
  const result = parseLineCommand('ยอดขาย ผัดไทย 15 กล่อง')
  expect(result).toEqual({ type: 'sales', menu: 'ผัดไทย', boxes: 15 })
})

test('returns null for unknown command', () => {
  expect(parseLineCommand('hello')).toBeNull()
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npx jest line --no-coverage
```

- [ ] **Step 3: Create lib/line.ts**

```typescript
type StockCommand = { type: 'stock'; ingredient: string; amount: number; unit: string }
type SalesCommand = { type: 'sales'; menu: string; boxes: number }
type LineCommand = StockCommand | SalesCommand | null

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
```

- [ ] **Step 4: Create LINE Bot webhook route**

Create `app/api/line/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Client, validateSignature, WebhookEvent } from '@line/bot-sdk'
import { parseLineCommand } from '@/lib/line'
import { appendRows } from '@/lib/sheets'
import { extractReceiptItems } from '@/lib/gemini'

const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
})

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('x-line-signature') || ''

  if (!validateSignature(body, process.env.LINE_CHANNEL_SECRET!, signature)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { events }: { events: WebhookEvent[] } = JSON.parse(body)
  const date = new Date().toISOString().slice(0, 10)

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const cmd = parseLineCommand(event.message.text)
      if (cmd?.type === 'stock') {
        await appendRows('stock', [[date, cmd.ingredient, cmd.amount, cmd.unit, 'ใช้ทำอาหาร', 'LINE']])
        await lineClient.replyMessage(event.replyToken, { type: 'text', text: `✅ ตัดสต็อก ${cmd.ingredient} ${cmd.amount} ${cmd.unit}` })
      } else if (cmd?.type === 'sales') {
        await appendRows('sales', [[date, cmd.menu, cmd.boxes, 0, 0, 0, 0, 0]])
        await lineClient.replyMessage(event.replyToken, { type: 'text', text: `✅ บันทึกยอดขาย ${cmd.menu} ${cmd.boxes} กล่อง` })
      }
    } else if (event.type === 'message' && event.message.type === 'image') {
      // Receipt photo via LINE
      const stream = await lineClient.getMessageContent(event.message.id)
      const chunks: Buffer[] = []
      for await (const chunk of stream) chunks.push(chunk as Buffer)
      const buffer = Buffer.concat(chunks)
      const items = await extractReceiptItems(buffer, 'image/jpeg')
      const summary = items.map(i => `${i.nameFr} x${i.qty} = €${i.total}`).join('\n')
      await lineClient.replyMessage(event.replyToken, {
        type: 'text',
        text: `🧾 พบ ${items.length} รายการ:\n${summary}\n\nกรุณายืนยันในแอป`,
      })
    }
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npx jest line --no-coverage
```
Expected: 3 tests pass (parseLineCommand tests; webhook route not unit-tested due to LINE SDK coupling).

- [ ] **Step 6: Commit**

```bash
git add lib/line.ts app/api/line/ __tests__/api/line.test.ts
git commit -m "feat: add LINE Bot webhook for stock/sales commands and receipt photos"
```

---

## Task 20: Auth Guard + Run All Tests

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Add auth middleware**

Create `middleware.ts` at project root:
```typescript
export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/((?!api/auth|api/line|_next/static|_next/image|favicon.ico).*)'],
}
```

This protects all routes except auth callbacks and the LINE webhook.

- [ ] **Step 2: Run full test suite**

```bash
npx jest --no-coverage
```
Expected: all tests pass.

- [ ] **Step 3: Build check**

```bash
npm run build
```
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat: add auth middleware to protect all routes"
```

---

## Self-Review Against Spec

| Spec requirement | Task |
|---|---|
| Dashboard: weekly income, expenses, low stock | Task 11 (API) + Task 13 (UI) |
| Upload Receipt: camera/file, Gemini OCR, review, confirm | Task 6 + Task 14 |
| Purchases tab appended on confirm | Task 8 |
| Stock Deduction: menu chips, template pre-fill, per-menu sections, reasons | Task 15 |
| Stock tab appended on save | Task 9 |
| Daily Sales: boxes + price per menu, cash + card | Task 16 |
| Daily Sales tab appended | Task 10 |
| Manage Stock Items: list with current qty, add, delete | Task 17 |
| Manage Menus: list, add, delete, ingredient templates | Task 18 |
| Config tab: ingredients + menus, copied forward monthly | Task 4 + Task 7 |
| Auto-create new month spreadsheet | Task 4 |
| Thai UI default, FR/EN switchable | Task 3 |
| Google OAuth + Sheets scope | Task 5 |
| LINE Bot: receipt photo, text commands | Task 19 |
| Tablet-optimized (max-w-2xl, fixed bottom nav, large tap targets) | Task 12 |
