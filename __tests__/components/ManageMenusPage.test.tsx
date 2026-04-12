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

const mockMenus = [
  { id: 'm1', nameTh: 'Pad Thai', pricePerBox: 12, ingredients: [] },
]
const mockIngredients = [
  { id: 'i1', nameTh: 'Noodles', unit: 'kg' },
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
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })
  })

  test('renders menu items with correct IDs and buttons', async () => {
    render(<ManageMenusPage />)
    
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    
    expect(screen.getByText('Pad Thai')).toBeInTheDocument()
    
    // Check for IDs as per requirements
    const menuItem = document.getElementById('menu-item-m1')
    expect(menuItem).toBeInTheDocument()
    
    const editBtn = document.getElementById('menu-edit-m1')
    const deleteBtn = document.getElementById('menu-delete-m1')
    
    expect(editBtn).toBeInTheDocument()
    expect(deleteBtn).toBeInTheDocument()
    expect(editBtn).toHaveTextContent('Edit')
    expect(deleteBtn).toHaveTextContent('Delete')
  })
})
