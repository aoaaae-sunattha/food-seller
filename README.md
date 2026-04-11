# Restaurant Manager

A tablet-optimized web application for managing Thai restaurant operations.

## Features
- **Dashboard:** Weekly income and expense tracking with low-stock alerts.
- **Receipt Scanning:** OCR powered by Gemini Vision API to extract items from French receipts.
- **Stock Management:** Record deductions for cooking, damage, or loss.
- **Daily Sales:** Log end-of-day sales with cash/card breakdown.
- **Master Data:** Manage ingredients and menu templates with default recipes.
- **Backup Interface:** Telegram Bot for quick text-based entries and mobile receipt scanning.

## Tech Stack
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS.
- **Database:** Google Sheets API v4.
- **Intelligence:** Gemini 1.5 Flash.
- **Auth:** NextAuth.js (Google OAuth).
- **Messaging:** Telegram Bot API.

## Setup

1. **Clone & Install:**
   ```bash
   git clone <repo-url>
   npm install
   ```

2. **Environment Variables:**
   Create a `.env.local` file based on `.env.local.example`:
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: From Google Cloud Console.
   - `NEXTAUTH_SECRET`: Random string for sessions.
   - `GEMINI_API_KEY`: From Google AI Studio.
   - `TELEGRAM_BOT_TOKEN`: Token from BotFather for Telegram integration.

3. **Google API Scopes:**
   Ensure the following scopes are enabled in your Google Cloud Project:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/drive`

4. **Run:**
   ```bash
   npm run dev
   ```

## Development
- **Tests:** `npm test`
- **Build:** `npm run build`
