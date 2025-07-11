// src/app/api/sheets/registro-ponto/route.ts - Versão Corrigida

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { google } from 'googleapis'
import { JWT } from 'google-auth-library'

// Função para calcular distância entre coordenadas
function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // Raio da Terra em metros
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c
}

// Função para validar localização (com logs detalhados)
function validarLocalizacao(userLat: number, userLon: number): { valido: boolean, distancia: number, detalhes: string } {
  const escolaLat = parseFloat(process.env.ESCOLA_LATITUDE || '-3.1190275')
  const escolaLon = parseFloat(process.env.ESCOLA_LONGITUDE || '-60.0218038')
  const raioPermitido = parseInt(process.env.ESCOLA_RAIO_METROS || '50')

  const distancia = calcularDistancia(userLat, userLon, escolaLat, escolaLon)
  const valido = distancia <= raioPermitido
  
  const detalhes = `
    Usuário: ${userLat.toFixed(6)}, ${userLon.toFixed(6)}
    Escola: ${escolaLat.toFixed(6)}, ${escolaLon.toFixed(6)}
    Distância: ${Math.round(distancia)}m
    Raio permitido: ${raioPermitido}m
    Status: ${valido ? 'PERMITIDO' : 'BLOQUEADO'}
  `
  
  console.log('=== VALIDAÇÃO DE LOCALIZAÇÃO ===')
  console.log(detalhes)
  console.log('=================================')
  
  return { valido, distancia: Math.round(distancia), detalhes }
}

// Função para obter cliente autenticado do Google Sheets (tipagem corrigida)
async function getAuthenticatedSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  const authClient = await auth.getClient() as JWT
  return google.sheets({ version: 'v4', auth: authClient })
}

// Função para buscar registro do dia atual
async function getRegistroHoje(email: string) {
  try {
    const sheets = await getAuthenticatedSheets()
    const hoje = new Date().toISOString().split('T')[0]
    
    const response = await sheets.spreadsheets.values.get({
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { tipo, latitude, longitude } = body

    // Validar dados obrigatórios
    if (!tipo || latitude === undefined || longitude === undefined) {
      return NextResponse.json({ 
        error: 'Dados obrigatórios: tipo, latitude, longitude' 
      }, { status: 400 })
    }

    // Validar localização com detalhes
    const validacao = validarLocalizacao(latitude, longitude)
    
    if (!validacao.valido) {
      return NextResponse.json({ 
        error: `Você não está na localização da escola. Distância: ${validacao.distancia}m (máximo: ${process.env.ESCOLA_RAIO_METROS || 50}m)`,
        distancia: validacao.distancia,
        detalhes: validacao.detalhes
      }, { status: 403 })
    }

    const sheets = await getAuthenticatedSheets()
    const agora = new Date()
    const data = agora.toISOString().split('T')[0]
    const hora = agora.toLocaleTimeString('pt-BR', { 
      timeZone: 'America/Manaus',
      hour12: false 
    })

    const registroExistente = await getRegistroHoje(session.user.email)

    if (tipo === 'entrada') {
      if (registroExistente) {
        return NextResponse.json({ 
          error: 'Entrada já registrada hoje' 
        }, { status: 400 })
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
        range: 'registros_ponto!A:G',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            session.user.email,
            session.user.name,
            data,
            hora,
            '',
            latitude,
            longitude
          ]]
        }
      })

      return NextResponse.json({ 
        success: true, 
        message: `Entrada registrada com sucesso (${validacao.distancia}m da escola)`,
        hora,
        distancia: validacao.distancia
      })

    } else if (tipo === 'saida') {
      if (!registroExistente) {
        return NextResponse.json({ 
          error: 'Você precisa registrar a entrada primeiro' 
        }, { status: 400 })
      }

      if (registroExistente.saida) {
        return NextResponse.json({ 
          error: 'Saída já registrada hoje' 
        }, { status: 400 })
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
        range: `registros_ponto!E${registroExistente.rowIndex}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[hora]]
        }
      })

      return NextResponse.json({ 
        success: true, 
        message: `Saída registrada com sucesso (${validacao.distancia}m da escola)`,
        hora,
        distancia: validacao.distancia
      })
    }

    return NextResponse.json({ 
      error: 'Tipo de registro inválido' 
    }, { status: 400 })

  } catch (error) {
    console.error('Erro na API:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
}