import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { google } from 'googleapis'

// Função para validar email na planilha
async function validateUserEmail(email: string): Promise<boolean> {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
        private_key: process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const authClient = await auth.getClient()
    const sheets = google.sheets({ version: 'v4', auth: authClient })
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID!,
      range: 'usuarios_autorizados!A:A',
    })

    const emails = response.data.values?.flat() || []
    return emails.includes(email)
  } catch (error) {
    console.error('Erro ao validar email:', error)
    return false
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (user.email) {
        const isAuthorized = await validateUserEmail(user.email)
        if (!isAuthorized) {
          console.log(`Email não autorizado: ${user.email}`)
          return false
        }
        return true
      }
      return false
    },
    async session({ session }) {
      return session
    },
    async jwt({ token }) {
      return token
    },
  },
  pages: {
    signIn: '/', // Redireciona para a página inicial se não autenticado
    error: '/', // Em caso de erro, volta para a página inicial
  },
  events: {
    async signIn(message) {
      console.log('Login realizado:', message.user.email)
    },
  },
}