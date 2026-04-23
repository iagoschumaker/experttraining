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
  Settings,
  UserCheck,
  DollarSign,
  FileText,
  TrendingDown,
  TrendingUp,
  BarChart2,
  FolderTree,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui'

interface SidebarLink {
  href: string
  label: string
  icon: React.ReactNode
  requiresAdmin?: boolean
  module?: 'TREINO' | 'FINANCEIRO'  // Módulo necessário
}

const sidebarLinks: SidebarLink[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  // ─── MÓDULO TREINO ───
  {
    href: '/presenca',
    label: 'Presença',
    icon: <UserCheck className="w-5 h-5" />,
    module: 'TREINO',
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
    module: 'TREINO',
  },
  {
    href: '/workouts',
    label: 'Treinos',
    icon: <Dumbbell className="w-5 h-5" />,
    module: 'TREINO',
  },
  // ─── MÓDULO FINANCEIRO ───
  {
    href: '/financeiro',
    label: 'Financeiro',
    icon: <DollarSign className="w-5 h-5" />,
    module: 'FINANCEIRO',
  },
  {
    href: '/financeiro/lancamentos',
    label: 'Lançamentos',
    icon: <FileText className="w-5 h-5" />,
    module: 'FINANCEIRO',
  },
  {
    href: '/financeiro/contas-pagar',
    label: 'Contas a Pagar',
    icon: <TrendingDown className="w-5 h-5" />,
    module: 'FINANCEIRO',
  },
  {
    href: '/financeiro/contas-receber',
    label: 'Contas a Receber',
    icon: <TrendingUp className="w-5 h-5" />,
    module: 'FINANCEIRO',
  },
  {
    href: '/financeiro/dre',
    label: 'DRE',
    icon: <BarChart2 className="w-5 h-5" />,
    module: 'FINANCEIRO',
  },
  {
    href: '/financeiro/categorias',
    label: 'Plano de Contas',
    icon: <FolderTree className="w-5 h-5" />,
    module: 'FINANCEIRO',
    requiresAdmin: true,
  },
  // ─── SEMPRE VISÍVEL ───
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
  const [studioModules, setStudioModules] = useState<string[]>(['TREINO'])

  const isMobileOpen = externalMobileOpen ?? internalMobileOpen
  const setIsMobileOpen = onMobileOpenChange ?? setInternalMobileOpen

  // Buscar role do usuário e módulos do studio
  useEffect(() => {
    async function fetchUserRole() {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()

        if (data.success && data.data.currentStudio) {
          setUserRole(data.data.currentStudio.role)
          // Buscar módulos do studio
          if (data.data.currentStudio.modules) {
            setStudioModules(data.data.currentStudio.modules)
          }
        }
      } catch (err) {
        console.error('Error fetching user role:', err)
      }
    }

    fetchUserRole()
  }, [])

  // Filtrar links por role e módulo
  const visibleLinks = sidebarLinks.filter(link => {
    // Filtrar por role admin
    if (link.requiresAdmin && userRole !== 'STUDIO_ADMIN') return false
    // Filtrar por módulo
    if (link.module && !studioModules.includes(link.module)) return false
    return true
  })

  // Separar links por seção para visual
  const mainLinks = visibleLinks.filter(l => !l.module || l.module === 'TREINO')
  const financialLinks = visibleLinks.filter(l => l.module === 'FINANCEIRO')
  const hasFinancial = financialLinks.length > 0

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
              <span className="font-semibold text-foreground">EXPERT PRO TRAINING</span>
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
        <nav className="p-2 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
          {/* Main links (Dashboard, Treino) */}
          {mainLinks.map((link) => {
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

          {/* Separator + Financial links */}
          {hasFinancial && (
            <>
              {(!isCollapsed || isMobileOpen) && (
                <div className="pt-3 pb-1 px-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Financeiro
                  </span>
                </div>
              )}
              {isCollapsed && !isMobileOpen && (
                <div className="border-t border-border my-2" />
              )}
              {financialLinks.map((link) => {
                const isActive = link.href === '/financeiro'
                  ? pathname === '/financeiro'
                  : pathname === link.href || pathname.startsWith(link.href + '/')
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full',
                      isActive
                        ? 'bg-emerald-600 text-white'
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
            </>
          )}

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
