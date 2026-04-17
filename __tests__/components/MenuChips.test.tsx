/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import MenuChips from '@/components/stock/MenuChips'
import type { MenuTemplate } from '@/types'

const mockMenus: MenuTemplate[] = [
  { id: '1', nameTh: 'ผัดไทย', nameFr: 'Pad Thai', pricePerBox: 12, ingredients: [] },
  { id: '2', nameTh: 'แกงเขียวหวาน', nameFr: 'Green Curry', pricePerBox: 14, ingredients: [] },
]

test('renders menu chips', () => {
  render(<MenuChips menus={mockMenus} selected={[]} onChange={jest.fn()} t={{ stock: { other: '✦ อื่นๆ' } } as any} />)
  expect(screen.getByText('ผัดไทย')).toBeInTheDocument()
  expect(screen.getByText('✦ อื่นๆ')).toBeInTheDocument()
})

test('toggles selection on click', () => {
  const onChange = jest.fn()
  render(<MenuChips menus={mockMenus} selected={[]} onChange={onChange} t={{ stock: { other: '✦ อื่นๆ' } } as any} />)
  fireEvent.click(screen.getByText('ผัดไทย'))
  expect(onChange).toHaveBeenCalledWith(['ผัดไทย'])
})
