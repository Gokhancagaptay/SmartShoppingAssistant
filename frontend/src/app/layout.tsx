import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Online Market AI Assistant',
  description: 'Yapay zeka destekli akıllı alışveriş asistanı — stok takibi, tarif önerileri ve beslenme analizi.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        {/* Providers: QueryClient + MUI AppRouterCache + AppThemeProvider + CssBaseline */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
