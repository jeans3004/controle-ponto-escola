import { NextResponse } from 'next/server'
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
    
    // Verificar se existe verificação facial prévia hoje na aba fotos_verificacao
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
      range: 'fotos_verificacao!A:G',
    })

    const rows = response.data.values || []
    
    // Procurar por verificação do usuário hoje
    const verificacaoHoje = rows.find((row, index) => 
      index > 0 && // Pular header
      row[0] === session.user!.email && // Email do usuário
      row[2] === hoje // Data de hoje
    )

    return NextResponse.json({
      verified: !!verificacaoHoje,
      lastVerification: verificacaoHoje ? {
        data: verificacaoHoje[2],
        hora: verificacaoHoje[3],
        fileId: verificacaoHoje[4]
      } : null
    })

  } catch (error) {
    console.error('Erro ao verificar verificação diária:', error)
    
    // Em caso de erro, assumir que não foi verificado (mais seguro)
    return NextResponse.json({ 
      verified: false,
      error: 'Erro ao verificar status de verificação'
    })
  }
}