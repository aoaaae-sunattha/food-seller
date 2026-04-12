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
        dropzone: 'Click or drag CSV file here',
        importCount: 'Import {{count}} ingredients',
        warningNote: '{{count}} items have non-standard units and will be imported as-is',
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
        loading: 'Loading...',
        error: 'An error occurred'
      }
    }
  })
}))

const mockIngredients: Ingredient[] = [
  { id: '1', nameTh: 'ข้าว', nameFr: 'Riz', unit: 'kg', threshold: 5 }
]

// Helper: open the zone and load a CSV via mocked FileReader
async function loadCSV(csvContent: string) {
  fireEvent.click(screen.getByText(/Bulk Import/))

  const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
  const readAsTextMock = jest.fn()
  const FileReaderMock = jest.fn().mockImplementation(() => ({
    readAsText: readAsTextMock,
    onload: null,
  }))
  window.FileReader = FileReaderMock as any

  const input = screen.getByTestId('bulk-file-input')
  fireEvent.change(input, { target: { files: [file] } })

  const readerInstance = FileReaderMock.mock.results[0].value
  await act(async () => {
    readerInstance.onload({ target: { result: csvContent } })
  })
}

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

    const csvContent = [
      'nameTh,nameFr,unit,threshold',
      'ข้าว,Riz Jasmin,kg,10',       // update (exists)
      'กระเทียม,Ail,kg,1',            // new
      'พริก,,box,2',                  // new
      'เกลือ,Sel,invalid,1',          // warning (non-standard unit)
      'น้ำตาล,Sucre,kg,abc',          // new — invalid threshold is now allowed (defaults to 1)
      ',Missing Name,kg,1'            // error (no Thai name)
    ].join('\n')

    await loadCSV(csvContent)

    await waitFor(() => {
      expect(screen.getByText('ข้าว')).toBeInTheDocument()
      expect(screen.getByText('กระเทียม')).toBeInTheDocument()
      expect(screen.getByText('Update')).toBeInTheDocument()
      expect(screen.getAllByText('New').length).toBeGreaterThan(0)
      expect(screen.getByText('Warning')).toBeInTheDocument()
      expect(screen.getAllByText('Error').length).toBeGreaterThan(0)
    })

    // Valid count: 5 (ข้าว, กระเทียม, พริก, เกลือ, น้ำตาล) — bad threshold no longer blocks
    expect(screen.getByText('Import 5 ingredients')).toBeInTheDocument()
    // Warning note should appear for เกลือ (invalid unit)
    expect(screen.getByText(/1 items have non-standard units/)).toBeInTheDocument()
  })

  test('parses CSV with quoted fields containing commas', async () => {
    render(<BulkImportZone ingredients={[]} onImportComplete={jest.fn()} />)

    const csvContent = [
      'nameTh,nameFr,unit,threshold',
      'กระเทียม,"Ail, rose de Lautrec",kg,1',
    ].join('\n')

    await loadCSV(csvContent)

    await waitFor(() => {
      expect(screen.getByText('กระเทียม')).toBeInTheDocument()
      expect(screen.getByText('Ail, rose de Lautrec')).toBeInTheDocument()
    })
    expect(screen.getByText('Import 1 ingredients')).toBeInTheDocument()
  })

  test('strips UTF-8 BOM from file content', async () => {
    render(<BulkImportZone ingredients={[]} onImportComplete={jest.fn()} />)

    // BOM prefix (\uFEFF) before the header
    const csvContent = '\uFEFFnameTh,nameFr,unit,threshold\nกระเทียม,Ail,kg,1\n'

    await loadCSV(csvContent)

    await waitFor(() => {
      expect(screen.getByText('กระเทียม')).toBeInTheDocument()
    })
    // Should parse 1 valid item, not treat BOM line as a data row
    expect(screen.getByText('Import 1 ingredients')).toBeInTheDocument()
  })

  test('calls onImportComplete with correct counts after successful import', async () => {
    const onImportComplete = jest.fn()
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ added: 1, updated: 1 })
    }) as any

    render(<BulkImportZone ingredients={mockIngredients} onImportComplete={onImportComplete} />)

    const csvContent = [
      'nameTh,nameFr,unit,threshold',
      'ข้าว,Riz Jasmin,kg,10',   // update
      'กระเทียม,Ail,kg,1',         // new
      ',Bad row,kg,1',             // skipped (invalid)
    ].join('\n')

    await loadCSV(csvContent)

    await waitFor(() => screen.getByText('Import 2 ingredients'))

    await act(async () => {
      fireEvent.click(screen.getByText('Import 2 ingredients'))
    })

    await waitFor(() => {
      expect(onImportComplete).toHaveBeenCalledWith(1, 1, 1)
    })
  })

  test('shows alert on import API error', async () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: 'Server error' })
    }) as any

    render(<BulkImportZone ingredients={[]} onImportComplete={jest.fn()} />)

    const csvContent = 'nameTh,nameFr,unit,threshold\nกระเทียม,Ail,kg,1\n'
    await loadCSV(csvContent)

    await waitFor(() => screen.getByText('Import 1 ingredients'))

    await act(async () => {
      fireEvent.click(screen.getByText('Import 1 ingredients'))
    })

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Server error')
    })

    alertSpy.mockRestore()
  })
})
