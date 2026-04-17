# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server
npm run build    # production build
npm test         # run all tests
npm test -- --testPathPattern=<pattern>  # run a single test file
```

## Environment variables

Required in `.env.local`:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth app credentials
- `NEXTAUTH_SECRET` — random secret for NextAuth JWT signing
- `NEXTAUTH_URL` — e.g. `http://localhost:3000`
- `GEMINI_API_KEY` — used by `lib/gemini.ts` for OCR
- `TELEGRAM_BOT_TOKEN` — Telegram bot webhook secret

## Architecture

Tablet-optimized restaurant manager for 'Lawan Thai Traiteur' in France. The "database" is Google Sheets — every calendar month gets its own spreadsheet named `ร้านอาหาร — <Thai month> <Buddhist year>`. There is no SQL database; all persistence goes through `lib/sheets.ts`.

### Data layer (`lib/sheets.ts`)

Four exported functions cover all data access:
- `getOrCreateMonthSheet(accessToken?, date?)` — finds or creates the month's spreadsheet; on first creation copies the Config tab from the previous month
- `appendRows(accessToken, tab, rows)` — appends rows to a named tab
- `readRows(accessToken, tab)` — returns all data rows (excludes header) from a tab
- `updateTab(accessToken, tab, header, rows)` — clears the tab then writes header + all rows (full overwrite)

`TabKey` values: `'purchases' | 'stock' | 'sales' | 'config' | 'summary' | 'receipt_summaries' | 'receipt_extract' | 'inventory'`

**Mutation pattern for PUT/DELETE:** all edits use read-modify-write — call `readRows`, transform the array, then call `updateTab`. There is no row-level update API; the entire tab is rewritten each time.

### Config tab schema

The Config tab stores two entity types in the same sheet, distinguished by column 0:

| col 0 | col 1 | col 2 | col 3 | col 4 | col 5 |
|-------|-------|-------|-------|-------|-------|
| `ingredient` | id (8-char UUID) | nameTh | nameFr | unit | threshold |
| `menu` | id | nameTh | pricePerBox (€) | `ingredientId:qty,...` CSV | _(empty)_ |

The `parseConfig()` function in `app/api/sheets/config/route.ts` is the canonical parser.

Config POST also accepts `{ bulk: true, items: [...] }` for batch ingredient upsert — matches by `nameTh` (case-insensitive), updates existing or creates new.

### Sales tab schema

The sales tab has 9 columns: `id, date, menu, boxes, price_per_box, subtotal, cash, card, total`. The `id` is an 8-char UUID prefix prepended at write time. Legacy rows written before this change have only 8 columns; the GET route detects `row.length === 9` and maps accordingly, generating a synthetic `legacy-` id for older rows. **Note:** the `SalesRow` type in `types/index.ts` predates the id column and does not match the live sheet schema.

### Inventory and Stock computation

The `Inventory` tab is the single source of truth for current stock quantities.
- `GET /api/sheets/stock` returns quantities directly from this tab.
- `GET /api/sheets/dashboard` uses this tab for low-stock alerts.
- `POST /api/sheets/stock` (deductions) and `POST /api/sheets/purchases` update this tab incrementally via the `updateInventory` helper in `lib/sheets.ts`.
- `PUT /api/sheets/stock` performs absolute overrides of quantity (used by Manage Stock page).

The `Stock` tab remains as a historical log of deductions (usage), while the `Purchases` tab logs purchase history.

### Auth flow

NextAuth.js (v4) uses Google OAuth. The Google access token is stored directly in the JWT session (`session.accessToken`) and forwarded to every Google Sheets/Drive API call. Token refresh is handled manually in the JWT callback in `lib/auth.ts`. All API routes call `getServerSession(authOptions)` and extract `accessToken` from it; a missing token returns 401.

If the refresh token is missing or expired, the JWT callback sets `token.error = 'RefreshAccessTokenError'` — UIs should check `session.error` and prompt re-login.

The Telegram webhook (`app/api/telegram/`) passes `undefined` as `accessToken` to use Application Default Credentials (ADC) instead of user OAuth — it runs server-side without a user session.

The middleware (`middleware.ts`) protects all routes **except** `/api/auth/**`, `/api/telegram`, and Next.js static assets. The Telegram webhook is intentionally public.

### API routes

All under `app/api/sheets/`:
- `config` — CRUD for ingredients and menu templates (GET/POST/PUT/DELETE); POST also handles bulk upsert
- `purchases` — append purchase rows from OCR-reviewed receipts
- `sales` — full CRUD for daily sales rows (GET/POST/PUT/DELETE)
- `stock` — compute live quantities (GET) and append deduction rows (POST)
- `dashboard` — compute weekly income/expense totals and low-stock alerts
- `url` — return the Google Sheets URL for the current month

Other routes:
- `app/api/ocr/` — Gemini vision (`lib/gemini.ts`) to parse French supplier receipts into `ReceiptItem[]`
- `app/api/telegram/` — Telegram bot webhook for mobile/quick entries (`lib/telegram.ts` parses commands)

### UI pages

- `/` — dashboard (root page)
- `/receipt` — photograph and OCR a supplier receipt, review items, then save to Purchases
- `/manage-stock` — view current stock levels and record deductions
- `/manage-menus` — CRUD for menu templates and ingredients
- `/daily-sales` — record end-of-day sales by menu item, view/edit/delete history
- `/stock-deduction` — record ad-hoc stock deductions

### i18n

`hooks/useLanguage.ts` provides a `useLanguage()` hook returning `{ lang, setLang, t }`. Translations live in `i18n/th.json`, `i18n/fr.json`, `i18n/en.json`. Language preference is persisted in `localStorage`.

### Types

All shared types are in `types/index.ts`: `Ingredient`, `MenuTemplate`, `MenuIngredient`, `ReceiptItem`, `PurchaseRow`, `StockDeductionRow`, `SalesRow`, `StockQuantity`, `DashboardData`. `SalesRow` does not include the `id` field used in the live sheet.

### Testing

Tests live in `__tests__/` mirroring the source structure (`api/`, `components/`, `lib/`). Jest runs with `ts-jest`; the environment is `node` by default (not jsdom). Component tests that need DOM use `jest-environment-jsdom` via per-file docblock.

Test pattern: mock `../../lib/sheets` as a whole module with `jest.fn()`, mock `next-auth` to return a fake session, then import and call the route handler directly with a minimal `{ json: jest.fn() }` request object.
