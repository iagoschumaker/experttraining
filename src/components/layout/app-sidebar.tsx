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
  Calendar
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
  {
    href: '/lessons',
    label: 'Aulas',
    icon: <Calendar className="w-5 h-5" />,
  },
  {
    href: '/team',
    label: 'Equipe',
    icon: <UserCog className="w-5 h-5" />,
    requiresAdmin: true,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

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
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">ET</span>
            </div>
            <span className="font-semibold text-foreground">Expert Training</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(isCollapsed && 'mx-auto')}
        >
          {isCollapsed ? (
            <Menu className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
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
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                isCollapsed && 'justify-center px-2'
              )}
              title={isCollapsed ? link.label : undefined}
            >
              {link.icon}
              {!isCollapsed && <span className="font-medium">{link.label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
