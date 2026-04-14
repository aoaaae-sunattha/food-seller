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

export type TabKey = 'purchases' | 'stock' | 'sales' | 'config' | 'summary' | 'receipt_summaries' | 'receipt_extract'

const TAB_NAMES: Record<TabKey, string> = {
  purchases: 'Purchases',
  stock: 'Stock',
  sales: 'Daily Sales',
  config: 'Config',
  summary: 'Monthly Summary',
  receipt_summaries: 'Receipt Summaries',
  receipt_extract: 'Receipt Extract',
}

export function getSheetTitle(tab: TabKey): string {
  return TAB_NAMES[tab]
}

// --- Google Sheets API client ---

function getAuth(accessToken?: string) {
  if (accessToken) {
    console.log('--- Sheets Debug: getAuth called with token ---')
    console.log('Token starts with:', accessToken.substring(0, 4))
    const auth = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    auth.setCredentials({ access_token: accessToken })
    return auth
  }
  console.log('--- Sheets Debug: getAuth using ADC fallback ---')
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
  console.log('--- Sheets Debug: getOrCreateMonthSheet start ---')
  const sheets = getSheetsClient(accessToken)
  const drive = getDriveClient(accessToken)
  const title = buildMonthTitle(date)
  console.log('Target Spreadsheet Title:', title)

  try {
    // Search for existing spreadsheet with this title
    console.log('Searching for existing file...')
    const search = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.spreadsheet' and name='${title}' and trashed=false`,
      fields: 'files(id,name)',
    })

    if (search.data.files && search.data.files.length > 0) {
      const existingId = search.data.files[0].id!
      console.log('Found existing spreadsheet:', existingId)
      
      // Ensure all tabs exist (for backward compatibility when new tabs are added)
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: existingId })
      const existingTitles = spreadsheet.data.sheets?.map(s => s.properties?.title) || []
      const missingTabs = (Object.values(TAB_NAMES) as string[]).filter(title => !existingTitles.includes(title))

      if (missingTabs.length > 0) {
        console.log('Missing tabs found, creating:', missingTabs)
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: existingId,
          requestBody: {
            requests: missingTabs.map(title => ({
              addSheet: { properties: { title } }
            }))
          }
        })
        
        // Add headers for the new tabs
        const headerData = []
        if (missingTabs.includes('Receipt Summaries')) {
          headerData.push({ range: 'Receipt Summaries!A1', values: [['date','store','total','drive_url','id']] })
        }
        if (missingTabs.includes('Receipt Extract')) {
          headerData.push({ range: 'Receipt Extract!A1', values: [['date','store','name_fr','name_th','qty','unit','price_per_unit','total','receipt_id']] })
        }
        if (missingTabs.includes('Purchases')) {
          headerData.push({ range: 'Purchases!A1', values: [['date','store','item_fr','item_th','qty','unit','price','total','receipt_id']] })
        }

        if (headerData.length > 0) {
          await sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: existingId,
            requestBody: {
              valueInputOption: 'RAW',
              data: headerData
            }
          })
        }
      }

      return existingId
    }

    console.log('No existing spreadsheet found. Creating new one...')
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
          { properties: { title: 'Receipt Summaries' } },
          { properties: { title: 'Receipt Extract' } },
        ],
      },
    })
    const newId = created.data.spreadsheetId!
    console.log('New spreadsheet created successfully! ID:', newId)

    // Add headers
    console.log('Adding headers to new spreadsheet...')
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: newId,
      requestBody: {
        valueInputOption: 'RAW',
        data: [
          { range: 'Purchases!A1', values: [['date','store','item_fr','item_th','qty','unit','price','total','receipt_id']] },
          { range: 'Stock!A1', values: [['date','ingredient','amount_used','unit','reason','menu']] },
          { range: 'Daily Sales!A1', values: [['date','menu','boxes','price_per_box','subtotal','cash','card','total']] },
          { range: 'Config!A1', values: [['type','id','name_th','name_fr_or_price','unit_or_ingredients','threshold']] },
          { range: 'Monthly Summary!A1', values: [['category','metric','value']] },
          { range: 'Receipt Summaries!A1', values: [['date','store','total','drive_url','id']] },
          { range: 'Receipt Extract!A1', values: [['date','store','name_fr','name_th','qty','unit','price_per_unit','total','receipt_id']] },
        ],
      },
    })
    console.log('Headers added.')

    // Copy Config from previous month if it exists
    const prevDate = new Date(date.getFullYear(), date.getMonth() - 1, 1)
    const prevTitle = buildMonthTitle(prevDate)
    console.log('Checking for previous month config:', prevTitle)
    const prevSearch = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.spreadsheet' and name='${prevTitle}' and trashed=false`,
      fields: 'files(id)',
    })
    if (prevSearch.data.files && prevSearch.data.files.length > 0) {
      const prevId = prevSearch.data.files[0].id!
      console.log('Copying config from:', prevId)
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
        console.log('Config copied.')
      }
    }

    console.log('--- Sheets Debug: getOrCreateMonthSheet end ---')
    return newId
  } catch (error: any) {
    console.error('CRITICAL ERROR in getOrCreateMonthSheet:', error.message)
    if (error.response?.data) {
      console.error('Google API Error Details:', JSON.stringify(error.response.data, null, 2))
    }
    throw error
  }
}

/**
 * Appends rows to a tab in the current month's spreadsheet.
 */
export async function appendRows(accessToken: string | undefined, tab: TabKey, rows: unknown[][]): Promise<void> {
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
export async function readRows(accessToken: string | undefined, tab: TabKey): Promise<string[][]> {
  const sheets = getSheetsClient(accessToken)
  const spreadsheetId = await getOrCreateMonthSheet(accessToken)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB_NAMES[tab]}!A2:Z`,
  })
  return (res.data.values as string[][]) || []
}

/**
 * Overwrites a tab with a header and rows.
 * Clears the sheet first so stale rows beyond the new data are removed.
 */
export async function updateTab(accessToken: string | undefined, tab: TabKey, header: string[], rows: unknown[][]): Promise<void> {
  const sheets = getSheetsClient(accessToken)
  const spreadsheetId = await getOrCreateMonthSheet(accessToken)
  // Clear existing content first; without this, rows beyond the new data persist
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: TAB_NAMES[tab],
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TAB_NAMES[tab]}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [header, ...rows] },
  })
}

/**
 * Uploads a receipt image to Google Drive in a folder named 'Receipts'.
 * Returns the webViewLink.
 */
export async function uploadReceiptImage(accessToken: string | undefined, buffer: Buffer, filename: string, mimeType: string): Promise<string> {
  const drive = getDriveClient(accessToken)
  
  // 1. Find or create 'Receipts' folder
  let folderId: string
  const folderSearch = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.folder' and name='Receipts' and trashed=false",
    fields: 'files(id)',
  })
  
  if (folderSearch.data.files && folderSearch.data.files.length > 0) {
    folderId = folderSearch.data.files[0].id!
  } else {
    const folder = await drive.files.create({
      requestBody: {
        name: 'Receipts',
        mimeType: 'application/vnd.google-apps.folder',
      },
      fields: 'id',
    })
    folderId = folder.data.id!
  }

  // 2. Upload the file
  const response = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: require('stream').Readable.from(buffer),
    },
    fields: 'id, webViewLink',
  })

  // 3. Make the file readable by anyone with the link (optional but helpful for the owner)
  await drive.permissions.create({
    fileId: response.data.id!,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  })

  return response.data.webViewLink!
}
