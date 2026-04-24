'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  Users, 
  Boxes,
  ChevronLeft,
  Menu,
  DollarSign,
  Database,
  Layers,
  FileText,
  TrendingDown,
  TrendingUp,
  BarChart2,
  FolderTree,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui'

interface SidebarLink {
  href: string
  label: string
  icon: React.ReactNode
  section?: string
}

const sidebarLinks: SidebarLink[] = [
  // ─── PRINCIPAL ───
  {
    href: '/superadmin/dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    href: '/superadmin/studios',
    label: 'Studios',
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    href: '/superadmin/plans',
    label: 'Planos SaaS',
    icon: <CreditCard className="w-5 h-5" />,
  },
  {
    href: '/superadmin/payments',
    label: 'Cobranças',
    icon: <DollarSign className="w-5 h-5" />,
  },
  {
    href: '/superadmin/users',
    label: 'Usuários',
    icon: <Users className="w-5 h-5" />,
  },
  {
    href: '/superadmin/phases',
    label: 'Fases / Treinos',
    icon: <Layers className="w-5 h-5" />,
  },
  // ─── FINANCEIRO SUPERADMIN ───
  {
    href: '/superadmin/financeiro',
    label: 'Financeiro',
    icon: <BarChart2 className="w-5 h-5" />,
    section: 'FINANCEIRO',
  },
  {
    href: '/superadmin/financeiro/lancamentos',
    label: 'Lançamentos',
    icon: <FileText className="w-5 h-5" />,
    section: 'FINANCEIRO',
  },
  {
    href: '/superadmin/financeiro/dre',
    label: 'DRE',
    icon: <TrendingUp className="w-5 h-5" />,
    section: 'FINANCEIRO',
  },
  // ─── SISTEMA ───
  {
    href: '/superadmin/backup',
    label: 'Backup',
    icon: <Database className="w-5 h-5" />,
    section: 'SISTEMA',
  },
]

interface SuperAdminSidebarProps {
  isMobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
}

export function SuperAdminSidebar({ isMobileOpen: externalMobileOpen, onMobileOpenChange }: SuperAdminSidebarProps = {}) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [internalMobileOpen, setInternalMobileOpen] = useState(false)
  
  const isMobileOpen = externalMobileOpen ?? internalMobileOpen
  const setIsMobileOpen = onMobileOpenChange ?? setInternalMobileOpen

  // Separar links por seção
  const mainLinks = sidebarLinks.filter(l => !l.section)
  const financialLinks = sidebarLinks.filter(l => l.section === 'FINANCEIRO')
  const systemLinks = sidebarLinks.filter(l => l.section === 'SISTEMA')

  const renderLink = (link: SidebarLink) => {
    const isActive = link.href === '/superadmin/financeiro'
      ? pathname === '/superadmin/financeiro'
      : pathname === link.href || pathname.startsWith(link.href + '/')

    return (
      <Link
        key={link.href}
        href={link.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg w-full',
          isActive
            ? link.section === 'FINANCEIRO' ? 'bg-emerald-600 text-white' : 'bg-primary text-primary-foreground'
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
  }

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
          isCollapsed ? 'md:w-16' : 'md:w-64',
          'w-64',
          isMobileOpen ? 'translate-x-0 md:translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 relative z-50">
        {!isCollapsed && (
          <span className="font-semibold text-foreground text-sm">🛡️ SUPER ADMIN</span>
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
          className="text-muted-foreground hover:text-foreground hover:bg-muted md:hidden ml-auto"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
        {/* Main links */}
        {mainLinks.map(renderLink)}

        {/* Financeiro section */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="pt-3 pb-1 px-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Financeiro
            </span>
          </div>
        )}
        {isCollapsed && !isMobileOpen && <div className="border-t border-border my-2" />}
        {financialLinks.map(renderLink)}

        {/* Sistema section */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="pt-3 pb-1 px-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Sistema
            </span>
          </div>
        )}
        {isCollapsed && !isMobileOpen && <div className="border-t border-border my-2" />}
        {systemLinks.map(renderLink)}
      </nav>
    </aside>
    </>
  )
}
