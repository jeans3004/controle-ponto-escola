export function calcularDistancia(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
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

export function validarLocalizacao(
  userLat: number, userLon: number
): boolean {
  const escolaLat = parseFloat(process.env.ESCOLA_LATITUDE!)
  const escolaLon = parseFloat(process.env.ESCOLA_LONGITUDE!)
  const raioPermitido = parseInt(process.env.ESCOLA_RAIO_METROS!)

  const distancia = calcularDistancia(userLat, userLon, escolaLat, escolaLon)
  return distancia <= raioPermitido
}

export function obterLocalizacao(): Promise<GeolocationPosition> {
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
        timeout: 10000,
        maximumAge: 0
      }
    )
  })
}