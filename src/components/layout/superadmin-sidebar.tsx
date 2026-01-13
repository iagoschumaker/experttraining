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
  GitBranch,
  ChevronLeft,
  Menu,
  Shield,
  Dumbbell,
  DollarSign,
  Database
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui'

interface SidebarLink {
  href: string
  label: string
  icon: React.ReactNode
}

const sidebarLinks: SidebarLink[] = [
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
    label: 'Planos',
    icon: <CreditCard className="w-5 h-5" />,
  },
  {
    href: '/superadmin/payments',
    label: 'Pagamentos',
    icon: <DollarSign className="w-5 h-5" />,
  },
  {
    href: '/superadmin/users',
    label: 'Usuários',
    icon: <Users className="w-5 h-5" />,
  },
  {
    href: '/superadmin/blocks',
    label: 'Blocos',
    icon: <Boxes className="w-5 h-5" />,
  },
  {
    href: '/superadmin/exercises',
    label: 'Exercícios',
    icon: <Dumbbell className="w-5 h-5" />,
  },
  {
    href: '/superadmin/rules',
    label: 'Regras',
    icon: <GitBranch className="w-5 h-5" />,
  },
  {
    href: '/superadmin/backup',
    label: 'Backup',
    icon: <Database className="w-5 h-5" />,
  },
]

export function SuperAdminSidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black bg-opacity-50 md:hidden" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      {/* Mobile menu button */}
      {!isMobileOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden bg-card border border-border shadow-lg hover:bg-muted rounded-lg transition-all duration-200"
          onClick={() => setIsMobileOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </Button>
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
          <Link href="/superadmin/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-semibold text-foreground">SuperAdmin</span>
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
        {sidebarLinks.map((link) => {
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
                isCollapsed && !isMobileOpen && 'md:justify-center md:px-2'
              )}
              title={isCollapsed ? link.label : undefined}
              onClick={() => setIsMobileOpen(false)}
            >
              {link.icon}
              {(!isCollapsed || isMobileOpen) && <span className="font-medium">{link.label}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
    </>
  )
}
