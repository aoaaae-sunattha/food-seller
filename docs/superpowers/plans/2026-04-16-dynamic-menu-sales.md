# Dynamic Menu Sales Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable removing unsold menus, adding duplicates (for giveaways), and adding custom menu names in the Daily Sales page.

**Architecture:** Update `menuSales` state to use unique IDs for each row. Add a Trash icon for removal and a searchable popover for adding existing or custom menus.

**Tech Stack:** Next.js (React), Tailwind CSS, Lucide Icons, crypto.randomUUID.

---

### Task 1: Update State Structure and Initialization

**Files:**
- Modify: `app/daily-sales/page.tsx`
- Test: `__tests__/api/sales.test.ts` (Update mock data if needed)

- [ ] **Step 1: Update `MenuSale` interface to include `id`**

```typescript
// app/daily-sales/page.tsx
interface MenuSale {
  id: string
  menu: string
  boxes: number
  pricePerBox: number
}
```

- [ ] **Step 2: Update initialization in `useEffect` to assign random UUIDs**

```typescript
// app/daily-sales/page.tsx
useEffect(() => {
  Promise.all([
    fetch('/api/sheets/config').then(r => r.json()),
    fetch('/api/sheets/sales').then(r => r.json()).catch(() => ({ history: [] }))
  ]).then(([configData, salesData]) => {
    const menus = configData.menus ?? []
    setMenus(menus)
    // Assign IDs to initial rows
    setMenuSales(menus.map((m: MenuTemplate) => ({ 
      id: crypto.randomUUID(),
      menu: m.nameTh, 
      boxes: 0, 
      pricePerBox: m.pricePerBox 
    })))
    setHistory(salesData.history ?? [])
    setLoading(false)
  })
}, [])
```

- [ ] **Step 3: Update `handleBoxChange` and `handlePriceChange` to use `id` instead of `index`**

```typescript
const handleBoxChange = (id: string, val: number) => {
  setMenuSales(prev => prev.map(s => s.id === id ? { ...s, boxes: val } : s))
}

const handlePriceChange = (id: string, val: number) => {
  setMenuSales(prev => prev.map(s => s.id === id ? { ...s, pricePerBox: val } : s))
}
```

- [ ] **Step 4: Update the map loop in JSX to use `sale.id` as key and pass `sale.id` to handlers**

```tsx
{menuSales.map((sale) => (
  <div key={sale.id} ...>
    ...
    <NumberInput ... onChange={val => handleBoxChange(sale.id, val)} />
    ...
    <NumberInput ... onChange={val => handlePriceChange(sale.id, val)} />
  </div>
))}
```

- [ ] **Step 5: Commit**

```bash
git add app/daily-sales/page.tsx
git commit -m "refactor: use unique IDs for daily sales menu rows"
```

---

### Task 2: Implement Row Removal

**Files:**
- Modify: `app/daily-sales/page.tsx`

- [ ] **Step 1: Define `removeRow` function**

```typescript
const removeRow = (id: string) => {
  setMenuSales(prev => prev.filter(s => s.id !== id))
}
```

- [ ] **Step 2: Add Trash icon to the row UI**

```tsx
// Inside menuSales.map
<div className="flex-1 font-bold text-slate-deep text-xl">{sale.menu}</div>
<div className="flex items-center gap-8">
   ...
   <button 
     onClick={() => removeRow(sale.id)}
     className="p-2 text-slate-300 hover:text-error-red transition-colors"
     title="Remove from today's list"
   >
     <Trash2 size={20} />
   </button>
</div>
```

- [ ] **Step 3: Verify removal works manually**

Expected: Clicking trash removes the card from the list. Estimated revenue updates.

- [ ] **Step 4: Commit**

```bash
git add app/daily-sales/page.tsx
git commit -m "feat: allow removing menu rows from daily sales"
```

---

### Task 3: Implement "Add Item" Component (Searchable List)

**Files:**
- Modify: `app/daily-sales/page.tsx`
- Create: `components/sales/AddMenuPopover.tsx` (optional, or implement inline for simplicity)

- [ ] **Step 1: Create a basic searchable popover for selecting menus**

Implement a state-driven search list below the menu cards.

```typescript
// Define addRow function
const addRow = (menuName: string, price: number) => {
  setMenuSales(prev => [...prev, {
    id: crypto.randomUUID(),
    menu: menuName,
    boxes: 0,
    pricePerBox: price
  }])
}
```

- [ ] **Step 2: Add UI for searching and selecting**

```tsx
// Below the menuSales.map loop
<div className="relative">
  <button 
    className="w-full py-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-cinnabar hover:text-cinnabar transition-all flex items-center justify-center gap-2"
    onClick={() => setShowAddMenu(!showAddMenu)}
  >
    <Plus size={24} /> Add Menu or Custom Entry
  </button>
  
  {showAddMenu && (
    <div className="absolute top-full left-0 w-full mt-2 bg-white shadow-2xl rounded-2xl border border-slate-100 z-50 p-4 animate-in fade-in slide-in-from-top-2">
      <input 
        autoFocus
        className="w-full h-12 bg-mist-gray rounded-xl px-4 outline-none focus:ring-2 focus:ring-cinnabar/20 font-bold"
        placeholder="Search menus or type custom name..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
      <div className="mt-4 max-h-60 overflow-y-auto space-y-1">
        {filteredMenus.map(m => (
          <button 
            key={m.id}
            onClick={() => { addRow(m.nameTh, m.pricePerBox); setShowAddMenu(false); setSearchTerm(''); }}
            className="w-full text-left p-3 hover:bg-mist-gray rounded-lg font-bold text-slate-deep flex justify-between"
          >
            <span>{m.nameTh}</span>
            <span className="text-slate-400">€{m.pricePerBox}</span>
          </button>
        ))}
        {searchTerm && !filteredMenus.some(m => m.nameTh === searchTerm) && (
          <button 
            onClick={() => { addRow(searchTerm, 12.0); setShowAddMenu(false); setSearchTerm(''); }}
            className="w-full text-left p-3 hover:bg-cinnabar/10 text-cinnabar rounded-lg font-bold flex items-center gap-2"
          >
            <Plus size={18} /> Add Custom: "{searchTerm}"
          </button>
        )}
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 3: Commit**

```bash
git add app/daily-sales/page.tsx
git commit -m "feat: add searchable menu selection for daily sales"
```

---

### Task 4: Final Verification and UI Polish

**Files:**
- Modify: `app/daily-sales/page.tsx`

- [ ] **Step 1: Ensure duplicates work correctly**

Expected: Selecting "Pad Thai" twice creates two rows with different IDs. Changing price in one doesn't affect the other.

- [ ] **Step 2: Verify "Save" still works**

Expected: `handleSave` filters `menuSales` for `boxes > 0`. Since names are preserved, the API should handle them correctly.

- [ ] **Step 3: Commit**

```bash
git add app/daily-sales/page.tsx
git commit -m "feat: complete dynamic menu sales with duplication support"
```
