// ============================================================================
// EXPERT PRO TRAINING - ZUSTAND AUTH STORE
// ============================================================================
// Estado global de autenticação
// ============================================================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserStudioLink, UserStudioRole } from '@/types'

interface StudioContext {
  studioId: string
  studioName: string
  studioSlug: string
  role: UserStudioRole
}

interface AuthState {
  // User data
  user: User | null
  studios: UserStudioLink[]
  
  // Current studio context
  currentStudio: StudioContext | null
  
  // Auth status
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  setUser: (user: User, studios: UserStudioLink[]) => void
  setCurrentStudio: (studio: StudioContext) => void
  clearCurrentStudio: () => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      studios: [],
      currentStudio: null,
      isAuthenticated: false,
      isLoading: true,

      // Actions
      setUser: (user, studios) =>
        set({
          user,
          studios,
          isAuthenticated: true,
          isLoading: false,
        }),

      setCurrentStudio: (studio) =>
        set({
          currentStudio: studio,
        }),

      clearCurrentStudio: () =>
        set({
          currentStudio: null,
        }),

      logout: () =>
        set({
          user: null,
          studios: [],
          currentStudio: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      setLoading: (loading) =>
        set({
          isLoading: loading,
        }),
    }),
    {
      name: 'expert-auth-storage',
      partialize: (state) => ({
        user: state.user,
        studios: state.studios,
        currentStudio: state.currentStudio,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
