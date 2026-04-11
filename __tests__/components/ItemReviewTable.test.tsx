/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import ItemReviewTable from '@/components/receipt/ItemReviewTable'
import type { ReceiptItem } from '@/types'

const items: ReceiptItem[] = [
  { nameFr: 'Riz jasmin', nameTh: '', qty: 5, unit: 'kg', pricePerUnit: 2, total: 10 },
]

test('renders item row', () => {
  render(<ItemReviewTable items={items} onChange={jest.fn()} />)
  expect(screen.getByDisplayValue('Riz jasmin')).toBeInTheDocument()
  expect(screen.getByDisplayValue('5')).toBeInTheDocument()
})

test('calls onChange when nameTh is edited', () => {
  const onChange = jest.fn()
  render(<ItemReviewTable items={items} onChange={onChange} />)
  const nameThInput = screen.getAllByRole('textbox')[1] // second input = nameTh
  fireEvent.change(nameThInput, { target: { value: 'ข้าว' } })
  expect(onChange).toHaveBeenCalledWith(
    expect.arrayContaining([expect.objectContaining({ nameTh: 'ข้าว' })])
  )
})
