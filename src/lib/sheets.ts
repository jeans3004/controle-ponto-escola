import { google } from 'googleapis'



async function getAuthenticatedSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  const authClient = await auth.getClient()
  return google.sheets({ version: 'v4', auth: authClient })
}

export async function validateUserEmail(email: string): Promise<boolean> {
  try {
    const sheetsClient = await getAuthenticatedSheets()
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
      range: 'usuarios_autorizados!A:A',
    })

    const emails = response.data.values?.flat() || []
    return emails.includes(email)
  } catch (error) {
    console.error('Erro ao validar email:', error)
    return false
  }
}

export async function getRegistroHoje(email: string) {
  try {
    const sheetsClient = await getAuthenticatedSheets()
    const hoje = new Date().toISOString().split('T')[0]
    
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
      range: 'registros_ponto!A:G',
    })

    const rows = response.data.values || []
    const registro = rows.find((row, index) => 
      index > 0 && row[0] === email && row[2] === hoje
    )
    
    return registro ? {
      rowIndex: rows.findIndex((row, index) => 
        index > 0 && row[0] === email && row[2] === hoje
      ) + 1,
      email: registro[0],
      nome: registro[1],
      data: registro[2],
      entrada: registro[3],
      saida: registro[4],
      latitude: registro[5],
      longitude: registro[6],
    } : null
  } catch (error) {
    console.error('Erro ao buscar registro:', error)
    return null
  }
}