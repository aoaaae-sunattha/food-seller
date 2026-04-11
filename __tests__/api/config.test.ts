import { GET, POST } from '../../app/api/sheets/config/route'
import { getServerSession } from 'next-auth'

jest.mock('next-auth')
jest.mock('../../lib/sheets', () => ({
  readRows: jest.fn(),
  appendRows: jest.fn(),
  getOrCreateMonthSheet: jest.fn().mockResolvedValue('sheet-id'),
}))

const { readRows, appendRows } = require('../../lib/sheets')
const mockedGetServerSession = getServerSession as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockedGetServerSession.mockResolvedValue({ accessToken: 'fake-token' })
  readRows.mockResolvedValue([
    ['ingredient', 'i1', 'ข้าว', 'Riz', 'kg', '5'],
    ['menu', 'm1', 'ผัดไทย', '12', 'i1:0.2'],
  ])
  appendRows.mockResolvedValue(undefined)
})

test('GET /api/sheets/config returns ingredients and menus', async () => {
  const req = {} 
  const res = await GET(req as any)
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.ingredients).toHaveLength(1)
  expect(data.ingredients[0].nameTh).toBe('ข้าว')
  expect(readRows).toHaveBeenCalledWith('fake-token', 'config')
})

test('POST /api/sheets/config adds ingredient', async () => {
  const body = { type: 'ingredient', nameTh: 'กระเทียม', nameFr: 'Ail', unit: 'kg', threshold: 1 }
  const req = {
    json: jest.fn().mockResolvedValue(body)
  }
  const res = await POST(req as any)
  expect(res.status).toBe(200)
  expect(appendRows).toHaveBeenCalledWith('fake-token', 'config', expect.arrayContaining([
    expect.arrayContaining(['ingredient', expect.any(String), 'กระเทียม', 'Ail', 'kg', '1']),
  ]))
})
