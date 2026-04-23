'use client'

// ============================================================================
// EXPERT PRO TRAINING — CONTAS A RECEBER
// ============================================================================

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatsCard, StatsGrid } from '@/components/ui'
import {
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

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

export default function ContasReceberPage() {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<Entry[]>([])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/studio/financeiro/entries?type=RECEITA&limit=100')
      const result = await res.json()
      if (result.success) {
        setEntries(result.data.entries.filter((e: Entry) => e.status !== 'CANCELED'))
      }
    } catch { toast.error('Erro') }
    finally { setLoading(false) }
  }

  const handleMarkPaid = async (id: string) => {
    try {
      const res = await fetch(`/api/studio/financeiro/entries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      })
      if ((await res.json()).success) {
        toast.success('Recebido!')
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
  const received = entries.filter(e => e.status === 'PAID')

  const totalPending = pending.reduce((s, e) => s + e.amount, 0)
  const totalOverdue = overdue.reduce((s, e) => s + e.amount, 0)
  const totalReceived = received.reduce((s, e) => s + e.amount, 0)

  // Agrupar por aluno
  const byClient: Record<string, { name: string; total: number; overdue: number; count: number }> = {}
  for (const e of pending) {
    const key = e.client?.id || '_avulso'
    const name = e.client?.name || 'Avulso'
    if (!byClient[key]) byClient[key] = { name, total: 0, overdue: 0, count: 0 }
    byClient[key].total += e.amount
    byClient[key].count++
    if (e.dueDate && new Date(e.dueDate) < now) byClient[key].overdue += e.amount
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-emerald-500" /> Contas a Receber
        </h1>
        <StatsGrid columns={3}>
          {[1,2,3].map(i => <Skeleton key={i} className="h-28" />)}
        </StatsGrid>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-emerald-500" />
        Contas a Receber
      </h1>

      <StatsGrid columns={3}>
        <StatsCard
          title="A Receber"
          value={fmt(totalPending)}
          subtitle={`${pending.length} receitas`}
          icon={<Clock className="h-4 w-4" />}
          iconColor="text-amber-500"
          iconBgColor="bg-amber-500/10"
        />
        <StatsCard
          title="Em Atraso"
          value={fmt(totalOverdue)}
          subtitle={`${overdue.length} atrasadas`}
          icon={<AlertTriangle className="h-4 w-4" />}
          iconColor="text-red-500"
          iconBgColor="bg-red-500/10"
        />
        <StatsCard
          title="Recebido (mês)"
          value={fmt(totalReceived)}
          subtitle={`${received.length} receitas`}
          icon={<CheckCircle className="h-4 w-4" />}
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-500/10"
        />
      </StatsGrid>

      {/* Por Aluno */}
      {Object.keys(byClient).length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Por Aluno/Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(byClient)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([key, info]) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{info.name}</p>
                      <p className="text-xs text-muted-foreground">{info.count} receitas pendentes</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {info.overdue > 0 && (
                        <Badge className="bg-red-500/20 text-red-400 text-xs">
                          {fmt(info.overdue)} atrasado
                        </Badge>
                      )}
                      <span className="text-sm font-semibold text-amber-400">{fmt(info.total)}</span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de receitas pendentes */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">
            Todos a Receber ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500 opacity-50" />
              Nenhuma receita pendente
            </p>
          ) : (
            <div className="space-y-2">
              {pending
                .sort((a, b) => (a.dueDate || a.date).localeCompare(b.dueDate || b.date))
                .map(e => {
                  const isOverdue = e.dueDate && new Date(e.dueDate) < now
                  return (
                    <div key={e.id} className={`flex items-center justify-between p-3 rounded-lg group ${
                      isOverdue ? 'bg-red-500/5' : 'hover:bg-muted/50'
                    }`}>
                      <div>
                        <p className="text-sm font-medium">{e.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.category.name}
                          {e.client && ` · ${e.client.name}`}
                          {e.dueDate && ` · ${isOverdue ? 'Venceu' : 'Vence'} ${fmtDate(e.dueDate)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOverdue && (
                          <Badge className="bg-red-500/20 text-red-400 text-xs">Atrasado</Badge>
                        )}
                        <span className={`text-sm font-semibold ${isOverdue ? 'text-red-400' : 'text-emerald-400'}`}>
                          {fmt(e.amount)}
                        </span>
                        <Button
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 bg-emerald-600 h-7"
                          onClick={() => handleMarkPaid(e.id)}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" /> Receber
                        </Button>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
