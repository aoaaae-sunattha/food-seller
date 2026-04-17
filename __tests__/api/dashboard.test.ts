import { GET } from '../../app/api/sheets/dashboard/route'
import { getServerSession } from 'next-auth'

jest.mock('next-auth')
jest.mock('../../lib/sheets', () => ({ readRows: jest.fn() }))

const { readRows } = require('../../lib/sheets')
const mockedGetServerSession = getServerSession as jest.Mock

// Today is 2026-04-11 (Saturday). Week = Mon Apr 6 – Sun Apr 12.
jest.useFakeTimers().setSystemTime(new Date('2026-04-11'))

beforeEach(() => {
  jest.clearAllMocks()
  mockedGetServerSession.mockResolvedValue({ accessToken: 'fake-token' })
  readRows.mockImplementation((token: string, tab: string) => {
    if (tab === 'sales') return Promise.resolve([
      ['id1', '2026-04-09', 'ผัดไทย', '10', '12', '120', '100', '20', '120'],
      ['id2', '2026-04-10', 'ผัดไทย', '5', '12', '60', '60', '0', '60'],
    ])
    if (tab === 'purchases') return Promise.resolve([
      ['2026-04-08', 'Carrefour', 'Riz', 'ข้าว', '10', 'kg', '2', '20', '0', '20', 'rid1'],
    ])
    if (tab === 'inventory') return Promise.resolve([
      ['ข้าว', '3', 'kg', '2026-04-11'],
    ])
    if (tab === 'config') return Promise.resolve([
      ['ingredient', 'i1', 'ข้าว', 'Riz', 'kg', '5'],
    ])
    return Promise.resolve([])
  })
})

test('GET returns weekly income, expenses and low stock from inventory', async () => {
  const res = await GET({} as any)
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.weeklyIncome).toBe(180)  // 120 + 60
  expect(data.weeklyExpenses).toBe(20) // 1 purchase this week
  expect(data.lowStock[0].ingredient.nameTh).toBe('ข้าว')
  expect(data.lowStock[0].currentQty).toBe(3) // 3 <= 5 threshold
  expect(readRows).toHaveBeenCalledWith('fake-token', 'inventory')
})
