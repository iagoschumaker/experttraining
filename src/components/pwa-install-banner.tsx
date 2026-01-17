'use client'

import { useState, useEffect } from 'react'
import { X, Download, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone === true

    setIsStandalone(isInstalled)

    if (isInstalled) {
      return
    }

    // Check if user has dismissed before
    const dismissed = localStorage.getItem('pwa-banner-dismissed')
    const lastShown = localStorage.getItem('pwa-banner-last-shown')
    const now = Date.now()
    
    // Show again after 7 days if dismissed
    if (dismissed && lastShown) {
      const daysSinceLastShown = (now - parseInt(lastShown)) / (1000 * 60 * 60 * 24)
      if (daysSinceLastShown < 7) {
        return
      }
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show banner after 3 seconds of login
      setTimeout(() => {
        setShowBanner(true)
        localStorage.setItem('pwa-banner-last-shown', now.toString())
      }, 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('PWA installed')
      localStorage.removeItem('pwa-banner-dismissed')
    }
    
    setDeferredPrompt(null)
    setShowBanner(false)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('pwa-banner-dismissed', 'true')
    localStorage.setItem('pwa-banner-last-shown', Date.now().toString())
  }

  const handleRemindLater = () => {
    setShowBanner(false)
    localStorage.setItem('pwa-banner-last-shown', Date.now().toString())
  }

  if (!showBanner || isStandalone) return null

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-in">
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 backdrop-blur-lg border-2 border-primary/30 rounded-xl shadow-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-foreground mb-1 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Instale o App Expert Training
            </h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Acesse rapidamente pela tela inicial do seu celular. Funciona offline e é mais rápido!
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
              >
                Instalar Agora
              </button>
              <button
                onClick={handleRemindLater}
                className="px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Depois
              </button>
            </div>
            <button
              onClick={handleDismiss}
              className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
            >
              Não mostrar novamente (por 7 dias)
            </button>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
