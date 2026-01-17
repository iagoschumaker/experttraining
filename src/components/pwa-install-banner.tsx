'use client'

import { useState, useEffect } from 'react'
import { X, Smartphone, Share } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Verificar se já está instalado como PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true
    
    if (isStandalone) {
      return // Já instalado, não mostrar banner
    }

    // Verificar se é mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    if (!isMobile) {
      return // Desktop, não mostrar banner
    }

    // Verificar se usuário já dispensou recentemente
    const dismissed = localStorage.getItem('pwa-banner-dismissed')
    const lastShown = localStorage.getItem('pwa-banner-last-shown')
    if (dismissed && lastShown) {
      const daysSince = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24)
      if (daysSince < 3) return
    }

    // Verificar se é iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIOSDevice)

    // Mostrar banner após 2 segundos para TODOS os dispositivos móveis
    const timeout = setTimeout(() => {
      setShowBanner(true)
      localStorage.setItem('pwa-banner-last-shown', Date.now().toString())
    }, 2000)

    // Para Android/Chrome, também escutar evento beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Escutar quando app é instalado para esconder banner
    const installedHandler = () => {
      setShowBanner(false)
      setDeferredPrompt(null)
    }
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      clearTimeout(timeout)
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback: abrir instruções
      alert('Para instalar:\n1. Toque nos 3 pontos do navegador\n2. Selecione "Instalar aplicativo"')
      return
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        localStorage.removeItem('pwa-banner-dismissed')
      }
    } catch (err) {
      console.error('Erro ao instalar PWA:', err)
    }
    
    setDeferredPrompt(null)
    setShowBanner(false)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('pwa-banner-dismissed', 'true')
    localStorage.setItem('pwa-banner-last-shown', Date.now().toString())
  }

  if (!showBanner) return null

  // iOS - instruções manuais
  if (isIOS) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-in-bottom">
        <div className="bg-card border-2 border-primary/30 rounded-xl shadow-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Share className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-foreground mb-1">
                Instale o App
              </h3>
              <p className="text-xs text-muted-foreground mb-2">
                Toque em <Share className="w-3 h-3 inline mx-0.5" /> e depois em <strong>"Adicionar à Tela de Início"</strong>
              </p>
              <button
                onClick={handleDismiss}
                className="text-xs text-primary font-medium"
              >
                Entendi
              </button>
            </div>
            <button onClick={handleDismiss} className="text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Android/Chrome
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-in-bottom">
      <div className="bg-card border-2 border-primary/30 rounded-xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground mb-1">
              Instale o App
            </h3>
            <p className="text-xs text-muted-foreground mb-2">
              Acesse rapidamente pela tela inicial!
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold"
              >
                Instalar
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 border border-border rounded-lg text-xs text-foreground"
              >
                Depois
              </button>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
