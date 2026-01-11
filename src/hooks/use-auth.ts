// ============================================================================
// EXPERT TRAINING - USE AUTH HOOK
// ============================================================================
// Hook para acessar dados do usuário autenticado e contexto do studio
// ============================================================================

'use client'

import { useEffect, useState } from 'react'

export interface User {
  id: string
  name: string
  email: string
  isSuperAdmin: boolean
}

export interface Studio {
  id: string
  name: string
  slug: string
  status: 'ACTIVE' | 'SUSPENDED'
}

export interface StudioContext {
  studioId: string
  studioName: string
  role: 'STUDIO_ADMIN' | 'TRAINER'
}

export interface AuthData {
  user: User
  studios: any[]
  currentStudio: StudioContext | null
}

export function useAuth() {
  const [data, setData] = useState<AuthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        const result = await res.json()

        if (result.success) {
          setData(result.data)
        } else {
          setError(result.error || 'Erro ao carregar dados do usuário')
        }
      } catch (err) {
        setError('Erro ao carregar dados do usuário')
        console.error('useAuth error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAuth()
  }, [])

  return {
    user: data?.currentStudio ? {
      ...data.user,
      role: data.currentStudio.role,
      studioId: data.currentStudio.studioId,
    } : null,
    studios: data?.studios || [],
    currentStudio: data?.currentStudio || null,
    loading,
    error,
  }
}
