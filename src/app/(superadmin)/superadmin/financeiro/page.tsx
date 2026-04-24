'use client'

// ============================================================================
// EXPERT PRO TRAINING — SUPERADMIN FINANCEIRO DASHBOARD
// ============================================================================
// Visão financeira do SaaS: receita de studios, custos e DRE próprio
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
  Building2,
  Users,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface StudioBilling {
  id: string
  name: string
  status: string
  plan: { name: string; pricePerTrainer: number } | null
  activeTrainers: number
  estimatedBilling: number
}

interface PageData {
  stats: { ACTIVE: number; SUSPENDED: number; GRACE_PERIOD: number; CANCELED: number }
  studios: StudioBilling[]
}

export default function SuperAdminFinanceiroPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PageData | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/superadmin/billing/studios')
      const result = await res.json()
      if (result.success) setData(result.data)
      else toast.error(result.error)
    } catch { toast.error('Erro de conexão') }
    finally { setLoading(false) }
  }

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const totalReceitaEstimada = data?.studios.reduce((s, st) => s + st.estimatedBilling, 0) || 0
  const totalTrainers = data?.studios.reduce((s, st) => s + st.activeTrainers, 0) || 0

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-emerald-500" /> Financeiro
        </h1>
        <StatsGrid columns={4}>
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
        </StatsGrid>
        <Skeleton className="h-96" />
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      ACTIVE: { label: 'Ativo', className: 'bg-emerald-500/20 text-emerald-400' },
      SUSPENDED: { label: 'Bloqueado', className: 'bg-red-500/20 text-red-400' },
      GRACE_PERIOD: { label: 'Carência', className: 'bg-amber-500/20 text-amber-400' },
      CANCELED: { label: 'Cancelado', className: 'bg-muted text-muted-foreground' },
    }
    const c = config[status] || config.ACTIVE
    return <Badge className={c.className}>{c.label}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-500" />
            Financeiro — SaaS
          </h1>
          <p className="text-sm text-muted-foreground">
            Visão geral de receita, studios e faturamento
          </p>
        </div>
        <Link href="/superadmin/financeiro/lancamentos">
          <Badge className="bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700 px-3 py-1.5">
            Lançamentos →
          </Badge>
        </Link>
      </div>

      {/* Stats */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Receita Estimada"
          value={fmt(totalReceitaEstimada)}
          subtitle="Base atual de studios"
          icon={<TrendingUp className="h-4 w-4" />}
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-500/10"
        />
        <StatsCard
          title="Trainers Ativos"
          value={totalTrainers}
          subtitle="Base de cobrança"
          icon={<Users className="h-4 w-4" />}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-500/10"
        />
        <StatsCard
          title="Studios Ativos"
          value={data?.stats.ACTIVE || 0}
          subtitle="Pagos e ativos"
          icon={<Building2 className="h-4 w-4" />}
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-500/10"
        />
        <StatsCard
          title="Inadimplentes"
          value={(data?.stats.SUSPENDED || 0) + (data?.stats.GRACE_PERIOD || 0)}
          subtitle="Bloqueados + carência"
          icon={<AlertTriangle className="h-4 w-4" />}
          iconColor="text-red-500"
          iconBgColor="bg-red-500/10"
        />
      </StatsGrid>

      {/* Faturamento por Studio */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            Faturamento por Studio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.studios.length ? (
            <div className="py-8 text-center text-muted-foreground">
              <Building2 className="mx-auto h-12 w-12 text-muted mb-2" />
              <p>Nenhum studio encontrado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.studios.map((studio) => (
                <div key={studio.id} className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 border border-border">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <Building2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{studio.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {studio.plan?.name || 'Sem plano'} · {studio.activeTrainers} trainer{studio.activeTrainers !== 1 ? 's' : ''}
                        {studio.plan && ` · ${fmt(studio.plan.pricePerTrainer)}/trainer`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(studio.status)}
                    <span className="text-lg font-bold text-emerald-400 min-w-[100px] text-right">
                      {fmt(studio.estimatedBilling)}
                    </span>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 mt-4">
                <span className="text-sm font-semibold text-emerald-400">Total Estimado Mensal</span>
                <span className="text-xl font-bold text-emerald-400">{fmt(totalReceitaEstimada)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/superadmin/financeiro/lancamentos">
          <Card className="bg-card border-border hover:border-emerald-500/30 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <ArrowUpRight className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Lançamentos</p>
                <p className="text-xs text-muted-foreground">Receitas e despesas do SaaS</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/superadmin/financeiro/dre">
          <Card className="bg-card border-border hover:border-emerald-500/30 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="font-medium text-sm">DRE</p>
                <p className="text-xs text-muted-foreground">Demonstração do resultado</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/superadmin/client-plans">
          <Card className="bg-card border-border hover:border-amber-500/30 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <CreditCard className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-medium text-sm">Planos de Aluno</p>
                <p className="text-xs text-muted-foreground">Templates de mensalidade</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
