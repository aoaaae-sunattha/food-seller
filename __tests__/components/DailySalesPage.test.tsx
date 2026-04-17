/** @jest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import DailySalesPage from '@/app/daily-sales/page'

// Mock useLanguage hook
jest.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: {
      common: { save: 'Save', cancel: 'Cancel', loading: 'Loading...' },
      sales: { title: 'Daily Sales', boxes: 'boxes', pricePerBox: 'Price/box', cash: 'Cash', card: 'Card', save: 'Save' },
      manageMenus: { name: 'Name' }
    }
  })
}))

// Mock fetch
global.fetch = jest.fn() as jest.Mock

// Mock crypto.randomUUID
if (typeof crypto === 'undefined') {
  (global as any).crypto = {
    randomUUID: jest.fn().mockReturnValue('test-uuid')
  };
} else {
  (crypto as any).randomUUID = jest.fn().mockReturnValue('test-uuid');
}

const mockMenus = [
  { id: 'm1', nameTh: 'Menu 1', pricePerBox: 10 },
  { id: 'm2', nameTh: 'Menu 2', pricePerBox: 15 },
]

describe('DailySalesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset()
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/sheets/config') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ menus: mockMenus })
        })
      }
      if (url === '/api/sheets/sales') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ history: [] })
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })
  })

  test('initializes menu sales and updates box count', async () => {
    render(<DailySalesPage />)
    
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    
    expect(screen.getByText('Menu 1')).toBeInTheDocument()
    expect(screen.getByText('Menu 2')).toBeInTheDocument()

    // Find box inputs. NumberInput for 0 shows empty string.
    const boxInputs = screen.getAllByDisplayValue('') 
    
    // Menu 1 is first
    fireEvent.change(boxInputs[0], { target: { value: '5' } })
    
    // Total should be 5 * 10 = 50
    // The UI shows €50.0
    expect(screen.getByText('€50.0')).toBeInTheDocument()
  })

  test('uses unique IDs for menu sales keys', async () => {
    // This test will fail until we implement randomUUID in initialization
    const uuids = ['uuid-1', 'uuid-2'];
    (crypto.randomUUID as jest.Mock).mockReturnValueOnce(uuids[0]).mockReturnValueOnce(uuids[1]);

    render(<DailySalesPage />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    // We can't directly check keys in DOM, but we can verify that randomUUID was called
    expect(crypto.randomUUID).toHaveBeenCalledTimes(2)
  })

  test('delete button in modal is disabled if reason is empty', async () => {
    const mockHistory = [
      { id: '1', timestamp: '12:00', menu: 'Pad Thai', boxes: 2, pricePerBox: 10, total: 20, method: 'cash' }
    ];
    
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/sheets/config') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ menus: [] }) })
      }
      if (url === '/api/sheets/sales') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ history: mockHistory }) })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    render(<DailySalesPage />)
    
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    
    // Find trash button
    const allButtons = screen.getAllByRole('button')
    const trashButton = allButtons.find(b => b.className.includes('hover:text-error-red'))
    
    if (!trashButton) throw new Error('Trash button not found')
    
    fireEvent.click(trashButton)
    
    // Check if modal is open
    expect(screen.getByText(/Delete Record\?/i)).toBeInTheDocument()
    
    // Find the Delete button in modal
    const confirmDeleteButton = screen.getByRole('button', { name: /Delete/i })
    
    // Should be disabled initially (empty reason)
    expect(confirmDeleteButton).toBeDisabled()

    // Type a reason
    const reasonInput = screen.getByPlaceholderText(/e\.g\., Wrong quantity/i)
    fireEvent.change(reasonInput, { target: { value: 'Wrong entry' } })

    // Should be enabled now
    expect(confirmDeleteButton).not.toBeDisabled()

    // Clear reason
    fireEvent.change(reasonInput, { target: { value: '' } })
    expect(confirmDeleteButton).toBeDisabled()
  })
})
