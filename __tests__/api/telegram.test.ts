import { parseTelegramCommand } from '@/lib/telegram'

describe('parseTelegramCommand', () => {
  test('parses valid stock command', () => {
    const result = parseTelegramCommand('ตัดสต็อก ข้าว 500 g')
    expect(result).toEqual({
      type: 'stock',
      ingredient: 'ข้าว',
      amount: 500,
      unit: 'g'
    })
  })

  test('parses stock command with decimal', () => {
    const result = parseTelegramCommand('ตัดสต็อก ไก่ 1.5 kg')
    expect(result).toEqual({
      type: 'stock',
      ingredient: 'ไก่',
      amount: 1.5,
      unit: 'kg'
    })
  })

  test('parses valid sales command', () => {
    const result = parseTelegramCommand('ยอดขาย ผัดไทย 15 กล่อง')
    expect(result).toEqual({
      type: 'sales',
      menu: 'ผัดไทย',
      boxes: 15
    })
  })

  test('returns null for invalid command', () => {
    expect(parseTelegramCommand('hello')).toBeNull()
    expect(parseTelegramCommand('ตัดสต็อก ข้าว')).toBeNull()
  })
})
