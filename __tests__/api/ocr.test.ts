import { POST } from '../../app/api/ocr/route'

jest.mock('../../lib/gemini', () => ({
  extractReceiptItems: jest.fn().mockResolvedValue({
    items: [
      { nameFr: 'Riz jasmin', nameTh: 'ข้าว', qty: 5, unit: 'kg', pricePerUnit: 2.5, total: 12.5 },
    ],
    store: 'Carrefour',
    date: '2026-04-11',
    total: 12.5
  }),
}))

test('POST /api/ocr returns extracted items', async () => {
  const mockFile = { type: 'image/jpeg', arrayBuffer: async () => Buffer.from('fake') }
  const mockFormData = {
    get: jest.fn().mockReturnValue(mockFile),
  }
  const mockReq = {
    formData: jest.fn().mockResolvedValue(mockFormData),
  }

  const res = await POST(mockReq as any)
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.items).toHaveLength(1)
  expect(data.items[0].nameFr).toBe('Riz jasmin')
})

test('POST /api/ocr returns 400 when no image', async () => {
  const mockFormData = {
    get: jest.fn().mockReturnValue(null),
  }
  const mockReq = {
    formData: jest.fn().mockResolvedValue(mockFormData),
  }

  const res = await POST(mockReq as any)
  expect(res.status).toBe(400)
})
