# Config API PUT and DELETE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update `app/api/sheets/config/route.ts` to support `PUT` and `DELETE` requests for managing ingredients and menus.

**Architecture:** Extend the existing Next.js API route with `PUT` and `DELETE` handlers. Use `readRows` to fetch current data and `updateTab` from `lib/sheets.ts` to persist changes.

**Tech Stack:** Next.js 15, TypeScript, Google Sheets API (via `lib/sheets.ts`), Jest for testing.

---

### Task 1: Update Tests for PUT and DELETE

**Files:**
- Modify: `__tests__/api/config.test.ts`

- [ ] **Step 1: Update mocks in `__tests__/api/config.test.ts` to include `updateTab` and export `PUT` and `DELETE`**

```typescript
import { GET, POST, PUT, DELETE } from '../../app/api/sheets/config/route'
import { getServerSession } from 'next-auth'

jest.mock('next-auth')
jest.mock('../../lib/sheets', () => ({
  readRows: jest.fn(),
  appendRows: jest.fn(),
  updateTab: jest.fn(),
  getOrCreateMonthSheet: jest.fn().mockResolvedValue('sheet-id'),
}))

const { readRows, appendRows, updateTab } = require('../../lib/sheets')
const mockedGetServerSession = getServerSession as jest.Mock
```

- [ ] **Step 2: Add failing tests for `PUT` (update ingredient)**

```typescript
test('PUT /api/sheets/config updates ingredient', async () => {
  const body = { id: 'i1', type: 'ingredient', nameTh: 'ข้าวหอม', nameFr: 'Riz Jasmin', unit: 'kg', threshold: 10 }
  const req = {
    json: jest.fn().mockResolvedValue(body)
  }
  const res = await PUT(req as any)
  expect(res.status).toBe(200)
  expect(updateTab).toHaveBeenCalledWith('fake-token', 'config', 
    ['type','id','name_th','name_fr_or_price','unit_or_ingredients','threshold'],
    [
      ['ingredient', 'i1', 'ข้าวหอม', 'Riz Jasmin', 'kg', '10'],
      ['menu', 'm1', 'ผัดไทย', '12', 'i1:0.2', ''], // Keep other rows, ensure threshold is empty string if not applicable
    ]
  )
})
```

- [ ] **Step 3: Add failing tests for `PUT` (update menu)**

```typescript
test('PUT /api/sheets/config updates menu', async () => {
  const body = { id: 'm1', type: 'menu', nameTh: 'ผัดไทยกุ้ง', pricePerBox: 15, ingredients: [{ ingredientId: 'i1', defaultQty: 0.3 }] }
  const req = {
    json: jest.fn().mockResolvedValue(body)
  }
  const res = await PUT(req as any)
  expect(res.status).toBe(200)
  expect(updateTab).toHaveBeenCalledWith('fake-token', 'config', 
    ['type','id','name_th','name_fr_or_price','unit_or_ingredients','threshold'],
    [
      ['ingredient', 'i1', 'ข้าว', 'Riz', 'kg', '5'],
      ['menu', 'm1', 'ผัดไทยกุ้ง', '15', 'i1:0.3', ''],
    ]
  )
})
```

- [ ] **Step 4: Add failing tests for `DELETE`**

```typescript
test('DELETE /api/sheets/config removes row', async () => {
  const req = {
    nextUrl: { searchParams: new URLSearchParams({ id: 'i1' }) }
  }
  const res = await DELETE(req as any)
  expect(res.status).toBe(200)
  expect(updateTab).toHaveBeenCalledWith('fake-token', 'config', 
    ['type','id','name_th','name_fr_or_price','unit_or_ingredients','threshold'],
    [
      ['menu', 'm1', 'ผัดไทย', '12', 'i1:0.2', ''],
    ]
  )
})
```

- [ ] **Step 5: Run tests and verify they fail**

Run: `npm test __tests__/api/config.test.ts`
Expected: FAIL (PUT and DELETE not defined)

---

### Task 2: Implement PUT Handler

**Files:**
- Modify: `app/api/sheets/config/route.ts`

- [ ] **Step 1: Import `updateTab` and export `PUT`**

```typescript
import { readRows, appendRows, updateTab } from '../../../../lib/sheets'
// ...
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, type } = body

    const rows = await readRows(accessToken, 'config')
    const updatedRows = rows.map(row => {
      if (row[1] === id) {
        if (type === 'ingredient') {
          return ['ingredient', id, body.nameTh, body.nameFr, body.unit, String(body.threshold)]
        } else if (type === 'menu') {
          const ingredientStr = (body.ingredients || [])
            .map((i: { ingredientId: string; defaultQty: number }) => `${i.ingredientId}:${i.defaultQty}`)
            .join(',')
          return ['menu', id, body.nameTh, String(body.pricePerBox), ingredientStr, '']
        }
      }
      // Ensure all rows have 6 columns for consistency with updateTab
      const newRow = [...row]
      while (newRow.length < 6) newRow.push('')
      return newRow
    })

    const header = ['type', 'id', 'name_th', 'name_fr_or_price', 'unit_or_ingredients', 'threshold']
    await updateTab(accessToken, 'config', header, updatedRows)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Config PUT error:', error.message)
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Run tests to verify PUT passes**

Run: `npm test __tests__/api/config.test.ts`
Expected: PUT tests PASS, DELETE still FAILS

---

### Task 3: Implement DELETE Handler

**Files:**
- Modify: `app/api/sheets/config/route.ts`

- [ ] **Step 1: Export `DELETE`**

```typescript
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const rows = await readRows(accessToken, 'config')
    const filteredRows = rows
      .filter(row => row[1] !== id)
      .map(row => {
        const newRow = [...row]
        while (newRow.length < 6) newRow.push('')
        return newRow
      })

    const header = ['type', 'id', 'name_th', 'name_fr_or_price', 'unit_or_ingredients', 'threshold']
    await updateTab(accessToken, 'config', header, filteredRows)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Config DELETE error:', error.message)
    return NextResponse.json({ error: 'Failed to delete config' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Run all tests to verify everything passes**

Run: `npm test __tests__/api/config.test.ts`
Expected: ALL PASS

- [ ] **Step 3: Verify with type-check**

Run: `npx tsc --noEmit`
Expected: Success

---

### Task 4: Final Commit

- [ ] **Step 1: Commit the changes**

Run: `git add . && git commit -m "feat: add PUT and DELETE handlers to config API"`
