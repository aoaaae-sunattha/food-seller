import { GET, POST } from '../../app/api/sheets/stock/route'
import { getServerSession } from 'next-auth'

jest.mock('next-auth')
jest.mock('../../lib/sheets', () => ({
  readRows: jest.fn(),
  appendRows: jest.fn().mockResolvedValue(undefined),
}))

const { readRows, appendRows } = require('../../lib/sheets')
const mockedGetServerSession = getServerSession as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockedGetServerSession.mockResolvedValue({ accessToken: 'fake-token' })
})

test('GET returns current quantities computed from purchases minus deductions', async () => {
  readRows.mockImplementation((token: string, tab: string) => {
    if (tab === 'purchases') return Promise.resolve([
      ['2026-04-01', 'Carrefour', 'Riz', 'ข้าว', '10', 'kg', '2', '20'],
    ])
    if (tab === 'stock') return Promise.resolve([
      ['2026-04-02', 'ข้าว', '3', 'kg', 'ใช้ทำอาหาร', 'ผัดไทย'],
    ])
    return Promise.resolve([])
  })

  const res = await GET({} as any)
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.quantities['ข้าว']).toBe(7)
  expect(readRows).toHaveBeenCalledWith('fake-token', 'purchases')
})

test('POST appends deduction rows', async () => {
  const body = {
    rows: [
      { date: '2026-04-11', ingredient: 'ข้าว', amount_used: 2, unit: 'kg', reason: 'ใช้ทำอาหาร', menu: 'ผัดไทย' },
    ],
  }
  const req = {
    json: jest.fn().mockResolvedValue(body)
  }
  const res = await POST(req as any)
  expect(res.status).toBe(200)
  expect(appendRows).toHaveBeenCalledWith('fake-token', 'stock', [
    ['2026-04-11', 'ข้าว', 2, 'kg', 'ใช้ทำอาหาร', 'ผัดไทย'],
  ])
})
