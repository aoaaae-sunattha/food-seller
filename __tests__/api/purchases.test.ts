import { POST } from '../../app/api/sheets/purchases/route'
import { getServerSession } from 'next-auth'

jest.mock('next-auth')
jest.mock('../../lib/sheets', () => ({
  appendRows: jest.fn().mockResolvedValue(undefined),
}))

const { appendRows } = require('../../lib/sheets')
const mockedGetServerSession = getServerSession as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockedGetServerSession.mockResolvedValue({ accessToken: 'fake-token' })
})

test('POST /api/sheets/purchases appends rows for all items', async () => {
  const body = {
    date: '2026-04-11',
    store: 'Carrefour',
    items: [
      { nameFr: 'Riz', nameTh: 'ข้าว', qty: 5, unit: 'kg', pricePerUnit: 2, total: 10 },
      { nameFr: 'Ail', nameTh: 'กระเทียม', qty: 1, unit: 'kg', pricePerUnit: 3, total: 3 },
    ],
  }
  const req = {
    json: jest.fn().mockResolvedValue(body)
  }
  const res = await POST(req as any)
  expect(res.status).toBe(200)
  expect(appendRows).toHaveBeenCalledWith('fake-token', 'purchases', [
    ['2026-04-11', 'Carrefour', 'Riz', 'ข้าว', 5, 'kg', 2, 10],
    ['2026-04-11', 'Carrefour', 'Ail', 'กระเทียม', 1, 'kg', 3, 3],
  ])
})
