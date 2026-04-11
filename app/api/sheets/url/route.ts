import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateMonthSheet } from '../../../../lib/sheets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessToken = (session as any)?.accessToken
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = await getOrCreateMonthSheet(accessToken)
    const url = `https://docs.google.com/spreadsheets/d/${id}/edit`
    
    return NextResponse.json({ url })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
