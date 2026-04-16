# Spec: Dynamic Menu Sales Management

Enables users to remove unsold menus from their daily list, add duplicates (e.g., for giveaways with different prices), and add custom items not in the pre-configured list.

## 1. Problem Statement
The current Daily Sales page initializes with all menus from the Config tab and doesn't allow removing them or adding duplicate rows. This makes it difficult to record days where certain items weren't sold or when items are given away (price = 0) separately from regular sales.

## 2. Goals & Non-Goals
### Goals
- Allow users to remove any menu row from the daily input list.
- Allow users to add multiple rows for the same menu (duplicates).
- Allow users to add custom menu names that are not in the Config tab.
- Support different prices for each row (already supported, but now more useful for duplicates).
- Maintain the current "Save" and "History" functionality.

### Non-Goals
- Modifying the permanent Config tab (this change is for daily entry only).
- Changing the Google Sheets schema (the current schema supports arbitrary menu names).

## 3. User Experience (UI/UX)
- **Removal:** A "Trash" (🗑️) icon on each menu row in the input form.
- **Addition:** A "+ Add Item" button at the bottom of the menu list.
- **Searchable Selector:** Clicking "+ Add Item" opens a searchable dropdown/popover containing:
    - All menus from the Config tab.
    - A "Custom Name" option to enter a free-text name.
- **Touch-Friendly:** Large targets for the Trash icon and the Add button, optimized for tablet use.

## 4. Architecture & Data Flow
### Frontend State Management
- Change `menuSales` state from `MenuSale[]` to include a unique ID for each row.
- `interface MenuSaleRow { id: string; menu: string; boxes: number; pricePerBox: number; isCustom?: boolean; }`
- Use `crypto.randomUUID()` or a simple timestamp/counter for IDs.

### Initialization
- On page load, `menuSales` will still be populated with all menus from Config, but each will get a unique ID.

### Logic Changes
- **Handle Delete:** `setMenuSales(prev => prev.filter(s => s.id !== id))`.
- **Handle Add:** `setMenuSales(prev => [...prev, { id: uuid(), menu: selectedMenu, boxes: 0, pricePerBox: defaultPrice }])`.
- **Handle Change:** Update state by matching the unique row ID.

## 5. Implementation Plan (High Level)
1. **Types Update:** Update `MenuSale` interface in `page.tsx` (or move to shared types if needed).
2. **State Migration:** Update `useEffect` to assign unique IDs to the initial menu list.
3. **UI - Row Actions:** Add the Trash icon to the `menuSales.map` loop.
4. **UI - Add Component:** Create a searchable selection component (or use a simple datalist/search approach) for adding items.
5. **Logic - CRUD:** Implement `addRow` and `removeRow` functions.
6. **Validation:** Ensure the total calculations and saving logic correctly handle the new state structure.

## 6. Verification Plan
- **Automated Tests:** Add Jest tests to verify that adding/removing rows updates the total correctly.
- **Manual QA:** 
    - Verify that clicking trash removes the row.
    - Verify that adding a duplicate menu works and allows different prices.
    - Verify that adding a custom menu name works and saves correctly to the sheet.
    - Verify that saving only sends items with `boxes > 0` (current behavior).
