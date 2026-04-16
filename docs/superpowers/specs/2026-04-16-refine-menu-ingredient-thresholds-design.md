# Spec: Refine Menu & Ingredient Thresholds

Refine the menu management system to focus on ingredient-level stock tracking and thresholds, removing the redundant menu-level threshold.

## 1. Problem Statement
The current system tracks stock for both prepared menus (boxes) and raw ingredients. The restaurant owner prefers to track stock primarily by raw ingredients. The existing UI for managing menus includes a "Threshold" field for the menu itself, which is confusing and unnecessary. Additionally, the ingredient management within the menu editor needs to be more comprehensive, allowing for threshold and French name updates in a single view.

## 2. Goals & Non-Goals
### Goals:
- Remove the `threshold` field from `MenuTemplate` and the menu management UI.
- Add a `threshold` field to each ingredient row in the menu editor.
- Allow updating the `nameFr` of an ingredient directly in the menu editor row.
- Update CSV import/export logic to include the ingredient threshold.
- Ensure ingredient updates (threshold, nameFr) from the menu editor are persisted globally to the `Config` tab.

### Non-Goals:
- Implementing automatic ingredient deduction (this is handled by other features).
- Changing the underlying Google Sheets schema (it already supports `menu_threshold` and `threshold` columns).

## 3. User Experience
### Menu Management Page (`/manage-menus`):
- **Menu Level:** The "Threshold" field at the top of the menu editor form is removed.
- **Ingredient Level:** Each ingredient row now displays:
  - **Name (TH):** Input/Datalist.
  - **Name (FR):** Input field.
  - **Unit:** Select dropdown.
  - **Qty:** Number input (quantity per batch).
  - **Threshold:** Number input (low-stock alert level for this ingredient).
- **Batch Updates:** When saving a menu, any changes to an ingredient's French name, unit, or threshold will be updated in the global ingredient configuration.

### Dashboard:
- The "Low Stock" alerts will no longer include menu boxes based on a menu threshold. It will focus strictly on ingredients that are below their respective thresholds.

## 4. Technical Architecture
### Data Structures (`types/index.ts`):
- Remove `threshold` from `MenuTemplate` interface.
- `MenuIngredient` interface will be extended locally in the UI to handle temporary state (`tempThreshold`, `tempNameFr`, etc.) before resolution.

### API Layer (`app/api/sheets/config/route.ts`):
- The API already handles `threshold` (for ingredients) and `menu_threshold` (stored in the same column as `threshold` for menu rows). 
- We will stop sending/storing non-zero values for `menu_threshold` when updating menus.

### CSV Logic:
- `downloadIngredientTemplate` in `ManageMenusPage` will include a `threshold` column.
- `handleIngredientCSV` will parse the `threshold` column and populate the UI state.

## 5. Verification Plan
### Automated Tests:
- Update `__tests__/components/ManageMenusPage.test.tsx` (if it exists or create it) to verify the removal of the menu threshold field and the presence of ingredient threshold fields.
- Verify CSV parsing logic with a sample file containing the `threshold` column.

### Manual Verification:
1. Open `/manage-menus`.
2. Add a new menu; confirm no "Menu Threshold" field exists.
3. Add ingredients; set thresholds for each.
4. Save the menu.
5. Check the "Manage Stock" page to confirm the ingredients' thresholds were updated globally.
6. Export an ingredient CSV and verify the `threshold` column is present.
7. Import a CSV with thresholds and confirm the UI populates correctly.
