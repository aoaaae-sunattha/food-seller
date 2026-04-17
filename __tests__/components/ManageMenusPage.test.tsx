/** @jest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ManageMenusPage from '@/app/manage-menus/page'

// Mock useLanguage hook
jest.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: {
      common: { cancel: 'Cancel', add: 'Add', save: 'Save', loading: 'Loading...', error: 'Error' },
      manageMenus: { title: 'Manage Menus', add: 'Add Menu', name: 'Name (Thai)', price: 'Price (€)', ingredients: 'Ingredients' },
      stock: { addIngredient: '+ Add Ingredient' },
      manageStock: { add: 'Add' }
    }
  })
}))

// Mock fetch
global.fetch = jest.fn() as jest.Mock

// Mock FileReader for CSV tests
class MockFileReader {
  onload: ((ev: any) => void) | null = null;
  readAsText(blob: Blob) {
    // We'll manually trigger onload in tests
  }
}
(global as any).FileReader = MockFileReader

const mockMenus = [
  { id: 'm1', nameTh: 'Pad Thai', pricePerBox: 12, ingredients: [] },
]
const mockIngredients = [
  { id: 'i1', nameTh: 'Noodles', unit: 'kg', threshold: 10 },
]

describe('ManageMenusPage', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset()
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/sheets/config') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ menus: mockMenus, ingredients: mockIngredients })
        })
      }
      if (url === '/api/sheets/stock') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ quantities: { 'Pad Thai': 5 } })
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })
  })

  test('renders menu items with correct IDs and buttons', async () => {
    render(<ManageMenusPage />)
    
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    
    expect(screen.getByText('Pad Thai')).toBeInTheDocument()
    
    // Check for data-testid as per requirements
    const menuItem = document.querySelector('[data-testid="menu-item-m1"]')
    expect(menuItem).toBeInTheDocument()

    const editBtn = document.querySelector('[data-testid="menu-edit-m1"]')
    const deleteBtn = document.querySelector('[data-testid="menu-delete-m1"]')

    expect(editBtn).toBeInTheDocument()
    expect(deleteBtn).toBeInTheDocument()
  })

  test('handles CSV import with threshold', async () => {
    render(<ManageMenusPage />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())

    // Open add menu form
    fireEvent.click(screen.getByText('+ Add Menu'))

    const file = new File(['nameTh,nameFr,unit,qty,threshold\nShrimp,Crevette,kg,2,5'], 'ingredients.csv', { type: 'text/csv' })
    const input = screen.getByTestId('menu-csv-input')

    // Mock the reader instance that the component creates
    let capturedOnload: any
    const readAsTextMock = jest.spyOn(MockFileReader.prototype, 'readAsText').mockImplementation(function(this: any) {
      capturedOnload = this.onload
    })

    fireEvent.change(input, { target: { files: [file] } })
    
    expect(readAsTextMock).toHaveBeenCalled()
    
    // Trigger the onload manually with mock CSV data
    capturedOnload({ target: { result: 'nameTh,nameFr,unit,qty,threshold\nShrimp,Crevette,kg,2,5' } })

    // Verify ingredient was added to the list with correct threshold
    await waitFor(() => {
      expect(screen.getByDisplayValue('Shrimp')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Crevette')).toBeInTheDocument()
      expect(screen.getByDisplayValue('5')).toBeInTheDocument()
    })
  })
})
