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
  Dumbbell
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
]

export function SuperAdminSidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-slate-900 border-r border-slate-800 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
        {!isCollapsed && (
          <Link href="/superadmin/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-slate-900" />
            </div>
            <span className="font-semibold text-white">SuperAdmin</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn('text-slate-400 hover:text-white hover:bg-slate-800', isCollapsed && 'mx-auto')}
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
        {sidebarLinks.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                isActive
                  ? 'bg-amber-500 text-slate-900'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white',
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
