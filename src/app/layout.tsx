import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Expert Training',
    template: '%s | Expert Training',
  },
  description: 'Sistema de treino funcional híbrido baseado em padrões de movimento e capacidades físicas',
  keywords: ['treino funcional', 'método expert', 'avaliação física', 'personal trainer'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
