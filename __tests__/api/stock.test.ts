import { GET, POST, PUT } from '../../app/api/sheets/stock/route'
import { getServerSession } from 'next-auth'

jest.mock('next-auth')
jest.mock('../../lib/sheets', () => ({
  readRows: jest.fn(),
  appendRows: jest.fn().mockResolvedValue(undefined),
  updateInventory: jest.fn().mockResolvedValue(undefined),
  updateTab: jest.fn().mockResolvedValue(undefined),
}))

const { readRows, appendRows, updateInventory, updateTab } = require('../../lib/sheets')
const mockedGetServerSession = getServerSession as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockedGetServerSession.mockResolvedValue({ accessToken: 'fake-token' })
})

test('GET returns quantities from Inventory tab', async () => {
  readRows.mockImplementation((token: string, tab: string) => {
    if (tab === 'inventory') return Promise.resolve([
      ['ข้าว', '7', 'kg', '2026-04-11'],
    ])
    return Promise.resolve([])
  })

  const res = await GET({} as any)
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.quantities['ข้าว']).toBe(7)
  expect(readRows).toHaveBeenCalledWith('fake-token', 'inventory')
})

test('POST appends deduction rows and updates inventory', async () => {
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
  expect(updateInventory).toHaveBeenCalledWith('fake-token', [
    { ingredient: 'ข้าว', qtyDelta: -2, unit: 'kg' }
  ])
})

test('PUT updates absolute inventory quantity', async () => {
  readRows.mockResolvedValue([
    ['ข้าว', '7', 'kg', '2026-04-11'],
  ])
  const body = { ingredient: 'ข้าว', qty: 10, unit: 'kg' }
  const req = {
    json: jest.fn().mockResolvedValue(body)
  }
  const res = await PUT(req as any)
  expect(res.status).toBe(200)
  expect(updateTab).toHaveBeenCalledWith(
    'fake-token', 
    'inventory', 
    ['ingredient','qty','unit','last_updated'],
    expect.arrayContaining([['ข้าว', 10, 'kg', expect.any(String)]])
  )
})
