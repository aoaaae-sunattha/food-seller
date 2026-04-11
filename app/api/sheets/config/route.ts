import { NextRequest, NextResponse } from 'next/server'
import { readRows, appendRows } from '@/lib/sheets'
import type { Ingredient, MenuTemplate } from '@/types'
import { randomUUID } from 'crypto'

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
    const rows = await readRows('config')
    return NextResponse.json(parseConfig(rows))
  } catch (error) {
    console.error('Config GET error:', error)
    return NextResponse.json({ error: 'Failed to read config' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const id = randomUUID().slice(0, 8)

    if (body.type === 'ingredient') {
      await appendRows('config', [[
        'ingredient', id, body.nameTh, body.nameFr, body.unit, String(body.threshold),
      ]])
      return NextResponse.json({ id })
    }

    if (body.type === 'menu') {
      const ingredientStr = (body.ingredients || [])
        .map((i: { ingredientId: string; defaultQty: number }) => `${i.ingredientId}:${i.defaultQty}`)
        .join(',')
      await appendRows('config', [[
        'menu', id, body.nameTh, String(body.pricePerBox), ingredientStr,
      ]])
      return NextResponse.json({ id })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error('Config POST error:', error)
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}
