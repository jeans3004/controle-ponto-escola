'use client'

import { useState } from 'react'

interface LocationData {
  userLatitude: number
  userLongitude: number
  escolaLatitude: number
  escolaLongitude: number
  distancia: number
  raioPermitido: number
  permitido: boolean
  precisao: number
  timestamp: string
}

export default function LocationDebug() {
  const [locationData, setLocationData] = useState<LocationData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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

  const testarLocalizacao = async () => {
    setLoading(true)
    setError('')
    setLocationData(null)

    try {
      // Obter localização do usuário
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        })
      })

      const userLat = position.coords.latitude
      const userLon = position.coords.longitude
      const precisao = position.coords.accuracy

      // Coordenadas da escola (você deve ajustar estas)
      const escolaLat = -3.1190275  // AJUSTAR PARA COORDENADAS REAIS DA ESCOLA
      const escolaLon = -60.0218038 // AJUSTAR PARA COORDENADAS REAIS DA ESCOLA
      const raioPermitido = 50      // 50 metros de raio

      // Calcular distância
      const distancia = calcularDistancia(userLat, userLon, escolaLat, escolaLon)
      const permitido = distancia <= raioPermitido

      setLocationData({
        userLatitude: userLat,
        userLongitude: userLon,
        escolaLatitude: escolaLat,
        escolaLongitude: escolaLon,
        distancia: Math.round(distancia),
        raioPermitido,
        permitido,
        precisao: Math.round(precisao),
        timestamp: new Date().toLocaleString()
      })

    } catch (err: any) {
      setError(`Erro: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mt-4">
      <h3 className="font-bold text-yellow-800 mb-3">🔍 Debug de Localização GPS</h3>
      
      <button
        onClick={testarLocalizacao}
        disabled={loading}
        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded mb-4 disabled:opacity-50"
      >
        {loading ? 'Testando...' : 'Testar Localização Atual'}
      </button>

      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      {locationData && (
        <div className="space-y-3">
          <div className={`p-4 rounded-lg ${locationData.permitido ? 'bg-green-100 border-green-300' : 'bg-red-100 border-red-300'}`}>
            <h4 className={`font-bold ${locationData.permitido ? 'text-green-800' : 'text-red-800'}`}>
              {locationData.permitido ? '✅ PERMITIDO' : '❌ BLOQUEADO'}
            </h4>
            <p className={`text-sm ${locationData.permitido ? 'text-green-700' : 'text-red-700'}`}>
              Distância: {locationData.distancia}m (limite: {locationData.raioPermitido}m)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-blue-50 p-3 rounded">
              <h5 className="font-semibold text-blue-800">📍 Sua Localização</h5>
              <p>Latitude: {locationData.userLatitude.toFixed(6)}</p>
              <p>Longitude: {locationData.userLongitude.toFixed(6)}</p>
              <p>Precisão: {locationData.precisao}m</p>
            </div>

            <div className="bg-purple-50 p-3 rounded">
              <h5 className="font-semibold text-purple-800">🏫 Escola</h5>
              <p>Latitude: {locationData.escolaLatitude.toFixed(6)}</p>
              <p>Longitude: {locationData.escolaLongitude.toFixed(6)}</p>
              <p>Raio: {locationData.raioPermitido}m</p>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded text-sm">
            <h5 className="font-semibold text-gray-800">📊 Informações</h5>
            <p>Distância calculada: {locationData.distancia} metros</p>
            <p>Timestamp: {locationData.timestamp}</p>
            <p>Status: {locationData.permitido ? 'Dentro da área' : 'Fora da área'}</p>
          </div>

          <div className="bg-blue-50 p-3 rounded text-sm">
            <h5 className="font-semibold text-blue-800">🗺️ Links úteis</h5>
            <div className="space-y-1">
              <a 
                href={`https://maps.google.com/?q=${locationData.userLatitude},${locationData.userLongitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-600 underline"
              >
                📍 Ver sua localização no Google Maps
              </a>
              <a 
                href={`https://maps.google.com/?q=${locationData.escolaLatitude},${locationData.escolaLongitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-600 underline"
              >
                🏫 Ver localização da escola no Google Maps
              </a>
              <a 
                href={`https://maps.google.com/maps?q=${locationData.userLatitude},${locationData.userLongitude}&q=${locationData.escolaLatitude},${locationData.escolaLongitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-blue-600 underline"
              >
                📏 Ver distância entre os dois pontos
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
        <p><strong>Como corrigir:</strong></p>
        <p>1. Vá até a escola fisicamente</p>
        <p>2. Execute este teste</p>
        <p>3. Anote as coordenadas exibidas</p>
        <p>4. Configure no sistema com raio de 30-50 metros</p>
      </div>
    </div>
  )
}