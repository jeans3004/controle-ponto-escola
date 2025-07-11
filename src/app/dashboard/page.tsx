'use client'

import { useState } from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ModernPontoInterface from '@/components/ModernPontoInterface'
import FacialRecognition from '@/components/FacialRecognition'
import LogoutButton from '@/components/LogoutButton'

// Componente que gerencia o fluxo de verificação facial + registro de ponto
function PontoWithFacialVerification() {
  const [showFacialRecognition, setShowFacialRecognition] = useState(false)
  const [pendingPontoData, setPendingPontoData] = useState<any>(null)
  const [photoVerified, setPhotoVerified] = useState(false)

  // Função chamada quando usuário tenta registrar ponto
  const handlePontoAttempt = (pontoData: any) => {
    setPendingPontoData(pontoData)
    setShowFacialRecognition(true)
  }

  // Função chamada quando foto é capturada com sucesso
  const handlePhotoSuccess = async (photoFileId: string) => {
    setPhotoVerified(true)
    setShowFacialRecognition(false)

    // Agora registrar o ponto com o link da foto
    try {
      const response = await fetch('/api/sheets/registro-ponto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pendingPontoData,
          photoLink: `https://drive.google.com/file/d/${photoFileId}/view`
        })
      })

      const result = await response.json()
      
      if (response.ok) {
        alert(`✅ ${result.message}`)
        window.location.reload() // Recarregar para atualizar status
      } else {
        alert(`❌ ${result.error}`)
      }
    } catch (error) {
      console.error('Erro ao registrar ponto:', error)
      alert('❌ Erro ao registrar ponto')
    }

    setPendingPontoData(null)
  }

  // Função para pular verificação facial (opcional)
  const handleSkipFacial = async () => {
    setShowFacialRecognition(false)
    
    // Registrar ponto sem foto
    try {
      const response = await fetch('/api/sheets/registro-ponto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingPontoData)
      })

      const result = await response.json()
      
      if (response.ok) {
        alert(`✅ ${result.message} (sem verificação facial)`)
        window.location.reload()
      } else {
        alert(`❌ ${result.error}`)
      }
    } catch (error) {
      console.error('Erro ao registrar ponto:', error)
      alert('❌ Erro ao registrar ponto')
    }

    setPendingPontoData(null)
  }

  if (showFacialRecognition) {
    return (
      <FacialRecognition 
        onSuccess={handlePhotoSuccess}
        onSkip={handleSkipFacial}
      />
    )
  }

  return (
    <ModernPontoInterface 
      onPontoAttempt={handlePontoAttempt}
    />
  )
}

export default async function Dashboard() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header do usuário */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-white font-semibold">
                {session.user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-800 mb-1">
              Olá, {session.user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-gray-600 text-sm mb-4">
              {session.user?.email}
            </p>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Online
            </div>
          </div>
        </div>

        {/* Interface de Ponto com Verificação Facial */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <PontoWithFacialVerification />
        </div>

        {/* Rodapé com logout */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              🔒 Sistema com verificação facial
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  )
}