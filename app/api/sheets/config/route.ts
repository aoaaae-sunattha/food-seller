import { NextRequest, NextResponse } from 'next/server'
import { readRows, appendRows, updateTab } from '../../../../lib/sheets'
import type { Ingredient, MenuTemplate } from '../../../../types'
import { randomUUID } from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

function parseConfig(rows: string[][]): { ingredients: Ingredient[]; menus: MenuTemplate[] } {
  const ingredients: Ingredient[] = []
  const menus: MenuTemplate[] = []

  for (const row of rows) {
    if (row[0] === 'ingredient') {
      ingredients.push({
        id: row[1],
        nameTh: row[2],
        nameFr: row[3],
        unit: row[4],
        threshold: Number(row[5]),
      })
    } else if (row[0] === 'menu') {
      const ingredientPairs = (row[4] || '').split(',').filter(Boolean).map(pair => {
        const [ingredientId, qty] = pair.split(':')
        return { ingredientId, defaultQty: Number(qty) }
      })
      menus.push({
        id: row[1],
        nameTh: row[2],
        pricePerBox: Number(row[3]),
        ingredients: ingredientPairs,
      })
    }
  }

  return { ingredients, menus }
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    console.log(`--- API Debug: REQUEST /api/sheets/config ---`)
    console.log('Session present:', !!session)
    console.log('AccessToken present:', !!accessToken)
    
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rows = await readRows(accessToken, 'config')
    return NextResponse.json(parseConfig(rows))
  } catch (error) {
    console.error('Config GET error:', error)
    return NextResponse.json({ error: 'Failed to read config' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    console.log(`--- API Debug: REQUEST /api/sheets/config ---`)
    console.log('Session present:', !!session)
    console.log('AccessToken present:', !!accessToken)
    
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()

    if (body.bulk === true) {
      const items = body.items || []
      const rows = await readRows(accessToken, 'config')
      
      const updatedRowsMap = new Map<string, string[]>()
      const menuRows: string[][] = []
      let added = 0
      let updated = 0

      rows.forEach(row => {
        if (row[0] === 'ingredient') {
          updatedRowsMap.set(row[2].trim().toLowerCase(), row)
        } else if (row[0] === 'menu') {
          menuRows.push(row)
        }
      })

      items.forEach((item: any) => {
        const nameLower = (item.nameTh || '').trim().toLowerCase()
        if (updatedRowsMap.has(nameLower)) {
          updated++
          const existingRow = updatedRowsMap.get(nameLower)!
          updatedRowsMap.set(nameLower, [
            'ingredient', existingRow[1], item.nameTh, item.nameFr, item.unit, String(item.threshold)
          ])
        } else {
          added++
          const id = randomUUID().slice(0, 8)
          updatedRowsMap.set(nameLower, [
            'ingredient', id, item.nameTh, item.nameFr, item.unit, String(item.threshold)
          ])
        }
      })

      const finalRows = [
        ...Array.from(updatedRowsMap.values()),
        ...menuRows.map(row => {
          const newRow = [...row]
          while (newRow.length < 6) newRow.push('')
          return newRow
        })
      ]

      const header = ['type', 'id', 'name_th', 'name_fr_or_price', 'unit_or_ingredients', 'threshold']
      await updateTab(accessToken, 'config', header, finalRows)
      return NextResponse.json({ success: true, added, updated })
    }

    const id = randomUUID().slice(0, 8)

    // Duplicate check
    const existingRows = await readRows(accessToken, 'config')
    const { ingredients: existingIngredients, menus: existingMenus } = parseConfig(existingRows)

    if (body.type === 'ingredient') {
      const nameLower = (body.nameTh || '').trim().toLowerCase()
      const dup = existingIngredients.find(i => i.nameTh.trim().toLowerCase() === nameLower)
      if (dup) {
        return NextResponse.json({ error: 'duplicate', id: dup.id }, { status: 409 })
      }
      console.log('Appending ingredient:', body.nameTh)
      await appendRows(accessToken, 'config', [[
        'ingredient', id, body.nameTh, body.nameFr, body.unit, String(body.threshold),
      ]])
      return NextResponse.json({ id })
    }

    if (body.type === 'menu') {
      const nameLower = (body.nameTh || '').trim().toLowerCase()
      const dup = existingMenus.find(m => m.nameTh.trim().toLowerCase() === nameLower)
      if (dup) {
        return NextResponse.json({ error: 'duplicate', id: dup.id }, { status: 409 })
      }
      console.log('Appending menu:', body.nameTh)
      const ingredientStr = (body.ingredients || [])
        .map((i: { ingredientId: string; defaultQty: number }) => `${i.ingredientId}:${i.defaultQty}`)
        .join(',')
      await appendRows(accessToken, 'config', [[
        'menu', id, body.nameTh, String(body.pricePerBox), ingredientStr,
      ]])
      return NextResponse.json({ id })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error: any) {
    console.error('Config POST error:', error.message)
    return NextResponse.json({ 
      error: 'Failed to update config', 
      details: error.message,
      code: error.code
    }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { id, type } = body

    const rows = await readRows(accessToken, 'config')
    const updatedRows = rows.map(row => {
      if (row[1] === id) {
        if (type === 'ingredient') {
          return ['ingredient', id, body.nameTh, body.nameFr, body.unit, String(body.threshold)]
        } else if (type === 'menu') {
          const ingredientStr = (body.ingredients || [])
            .map((i: { ingredientId: string; defaultQty: number }) => `${i.ingredientId}:${i.defaultQty}`)
            .join(',')
          return ['menu', id, body.nameTh, String(body.pricePerBox), ingredientStr, '']
        }
      }
      // Ensure all rows have 6 columns for consistency with updateTab
      const newRow = [...row]
      while (newRow.length < 6) newRow.push('')
      return newRow
    })

    const header = ['type', 'id', 'name_th', 'name_fr_or_price', 'unit_or_ingredients', 'threshold']
    await updateTab(accessToken, 'config', header, updatedRows)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Config PUT error:', error.message)
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const rows = await readRows(accessToken, 'config')
    const filteredRows = rows
      .filter(row => row[1] !== id)
      .map(row => {
        const newRow = [...row]
        while (newRow.length < 6) newRow.push('')
        return newRow
      })

    const header = ['type', 'id', 'name_th', 'name_fr_or_price', 'unit_or_ingredients', 'threshold']
    await updateTab(accessToken, 'config', header, filteredRows)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Config DELETE error:', error.message)
    return NextResponse.json({ error: 'Failed to delete config' }, { status: 500 })
  }
}
