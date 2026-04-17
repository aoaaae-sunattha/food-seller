/** @jest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import ManageMenusPage from '@/app/manage-menus/page'
import React from 'react'

// Mock useLanguage hook
jest.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: {
      common: { cancel: 'Cancel', add: 'Add', save: 'Save', loading: 'Loading...', error: 'Error' },
      manageMenus: { 
        title: 'Manage Menus', 
        add: 'Add Menu', 
        nameTh: 'Thai Name', 
        nameFr: 'French Name', 
        price: 'Price (€)', 
        ingredients: 'Ingredients',
        loadCsv: 'Load CSV',
        loadCsvTemplate: 'Load CSV Template'
      },
      stock: { addIngredient: '+ Add Ingredient' },
      manageStock: { add: 'Add' }
    }
  })
}))

// Mock fetch
global.fetch = jest.fn() as jest.Mock

const mockIngredients = [
  { id: 'i1', nameTh: 'กระเทียม', nameFr: 'Ail', unit: 'tbsp', threshold: 1 },
]

describe('ManageMenusPage CSV Logic', () => {
  const originalCreateObjectURL = global.URL.createObjectURL
  const originalRevokeObjectURL = global.URL.revokeObjectURL
  const originalCreateElement = document.createElement

  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset()
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/sheets/config') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ menus: [], ingredients: mockIngredients })
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })
    
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
    global.URL.revokeObjectURL = jest.fn()
  })

  afterEach(() => {
    global.URL.createObjectURL = originalCreateObjectURL
    global.URL.revokeObjectURL = originalRevokeObjectURL
    document.createElement = originalCreateElement
  })

  test('handleIngredientCSV parses threshold column correctly', async () => {
    render(<ManageMenusPage />)
    
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    
    // Open the Add Menu form
    const addBtn = document.getElementById('manage-menus-add-toggle')
    fireEvent.click(addBtn!)
    
    // Find the file input
    const csvInput = screen.getByTestId('menu-csv-input') as HTMLInputElement
    
    // Simulate file content: nameTh,nameFr,unit,qty,threshold
    const csvContent = 'nameTh,nameFr,unit,qty,threshold\nพริกขี้หนู,Piment,pcs,10,5\nตะไคร้,Citronnelle,kg,2,\n'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    
    // We need to mock FileReader because JSDOM's FileReader might be picky
    const mockReader = {
      readAsText: jest.fn(function(this: any, blob: Blob) {
        // Simulate successful read
        this.onload({ target: { result: csvContent } })
      }),
      onload: null as any
    }
    window.FileReader = jest.fn(() => mockReader) as any

    fireEvent.change(csvInput, {
      target: { files: [file] }
    })
    
    // Wait for the rows to appear in the UI
    await waitFor(() => {
      expect(screen.getByDisplayValue('พริกขี้หนู')).toBeInTheDocument()
      expect(screen.getByDisplayValue('ตะไคร้')).toBeInTheDocument()
    })
    
    // Check threshold values
    // พริกขี้หนู has threshold 5
    expect(screen.getByDisplayValue('5')).toBeInTheDocument()
    // ตะไคร้ has empty threshold, should default to 1
    // We expect 5 and 1 to be in the document
    expect(screen.getByDisplayValue('5')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1')).toBeInTheDocument()
  })

  test('downloadIngredientTemplate includes threshold column', async () => {
    // We only mock createElement when we need it
    const link = {
      click: jest.fn(),
      style: {},
      href: '',
      download: '',
    }
    const spy = jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return link as any
      return originalCreateElement.call(document, tag)
    })
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => ({} as any))
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => ({} as any))

    render(<ManageMenusPage />)
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument())
    
    fireEvent.click(document.getElementById('manage-menus-add-toggle')!)
    
    const downloadBtn = screen.getByText('Load CSV Template')
    fireEvent.click(downloadBtn)
    
    expect(link.download).toMatch(/ingredients_.*\.csv/)
    expect(global.URL.createObjectURL).toHaveBeenCalled()
    
    spy.mockRestore()
  })
})
