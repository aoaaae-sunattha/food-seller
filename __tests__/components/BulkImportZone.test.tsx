/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import BulkImportZone from '@/components/stock/BulkImportZone'
import type { Ingredient } from '@/types'

// Mock useLanguage
jest.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    t: {
      bulkImport: {
        title: 'Bulk Import',
        downloadTemplate: 'Download CSV Template',
        importCount: 'Import {{count}} ingredients',
        status: 'Status',
        new: 'New',
        update: 'Update',
        warning: 'Warning',
        error: 'Error',
        added: 'Added',
        updated: 'Updated',
        skipped: 'Skipped',
        close: 'Close'
      },
      manageStock: {
        name: 'Name',
        unit: 'Unit',
        threshold: 'Alert when ≤'
      },
      common: {
        cancel: 'Cancel',
        loading: 'Loading...'
      }
    }
  })
}))

const mockIngredients: Ingredient[] = [
  { id: '1', nameTh: 'ข้าว', nameFr: 'Riz', unit: 'kg', threshold: 5 }
]

describe('BulkImportZone', () => {
  test('renders toggle button initially', () => {
    render(<BulkImportZone ingredients={mockIngredients} onImportComplete={jest.fn()} />)
    expect(screen.getByText(/Bulk Import/)).toBeInTheDocument()
    expect(screen.getByText(/Download CSV Template/)).toBeInTheDocument()
  })

  test('opens upload zone when clicked', () => {
    render(<BulkImportZone ingredients={mockIngredients} onImportComplete={jest.fn()} />)
    fireEvent.click(screen.getByText(/Bulk Import/))
    expect(screen.getByText(/Cancel/)).toBeInTheDocument()
    expect(screen.getByText(/Click or drag CSV file here/i)).toBeInTheDocument()
  })

  test('parses CSV and shows preview table', async () => {
    render(<BulkImportZone ingredients={mockIngredients} onImportComplete={jest.fn()} />)
    fireEvent.click(screen.getByText(/Bulk Import/))
    
    const csvContent = [
      'nameTh,nameFr,unit,threshold',
      'ข้าว,Riz Jasmin,kg,10',
      'กระเทียม,Ail,kg,1',
      'พริก,,box,2',
      'เกลือ,Sel,invalid,1',
      ',Missing Name,kg,1',
      'น้ำตาล,Sucre,kg,abc'
    ].join('\n')
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })

    // Mock FileReader
    const readAsTextMock = jest.fn()
    const FileReaderMock = jest.fn().mockImplementation(() => ({
      readAsText: readAsTextMock,
      onload: null,
    }))
    window.FileReader = FileReaderMock as any

    const input = screen.getByTestId('bulk-file-input')
    fireEvent.change(input, { target: { files: [file] } })

    // Manually trigger onload wrapped in act
    const readerInstance = FileReaderMock.mock.results[0].value
    await act(async () => {
      readerInstance.onload({ target: { result: csvContent } })
    })

    await waitFor(() => {
      expect(screen.getByText('ข้าว')).toBeInTheDocument()
      expect(screen.getByText('กระเทียม')).toBeInTheDocument()
      expect(screen.getByText('Update')).toBeInTheDocument()
      expect(screen.getAllByText('New').length).toBeGreaterThan(0)
      expect(screen.getByText('Warning')).toBeInTheDocument()
      expect(screen.getAllByText('Error').length).toBeGreaterThan(0)
    })

    // Valid count should be 4 (ข้าว, กระเทียม, พริก, เกลือ)
    expect(screen.getByText('Import 4 ingredients')).toBeInTheDocument()
  })
})
