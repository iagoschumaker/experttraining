'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Avatar, 
  AvatarFallback,
  Badge,
  Skeleton
} from '@/components/ui'
import { 
  ChevronDown, 
  LogOut, 
  Shield
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'

interface UserData {
  id: string
  name: string
  email: string
  isSuperAdmin: boolean
}

export function SuperAdminHeader() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()

        if (data.success) {
          setUser(data.data.user)
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

  if (isLoading) {
    return (
      <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
        <Skeleton className="h-6 w-32 bg-muted" />
        <Skeleton className="h-10 w-10 rounded-full bg-muted" />
      </header>
    )
  }

  return (
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between">
      {/* Left: Title */}
      <div className="flex items-center gap-3">
        <Badge className="bg-accent text-accent-foreground hover:bg-accent/90">
          <Shield className="w-3 h-3 mr-1" />
          SuperAdmin
        </Badge>
        <span className="text-muted-foreground text-sm">Painel de Controle</span>
      </div>

      {/* Right: User Menu */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <ThemeToggle />
        
        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 hover:bg-muted rounded-lg p-2 transition-colors"
          >
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                {user ? getInitials(user.name) : '??'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground hidden sm:inline">
              {user?.name}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>

          {/* Dropdown */}
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowMenu(false)} 
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-medium text-foreground">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>

                {/* Actions */}
                <div className="py-1">
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
