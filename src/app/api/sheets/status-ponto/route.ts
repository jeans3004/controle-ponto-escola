import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { google } from 'googleapis'

async function getAuthenticatedSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  const authClient = await auth.getClient()
  return google.sheets({ version: 'v4', auth: authClient })
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const sheets = await getAuthenticatedSheets()
    const hoje = new Date().toISOString().split('T')[0]
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
      range: 'registros_ponto!A:G',
    })

    const rows = response.data.values || []
    const registro = rows.find((row, index) => 
      index > 0 && row[0] === session.user!.email && row[2] === hoje
    )
    
    if (!registro) {
      return NextResponse.json({
        temEntrada: false,
        temSaida: false,
        proximaAcao: 'entrada'
      })
    }

    const temEntrada = !!registro[3]
    const temSaida = !!registro[4]

    return NextResponse.json({
      temEntrada,
      temSaida,
      proximaAcao: temEntrada && !temSaida ? 'saida' : temEntrada && temSaida ? 'completo' : 'entrada',
      horarioEntrada: registro[3],
      horarioSaida: registro[4]
    })

  } catch (error) {
    console.error('Erro ao buscar status:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}