# Design Spec: Bulk Stock Import via CSV

Enable restaurant owners to quickly add or update multiple ingredients in the stock management system by uploading a CSV file.

## 1. Problem Statement

Manual entry of ingredients one-by-one is tedious for initial setup or large menu updates. Owners often have lists in Excel/Sheets that they want to sync directly.

## 2. User Experience (UX)

### Entry Points
- **Bulk Import Button:** A clearly labeled button added to the header of the `Manage Stock` page. Label uses `useLanguage` / `i18n` like all other UI strings.
- **Download Template Link:** A "Download CSV Template" link below the button. The template is **generated from current Config data** (pre-populated with existing ingredients) so owners can also use it for bulk threshold/unit updates — not just initial setup. For an empty list, it falls back to example rows.

### Upload Flow

1. **Toggle Mode:** Clicking "Bulk Import" reveals the upload zone. A visible **Cancel / ✕** control closes it and resets all state back to the normal view.
2. **Select or Drop File:** Use the existing `UploadZone` component (`components/receipt/UploadZone.tsx`) for drag-and-drop + file picker support. Accepts `.csv` only.
3. **Parse & Preview:**
   - The file is parsed in the browser immediately after selection.
   - A table displays all rows found in the CSV with a status column:
     - 🟢 **New:** `nameTh` does not exist in the current list — will be added.
     - 🟠 **Update:** `nameTh` already exists — existing row will be overwritten.
     - 🟡 **Warning:** `unit` not in the standard `UNITS` list — will be saved as-is. Does **not** block the row.
     - 🔴 **Error:** Missing `nameTh`, or `threshold` is non-numeric and non-empty. Row will be **skipped**.
   - Error rows are highlighted but do **not** block valid rows from being imported.
4. **Confirm & Save:**
   - Button label shows the exact valid row count: **"Import 47 ingredients"**. Disabled if there are zero valid rows.
   - While the API call is in flight: button is disabled and shows a loading spinner. Prevents double-submission.
5. **Result:**
   - Success: **"5 added, 3 updated"** (not just a total count).
   - Partial: **"5 added, 3 updated — 2 rows skipped (see errors above)"**.
   - Failure: show error message; no partial write occurs (see §4).

### Template Format

- **Headers:** `nameTh,nameFr,unit,threshold`
- `nameFr` is **optional** — leave blank if the ingredient has no French name.
- `threshold` is **optional** — defaults to `1` if blank. The template header row includes a comment row explaining this.
- **Example:**
  ```csv
  nameTh,nameFr,unit,threshold
  กระเทียม,Ail,kg,5
  พริกขี้หนู,Piment,kg,2
  น้ำมันพืช,,L,3
  ```

## 3. Technical Architecture

### Frontend

- **Component:** New `BulkImportZone` component in `components/stock/`.
- **Upload UI:** Reuse `components/receipt/UploadZone.tsx` for drag-and-drop + file picking.
- **Parsing:** Native JS `split('\n')` / `split(',')` is sufficient for this simple schema. No new dependency needed.
- **Validation:**
  - `nameTh` present → required. Missing = 🔴 Error.
  - `threshold` numeric or blank → blank defaults to `1`. Non-numeric = 🔴 Error.
  - `unit` in `UNITS` list → case-insensitive check. Not in list = 🟡 Warning (not blocked).
  - `nameFr` → always optional.
- **Matching Logic:** Compare CSV `nameTh` (trimmed, lowercased) against the `ingredients` state from `/api/sheets/config`.
- **Template generation:** `GET /api/sheets/config` → map existing ingredients to CSV rows → trigger browser download.
- **i18n:** All labels, status text, button copy, and messages go through `useLanguage` / `i18n/*.json`.

### Backend (API)

- **Route:** `POST /api/sheets/config`
- **New mode:** `bulk: true` flag in the request body alongside an `items: Ingredient[]` array.
- **Single-pass write (efficient & atomic):**
  1. Read the full `config` tab once.
  2. Iterate through incoming `items`: update in-memory if `nameTh` matches, otherwise generate a new ID and append in-memory.
  3. Write the entire updated Config tab back in a **single `updateTab` call**.

## 4. Data Safety & Error Handling

- **Duplicate prevention:** Matching on `nameTh` — case-insensitive, trimmed — on both frontend (preview) and backend (write).
- **Error rows excluded server-side:** The frontend sends only valid rows. The backend performs its own validation and rejects any row missing `nameTh` as a safeguard.
- **Atomic write:** The entire Config tab is written in one API call. If the call fails, no changes are applied — the existing data is untouched.
- **Feedback:** Success message always distinguishes added vs. updated counts. Skipped rows are reported separately.

## 5. Success Criteria

- User can download a working template (pre-populated with current data when available).
- User can upload a CSV with 50+ rows and have it processed in < 3 seconds.
- Existing ingredients are correctly updated without creating duplicates.
- Error rows are clearly identified and skipped without blocking valid rows.
- The import button reflects the exact number of valid rows before the user commits.
- All UI text is translated via the `useLanguage` hook.
