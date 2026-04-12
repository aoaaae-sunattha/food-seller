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

## Architecture

Tablet-optimized restaurant manager for a Thai restaurant in France. The "database" is Google Sheets — every calendar month gets its own spreadsheet named `ร้านอาหาร — <Thai month> <Buddhist year>`. There is no SQL database; all persistence goes through `lib/sheets.ts`.

### Data layer (`lib/sheets.ts`)

Four exported functions cover all data access:
- `getOrCreateMonthSheet(accessToken?, date?)` — finds or creates the month's spreadsheet; on first creation copies the Config tab from the previous month
- `appendRows(accessToken, tab, rows)` — appends rows to a named tab
- `readRows(accessToken, tab)` — returns all data rows (excludes header) from a tab
- `updateTab(accessToken, tab, header, rows)` — full overwrite of a tab

`TabKey` values: `'purchases' | 'stock' | 'sales' | 'config' | 'summary'`

### Config tab schema

The Config tab stores two entity types in the same sheet, distinguished by column 0:

| col 0 | col 1 | col 2 | col 3 | col 4 | col 5 |
|-------|-------|-------|-------|-------|-------|
| `ingredient` | id (8-char UUID) | nameTh | nameFr | unit | threshold |
| `menu` | id | nameTh | pricePerBox (€) | `ingredientId:qty,...` CSV | _(empty)_ |

The `parseConfig()` function in `app/api/sheets/config/route.ts` is the canonical parser.

### Auth flow

NextAuth.js uses Google OAuth. The Google access token is stored directly in the JWT session (`session.accessToken`) and forwarded to every Google Sheets/Drive API call. Token refresh is handled manually in `lib/auth.ts`. All API routes call `getServerSession(authOptions)` and extract `accessToken` from it; a missing token returns 401.

The middleware (`middleware.ts`) protects all routes **except** `/api/auth/**`, `/api/telegram`, and Next.js static assets. The Telegram webhook is intentionally public.

### API routes

All under `app/api/sheets/`:
- `config` — CRUD for ingredients and menu templates (GET/POST/PUT/DELETE)
- `purchases` — append purchase rows from OCR-reviewed receipts
- `sales` — append daily sales rows
- `stock` — append stock deduction rows
- `dashboard` — compute weekly income/expense totals and low-stock alerts
- `url` — return the Google Sheets URL for the current month

Other routes:
- `app/api/ocr/` — Gemini 1.5 Flash vision to parse French supplier receipts into `ReceiptItem[]`
- `app/api/telegram/` — Telegram bot webhook for mobile/quick entries

### i18n

`hooks/useLanguage.ts` provides a `useLanguage()` hook returning `{ lang, setLang, t }`. Translations live in `i18n/th.json`, `i18n/fr.json`, `i18n/en.json`. Language preference is persisted in `localStorage`.

### Types

All shared types are in `types/index.ts`: `Ingredient`, `MenuTemplate`, `MenuIngredient`, `ReceiptItem`, `PurchaseRow`, `StockDeductionRow`, `SalesRow`, `StockQuantity`, `DashboardData`.

### Testing

Tests live in `__tests__/` mirroring the source structure (`api/`, `components/`, `lib/`). Jest runs with `ts-jest`; the environment is `node` by default (not jsdom). Components tests that need DOM use `jest-environment-jsdom` via per-file docblock.
