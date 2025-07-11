'use client'

import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import ModernPontoInterface from '@/components/ModernPontoInterface'
import PreFacialVerification from '@/components/PreFacialVerification'
import FacialRecognition from '@/components/FacialRecognition'
import LogoutButton from '@/components/LogoutButton'

interface DashboardClientProps {
  session: Session
}

export default function DashboardClient({ session }: DashboardClientProps) {
  const [currentStep, setCurrentStep] = useState<'pre-facial' | 'dashboard' | 'ponto-facial'>('pre-facial')
  const [pendingPontoData, setPendingPontoData] = useState<any>(null)

  // Verificar se usuário já fez verificação facial hoje
  useEffect(() => {
    checkDailyVerification()
  }, [])

  const checkDailyVerification = async () => {
    try {
      const response = await fetch('/api/check-daily-verification')
      const result = await response.json()
      
      if (result.verified) {
        // Usuário já fez verificação facial hoje, ir direto para dashboard
        setCurrentStep('dashboard')
      }
    } catch (error) {
      console.log('Erro ao verificar verificação diária, prosseguindo com verificação')
      // Em caso de erro, manter verificação por segurança
    }
  }

  // Função chamada quando verificação prévia é completa
  const handlePreVerificationComplete = () => {
    console.log('✅ Verificação prévia completa, indo para dashboard')
    setCurrentStep('dashboard')
  }

  // Função chamada quando usuário tenta registrar ponto
  const handlePontoAttempt = (pontoData: any) => {
    console.log('🎯 Dashboard: Recebido pedido de ponto:', pontoData)
    setPendingPontoData(pontoData)
    setCurrentStep('ponto-facial')
  }

  // Função chamada quando foto do ponto é capturada
  const handlePontoPhotoSuccess = async (photoFileId: string) => {
    console.log('📸 Dashboard: Foto do ponto capturada, registrando...', photoFileId)
    setCurrentStep('dashboard')

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

  // Função para pular verificação facial do ponto
  const handleSkipPontoFacial = async () => {
    console.log('⏭️ Dashboard: Pulando verificação facial do ponto')
    setCurrentStep('dashboard')
    
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

  // Função para pular verificação prévia
  const handleSkipPreVerification = () => {
    console.log('⏭️ Dashboard: Pulando verificação prévia')
    setCurrentStep('dashboard')
  }

  // Tela de verificação facial prévia
  if (currentStep === 'pre-facial') {
    return (
      <PreFacialVerification 
        onVerificationComplete={handlePreVerificationComplete}
        onSkip={handleSkipPreVerification}
      />
    )
  }

  // Tela de verificação facial para ponto
  if (currentStep === 'ponto-facial') {
    return (
      <FacialRecognition 
        onSuccess={handlePontoPhotoSuccess}
        onSkip={handleSkipPontoFacial}
      />
    )
  }

  // Dashboard principal
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
              Verificado ✓
            </div>
          </div>
        </div>

        {/* Interface de Ponto */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <ModernPontoInterface onPontoAttempt={handlePontoAttempt} />
        </div>

        {/* Rodapé com logout */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              🔒 Sistema com dupla verificação facial
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  )
}