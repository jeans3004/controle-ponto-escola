import { google } from 'googleapis'

const sheets = google.sheets('v4')

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
    const sheets = await getAuthenticatedSheets()
    const response = await sheets.spreadsheets.values.get({
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

export async function getRegistroHoje(email: string): Promise<any> {
  try {
    const sheets = await getAuthenticatedSheets()
    const hoje = new Date().toISOString().split('T')[0]
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
      range: 'registros_ponto!A:G',
    })

    const rows = response.data.values || []
    const registro = rows.find(row => row[0] === email && row[2] === hoje)
    
    return registro ? {
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

export async function registrarPonto(dados: {
  email: string
  nome: string
  tipo: 'entrada' | 'saida'
  latitude: number
  longitude: number
}): Promise<boolean> {
  try {
    const sheets = await getAuthenticatedSheets()
    const agora = new Date()
    const data = agora.toISOString().split('T')[0]
    const hora = agora.toTimeString().split(' ')[0]

    const registroExistente = await getRegistroHoje(dados.email)
    
    if (dados.tipo === 'entrada' && !registroExistente) {
      // Inserir nova linha
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
        range: 'registros_ponto!A:G',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            dados.email,
            dados.nome,
            data,
            hora,
            '',
            dados.latitude,
            dados.longitude
          ]]
        }
      })
    } else if (dados.tipo === 'saida' && registroExistente) {
      // Atualizar linha existente com horário de saída
      // Implementar lógica de atualização
    }

    return true
  } catch (error) {
    console.error('Erro ao registrar ponto:', error)
    return false
  }
}