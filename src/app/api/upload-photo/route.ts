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
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  const authClient = await auth.getClient()
  return google.sheets({ version: 'v4', auth: authClient })
}

export async function POST(request: NextRequest) {
  console.log('🔍 API upload-photo iniciada (versão teste)')
  
  try {
    const session = await getServerSession(authOptions)
    console.log('👤 Sessão verificada:', session?.user?.email)
    
    if (!session || !session.user?.email) {
      console.log('❌ Sessão inválida')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📦 Dados recebidos:', {
      temPhotoData: !!body.photoData,
      tamanhoPhoto: body.photoData?.length,
      userEmail: body.userEmail,
      userName: body.userName,
      verificationType: body.verificationType
    })

    const { userEmail, userName, verificationType = 'inicial' } = body

    console.log('📊 Salvando no Google Sheets...')
    
    try {
      const sheets = await getAuthenticatedSheets()
      const hoje = new Date().toISOString().split('T')[0]
      const agora = new Date().toLocaleTimeString('pt-BR', { 
        timeZone: 'America/Manaus',
        hour12: false 
      })

      // Gerar ID temporário 
      const tempId = `foto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Tentar salvar na aba fotos_verificacao
      console.log('📝 Tentando salvar na aba fotos_verificacao...')
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
        range: 'fotos_verificacao!A:H',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            userEmail,
            userName,
            hoje,
            agora,
            tempId,
            'https://exemplo.com/foto-temp',
            'https://exemplo.com/foto-temp',
            verificationType
          ]]
        }
      })
      
      console.log('✅ Dados salvos na aba fotos_verificacao')

    } catch (sheetsError: any) {
      console.error('❌ Erro Sheets:', sheetsError.message)
      
      if (sheetsError.message.includes('Unable to parse range') || 
          sheetsError.message.includes('fotos_verificacao')) {
        
        console.log('🔧 Aba fotos_verificacao não existe, criando...')
        
        try {
          const sheets = await getAuthenticatedSheets()
          
          // Criar aba
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
            requestBody: {
              requests: [{
                addSheet: {
                  properties: {
                    title: 'fotos_verificacao'
                  }
                }
              }]
            }
          })
          console.log('📋 Aba fotos_verificacao criada')

          // Adicionar cabeçalhos
          await sheets.spreadsheets.values.update({
            spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
            range: 'fotos_verificacao!A1:H1',
            valueInputOption: 'RAW',
            requestBody: {
              values: [['email', 'nome', 'data', 'hora', 'file_id', 'view_link', 'direct_link', 'tipo_verificacao']]
            }
          })
          console.log('📝 Cabeçalhos adicionados')

          // Salvar dados
          const hoje = new Date().toISOString().split('T')[0]
          const agora = new Date().toLocaleTimeString('pt-BR', { 
            timeZone: 'America/Manaus',
            hour12: false 
          })
          const tempId = `foto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

          await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
            range: 'fotos_verificacao!A:H',
            valueInputOption: 'RAW',
            requestBody: {
              values: [[
                userEmail,
                userName,
                hoje,
                agora,
                tempId,
                'https://exemplo.com/foto-temp',
                'https://exemplo.com/foto-temp',
                verificationType
              ]]
            }
          })
          console.log('✅ Dados salvos após criar aba')

        } catch (createError: any) {
          console.error('❌ Erro ao criar aba:', createError.message)
          throw new Error(`Erro ao criar aba fotos_verificacao: ${createError.message}`)
        }
      } else {
        throw sheetsError
      }
    }

    console.log('🎉 Processo completo!')
    return NextResponse.json({
      success: true,
      driveFileId: `temp_${Date.now()}`,
      viewLink: 'https://exemplo.com/foto-temp',
      directLink: 'https://exemplo.com/foto-temp',
      verificationType: verificationType,
      message: `Verificação ${verificationType} registrada com sucesso`
    })

  } catch (error: any) {
    console.error('❌ Erro geral:', error)
    return NextResponse.json({ 
      error: `Erro: ${error.message}` 
    }, { status: 500 })
  }
}