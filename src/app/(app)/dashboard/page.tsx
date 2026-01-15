// ============================================================================
// EXPERT TRAINING - DASHBOARD DO STUDIO
// ============================================================================
// Visão geral: KPIs, alunos ativos, avaliações pendentes, treinos recentes
// ============================================================================

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard, StatsGrid } from '@/components/ui'
import { Users, ClipboardCheck, Dumbbell, TrendingUp, AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

interface ReassessmentAlert {
  clientId: string
  clientName: string
  lastWorkoutDate: string
  lastWorkoutName: string
  lastAssessmentDate: string | null
}

interface DashboardData {
  overview: {
    totalClients: number
    activeClients: number
    inactiveClients: number
    totalAssessments: number
    totalWorkouts: number
    activeWorkouts: number
    pendingReassessments: number
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
  reassessmentAlerts: ReassessmentAlert[]
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
        <StatsGrid columns={4}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </StatsGrid>
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

      {/* Alerta de Reavaliações Pendentes */}
      {data.reassessmentAlerts && data.reassessmentAlerts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-500 mb-1">
                Reavaliações Pendentes ({data.reassessmentAlerts.length})
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Os seguintes alunos finalizaram seu ciclo de treino e precisam de reavaliação para continuar:
              </p>
              <div className="space-y-2">
                {data.reassessmentAlerts.slice(0, 5).map((alert) => (
                  <Link
                    key={alert.clientId}
                    href={`/clients/${alert.clientId}`}
                    className="flex items-center justify-between p-2 bg-card/50 rounded border border-border hover:border-amber-500/50 transition-colors"
                  >
                    <span className="font-medium text-sm">{alert.clientName}</span>
                    <span className="text-xs text-muted-foreground">
                      Ciclo finalizado em {new Date(alert.lastWorkoutDate).toLocaleDateString('pt-BR')}
                    </span>
                  </Link>
                ))}
              </div>
              {data.reassessmentAlerts.length > 5 && (
                <p className="text-xs text-muted-foreground mt-2">
                  E mais {data.reassessmentAlerts.length - 5} aluno(s)...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Total de Alunos"
          value={data.overview.totalClients}
          subtitle={`${data.overview.activeClients} ativos`}
          icon={<Users className="w-4 h-4" />}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-500/10"
        />
        <StatsCard
          title="Avaliações"
          value={data.overview.totalAssessments}
          subtitle="Total realizadas"
          icon={<ClipboardCheck className="w-4 h-4" />}
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-500/10"
        />
        <StatsCard
          title="Treinos Ativos"
          value={data.overview.activeWorkouts}
          subtitle="Em andamento"
          icon={<Dumbbell className="w-4 h-4" />}
          iconColor="text-amber-500"
          iconBgColor="bg-amber-500/10"
        />
        <StatsCard
          title="Total de Treinos"
          value={data.overview.totalWorkouts}
          subtitle="Criados"
          icon={<TrendingUp className="w-4 h-4" />}
          iconColor="text-purple-500"
          iconBgColor="bg-purple-500/10"
        />
      </StatsGrid>

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
