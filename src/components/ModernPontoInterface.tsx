'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface StatusPonto {
  temEntrada: boolean
  temSaida: boolean
  proximaAcao: 'entrada' | 'saida' | 'completo'
  horarioEntrada?: string
  horarioSaida?: string
}

export default function ModernPontoInterface() {
  const { } = useSession()
  const [status, setStatus] = useState<StatusPonto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [horaAtual, setHoraAtual] = useState('')

  // Atualizar hora atual a cada segundo
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setHoraAtual(now.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Manaus',
        hour12: false
      }))
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  // Buscar status do ponto
  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/sheets/status-ponto')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Erro ao buscar status:', error)
    }
  }

  const obterLocalizacao = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      )
    })
  }

  const handleRegistrarPonto = async (tipo: 'entrada' | 'saida') => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // 1. Obter localização
      const position = await obterLocalizacao()
      const { latitude, longitude } = position.coords

      console.log('Localização obtida:', { latitude, longitude })

      // 2. Registrar ponto
      const response = await fetch('/api/sheets/registro-ponto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          latitude,
          longitude
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        await fetchStatus() // Atualizar status
      } else {
        setError(data.error || 'Erro ao registrar ponto')
      }
    } catch (err) {
      console.error('Erro:', err)
      if (err instanceof Error) {
        if (err.message.includes('User denied')) {
          setError('Permita o acesso à localização para continuar')
        } else if (err.message.includes('Timeout')) {
          setError('Tempo limite para obter localização. Tente novamente.')
        } else {
          setError('Erro ao obter localização. Verifique se o GPS está ativo.')
        }
      } else {
        setError('Erro desconhecido ao obter localização')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!status) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Relógio Digital */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white text-center">
        <div className="text-3xl font-mono font-bold mb-2">
          {horaAtual}
        </div>
        <div className="text-blue-100 text-sm">
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* Status do Dia */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          Status do Ponto Hoje
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
              status.temEntrada ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm font-medium text-gray-700">Entrada</div>
            <div className="text-xs text-gray-500">
              {status.horarioEntrada || '--:--'}
            </div>
          </div>
          
          <div className="text-center">
            <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
              status.temSaida ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-sm font-medium text-gray-700">Saída</div>
            <div className="text-xs text-gray-500">
              {status.horarioSaida || '--:--'}
            </div>
          </div>
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="space-y-3">
        {status.proximaAcao === 'entrada' && (
          <button
            onClick={() => handleRegistrarPonto('entrada')}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 px-6 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span>Registrar Entrada</span>
              </>
            )}
          </button>
        )}

        {status.proximaAcao === 'saida' && (
          <button
            onClick={() => handleRegistrarPonto('saida')}
            disabled={loading}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 px-6 rounded-2xl font-semibold transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <span>Registrar Saída</span>
              </>
            )}
          </button>
        )}

        {status.proximaAcao === 'completo' && (
          <div className="bg-gray-50 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">Ponto Completo!</h3>
            <p className="text-gray-600 text-sm">
              Você já registrou entrada e saída hoje.
            </p>
          </div>
        )}
      </div>

      {/* Mensagens */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Informações de Localização */}
      <div className="bg-blue-50 rounded-2xl p-4">
        <div className="flex items-center text-blue-700">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">
            O ponto só pode ser registrado na escola
          </span>
        </div>
      </div>
    </div>
  )
}