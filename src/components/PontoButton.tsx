'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
// import { obterLocalizacao, validarLocalizacao } from '@/lib/geolocation'

export default function PontoButton() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRegistrarPonto = async () => {
    setLoading(true)
    setError('')

    try {
      // 1. Obter localização
      if (!navigator.geolocation) {
        setError('Geolocalização não suportada pelo navegador')
        return
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        })
      })

      const { latitude, longitude } = position.coords

      // 2. Validar localização (implementar depois)
      // if (!validarLocalizacao(latitude, longitude)) {
      //   setError('Você não está na localização da escola')
      //   return
      // }

      // 3. Registrar ponto
      const response = await fetch('/api/sheets/registro-ponto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session?.user?.email,
          nome: session?.user?.name,
          tipo: 'entrada', // ou 'saida' baseado no estado
          latitude,
          longitude
        })
      })

      if (response.ok) {
        // Sucesso - recarregar página ou atualizar estado
        alert('Ponto registrado com sucesso!')
        window.location.reload()
      } else {
        setError('Erro ao registrar ponto')
      }
    } catch (err) {
      setError('Erro ao obter localização. Permita o acesso à localização.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="text-center">
      <button 
        onClick={handleRegistrarPonto}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-6 rounded-lg font-medium transition-colors duration-200"
      >
        {loading ? 'Registrando...' : 'Registrar Entrada'}
      </button>
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
    </div>
  )
}