# Bulk Stock Import Implementation Plan (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable restaurant owners to upload a CSV file to bulk add or update ingredients in the stock management system, following the updated design spec.

**Architecture:** 
- **Backend:** Upgrade `POST /api/sheets/config` to support a `bulk: true` flag, allowing it to process an array of ingredients and perform an atomic update of the entire Config tab.
- **Frontend:** Create a `BulkImportZone` component that reuses `UploadZone.tsx`, handles CSV parsing, validation, and previewing (showing "New", "Update", "Warning", or "Error" status) with i18n support.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Google Sheets API.

---

### Task 0: Update i18n strings

**Files:**
- Modify: `i18n/th.json`, `i18n/fr.json`, `i18n/en.json`

- [ ] **Step 1: Add bulk import strings**
Add new strings for "Bulk Import", "Download Template", "Import X ingredients", "Status", "New", "Update", "Warning", "Error", "Added", "Updated", "Skipped".

---

### Task 1: API - Add Bulk Support to Config POST

**Files:**
- Modify: `app/api/sheets/config/route.ts`
- Test: `__tests__/api/config.test.ts`

- [ ] **Step 1: Write a failing test for bulk POST**
Ensure it updates existing (by `nameTh` case-insensitive), adds new, and preserves menus.

- [ ] **Step 2: Implement bulk handling in POST**
Logic: Read Config -> Map ingredients by lowercase `nameTh` -> Process input items -> Write entire tab back.

---

### Task 2: UI - Create BulkImportZone Component

**Files:**
- Create: `components/stock/BulkImportZone.tsx`
- Test: `__tests__/components/BulkImportZone.test.tsx`

- [ ] **Step 1: Implement BulkImportZone component**
  - Reuse `UploadZone.tsx` (passing `accept=".csv"`).
  - **Template Generation:** Function to generate CSV from `ingredients` prop.
  - **Parsing:** `split('\n')` and `split(',')`.
  - **Validation:**
    - Missing `nameTh` = 🔴 Error.
    - Non-numeric `threshold` = 🔴 Error.
    - `unit` not in `UNITS` = 🟡 Warning.
  - **Preview Table:** Status column with colors.
  - **Confirmation Button:** Show count "Import X ingredients".

---

### Task 3: Integration - Add Bulk Import to Manage Stock Page

**Files:**
- Modify: `app/manage-stock/page.tsx`

- [ ] **Step 1: Integrate BulkImportZone**
Add it to the header next to the "+ Add" button. Update the refresh logic to show detailed success counts ("X added, Y updated").
