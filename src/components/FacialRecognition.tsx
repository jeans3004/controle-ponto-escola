'use client'

import { useState, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'

interface FacialRecognitionProps {
  onSuccess: (photoData: string) => void
  onSkip?: () => void
}

export default function FacialRecognition({ onSuccess, onSkip }: FacialRecognitionProps) {
  const { data: session } = useSession()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [error, setError] = useState('')
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const startCamera = useCallback(async () => {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsCameraActive(true)
      }
    } catch (err) {
      console.error('Erro ao acessar câmera:', err)
      setError('Não foi possível acessar a câmera. Verifique as permissões.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
      setIsCameraActive(false)
    }
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Definir dimensões do canvas
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Capturar frame atual
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Converter para base64
    const photoData = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedPhoto(photoData)
    setIsCapturing(true)
  }, [])

  const uploadPhoto = useCallback(async () => {
    if (!capturedPhoto || !session?.user?.email) return

    setUploading(true)
    setError('')

    try {
      // Criar nome único para o arquivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `facial-recognition/${session.user.email}/${timestamp}.jpg`

      // Upload para Google Drive via API
      const response = await fetch('/api/upload-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          photoData: capturedPhoto,
          fileName,
          userEmail: session.user.email,
          userName: session.user.name
        })
      })

      const result = await response.json()

      if (response.ok) {
        stopCamera()
        onSuccess(result.driveFileId)
      } else {
        setError(result.error || 'Erro ao fazer upload da foto')
      }
    } catch (err) {
      console.error('Erro no upload:', err)
      setError('Erro ao enviar foto. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }, [capturedPhoto, session, stopCamera, onSuccess])

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null)
    setIsCapturing(false)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Verificação Facial
          </h2>
          <p className="text-gray-600 text-sm">
            Tire uma foto para confirmar sua identidade
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

        <div className="space-y-4">
          {/* Área da câmera/foto */}
          <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
            {!isCameraActive && !capturedPhoto && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586l-.707-.707A1 1 0 0013 4H7a1 1 0 00-.707.293L5.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  <p className="text-gray-500 text-sm">Clique para ativar a câmera</p>
                </div>
              </div>
            )}

            {capturedPhoto && (
              <img 
                src={capturedPhoto} 
                alt="Foto capturada" 
                className="w-full h-full object-cover"
              />
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCameraActive && !capturedPhoto ? 'block' : 'hidden'}`}
            />

            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Botões de ação */}
          <div className="space-y-3">
            {!isCameraActive && !capturedPhoto && (
              <button
                onClick={startCamera}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Ativar Câmera
              </button>
            )}

            {isCameraActive && !isCapturing && (
              <button
                onClick={capturePhoto}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                📸 Capturar Foto
              </button>
            )}

            {capturedPhoto && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={retakePhoto}
                  className="bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  🔄 Refazer
                </button>
                <button
                  onClick={uploadPhoto}
                  disabled={uploading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  {uploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    '✅ Confirmar'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Botão para pular (opcional) */}
          {onSkip && (
            <div className="pt-4 border-t">
              <button
                onClick={onSkip}
                className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm transition-colors"
              >
                Pular verificação facial (não recomendado)
              </button>
            </div>
          )}
        </div>

        {/* Informações sobre privacidade */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-800 mb-1">
                Privacidade e Segurança
              </h4>
              <p className="text-xs text-blue-600">
                Sua foto será armazenada de forma segura e usada apenas para verificação de identidade no registro de ponto.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}