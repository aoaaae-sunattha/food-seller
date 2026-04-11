# Restaurant Manager — Design Spec
**Date:** 2026-04-11  
**Project:** Small Thai restaurant management system (based in France)  
**Client:** Single owner, Thai operator, restaurant in France

---

## Overview

A tablet-optimized web app to manage a small Thai restaurant's daily operations: purchasing ingredients (via receipt scanning), stock management, daily sales recording, and end-of-day settlement. All data is stored in Google Sheets (one spreadsheet per month).

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend + API | Next.js (App Router) |
| Hosting | Vercel |
| Storage | Google Sheets API v4 |
| OCR | Gemini Vision API (Google) |
| Auth | Google OAuth (single owner) |
| Backup interface | LINE Bot |

---

## Users

- **Single owner** — Thai national, restaurant in France, uses a tablet daily
- **Language preference** — UI in Thai (default), switchable to French or English
- **No staff logins** — one Google account, one login

---

## UI Languages

Three languages switchable on every page via a flag selector. Preference saved to localStorage.

- 🇹🇭 ภาษาไทย (default)
- 🇫🇷 Français
- 🇬🇧 English

---

## Screens (6)

### 1. Dashboard
- Weekly income total (€)
- Weekly ingredient expenses (€)
- Low stock alerts (yellow = near threshold, red = below threshold)
- Quick navigation buttons to all other screens

### 2. Upload Receipt
- Camera/file upload for receipt photo (French receipts, Latin text)
- Gemini Vision API extracts: item name (French), quantity, unit, price per unit, line total
- User reviews and edits extracted items before confirming
- On confirm: appends rows to **Purchases** tab + updates quantity in **Stock** tab
- One receipt = one shopping trip

### 3. Stock Deduction
- Step 1: Select today's menus from pill chips (multi-select). "✦ อื่นๆ (Other)" chip always available.
- Step 2: Ingredients pre-fill in **separate sections per menu** (collapsible), sourced from that menu's template
- Each ingredient row: name, current stock remaining, amount used, unit, reason dropdown
- Reason options: ใช้ทำอาหาร (cooking) / แตก/เสียหาย (broken/damaged) / เสีย (expired) / สูญหาย (lost)
- Each menu section has a "+ add ingredient" button for one-off additions
- "อื่นๆ" section: fully free-form — user picks ingredient from dropdown, no template
- On save: appends rows to **Stock** tab with menu name tagged per row

### 4. Daily Sales
- For each active menu: enter number of boxes sold + price per box (pre-filled from menu config, editable)
- Cash total and credit card total fields
- On save: appends to **Daily Sales** tab

### 5. Manage Stock Items
- List of all ingredients with current quantity (computed: sum of receipt additions minus sum of stock deductions), unit, low-stock alert threshold
- Add new ingredient: name, unit, threshold
- Edit existing: rename, change unit or threshold
- Delete ingredient (with confirmation)
- Master list stored in a dedicated **Config** tab in Google Sheets

### 6. Manage Menus
- List of menus (e.g. ผัดไทย, แกงเขียวหวาน, โรล)
- Add/edit/delete menus
- Each menu has an ingredient template list: ingredient + default quantity per pot/batch
- Each menu has a selling price per box (€) — used to pre-fill Daily Sales
- Ingredient template add/remove per menu
- Menu config stored in **Config** tab in Google Sheets

---

## Google Sheets Structure

**One spreadsheet per calendar month** (e.g. "ร้านอาหาร — เมษายน 2569").  
The app auto-creates the new month's spreadsheet on first use of each month, copying the Config tab forward from the previous month. Each spreadsheet has 5 tabs:

| Tab | Columns | Purpose |
|---|---|---|
| **Purchases** | date, store, item_fr, item_th, qty, unit, price, total | Expense tracking from receipts |
| **Stock** | date, ingredient, amount_used, unit, reason, menu | All stock deductions (cooking + loss) |
| **Daily Sales** | date, menu, boxes, price_per_box, subtotal, cash, card, total | End-of-day sales recording |
| **Monthly Summary** | — | Auto-calculated: total income, total expenses, total loss, net |
| **Config** | — | Master ingredient list + menu templates (copied forward each month) |

---

## Data Flow

```
Receipt photo
  → Gemini Vision API
  → Extracted items (FR name, qty, price)
  → User confirms
  → Purchases tab (expense row)
  → Stock tab (qty added to ingredient)

Menu selection + amounts
  → Stock Deduction form
  → Stock tab (qty deducted, reason, menu tagged)

Boxes sold + cash/card
  → Daily Sales tab

All tabs → Monthly Summary (auto formulas)
```

---

## LINE Bot (Backup)

For quick actions when tablet is unavailable:
- Send receipt photo → same OCR flow
- Text "ตัดสต็อก ข้าว 500g" → quick stock deduction
- Text "ยอดขาย ผัดไทย 15 กล่อง" → quick sales entry

LINE Bot uses the same Next.js API routes as the web app.

---

## Auth

- Google OAuth 2.0 — owner signs in with her Google account
- App requests Google Sheets read/write scope
- No separate user database needed
- Session managed by NextAuth.js

---

## Out of Scope (v1)

- Recipe-based automatic cost-per-dish calculation
- Multi-user / staff accounts
- Inventory reorder suggestions
- Barcode scanning
- Printer integration

---

## Open Questions (resolved)

| Question | Decision |
|---|---|
| Platform | Web app (tablet), LINE Bot backup |
| Storage | Google Sheets |
| Receipt language | French (Latin text) |
| UI language | Thai default, FR/EN switchable |
| Sheets structure | 1 spreadsheet per month |
| Framework | Next.js on Vercel |
| Device | Tablet-first |
