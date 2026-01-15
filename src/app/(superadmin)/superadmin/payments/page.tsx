'use client'

// ============================================================================
// EXPERT TRAINING - SUPERADMIN PAYMENTS PAGE
// ============================================================================

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard, StatsGrid } from '@/components/ui'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Building2, AlertCircle, CheckCircle, Clock, Calendar, DollarSign, Users, Info } from 'lucide-react'
import { toast } from 'sonner'

interface StudioForBilling {
  id: string
  name: string
  status: string
  plan: {
    name: string
    pricePerTrainer: number
  } | null
  activeTrainers: number
  estimatedBilling: number
}

interface PaymentData {
  stats: {
    ACTIVE: number
    SUSPENDED: number
    GRACE_PERIOD: number
    CANCELED: number
  }
  studios: StudioForBilling[]
}

export default function SuperAdminPaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<PaymentData | null>(null)
  const [selectedStudio, setSelectedStudio] = useState<StudioForBilling | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/superadmin/billing/studios')
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      } else {
        toast.error(result.error || 'Erro ao carregar dados de faturamento')
      }
    } catch (error) {
      console.error('Load error:', error)
      toast.error('Erro ao carregar dados de faturamento')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }
  
  const getStatusBadge = (status: string) => {
// ... (o resto da função getStatusBadge permanece o mesmo)
    const config: Record<string, { label: string; className: string }> = {
      ACTIVE: { label: 'Ativo', className: 'bg-green-500/20 text-green-400' },
      SUSPENDED: { label: 'Bloqueado', className: 'bg-red-500/20 text-red-400' },
      GRACE_PERIOD: { label: 'Período de Graça', className: 'bg-yellow-500/20 text-yellow-400' },
      CANCELED: { label: 'Cancelado', className: 'bg-muted text-muted-foreground' },
    }
    const c = config[status] || config.ACTIVE
    return <Badge className={c.className}>{c.label}</Badge>
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-amber-500" />
            Faturamento por Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Cálculo de cobrança em tempo real baseado em trainers ativos.
          </p>
        </div>

        <StatsGrid columns={4}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </StatsGrid>

        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-amber-500" />
            Faturamento por Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Cálculo de cobrança em tempo real baseado em trainers ativos.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Faturamento Estimado"
          value={formatCurrency(data?.studios.reduce((acc, s) => acc + s.estimatedBilling, 0) || 0)}
          subtitle="Soma studios ativos"
          icon={<DollarSign className="h-4 w-4" />}
          iconColor="text-green-500"
          iconBgColor="bg-green-500/10"
        />
        <StatsCard
          title="Trainers Ativos"
          value={data?.studios.reduce((acc, s) => acc + s.activeTrainers, 0) || 0}
          subtitle="Base de cobrança"
          icon={<Users className="h-4 w-4" />}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-500/10"
        />
        <StatsCard
          title="Studios Ativos"
          value={data?.stats.ACTIVE || 0}
          subtitle="Status ATIVO"
          icon={<CheckCircle className="h-4 w-4" />}
          iconColor="text-green-500"
          iconBgColor="bg-green-500/10"
        />
        <StatsCard
          title="Bloqueados"
          value={data?.stats.SUSPENDED || 0}
          subtitle="Fora do cálculo"
          icon={<AlertCircle className="h-4 w-4" />}
          iconColor="text-red-500"
          iconBgColor="bg-red-500/10"
        />
      </StatsGrid>

      {/* Studios Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            Cálculo Individual por Studio
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.studios.length ? (
            <div className="py-8 text-center text-muted-foreground">
              <Building2 className="mx-auto h-12 w-12 text-muted mb-2" />
              <p>Nenhum studio encontrado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.studios.map((studio) => (
                <div key={studio.id} className="p-4 border rounded-lg bg-card">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium">{studio.name}</div>
                      <div className="text-xs text-muted-foreground">{studio.plan?.name || 'Sem plano'}</div>
                    </div>
                    {getStatusBadge(studio.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div><span className="text-muted-foreground">Trainers:</span> {studio.activeTrainers}</div>
                    <div><span className="text-muted-foreground">Preço:</span> {formatCurrency(studio.plan?.pricePerTrainer || 0)}</div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground">Fatura Estimada</span>
                    <span className="text-lg font-bold text-amber-500">{formatCurrency(studio.estimatedBilling)}</span>
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
