import { getSheetTitle, buildMonthTitle } from '@/lib/sheets'

test('buildMonthTitle returns Thai month spreadsheet name', () => {
  // April 2026 = เมษายน พ.ศ. 2569 (2026 + 543)
  const title = buildMonthTitle(new Date('2026-04-11'))
  expect(title).toBe('ร้านอาหาร — เมษายน 2569')
})

test('buildMonthTitle for January 2027', () => {
  const title = buildMonthTitle(new Date('2027-01-15'))
  expect(title).toBe('ร้านอาหาร — มกราคม 2570')
})

test('getSheetTitle returns tab name', () => {
  expect(getSheetTitle('purchases')).toBe('Purchases')
  expect(getSheetTitle('stock')).toBe('Stock')
  expect(getSheetTitle('sales')).toBe('Daily Sales')
  expect(getSheetTitle('config')).toBe('Config')
  expect(getSheetTitle('summary')).toBe('Monthly Summary')
})
