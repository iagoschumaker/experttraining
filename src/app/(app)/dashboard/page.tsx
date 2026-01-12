// ============================================================================
// EXPERT TRAINING - DASHBOARD DO STUDIO
// ============================================================================
// Visão geral: KPIs, alunos ativos, avaliações pendentes, treinos recentes
// ============================================================================

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, ClipboardCheck, Dumbbell, TrendingUp, AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

interface DashboardData {
  overview: {
    totalClients: number
    activeClients: number
    inactiveClients: number
    totalAssessments: number
    totalWorkouts: number
    activeWorkouts: number
  }
  recentClients: Array<{
    id: string
    name: string
    status: string
    createdAt: string
  }>
  recentAssessments: Array<{
    id: string
    clientName: string
    createdAt: string
  }>
  goalsDistribution: Array<{
    goal: string
    count: number
  }>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch('/api/studio/dashboard')
        const result = await res.json()

        if (result.success) {
          setData(result.data)
        } else {
          setError(result.error || 'Erro ao carregar dashboard')
        }
      } catch (err) {
        setError('Erro de conexão')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">{error || 'Erro ao carregar dados'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu studio</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Clients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Alunos
            </CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalClients}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.overview.activeClients} ativos
            </p>
          </CardContent>
        </Card>

        {/* Total Assessments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avaliações
            </CardTitle>
            <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalAssessments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total realizadas
            </p>
          </CardContent>
        </Card>

        {/* Active Workouts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Treinos Ativos
            </CardTitle>
            <Dumbbell className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.activeWorkouts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Em andamento
            </p>
          </CardContent>
        </Card>

        {/* Total Workouts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Treinos
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalWorkouts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Criados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {!data.recentClients || data.recentClients.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum aluno cadastrado</p>
            ) : (
              <div className="space-y-3">
                {data.recentClients.map((client) => (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(client.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Assessments */}
        <Card>
          <CardHeader>
            <CardTitle>Avaliações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {!data.recentAssessments || data.recentAssessments.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma avaliação realizada</p>
            ) : (
              <div className="space-y-3">
                {data.recentAssessments.map((assessment) => (
                  <Link
                    key={assessment.id}
                    href={`/assessments/${assessment.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <ClipboardCheck className="w-5 h-5 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{assessment.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(assessment.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/clients/new">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold">Novo Aluno</p>
                <p className="text-sm text-muted-foreground">Cadastrar cliente</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/assessments/new">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="font-semibold">Nova Avaliação</p>
                <p className="text-sm text-muted-foreground">Avaliar cliente</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/workouts">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="font-semibold">Treinos</p>
                <p className="text-sm text-muted-foreground">Ver todos os treinos</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
