'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  BarChart3, 
  Dumbbell,
  UserCog,
  ChevronLeft,
  Menu,
  Calendar,
  Settings
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'

interface SidebarLink {
  href: string
  label: string
  icon: React.ReactNode
  requiresAdmin?: boolean
}

const sidebarLinks: SidebarLink[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    href: '/clients',
    label: 'Alunos',
    icon: <Users className="w-5 h-5" />,
  },
  {
    href: '/assessments',
    label: 'Avaliações',
    icon: <ClipboardList className="w-5 h-5" />,
  },
  {
    href: '/results',
    label: 'Resultados',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    href: '/workouts',
    label: 'Treinos',
    icon: <Dumbbell className="w-5 h-5" />,
  },
  // DEPRECATED: Aulas removidas do Método Expert Training
  // O sistema agora é controlado por Avaliações e Cronogramas
  // {
  //   href: '/lessons',
  //   label: 'Aulas',
  //   icon: <Calendar className="w-5 h-5" />,
  // },
  {
    href: '/team',
    label: 'Equipe',
    icon: <UserCog className="w-5 h-5" />,
    requiresAdmin: true,
  },
]

interface AppSidebarProps {
  isMobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}

export function AppSidebar({ isMobileOpen: externalMobileOpen, onMobileOpenChange }: AppSidebarProps = {}) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [internalMobileOpen, setInternalMobileOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  
  const isMobileOpen = externalMobileOpen ?? internalMobileOpen
  const setIsMobileOpen = onMobileOpenChange ?? setInternalMobileOpen

  // Buscar role do usuário
  useEffect(() => {
    async function fetchUserRole() {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()

        if (data.success && data.data.currentStudio) {
          setUserRole(data.data.currentStudio.role)
        }
      } catch (err) {
        console.error('Error fetching user role:', err)
      }
    }

    fetchUserRole()
  }, [])

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300',
          // Desktop behavior
          isCollapsed ? 'md:w-16' : 'md:w-64',
          // Mobile behavior - always 264px width when visible
          'w-64',
          // Show/hide logic
          isMobileOpen ? 'translate-x-0 md:translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 relative z-50">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-sm">ET</span>
            </div>
            <span className="font-semibold text-foreground">Expert Training</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn('text-muted-foreground hover:text-foreground hover:bg-muted hidden md:flex', isCollapsed && 'mx-auto')}
        >
          {isCollapsed ? (
            <Menu className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </Button>
        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileOpen(false)}
          className="text-muted-foreground hover:text-foreground hover:bg-muted md:hidden"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1">
        {sidebarLinks
          .filter(link => !link.requiresAdmin || userRole === 'STUDIO_ADMIN')
          .map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full',
                isActive
                  ? 'bg-amber-500 text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                isCollapsed && !isMobileOpen && 'md:justify-center md:px-2'
              )}
              style={{ transition: 'none' }}
              title={isCollapsed ? link.label : undefined}
              onClick={() => setIsMobileOpen(false)}
            >
              {link.icon}
              {(!isCollapsed || isMobileOpen) && <span className="font-medium">{link.label}</span>}
            </Link>
          )
        })}
        
        {/* Settings */}
        {userRole === 'STUDIO_ADMIN' && (
          <Link
            href="/settings/studio"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full',
              pathname === '/settings/studio' || pathname.startsWith('/settings/studio/')
                ? 'bg-amber-500 text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              isCollapsed && !isMobileOpen && 'md:justify-center md:px-2'
            )}
            style={{ transition: 'none' }}
            title={isCollapsed ? 'Configurações' : undefined}
            onClick={() => setIsMobileOpen(false)}
          >
            <Settings className="w-5 h-5" />
            {(!isCollapsed || isMobileOpen) && <span className="font-medium">Configurações</span>}
          </Link>
        )}
      </nav>
    </aside>
    </>
  )
}
