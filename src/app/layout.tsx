import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './print.css'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'
import { ServiceWorkerRegister } from '@/components/service-worker-register'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#F5A623',
}

export const metadata: Metadata = {
  title: {
    default: 'Kinex Performance',
    template: '%s | Kinex Performance',
  },
  description: 'Sistema de gestão completo para Studios e Personal Trainers — Kinex Performance',
  keywords: ['treino funcional', 'kinex performance', 'avaliação física', 'personal trainer'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kinex Performance',
  },
  icons: {
    icon: '/kinex-logo.jpg',
    apple: '/kinex-logo.jpg',
  },
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
        <meta name="theme-color" content="#F5A623" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
          <PWAInstallPrompt />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  )
}
