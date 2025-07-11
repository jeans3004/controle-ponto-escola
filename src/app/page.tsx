import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LoginButton from '@/components/LoginButton'

export default async function Home() {
  // Verificar se o usuário já está logado
  const session = await getServerSession(authOptions)
  
  // Se estiver logado, redirecionar para o dashboard
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Controle de Ponto
          </h1>
          <p className="text-gray-600 mb-6">
            Centro de Educação Integral Christ Master
          </p>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h2 className="font-semibold mb-2">
              Sistema de controle de ponto para professores
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Faça login com sua conta Google para registrar seu ponto
            </p>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <span className="text-red-500 mr-2">📍</span>
                Validação por localização GPS
              </div>
              <div className="flex items-center">
                <span className="text-orange-500 mr-2">🔒</span>
                Acesso seguro com Google
              </div>
              <div className="flex items-center">
                <span className="text-blue-500 mr-2">📊</span>
                Registro automático em planilha
              </div>
            </div>
          </div>
          
          <LoginButton />
        </div>
      </div>
    </div>
  )
}