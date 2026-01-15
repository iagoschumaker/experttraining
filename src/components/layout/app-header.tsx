'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Avatar, 
  AvatarFallback,
  Button,
  Badge,
  Skeleton
} from '@/components/ui'
import { 
  Building2, 
  ChevronDown, 
  LogOut, 
  RefreshCw,
  User,
  Menu
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'

interface UserData {
  id: string
  name: string
  email: string
  isSuperAdmin: boolean
}

interface StudioContext {
  studioId: string
  studioName: string
  role: string
}

interface AppHeaderProps {
  onMenuClick?: () => void
}

export function AppHeader({ onMenuClick }: AppHeaderProps = {}) {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [studio, setStudio] = useState<StudioContext | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()

        if (data.success) {
          setUser(data.data.user)
          setStudio(data.data.currentStudio)
        }
      } catch (err) {
        console.error('Error fetching user data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  function handleSwitchStudio() {
    router.push('/select-studio')
  }

  if (isLoading) {
    return (
      <header className="sticky top-0 z-50 h-16 border-b border-border bg-card px-6 flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-border bg-card px-3 sm:px-4 md:px-6 flex items-center justify-between">
      {/* Left: Menu Button (Mobile) + Studio Info */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Mobile Menu Button */}
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuClick}
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
        {studio && (
          <>
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
            </div>
            <div className="hidden sm:block">
              <h2 className="font-semibold text-foreground text-sm">
                {studio.studioName}
              </h2>
              <Badge variant="secondary" className="text-xs">
                {studio.role === 'STUDIO_ADMIN' ? 'Admin' : 'Treinador'}
              </Badge>
            </div>
          </>
        )}
      </div>

      {/* Right: User Menu */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Theme Toggle */}
        <ThemeToggle />
        
        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-1 md:gap-2 hover:bg-muted rounded-lg p-1.5 md:p-2 transition-colors"
          >
            <Avatar className="w-7 h-7 md:w-8 md:h-8">
              <AvatarFallback className="bg-amber-500 text-accent-foreground text-xs">
                {user ? getInitials(user.name) : '??'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground hidden sm:inline">
              {user?.name}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
            </button>

          {/* Dropdown */}
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowMenu(false)} 
              />
              <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-medium text-foreground">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>

                {/* Actions */}
                <div className="py-1">
                  <button
                    onClick={handleSwitchStudio}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Trocar de Studio
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
