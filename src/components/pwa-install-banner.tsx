'use client'

import { useState, useEffect } from 'react'
import { X, Download, Smartphone, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone === true

    setIsStandalone(isInstalled)

    if (isInstalled) {
      return
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIOSDevice)

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

    // Para iOS, mostrar banner após 2 segundos (não tem beforeinstallprompt)
    if (isIOSDevice) {
      setTimeout(() => {
        setShowBanner(true)
        localStorage.setItem('pwa-banner-last-shown', now.toString())
      }, 2000)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show banner after 2 seconds
      setTimeout(() => {
        setShowBanner(true)
        localStorage.setItem('pwa-banner-last-shown', now.toString())
      }, 2000)
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

  // Conteúdo específico para iOS (instruções manuais)
  if (isIOS) {
    return (
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-in-bottom">
        <div className="bg-card/95 backdrop-blur-lg border-2 border-primary/30 rounded-xl shadow-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Share className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-foreground mb-1">
                Instale o App Expert Training
              </h3>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Toque em <Share className="w-3 h-3 inline mx-1" /> e depois em <strong>"Adicionar à Tela de Início"</strong>
              </p>
              <button
                onClick={handleDismiss}
                className="text-xs text-primary hover:text-primary/80 font-medium"
              >
                Entendi
              </button>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-in-bottom">
      <div className="bg-card/95 backdrop-blur-lg border-2 border-primary/30 rounded-xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
              Instale o App
            </h3>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              Acesse rapidamente pela tela inicial!
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-all"
              >
                Instalar
              </button>
              <button
                onClick={handleRemindLater}
                className="px-3 py-2 border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                Depois
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
