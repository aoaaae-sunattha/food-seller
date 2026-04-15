import { POST } from '../../app/api/sheets/sales/route'
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

test('POST appends sales row with computed totals', async () => {
  const body = {
    date: '2026-04-11',
    menuSales: [
      { menu: 'ผัดไทย', boxes: 15, pricePerBox: 12 },
      { menu: 'แกงเขียวหวาน', boxes: 8, pricePerBox: 14 },
    ],
    cash: 200,
    card: 68,
  }
  const req = {
    json: jest.fn().mockResolvedValue(body)
  }
  const res = await POST(req as any)
  expect(res.status).toBe(200)
  expect(appendRows).toHaveBeenCalledWith('fake-token', 'sales', [
    [expect.any(String), '2026-04-11', 'ผัดไทย', 15, 12, 180, 200, 68, 268],
    [expect.any(String), '2026-04-11', 'แกงเขียวหวาน', 8, 14, 112, 0, 0, 0],
  ])
})
