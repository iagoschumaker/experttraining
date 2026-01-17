import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './print.css'
import { ThemeProvider } from '@/contexts/ThemeContext'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'EXPERT PRO TRAINING',
    template: '%s | EXPERT PRO TRAINING',
  },
  description: 'Sistema de treino funcional híbrido baseado em padrões de movimento e capacidades físicas',
  keywords: ['treino funcional', 'método expert', 'avaliação física', 'personal trainer'],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
