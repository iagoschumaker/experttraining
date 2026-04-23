'use client'

// ============================================================================
// EXPERT PRO TRAINING — DASHBOARD FINANCEIRO
// ============================================================================

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard, StatsGrid } from '@/components/ui'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface DashboardData {
  period: { month: number; year: number }
  summary: {
    totalReceita: number
    totalDespesa: number
    lucro: number
    totalPago: number
    totalPendente: number
    totalVencido: number
    totalEntries: number
  }
  upcomingDue: Array<{
    id: string
    description: string
    amount: number
    dueDate: string
    type: string
    category: { name: string }
    client: { name: string } | null
  }>
  recentEntries: Array<{
    id: string
    description: string
    amount: number
    type: string
    status: string
    date: string
    category: { code: string; name: string }
    client: { name: string } | null
  }>
  monthlyChart: Array<{
    month: string
    receita: number
    despesa: number
  }>
}

export default function FinanceiroDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/studio/financeiro/dashboard')
      const result = await res.json()
      if (result.success) {
        setData(result.data)
      } else {
        toast.error(result.error || 'Erro ao carregar dashboard')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-500" />
            Financeiro
          </h1>
        </div>
        <StatsGrid columns={4}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </StatsGrid>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { summary, upcomingDue, recentEntries, monthlyChart } = data
  const maxChartValue = Math.max(...monthlyChart.map(m => Math.max(m.receita, m.despesa)), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-emerald-500" />
          Dashboard Financeiro
        </h1>
        <p className="text-sm text-muted-foreground">
          {monthNames[(data.period.month || 1) - 1]} de {data.period.year}
        </p>
      </div>

      {/* Stats Cards */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Receita Total"
          value={fmt(summary.totalReceita)}
          subtitle="Este mês"
          icon={<TrendingUp className="h-4 w-4" />}
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-500/10"
        />
        <StatsCard
          title="Despesa Total"
          value={fmt(summary.totalDespesa)}
          subtitle="Este mês"
          icon={<TrendingDown className="h-4 w-4" />}
          iconColor="text-red-500"
          iconBgColor="bg-red-500/10"
        />
        <StatsCard
          title="Lucro"
          value={fmt(summary.lucro)}
          subtitle={summary.lucro >= 0 ? 'Positivo' : 'Negativo'}
          icon={<DollarSign className="h-4 w-4" />}
          iconColor={summary.lucro >= 0 ? 'text-emerald-500' : 'text-red-500'}
          iconBgColor={summary.lucro >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}
        />
        <StatsCard
          title="Contas Vencidas"
          value={fmt(summary.totalVencido)}
          subtitle={summary.totalVencido > 0 ? '⚠️ Atenção' : 'Nenhuma'}
          icon={<AlertTriangle className="h-4 w-4" />}
          iconColor={summary.totalVencido > 0 ? 'text-amber-500' : 'text-emerald-500'}
          iconBgColor={summary.totalVencido > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}
        />
      </StatsGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico Receita vs Despesa */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-base">Receita vs Despesa (6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {monthlyChart.map((m) => {
                const [y, mon] = m.month.split('-')
                const label = `${monthNames[parseInt(mon) - 1]}/${y.slice(2)}`
                const receitaWidth = maxChartValue > 0 ? (m.receita / maxChartValue) * 100 : 0
                const despesaWidth = maxChartValue > 0 ? (m.despesa / maxChartValue) * 100 : 0

                return (
                  <div key={m.month} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium w-14">{label}</span>
                      <div className="flex gap-4">
                        <span className="text-emerald-400">{fmt(m.receita)}</span>
                        <span className="text-red-400">{fmt(m.despesa)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 h-4">
                      <div
                        className="bg-emerald-500/30 rounded-sm transition-all"
                        style={{ width: `${receitaWidth}%`, minWidth: m.receita > 0 ? '4px' : '0' }}
                      />
                      <div
                        className="bg-red-500/30 rounded-sm transition-all"
                        style={{ width: `${despesaWidth}%`, minWidth: m.despesa > 0 ? '4px' : '0' }}
                      />
                    </div>
                  </div>
                )
              })}
              <div className="flex items-center gap-4 pt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-emerald-500/30" />
                  Receita
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-500/30" />
                  Despesa
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contas a Vencer */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Vencendo em 7 dias
              </span>
              <Link
                href="/financeiro/contas-pagar"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Ver todas →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDue.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-50" />
                Nenhuma conta a vencer
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingDue.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.category.name} · Vence {fmtDate(item.dueDate)}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold ml-2 ${
                      item.type === 'RECEITA' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {item.type === 'DESPESA' ? '-' : '+'}{fmt(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Últimas Movimentações */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base flex items-center justify-between">
            <span>Últimas Movimentações</span>
            <Link
              href="/financeiro/lancamentos"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Ver todos →
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nenhum lançamento registrado
            </div>
          ) : (
            <div className="space-y-1">
              {recentEntries.map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-1.5 rounded-md ${
                      entry.type === 'RECEITA' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                    }`}>
                      {entry.type === 'RECEITA'
                        ? <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                        : <ArrowDownRight className="h-4 w-4 text-red-500" />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.category.name}
                        {entry.client && ` · ${entry.client.name}`}
                        {' · '}{fmtDate(entry.date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge className={
                      entry.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' :
                      entry.status === 'OVERDUE' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }>
                      {entry.status === 'PAID' ? 'Pago' :
                       entry.status === 'OVERDUE' ? 'Vencido' : 'Pendente'}
                    </Badge>
                    <span className={`text-sm font-semibold whitespace-nowrap ${
                      entry.type === 'RECEITA' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {entry.type === 'DESPESA' ? '-' : '+'}{fmt(entry.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
