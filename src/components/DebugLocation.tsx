'use client'

import { useState } from 'react'

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  timestamp: string
  distanciaEscola?: number
}

export default function DebugLocation() {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [error, setError] = useState('')

  const testLocation = () => {
    setError('')
    setLocation(null)

    if (!navigator.geolocation) {
      setError('Geolocalização não suportada')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        const locationData: LocationData = {
          latitude,
          longitude,
          accuracy,
          timestamp: new Date().toLocaleString()
        }
        
        // Calcular distância para a escola (usando valores do .env)
        const escolaLat = -3.1190275 // Substitua pelo valor real
        const escolaLon = -60.0218038 // Substitua pelo valor real
        
        const R = 6371e3
        const φ1 = latitude * Math.PI / 180
        const φ2 = escolaLat * Math.PI / 180
        const Δφ = (escolaLat - latitude) * Math.PI / 180
        const Δλ = (escolaLon - longitude) * Math.PI / 180

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        const distance = R * c

        locationData.distanciaEscola = Math.round(distance)
        setLocation(locationData)
      },
      (err) => {
        setError(`Erro: ${err.message}`)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    )
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
      <h3 className="font-semibold text-yellow-800 mb-2">🔍 Debug de Localização</h3>
      
      <button
        onClick={testLocation}
        className="bg-yellow-600 text-white px-3 py-1 rounded text-sm mb-3"
      >
        Testar Localização
      </button>

      {error && (
        <div className="text-red-600 text-sm mb-2">
          {error}
        </div>
      )}

      {location && (
        <div className="text-sm space-y-1">
          <div><strong>Latitude:</strong> {location.latitude}</div>
          <div><strong>Longitude:</strong> {location.longitude}</div>
          <div><strong>Precisão:</strong> {location.accuracy}m</div>
          <div><strong>Distância da escola:</strong> {location.distanciaEscola}m</div>
          <div><strong>Timestamp:</strong> {location.timestamp}</div>
          <div className="mt-2">
            <a 
              href={`https://maps.google.com/?q=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Ver no Google Maps
            </a>
          </div>
        </div>
      )}
    </div>
  )
}