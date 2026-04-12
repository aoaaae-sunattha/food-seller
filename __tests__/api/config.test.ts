import { GET, POST, PUT, DELETE } from '../../app/api/sheets/config/route'
import { getServerSession } from 'next-auth'

jest.mock('next-auth')
jest.mock('../../lib/sheets', () => ({
  readRows: jest.fn(),
  appendRows: jest.fn(),
  updateTab: jest.fn(),
  getOrCreateMonthSheet: jest.fn().mockResolvedValue('sheet-id'),
}))

const { readRows, appendRows, updateTab } = require('../../lib/sheets')
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

test('PUT /api/sheets/config updates ingredient', async () => {
  const body = { id: 'i1', type: 'ingredient', nameTh: 'ข้าวหอม', nameFr: 'Riz Jasmin', unit: 'kg', threshold: 10 }
  const req = {
    json: jest.fn().mockResolvedValue(body)
  }
  const res = await PUT(req as any)
  expect(res.status).toBe(200)
  expect(updateTab).toHaveBeenCalledWith('fake-token', 'config', 
    ['type','id','name_th','name_fr_or_price','unit_or_ingredients','threshold'],
    [
      ['ingredient', 'i1', 'ข้าวหอม', 'Riz Jasmin', 'kg', '10'],
      ['menu', 'm1', 'ผัดไทย', '12', 'i1:0.2', ''],
    ]
  )
})

test('PUT /api/sheets/config updates menu', async () => {
  const body = { id: 'm1', type: 'menu', nameTh: 'ผัดไทยกุ้ง', pricePerBox: 15, ingredients: [{ ingredientId: 'i1', defaultQty: 0.3 }] }
  const req = {
    json: jest.fn().mockResolvedValue(body)
  }
  const res = await PUT(req as any)
  expect(res.status).toBe(200)
  expect(updateTab).toHaveBeenCalledWith('fake-token', 'config', 
    ['type','id','name_th','name_fr_or_price','unit_or_ingredients','threshold'],
    [
      ['ingredient', 'i1', 'ข้าว', 'Riz', 'kg', '5'],
      ['menu', 'm1', 'ผัดไทยกุ้ง', '15', 'i1:0.3', ''],
    ]
  )
})

test('DELETE /api/sheets/config removes row', async () => {
  const req = {
    url: 'http://localhost/api/sheets/config?id=i1'
  }
  const res = await DELETE(req as any)
  expect(res.status).toBe(200)
  expect(updateTab).toHaveBeenCalledWith('fake-token', 'config', 
    ['type','id','name_th','name_fr_or_price','unit_or_ingredients','threshold'],
    [
      ['menu', 'm1', 'ผัดไทย', '12', 'i1:0.2', ''],
    ]
  )
})

test('POST /api/sheets/config returns 401 for unauthenticated bulk request', async () => {
  mockedGetServerSession.mockResolvedValue(null)
  const req = { json: jest.fn().mockResolvedValue({ bulk: true, items: [] }) }
  const res = await POST(req as any)
  expect(res.status).toBe(401)
})

test('POST /api/sheets/config bulk updates and adds ingredients', async () => {
  const body = {
    bulk: true,
    items: [
      { nameTh: 'ข้าว', nameFr: 'Riz Jasmin', unit: 'kg', threshold: 10 }, // Update
      { nameTh: 'กระเทียม', nameFr: 'Ail', unit: 'kg', threshold: 1 }      // New
    ]
  }
  const req = { json: jest.fn().mockResolvedValue(body) }
  const res = await POST(req as any)
  expect(res.status).toBe(200)
  const data = await res.json()
  expect(data.added).toBe(1)
  expect(data.updated).toBe(1)
  expect(updateTab).toHaveBeenCalledWith('fake-token', 'config', 
    ['type','id','name_th','name_fr_or_price','unit_or_ingredients','threshold'],
    expect.arrayContaining([
      ['ingredient', 'i1', 'ข้าว', 'Riz Jasmin', 'kg', '10'], // Updated
      ['menu', 'm1', 'ผัดไทย', '12', 'i1:0.2', ''],          // Kept
      ['ingredient', expect.any(String), 'กระเทียม', 'Ail', 'kg', '1'], // Added
    ])
  )
})
