import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ModernPontoInterface from '@/components/ModernPontoInterface'
import LogoutButton from '@/components/LogoutButton'
import DebugLocation from '@/components/DebugLocation'

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

        {/* Interface de Ponto */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <ModernPontoInterface />

           {/* Debug temporário - remover depois */}
          <DebugLocation />
        </div>

        {/* Rodapé com logout */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Centro de Educação Integral Christ Master
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  )
}