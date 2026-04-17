import { test, expect } from '@playwright/test'

test.describe('Smoke — Navigation', () => {
  test('dashboard loads and nav links are present', async ({ page }) => {
    await page.goto('/')

    // Nav links are identified by aria-label set in NavBar.tsx
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /receipt/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /daily.?sales/i })).toBeVisible()
  })
})

test.describe('Smoke — Daily Sales', () => {
  test('daily-sales page renders menu sale rows after load', async ({ page }) => {
    await page.goto('/daily-sales')

    // Wait for loading spinner to disappear
    await expect(page.getByText(/loading/i)).not.toBeVisible({ timeout: 10000 })

    // At least one sale row should exist (populated from menus config)
    const firstRow = page.locator('[data-testid^="sale-row-"]').first()
    await expect(firstRow).toBeVisible()
  })
})

test.describe('Smoke — Receipt', () => {
  test('receipt page renders OCR confirmation inputs', async ({ page }) => {
    await page.goto('/receipt')

    // These inputs are present once a file is uploaded; check they exist in DOM
    await expect(page.locator('[data-testid="ocr-date"]')).toBeAttached()
    await expect(page.locator('[data-testid="ocr-total"]')).toBeAttached()
    await expect(page.locator('[data-testid="ocr-store"]')).toBeAttached()
  })
})
