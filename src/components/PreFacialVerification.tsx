'use client'

import { useState, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface PreFacialVerificationProps {
  onVerificationComplete: () => void
  onSkip?: () => void
}

export default function PreFacialVerification({ onVerificationComplete, onSkip }: PreFacialVerificationProps) {
  const { data: session } = useSession()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [error, setError] = useState('')
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [step, setStep] = useState<'welcome' | 'camera' | 'captured'>('welcome')

  const startCamera = useCallback(async () => {
    console.log('🎬 Tentando iniciar câmera...')
    try {
      setError('')
      setStep('camera') // Mudar para tela de câmera ANTES de pedir permissão
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      })

      console.log('✅ Stream obtido:', stream)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        // Aguardar o vídeo carregar
        videoRef.current.onloadedmetadata = () => {
          console.log('📹 Vídeo carregado, iniciando reprodução')
          setIsCameraActive(true)
        }
      }
    } catch (err: any) {
      console.error('❌ Erro ao acessar câmera:', err)
      setStep('welcome') // Voltar para tela inicial em caso de erro
      
      if (err.name === 'NotAllowedError') {
        setError('Permissão de câmera negada. Por favor, permita o acesso à câmera e tente novamente.')
      } else if (err.name === 'NotFoundError') {
        setError('Nenhuma câmera encontrada no dispositivo.')
      } else if (err.name === 'NotReadableError') {
        setError('Câmera está em uso por outro aplicativo.')
      } else {
        setError('Erro ao acessar câmera. Verifique as permissões e tente novamente.')
      }
    }
  }, [])

  const stopCamera = useCallback(() => {
    console.log('🛑 Parando câmera...')
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
      setIsCameraActive(false)
    }
  }, [])

  const capturePhoto = useCallback(() => {
    console.log('📸 Capturando foto...')
    if (!videoRef.current || !canvasRef.current) {
      console.error('❌ Elementos de vídeo ou canvas não encontrados')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) {
      console.error('❌ Contexto do canvas não disponível')
      return
    }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const photoData = canvas.toDataURL('image/jpeg', 0.8)
    console.log('✅ Foto capturada, tamanho:', photoData.length)
    
    setCapturedPhoto(photoData)
    setStep('captured')
  }, [])

  const confirmPhoto = useCallback(async () => {
    console.log('💾 Confirmando e enviando foto...')
    if (!capturedPhoto || !session?.user?.email) return

    setUploading(true)
    setError('')

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

      console.log('📤 Enviando foto para servidor...')
      const response = await fetch('/api/upload-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoData: capturedPhoto,
          userEmail: session.user.email,
          userName: session.user.name,
          verificationType: 'inicial'
        })
      })

      const result = await response.json()
      console.log('📥 Resposta do servidor:', result)

      if (response.ok) {
        console.log('✅ Upload bem-sucedido!')
        stopCamera()
        onVerificationComplete()
      } else {
        console.error('❌ Erro no upload:', result.error)
        setError(result.error || 'Erro ao fazer upload da foto')
      }
    } catch (err) {
      console.error('❌ Erro no upload:', err)
      setError('Erro ao enviar foto. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }, [capturedPhoto, session, stopCamera, onVerificationComplete])

  const retakePhoto = useCallback(() => {
    console.log('🔄 Refazendo foto...')
    setCapturedPhoto(null)
    setStep('camera')
  }, [])

  const goBack = useCallback(() => {
    console.log('⬅️ Voltando para tela inicial...')
    stopCamera()
    setStep('welcome')
    setCapturedPhoto(null)
    setError('')
  }, [stopCamera])

  // Tela de boas-vindas
  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Bem-vindo ao Sistema de Ponto!
            </h2>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white font-semibold">
                  {session?.user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">
                {session?.user?.name?.split(' ')[0]}
              </h3>
              <p className="text-gray-600 text-sm">
                {session?.user?.email}
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-800 mb-2">
                🔒 Verificação de Segurança
              </h4>
              <p className="text-blue-700 text-sm mb-4">
                Para garantir a segurança do sistema, precisamos verificar sua identidade através de uma foto.
              </p>
              
              <div className="space-y-2 text-xs text-blue-600">
                <div className="flex items-center">
                  <span className="w-4 h-4 bg-blue-200 rounded-full flex items-center justify-center mr-2">1</span>
                  Capture uma foto do seu rosto
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 bg-blue-200 rounded-full flex items-center justify-center mr-2">2</span>
                  Confirme a foto capturada
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 bg-blue-200 rounded-full flex items-center justify-center mr-2">3</span>
                  Acesse o sistema de ponto
                </div>
              </div>
            </div>

            <button
              onClick={startCamera}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-xl font-semibold transition-colors mb-4"
            >
              📸 Iniciar Verificação Facial
            </button>

            {onSkip && (
              <button
                onClick={onSkip}
                className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm transition-colors"
              >
                Pular verificação (não recomendado)
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Tela da câmera
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            📸 Verificação Facial
          </h2>
          <p className="text-gray-600 text-sm">
            {step === 'camera' ? 'Posicione seu rosto na câmera e capture' : 'Confirme se a foto está boa'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Área da câmera/foto */}
        <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-6" style={{ aspectRatio: '4/3' }}>
          {capturedPhoto ? (
            <img 
              src={capturedPhoto} 
              alt="Foto capturada" 
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              />
              
              {!isCameraActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-sm">Iniciando câmera...</p>
                  </div>
                </div>
              )}
            </>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {/* Overlay com guia */}
          {step === 'camera' && !capturedPhoto && isCameraActive && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="border-2 border-white border-dashed rounded-full w-48 h-48 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="text-2xl mb-2">👤</div>
                  <div className="text-sm">Posicione seu rosto aqui</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="space-y-3">
          {step === 'camera' && (
            <button
              onClick={capturePhoto}
              disabled={!isCameraActive}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-4 px-6 rounded-xl font-semibold transition-colors"
            >
              📸 Capturar Foto
            </button>
          )}

          {step === 'captured' && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={retakePhoto}
                className="bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-xl font-medium transition-colors"
              >
                🔄 Refazer
              </button>
              <button
                onClick={confirmPhoto}
                disabled={uploading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  '✅ Confirmar'
                )}
              </button>
            </div>
          )}

          {/* Botão voltar */}
          <button
            onClick={goBack}
            className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm transition-colors"
          >
            ← Voltar
          </button>
        </div>

        {/* Dicas */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-800 mb-2">💡 Dicas para uma boa foto:</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Certifique-se de que há boa iluminação</li>
            <li>• Remova óculos ou acessórios se possível</li>
            <li>• Olhe diretamente para a câmera</li>
            <li>• Mantenha uma expressão neutra</li>
          </ul>
        </div>
      </div>
    </div>
  )
}