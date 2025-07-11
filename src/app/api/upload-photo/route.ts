import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { google } from 'googleapis'
import { Readable } from 'stream'

async function getAuthenticatedServices() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
  })

  const authClient = await auth.getClient()
  return {
    drive: google.drive({ version: 'v3', auth: authClient }),
    sheets: google.sheets({ version: 'v4', auth: authClient })
  }
}

// Converter Buffer para Stream
function bufferToStream(buffer: Buffer): Readable {
  const readable = new Readable({
    read() {}
  })
  readable.push(buffer)
  readable.push(null)
  return readable
}

// Criar subpasta se não existir
async function createSubfolderIfNotExists(drive: any, folderName: string, parentFolderId: string) {
  try {
    // Verificar se subpasta já existe
    const searchQuery = `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    
    const existingFolders = await drive.files.list({
      q: searchQuery,
      fields: 'files(id, name)'
    })

    if (existingFolders.data.files && existingFolders.data.files.length > 0) {
      return existingFolders.data.files[0].id
    }

    // Criar nova subpasta
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    }

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    })

    return folder.data.id
  } catch (error) {
    console.error('Erro ao criar subpasta:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  console.log('🔍 API upload-photo iniciada (versão com upload real)')
  
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

    const { photoData, userEmail, userName, verificationType = 'inicial' } = body

    if (!photoData) {
      console.log('❌ PhotoData ausente')
      return NextResponse.json({ error: 'Dados da foto são obrigatórios' }, { status: 400 })
    }

    // Verificar se pasta compartilhada está configurada
    if (!process.env.GOOGLE_DRIVE_FOLDER_ID) {
      console.log('❌ GOOGLE_DRIVE_FOLDER_ID não configurado')
      return NextResponse.json({ 
        error: 'Pasta do Google Drive não configurada. Configure GOOGLE_DRIVE_FOLDER_ID.' 
      }, { status: 500 })
    }

    console.log('🔐 Conectando aos serviços Google...')
    const { drive, sheets } = await getAuthenticatedServices()

    console.log('🔄 Processando foto...')
    const base64Data = photoData.replace(/^data:image\/jpeg;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')
    const imageStream = bufferToStream(imageBuffer)
    
    console.log('📏 Tamanho da foto:', imageBuffer.length, 'bytes')

    // Criar estrutura de subpastas
    console.log('📁 Organizando pastas...')
    const mainFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID
    
    // Criar subpasta por tipo de verificação
    let typeFolderId: string
    if (verificationType === 'inicial') {
      typeFolderId = await createSubfolderIfNotExists(drive, 'verificacao-inicial', mainFolderId)
    } else {
      typeFolderId = await createSubfolderIfNotExists(drive, 'ponto-facial', mainFolderId)
    }
    
    // Criar subpasta por usuário
    const userFolderName = userEmail.replace('@', '_').replace(/\./g, '_')
    const userFolderId = await createSubfolderIfNotExists(drive, userFolderName, typeFolderId)

    // Nome do arquivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `${timestamp}_${verificationType}_${userEmail.split('@')[0]}.jpg`
    
    console.log('📤 Fazendo upload da foto:', fileName)

    // Metadados do arquivo
    const fileMetadata = {
      name: fileName,
      parents: [userFolderId],
      description: `Verificação ${verificationType} - ${userName} - ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Manaus' })}`
    }

    // Upload da foto
    const uploadResponse = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: 'image/jpeg',
        body: imageStream
      },
      fields: 'id, name, webViewLink, webContentLink'
    })

    const fileId = uploadResponse.data.id
    console.log('✅ Upload concluído! File ID:', fileId)

    // Tornar arquivo público para visualização
    console.log('🔓 Configurando permissões públicas...')
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    })

    // Gerar links
    const viewLink = `https://drive.google.com/file/d/${fileId}/view`
    const directLink = `https://drive.google.com/uc?id=${fileId}`

    console.log('📊 Salvando no Google Sheets...')
    try {
      const hoje = new Date().toISOString().split('T')[0]
      const agora = new Date().toLocaleTimeString('pt-BR', { 
        timeZone: 'America/Manaus',
        hour12: false 
      })

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
            fileId,
            viewLink,
            directLink,
            verificationType
          ]]
        }
      })
      console.log('✅ Dados salvos na planilha')

    } catch (sheetsError: any) {
      console.error('❌ Erro ao salvar no Sheets:', sheetsError.message)
      
      // Tentar criar aba se não existir
      if (sheetsError.message.includes('Unable to parse range')) {
        console.log('🔧 Criando aba fotos_verificacao...')
        
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

        // Adicionar cabeçalhos
        await sheets.spreadsheets.values.update({
          spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
          range: 'fotos_verificacao!A1:H1',
          valueInputOption: 'RAW',
          requestBody: {
            values: [['email', 'nome', 'data', 'hora', 'file_id', 'view_link', 'direct_link', 'tipo_verificacao']]
          }
        })

        // Tentar salvar dados novamente
        const hoje = new Date().toISOString().split('T')[0]
        const agora = new Date().toLocaleTimeString('pt-BR', { 
          timeZone: 'America/Manaus',
          hour12: false 
        })

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
              fileId,
              viewLink,
              directLink,
              verificationType
            ]]
          }
        })
        console.log('✅ Aba criada e dados salvos')
      }
    }

    console.log('🎉 Processo completo!')
    console.log('🔗 Links gerados:')
    console.log('   - View:', viewLink)
    console.log('   - Direct:', directLink)

    return NextResponse.json({
      success: true,
      driveFileId: fileId,
      viewLink: viewLink,
      directLink: directLink,
      verificationType: verificationType,
      message: `Foto de ${verificationType} salva com sucesso no Google Drive`
    })

  } catch (error: any) {
    console.error('❌ Erro geral:', error)
    return NextResponse.json({ 
      error: `Erro interno: ${error.message}` 
    }, { status: 500 })
  }
}