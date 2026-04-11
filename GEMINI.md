# Restaurant Manager — Project Context

## Project Overview
A tablet-optimized web application for managing a small Thai restaurant's daily operations (purchasing, stock, sales). The project leverages Google Sheets as a serverless database, providing the owner with familiar data access while maintaining a structured UI for daily tasks.

- **Primary User:** Restaurant owner (Thai speaker, operating in France).
- **Languages:** Thai (Default), French, English (Switchable UI).
- **Architecture:** Next.js 15 (App Router), TypeScript, Tailwind CSS.
- **Storage:** Google Sheets API v4 (One spreadsheet per month, auto-created).
- **Intelligence:** Gemini Vision API for OCR extraction from French receipts.
- **Authentication:** Google OAuth 2.0 (via NextAuth.js) to access the owner's Sheets/Drive.
- **Backup Interface:** Telegram Bot (node-telegram-bot-api) for quick data entry.

## Tech Stack & Dependencies
- **Frontend/Backend:** Next.js 15, React 19, TypeScript.
- **Styling:** Tailwind CSS.
- **Database:** `googleapis` (Sheets & Drive).
- **OCR:** `@google/generative-ai` (Gemini 1.5 Flash).
- **Auth:** `next-auth` (Google Provider).
- **Messaging:** `node-telegram-bot-api`.
- **Testing:** Jest, Testing Library (`jsdom`).

## Building and Running

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

### Environment Variables (.env.local)
Ensure the following keys are configured:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: For Google OAuth.
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL`: For session management.
- `GEMINI_API_KEY`: For receipt OCR.
- `TELEGRAM_BOT_TOKEN`: For Telegram Bot integration.

## Development Conventions

### 1. Test-Driven Development (TDD)
Strict adherence to TDD is required for all logic and components.
- Path: `__tests__/` mirroring the `app/`, `lib/`, or `components/` structure.
- Protocol: Write failing test → Implement minimum code to pass → Refactor.

### 2. File Organization
- `app/`: Next.js App Router pages and API routes.
- `components/`: Reusable React components, organized by feature (e.g., `receipt/`, `stock/`).
- `lib/`: Core logic (Sheets client, Gemini wrapper, Auth config).
- `hooks/`: Custom React hooks (e.g., `useLanguage`).
- `i18n/`: JSON translation files for Thai, French, and English.
- `types/`: Shared TypeScript interfaces.

### 3. Google Sheets Protocol
- Data is partitioned by month: `ร้านอาหาร — [Thai Month] [Thai Year]`.
- Month-over-month transitions: The `Config` tab (Ingredients/Menus) must be copied forward when a new month's sheet is created.
- Tabs: `Purchases`, `Stock`, `Daily Sales`, `Monthly Summary`, `Config`.

### 4. UI/UX
- **Tablet-First:** Large touch targets (min 44px), bottom navigation bar.
- **Multi-Language:** All UI strings must use the `useLanguage` hook and translations from `i18n/`.
- **Interactive Feedback:** Loading states for OCR and Sheets API calls are mandatory.

## Current Roadmap
1. **Foundation:** Project bootstrap, Types, i18n, Sheets Client, Auth. (In Progress)
2. **API Layer:** OCR (Gemini), Config, Purchases, Stock, Sales, Dashboard.
3. **Frontend:** Dashboard, Receipt Upload, Stock Deduction, Daily Sales, Management screens.
4. **Integration:** Telegram Bot webhook and final polish.

Refer to `docs/superpowers/specs/2026-04-11-restaurant-manager-design.md` for full design details and `docs/superpowers/plans/2026-04-11-restaurant-manager.md` for the step-by-step implementation tasks.
