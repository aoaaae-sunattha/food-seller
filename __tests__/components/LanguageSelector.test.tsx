/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import LanguageSelector from '@/components/LanguageSelector'

beforeEach(() => localStorage.clear())

test('renders three flag buttons', () => {
  render(<LanguageSelector />)
  expect(screen.getByText('🇹🇭')).toBeInTheDocument()
  expect(screen.getByText('🇫🇷')).toBeInTheDocument()
  expect(screen.getByText('🇬🇧')).toBeInTheDocument()
})

test('saves selected language to localStorage', () => {
  render(<LanguageSelector />)
  fireEvent.click(screen.getByText('🇫🇷'))
  expect(localStorage.getItem('lang')).toBe('fr')
})

test('highlights active language', () => {
  localStorage.setItem('lang', 'fr')
  render(<LanguageSelector />)
  const frBtn = screen.getByText('🇫🇷').closest('button')!
  expect(frBtn).toHaveClass('ring-1')
})
