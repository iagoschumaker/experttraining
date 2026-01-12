'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import StudioBlockedMessage from '@/components/StudioBlockedMessage'

interface BlockedState {
  blocked: boolean
  studioName?: string
  blockReason?: string
  gracePeriodEnds?: Date | null
}

export default function PaymentGateway({ children }: { children: React.ReactNode }) {
  const [blockedState, setBlockedState] = useState<BlockedState>({ blocked: false })
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Interceptar fetch para detectar 402 Payment Required
    const originalFetch = window.fetch
    
    window.fetch = async (...args) => {
      const response = await originalFetch(...args)
      
      if (response.status === 402) {
        const data = await response.clone().json()
        
        setBlockedState({
          blocked: true,
          studioName: data.studioName,
          blockReason: data.blockReason || data.message,
          gracePeriodEnds: data.gracePeriodEnds ? new Date(data.gracePeriodEnds) : null,
        })
        
        return response
      }
      
      return response
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  // Não bloquear rotas públicas
  const publicRoutes = ['/login', '/register', '/forgot-password']
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return <>{children}</>
  }

  // Se bloqueado, mostrar tela de bloqueio
  if (blockedState.blocked) {
    return (
      <StudioBlockedMessage
        studioName={blockedState.studioName}
        blockReason={blockedState.blockReason}
        gracePeriodEnds={blockedState.gracePeriodEnds}
      />
    )
  }

  return <>{children}</>
}
