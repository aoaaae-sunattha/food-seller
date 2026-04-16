# Refine Menu & Ingredient Thresholds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove menu-level thresholds and add per-ingredient threshold/nameFr management within the menu editor.

**Architecture:** Update the React state in `ManageMenusPage` to handle temporary ingredient fields (`tempNameFr`, `tempThreshold`) and ensure these are persisted to the global configuration during the menu save process.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Google Sheets API.

---

### Task 1: Update Types

**Files:**
- Modify: `types/index.ts`

- [x] **Step 1: Remove threshold from MenuTemplate**
Modify `types/index.ts` to remove the `threshold` property from the `MenuTemplate` interface.

- [x] **Step 2: Commit**
```bash
git add types/index.ts
git commit -m "types: remove threshold from MenuTemplate"
```

### Task 2: Remove Menu Threshold from UI

**Files:**
- Modify: `app/manage-menus/page.tsx`

- [x] **Step 1: Remove threshold from state initialization and resets**
Update `newMenu` initialization and reset calls in `ManageMenusPage` to remove the `threshold` property.

- [x] **Step 2: Remove the threshold input field from the form**
Delete the `NumberInput` for `newMenu.threshold` and its associated label from the menu editor form.

- [x] **Step 3: Remove threshold display from the menu list**
Remove the threshold display logic (e.g., `Threshold: {menu.threshold}`) from the menu cards in the main list.

- [x] **Step 4: Commit**
```bash
git add app/manage-menus/page.tsx
git commit -m "ui: remove menu threshold field from manage menus page"
```

### Task 3: Add Ingredient Threshold & Name FR to Menu Row

**Files:**
- Modify: `app/manage-menus/page.tsx`

- [x] **Step 1: Update the ingredient row layout**
Modify the ingredient mapping in the menu editor to include an input for Name (FR) and a `NumberInput` for the ingredient's global threshold.

- [x] **Step 2: Update `handleAdd` to save ingredient threshold and nameFr**
Modify the `handleAdd` function to check for changes in `tempNameFr` and `tempThreshold` and call the PUT/POST config API accordingly to update the global ingredient setting.

- [x] **Step 3: Commit**
```bash
git add app/manage-menus/page.tsx
git commit -m "ui: add ingredient threshold and nameFr inputs to menu editor"
```

### Task 4: Update CSV Logic

**Files:**
- Modify: `app/manage-menus/page.tsx`

- [x] **Step 1: Update `downloadIngredientTemplate`**
Include a `threshold` column in the generated CSV template.

- [x] **Step 2: Update `handleIngredientCSV`**
Modify the CSV parser to read the `threshold` column and populate the temporary state for each ingredient.

- [x] **Step 3: Commit**
```bash
git add app/manage-menus/page.tsx
git commit -m "feat: update ingredient CSV import/export to include threshold"
```

### Task 5: Final Verification

**Files:**
- Create/Modify: `__tests__/components/ManageMenusPage.test.tsx`

- [x] **Step 1: Run build and lint to verify type safety**
Run `npm run build` or `tsc` to ensure the removal of `MenuTemplate.threshold` didn't break other parts of the app (like the Dashboard).

- [x] **Step 2: Manual verification of the save flow**
Verify that saving a menu correctly updates the global ingredient threshold in the "Manage Stock" view.

- [x] **Step 3: Commit**
```bash
git commit --allow-empty -m "chore: verify implementation of threshold refinement"
```
