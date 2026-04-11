import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

// --- Pure helpers (testable without network) ---

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

export function buildMonthTitle(date: Date): string {
  const month = THAI_MONTHS[date.getMonth()]
  const year = date.getFullYear() + 543
  return `ร้านอาหาร — ${month} ${year}`
}

export type TabKey = 'purchases' | 'stock' | 'sales' | 'config' | 'summary'

const TAB_NAMES: Record<TabKey, string> = {
  purchases: 'Purchases',
  stock: 'Stock',
  sales: 'Daily Sales',
  config: 'Config',
  summary: 'Monthly Summary',
}

export function getSheetTitle(tab: TabKey): string {
  return TAB_NAMES[tab]
}

// --- Google Sheets API client ---

function getAuth(accessToken?: string) {
  if (accessToken) {
    const auth = new OAuth2Client()
    auth.setCredentials({ access_token: accessToken })
    return auth
  }
  // Fallback to ADC (Application Default Credentials)
  return new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
  })
}

export function getSheetsClient(accessToken?: string) {
  return google.sheets({ version: 'v4', auth: getAuth(accessToken) })
}

export function getDriveClient(accessToken?: string) {
  return google.drive({ version: 'v3', auth: getAuth(accessToken) })
}

/**
 * Finds or creates the spreadsheet for the given month.
 * On first creation: adds all 5 tabs and copies Config rows from previous month.
 * Returns the spreadsheet ID.
 */
export async function getOrCreateMonthSheet(accessToken?: string, date: Date = new Date()): Promise<string> {
  const sheets = getSheetsClient(accessToken)
  const drive = getDriveClient(accessToken)
  const title = buildMonthTitle(date)

  // Search for existing spreadsheet with this title
  const search = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.spreadsheet' and name='${title}' and trashed=false`,
    fields: 'files(id,name)',
  })

  if (search.data.files && search.data.files.length > 0) {
    return search.data.files[0].id!
  }

  // Create new spreadsheet
  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title },
      sheets: [
        { properties: { title: 'Purchases' } },
        { properties: { title: 'Stock' } },
        { properties: { title: 'Daily Sales' } },
        { properties: { title: 'Monthly Summary' } },
        { properties: { title: 'Config' } },
      ],
    },
  })
  const newId = created.data.spreadsheetId!

  // Add headers
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: newId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: 'Purchases!A1', values: [['date','store','item_fr','item_th','qty','unit','price','total']] },
        { range: 'Stock!A1', values: [['date','ingredient','amount_used','unit','reason','menu']] },
        { range: 'Daily Sales!A1', values: [['date','menu','boxes','price_per_box','subtotal','cash','card','total']] },
      ],
    },
  })

  // Copy Config from previous month if it exists
  const prevDate = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  const prevTitle = buildMonthTitle(prevDate)
  const prevSearch = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.spreadsheet' and name='${prevTitle}' and trashed=false`,
    fields: 'files(id)',
  })
  if (prevSearch.data.files && prevSearch.data.files.length > 0) {
    const prevId = prevSearch.data.files[0].id!
    const prevConfig = await sheets.spreadsheets.values.get({
      spreadsheetId: prevId,
      range: 'Config!A:Z',
    })
    if (prevConfig.data.values && prevConfig.data.values.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: newId,
        range: 'Config!A1',
        valueInputOption: 'RAW',
        requestBody: { values: prevConfig.data.values },
      })
    }
  }

  return newId
}

/**
 * Appends rows to a tab in the current month's spreadsheet.
 */
export async function appendRows(accessToken?: string, tab: TabKey, rows: unknown[][]): Promise<void> {
  const sheets = getSheetsClient(accessToken)
  const spreadsheetId = await getOrCreateMonthSheet(accessToken)
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${TAB_NAMES[tab]}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  })
}

/**
 * Reads all rows from a tab (excluding header row).
 */
export async function readRows(accessToken?: string, tab: TabKey): Promise<string[][]> {
  const sheets = getSheetsClient(accessToken)
  const spreadsheetId = await getOrCreateMonthSheet(accessToken)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB_NAMES[tab]}!A2:Z`,
  })
  return (res.data.values as string[][]) || []
}
