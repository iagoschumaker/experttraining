import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './print.css'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'

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
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Expert Training',
  },
  icons: {
    icon: '/icon-192.svg',
    apple: '/icon-192.svg',
  },
  themeColor: '#00C2D1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#00C2D1" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
          <PWAInstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  )
}
