'use client'

// ============================================================================
// EXPERT PRO TRAINING — CONTAS A PAGAR
// ============================================================================

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatsCard, StatsGrid } from '@/components/ui'
import {
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
} from 'lucide-react'
import { toast } from 'sonner'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

interface Entry {
  id: string
  description: string
  amount: number
  date: string
  dueDate: string | null
  status: string
  paymentMethod: string | null
  category: { id: string; code: string; name: string }
  client: { id: string; name: string } | null
}

export default function ContasPagarPage() {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<Entry[]>([])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetchWithAuth('/api/studio/financeiro/entries?type=DESPESA&limit=100')
      const result = await res.json()
      if (result.success) {
        setEntries(result.data.entries.filter((e: Entry) => e.status !== 'CANCELED'))
      }
    } catch { toast.error('Erro') }
    finally { setLoading(false) }
  }

  const handleMarkPaid = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/studio/financeiro/entries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      })
      if ((await res.json()).success) {
        toast.success('Pago!')
        loadData()
      }
    } catch { toast.error('Erro') }
  }

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')

  const now = new Date()
  const pending = entries.filter(e => e.status === 'PENDING')
  const overdue = pending.filter(e => e.dueDate && new Date(e.dueDate) < now)
  const upcoming = pending.filter(e => !e.dueDate || new Date(e.dueDate) >= now)
  const paid = entries.filter(e => e.status === 'PAID')

  const totalPending = pending.reduce((s, e) => s + e.amount, 0)
  const totalOverdue = overdue.reduce((s, e) => s + e.amount, 0)
  const totalPaid = paid.reduce((s, e) => s + e.amount, 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingDown className="h-6 w-6 text-red-500" /> Contas a Pagar
        </h1>
        <StatsGrid columns={3}>
          {[1,2,3].map(i => <Skeleton key={i} className="h-28" />)}
        </StatsGrid>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <TrendingDown className="h-6 w-6 text-red-500" />
        Contas a Pagar
      </h1>

      <StatsGrid columns={3}>
        <StatsCard
          title="Pendente"
          value={fmt(totalPending)}
          subtitle={`${pending.length} contas`}
          icon={<Clock className="h-4 w-4" />}
          iconColor="text-amber-500"
          iconBgColor="bg-amber-500/10"
        />
        <StatsCard
          title="Vencido"
          value={fmt(totalOverdue)}
          subtitle={`${overdue.length} contas`}
          icon={<AlertTriangle className="h-4 w-4" />}
          iconColor="text-red-500"
          iconBgColor="bg-red-500/10"
        />
        <StatsCard
          title="Pago (mês)"
          value={fmt(totalPaid)}
          subtitle={`${paid.length} contas`}
          icon={<CheckCircle className="h-4 w-4" />}
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-500/10"
        />
      </StatsGrid>

      {/* Vencidas */}
      {overdue.length > 0 && (
        <Card className="bg-card border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400 text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Vencidas ({overdue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdue.map(e => (
                <div key={e.id} className="p-3 rounded-lg bg-red-500/5">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <p className="text-sm font-medium truncate flex-1">{e.description}</p>
                    <span className="text-sm font-bold text-red-400 flex-shrink-0">{fmt(e.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">{e.category.name} · Venceu {fmtDate(e.dueDate!)}</p>
                    <Button size="sm" className="bg-emerald-600 h-7 flex-shrink-0" onClick={() => handleMarkPaid(e.id)}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Pagar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* A vencer */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">
            A Vencer ({upcoming.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">Nenhuma conta a vencer</p>
          ) : (
            <div className="space-y-2">
              {upcoming
                .sort((a, b) => (a.dueDate || a.date).localeCompare(b.dueDate || b.date))
                .map(e => (
                  <div key={e.id} className="p-3 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <p className="text-sm font-medium truncate flex-1">{e.description}</p>
                      <span className="text-sm font-semibold text-amber-400 flex-shrink-0">{fmt(e.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">
                        {e.category.name}{e.dueDate && ` · Vence ${fmtDate(e.dueDate)}`}
                      </p>
                      <Button size="sm" variant="ghost" className="text-emerald-500 h-7 flex-shrink-0"
                        onClick={() => handleMarkPaid(e.id)}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagas */}
      {paid.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-base text-muted-foreground">
              Pagas ({paid.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {paid.slice(0, 10).map(e => (
                <div key={e.id} className="flex items-center justify-between gap-2 p-2 rounded-lg opacity-60 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{e.description}</p>
                    <p className="text-xs text-muted-foreground">{e.category.name} · {fmtDate(e.date)}</p>
                  </div>
                  <span className="text-sm text-muted-foreground line-through flex-shrink-0">{fmt(e.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
