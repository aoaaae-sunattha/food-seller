import { GET, POST } from '../../app/api/sheets/config/route'

jest.mock('../../lib/sheets', () => ({
  readRows: jest.fn(),
  appendRows: jest.fn(),
  getOrCreateMonthSheet: jest.fn().mockResolvedValue('sheet-id'),
}))

const { readRows, appendRows } = require('../../lib/sheets')

beforeEach(() => {
  jest.clearAllMocks()
  readRows.mockResolvedValue([
    ['ingredient', 'i1', 'ข้าว', 'Riz', 'kg', '5'],
    ['menu', 'm1', 'ผัดไทย', '12', 'i1:0.2'],
  ])
  appendRows.mockResolvedValue(undefined)
})

test('GET /api/sheets/config returns ingredients and menus', async () => {
  const req = {} // Mock req
  const res = await GET(req as any)
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.ingredients).toHaveLength(1)
  expect(data.ingredients[0].nameTh).toBe('ข้าว')
  expect(data.menus).toHaveLength(1)
  expect(data.menus[0].nameTh).toBe('ผัดไทย')
  expect(data.menus[0].pricePerBox).toBe(12)
})

test('POST /api/sheets/config adds ingredient', async () => {
  const body = { type: 'ingredient', nameTh: 'กระเทียม', nameFr: 'Ail', unit: 'kg', threshold: 1 }
  const req = {
    json: jest.fn().mockResolvedValue(body)
  }
  const res = await POST(req as any)
  expect(res.status).toBe(200)
  expect(appendRows).toHaveBeenCalledWith('config', expect.arrayContaining([
    expect.arrayContaining(['ingredient', expect.any(String), 'กระเทียม', 'Ail', 'kg', '1']),
  ]))
})
