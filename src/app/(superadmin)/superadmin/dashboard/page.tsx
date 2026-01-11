'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Skeleton, Badge } from '@/components/ui'
import { Building2, Users, CreditCard, Boxes, TrendingUp, AlertTriangle, Settings2, UserCheck } from 'lucide-react'
import Link from 'next/link'

interface DashboardData {
  overview: {
    totalStudios: number
    activeStudios: number
    suspendedStudios: number
    inactiveStudios: number
    totalUsers: number
    superAdminUsers: number
    regularUsers: number
    totalBlocks: number
    activeBlocks: number
    totalRules: number
    activeRules: number
    totalPlans: number
    totalClients: number
    monthlyRevenue: number
  }
  suspendedStudiosList: { id: string; name: string; slug: string }[]
  recentStudios: { id: string; name: string; status: string; createdAt: string }[]
  recentUsers: { id: string; name: string; email: string; createdAt: string }[]
  systemStatus: { decisionEngine: string; blocks: string }
}

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/superadmin/dashboard')
        const json = await res.json()
        if (json.success) setData(json.data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  const stats = data?.overview

  const statCards = [
    {
      title: 'Studios Ativos',
      value: stats?.activeStudios ?? 0,
      total: stats?.totalStudios ?? 0,
      icon: <Building2 className="w-5 h-5" />,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10',
      href: '/superadmin/studios',
    },
    {
      title: 'Usuários',
      value: stats?.totalUsers ?? 0,
      icon: <Users className="w-5 h-5" />,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      href: '/superadmin/users',
    },
    {
      title: 'Clientes',
      value: stats?.totalClients ?? 0,
      icon: <UserCheck className="w-5 h-5" />,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
    {
      title: 'Receita Mensal',
      value: `R$ ${(stats?.monthlyRevenue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: <CreditCard className="w-5 h-5" />,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10',
      isString: true,
      href: '/superadmin/plans',
    },
  ]

  const secondaryStats = [
    { title: 'Blocos', value: stats?.activeBlocks ?? 0, total: stats?.totalBlocks ?? 0, icon: <Boxes className="w-4 h-4" />, href: '/superadmin/blocks' },
    { title: 'Regras', value: stats?.activeRules ?? 0, total: stats?.totalRules ?? 0, icon: <Settings2 className="w-4 h-4" />, href: '/superadmin/rules' },
    { title: 'Planos', value: stats?.totalPlans ?? 0, icon: <CreditCard className="w-4 h-4" />, href: '/superadmin/plans' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">
          Visão geral do sistema Expert Training
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Link key={index} href={stat.href || '#'}>
            <Card className="bg-slate-900 border-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <span className={stat.color}>{stat.icon}</span>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 bg-slate-800" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">
                      {stat.isString ? stat.value : stat.value}
                    </span>
                    {stat.total !== undefined && !stat.isString && (
                      <span className="text-slate-500 text-sm">
                        / {stat.total}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {secondaryStats.map((stat, index) => (
          <Link key={index} href={stat.href}>
            <Card className="bg-slate-900 border-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-amber-500">{stat.icon}</span>
                    <span className="text-slate-400">{stat.title}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold text-white">{stat.value}</span>
                    {stat.total !== undefined && <span className="text-slate-500 text-sm">/ {stat.total}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Alerts and Info */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Suspended Studios */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Studios Suspensos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-20 w-full bg-slate-800" />
            ) : !data?.suspendedStudiosList?.length ? (
              <div className="text-center py-4 text-slate-400">
                <p>Nenhum studio suspenso</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.suspendedStudiosList.map((studio) => (
                  <div key={studio.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-slate-400" />
                      <span className="text-white">{studio.name}</span>
                    </div>
                    <Badge variant="destructive">Suspenso</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Status do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Regras Ativas</span>
                <span className="text-white font-medium">{stats?.activeRules ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Blocos Ativos</span>
                <span className="text-white font-medium">{stats?.activeBlocks ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Motor de Decisão</span>
                <Badge variant={data?.systemStatus?.decisionEngine === 'operational' ? 'success' : 'secondary'}>
                  {data?.systemStatus?.decisionEngine === 'operational' ? 'Operacional' : 'Sem regras'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white">Studios Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-20 w-full bg-slate-800" />
            ) : !data?.recentStudios?.length ? (
              <div className="text-center py-4 text-slate-400">Nenhum studio</div>
            ) : (
              <div className="space-y-3">
                {data.recentStudios.map((studio) => (
                  <div key={studio.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                    <span className="text-white">{studio.name}</span>
                    <Badge className={studio.status === 'ACTIVE' ? 'bg-green-500' : studio.status === 'SUSPENDED' ? 'bg-red-500' : 'bg-gray-500'}>
                      {studio.status === 'ACTIVE' ? 'Ativo' : studio.status === 'SUSPENDED' ? 'Suspenso' : 'Inativo'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg text-white">Usuários Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-20 w-full bg-slate-800" />
            ) : !data?.recentUsers?.length ? (
              <div className="text-center py-4 text-slate-400">Nenhum usuário</div>
            ) : (
              <div className="space-y-3">
                {data.recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                    <div>
                      <p className="text-white">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
