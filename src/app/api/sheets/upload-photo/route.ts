import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { google } from 'googleapis'

async function getAuthenticatedDrive() {
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

async function createFolderIfNotExists(drive: any, folderName: string, parentFolderId?: string) {
  try {
    // Verificar se a pasta já existe
    const searchQuery = parentFolderId 
      ? `name='${folderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
      : `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`

    const existingFolders = await drive.files.list({
      q: searchQuery,
      fields: 'files(id, name)'
    })

    if (existingFolders.data.files && existingFolders.data.files.length > 0) {
      return existingFolders.data.files[0].id
    }

    // Criar nova pasta
    const folderMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined
    }

    const folder = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    })

    return folder.data.id
  } catch (error) {
    console.error('Erro ao criar pasta:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { photoData, userEmail, userName } = body

    if (!photoData) {
      return NextResponse.json({ error: 'Dados da foto são obrigatórios' }, { status: 400 })
    }

    const { drive, sheets } = await getAuthenticatedDrive()

    // Converter base64 para buffer
    const base64Data = photoData.replace(/^data:image\/jpeg;base64,/, '')
    const imageBuffer = Buffer.from(base64Data, 'base64')

    // Criar estrutura de pastas
    const mainFolderId = await createFolderIfNotExists(drive, 'Controle-Ponto-Fotos')
    const userFolderId = await createFolderIfNotExists(drive, userEmail.replace('@', '_'), mainFolderId)

    // Nome do arquivo com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `${timestamp}_${userEmail.split('@')[0]}.jpg`

    // Upload da foto para Google Drive
    const fileMetadata = {
      name: fileName,
      parents: [userFolderId],
      description: `Foto de verificação facial - ${userName} - ${new Date().toLocaleString('pt-BR')}`
    }

    const media = {
      mimeType: 'image/jpeg',
      body: imageBuffer
    }

    const uploadResponse = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink'
    })

    const fileId = uploadResponse.data.id
    const viewLink = uploadResponse.data.webViewLink

    // Tornar o arquivo público para visualização
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    })

    // Registrar no Google Sheets (tabela de fotos)
    try {
      const hoje = new Date().toISOString().split('T')[0]
      const agora = new Date().toLocaleTimeString('pt-BR', { 
        timeZone: 'America/Manaus',
        hour12: false 
      })

      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
        range: 'fotos_verificacao!A:G',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            userEmail,
            userName,
            hoje,
            agora,
            fileId,
            viewLink,
            `https://drive.google.com/file/d/${fileId}/view`
          ]]
        }
      })
    } catch (sheetsError) {
      console.error('Erro ao salvar no Sheets (mas foto foi salva):', sheetsError)
      // Não falha a requisição se apenas o Sheets der erro
    }

    return NextResponse.json({
      success: true,
      driveFileId: fileId,
      viewLink: viewLink,
      directLink: `https://drive.google.com/file/d/${fileId}/view`,
      message: 'Foto enviada com sucesso'
    })

  } catch (error) {
    console.error('Erro no upload da foto:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor ao fazer upload' 
    }, { status: 500 })
  }
}