'use client'

// ============================================================================
// EXPERT PRO TRAINING — MENSALIDADES DE ALUNOS
// ============================================================================

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatsCard, StatsGrid } from '@/components/ui'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  CheckCircle,
  AlertTriangle,
  Clock,
  Plus,
  TrendingUp,
  Calendar,
  Search,
  CreditCard,
  Star,
  ChevronDown,
  ChevronRight,
  DollarSign,
} from 'lucide-react'
import { toast } from 'sonner'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

// ─── Types ─────────────────────────────────────────────────────────────────

interface MensalidadeEntry {
  id: string
  description: string
  amount: number
  date: string
  dueDate: string | null
  status: string
  paidAt: string | null
  paymentMethod: string | null
  installment: number | null
  totalInstallments: number | null
  recurrenceId: string | null
  category: { id: string; code: string; name: string }
}

interface ClientMensalidade {
  id: string
  name: string
  email: string | null
  phone: string | null
  status: 'ADIMPLENTE' | 'INADIMPLENTE' | 'ADIANTADO' | 'PENDENTE' | 'SEM_MENSALIDADE'
  creditMonths: number
  totalPending: number
  totalOverdue: number
  nextDueDate: string | null
  lastPaymentDate: string | null
  currentMonthPaid: boolean
  recurrenceId: string | null
  entries: MensalidadeEntry[]
}

interface Stats {
  total: number
  comMensalidade: number
  adimplentes: number
  inadimplentes: number
  pendentes: number
  adiantados: number
  totalAReceber: number
  totalOverdue: number
}

interface Category {
  id: string
  code: string
  name: string
  type: string
}

const PAYMENT_METHODS = [
  { value: 'PIX', label: 'PIX' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'CARTAO_DEBITO', label: 'Cartão Débito' },
  { value: 'CARTAO_CREDITO', label: 'Cartão Crédito' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'OUTRO', label: 'Outro' },
]

const STATUS_FILTER = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'INADIMPLENTE', label: 'Inadimplentes' },
  { value: 'PENDENTE', label: 'Pendentes' },
  { value: 'ADIMPLENTE', label: 'Adimplentes' },
  { value: 'ADIANTADO', label: 'Adiantados' },
  { value: 'SEM_MENSALIDADE', label: 'Sem mensalidade' },
]

// ─── Main Component ─────────────────────────────────────────────────────────

export default function MensalidadesPage() {
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<ClientMensalidade[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('TODOS')
  const [expandedClient, setExpandedClient] = useState<string | null>(null)

  // Modal: nova mensalidade
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [selectedClientForNew, setSelectedClientForNew] = useState<ClientMensalidade | null>(null)
  const [savingNew, setSavingNew] = useState(false)
  const [newForm, setNewForm] = useState({
    categoryId: '',
    description: '',
    amount: '',
    startDate: new Date().toISOString().split('T')[0],
    monthsTotal: '12',
    monthsPaidNow: '0',
    paymentMethod: 'PIX',
    notes: '',
  })

  // Modal: quitar meses
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [selectedClientForPay, setSelectedClientForPay] = useState<ClientMensalidade | null>(null)
  const [savingPay, setSavingPay] = useState(false)
  const [payForm, setPayForm] = useState({
    monthsCount: '1',
    paymentMethod: 'PIX',
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [mensRes, catRes] = await Promise.all([
        fetchWithAuth('/api/studio/financeiro/mensalidades'),
        fetchWithAuth('/api/studio/financeiro/categories'),
      ])
      const [mensData, catData] = await Promise.all([mensRes.json(), catRes.json()])

      if (mensData.success) {
        setClients(mensData.data.clients)
        setStats(mensData.data.stats)
      }
      if (catData.success) {
        setCategories(catData.data.flat.filter((c: Category) => c.type === 'RECEITA'))
      }
    } catch {
      toast.error('Erro ao carregar mensalidades')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleNewMensalidade = async () => {
    if (!selectedClientForNew) return
    if (!newForm.categoryId || !newForm.description || !newForm.amount || !newForm.startDate) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setSavingNew(true)
    try {
      const res = await fetchWithAuth('/api/studio/financeiro/mensalidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientForNew.id,
          categoryId: newForm.categoryId,
          description: newForm.description,
          amount: parseFloat(newForm.amount),
          startDate: newForm.startDate,
          monthsTotal: parseInt(newForm.monthsTotal),
          monthsPaidNow: parseInt(newForm.monthsPaidNow),
          paymentMethod: newForm.paymentMethod || null,
          notes: newForm.notes || null,
        }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success(result.message)
        setNewModalOpen(false)
        setSelectedClientForNew(null)
        loadData()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSavingNew(false)
    }
  }

  const handleQuitarMeses = async () => {
    if (!selectedClientForPay?.recurrenceId) return

    setSavingPay(true)
    try {
      const res = await fetchWithAuth('/api/studio/financeiro/mensalidades/quitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recurrenceId: selectedClientForPay.recurrenceId,
          monthsCount: parseInt(payForm.monthsCount),
          paymentMethod: payForm.paymentMethod || null,
        }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success(result.message)
        setPayModalOpen(false)
        setSelectedClientForPay(null)
        loadData()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('Erro ao quitar')
    } finally {
      setSavingPay(false)
    }
  }

  const openNewModal = (client: ClientMensalidade) => {
    setSelectedClientForNew(client)
    setNewForm({
      categoryId: '',
      description: `Mensalidade ${client.name}`,
      amount: '',
      startDate: new Date().toISOString().split('T')[0],
      monthsTotal: '12',
      monthsPaidNow: '0',
      paymentMethod: 'PIX',
      notes: '',
    })
    setNewModalOpen(true)
  }

  const openPayModal = (client: ClientMensalidade) => {
    setSelectedClientForPay(client)
    setPayForm({ monthsCount: '1', paymentMethod: 'PIX' })
    setPayModalOpen(true)
  }

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

  const fmtMonth = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'ADIMPLENTE':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-0">✓ Adimplente</Badge>
      case 'ADIANTADO':
        return <Badge className="bg-yellow-500/15 text-yellow-600 border-0"><Star className="h-3 w-3 mr-1" />Adiantado</Badge>
      case 'INADIMPLENTE':
        return <Badge className="bg-red-500/20 text-red-400 border-0">⚠ Inadimplente</Badge>
      case 'PENDENTE':
        return <Badge className="bg-amber-500/20 text-amber-400 border-0"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>
      default:
        return <Badge className="bg-muted text-muted-foreground border-0">Sem mensalidade</Badge>
    }
  }

  const entryStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'text-emerald-400'
      case 'OVERDUE': return 'text-red-400'
      case 'PENDING': return 'text-amber-400'
      default: return 'text-muted-foreground'
    }
  }

  const entryStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID': return 'Pago'
      case 'OVERDUE': return 'Vencido'
      case 'PENDING': return 'Pendente'
      case 'CANCELED': return 'Cancelado'
      default: return status
    }
  }

  // Filtrar e ordenar clientes
  const filteredClients = clients
    .filter(c => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'TODOS' || c.status === statusFilter
      return matchSearch && matchStatus
    })
    .sort((a, b) => {
      // Ordenar: inadimplente primeiro, depois pendente, depois adimplente, depois sem mensalidade
      const order = { INADIMPLENTE: 0, PENDENTE: 1, ADIMPLENTE: 2, ADIANTADO: 3, SEM_MENSALIDADE: 4 }
      return (order[a.status] ?? 5) - (order[b.status] ?? 5)
    })

  const pendingMonths = parseInt(payForm.monthsCount) || 1
  const payTotal = selectedClientForPay
    ? (selectedClientForPay.entries.find(e => e.status === 'PENDING' || e.status === 'OVERDUE')?.amount ?? 0) * pendingMonths
    : 0

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-emerald-500" /> Mensalidades
        </h1>
        <StatsGrid columns={4}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </StatsGrid>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-500" />
            Mensalidades de Alunos
          </h1>
          <p className="text-sm text-muted-foreground">
            {stats?.comMensalidade ?? 0} alunos com mensalidade ativa
          </p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <StatsGrid columns={4}>
          <StatsCard
            title="Adimplentes"
            value={String(stats.adimplentes + stats.adiantados)}
            subtitle={`de ${stats.comMensalidade} alunos`}
            icon={<CheckCircle className="h-4 w-4" />}
            iconColor="text-emerald-500"
            iconBgColor="bg-emerald-500/10"
          />
          <StatsCard
            title="Inadimplentes"
            value={String(stats.inadimplentes)}
            subtitle={stats.inadimplentes > 0 ? '⚠️ Atenção' : 'Nenhum'}
            icon={<AlertTriangle className="h-4 w-4" />}
            iconColor={stats.inadimplentes > 0 ? 'text-red-500' : 'text-emerald-500'}
            iconBgColor={stats.inadimplentes > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'}
          />
          <StatsCard
            title="A Receber"
            value={fmt(stats.totalAReceber)}
            subtitle="Pendente + vencido"
            icon={<TrendingUp className="h-4 w-4" />}
            iconColor="text-amber-500"
            iconBgColor="bg-amber-500/10"
          />
          <StatsCard
            title="Em Atraso"
            value={fmt(stats.totalOverdue)}
            subtitle={`${stats.inadimplentes} alunos`}
            icon={<DollarSign className="h-4 w-4" />}
            iconColor={stats.totalOverdue > 0 ? 'text-red-500' : 'text-emerald-500'}
            iconBgColor={stats.totalOverdue > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'}
          />
        </StatsGrid>
      )}

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar aluno..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de clientes */}
      <div className="space-y-2">
        {filteredClients.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum aluno encontrado</p>
            </CardContent>
          </Card>
        ) : filteredClients.map(client => {
          const isExpanded = expandedClient === client.id
          const hasPending = client.status === 'INADIMPLENTE' || client.status === 'PENDENTE'
          const borderColor = client.status === 'INADIMPLENTE'
            ? 'border-red-500/30'
            : client.status === 'ADIANTADO'
            ? 'border-yellow-500/30'
            : 'border-border'

          return (
            <Card key={client.id} className={`bg-card ${borderColor} transition-all`}>
              <CardContent className="p-0">
                {/* Client row */}
                <div className="flex items-center gap-3 p-4">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    client.status === 'INADIMPLENTE' ? 'bg-red-500/20 text-red-400' :
                    client.status === 'ADIANTADO' ? 'bg-yellow-500/15 text-yellow-600' :
                    client.status === 'ADIMPLENTE' ? 'bg-emerald-500/20 text-emerald-400' :
                    client.status === 'PENDENTE' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {client.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{client.name}</p>
                      {statusBadge(client.status)}
                      {client.creditMonths >= 2 && (
                        <span className="text-xs text-yellow-600">
                          {client.creditMonths} meses adiantados
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      {client.status !== 'SEM_MENSALIDADE' && (
                        <>
                          {client.nextDueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {hasPending ? 'Venceu' : 'Próximo'}: {fmtDate(client.nextDueDate)}
                            </span>
                          )}
                          {client.lastPaymentDate && (
                            <span>Último pag.: {fmtDate(client.lastPaymentDate)}</span>
                          )}
                        </>
                      )}
                      {client.phone && <span>{client.phone}</span>}
                    </div>
                  </div>

                  {/* Valores e ações */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {client.totalOverdue > 0 && (
                      <span className="text-sm font-bold text-red-400">{fmt(client.totalOverdue)}</span>
                    )}
                    {client.totalPending > 0 && client.totalOverdue === 0 && (
                      <span className="text-sm font-semibold text-amber-400">{fmt(client.totalPending)}</span>
                    )}

                    {/* Botão Pagar */}
                    {(hasPending || client.status === 'ADIMPLENTE') && client.recurrenceId && (
                      <Button
                        size="sm"
                        className={`h-8 text-xs ${hasPending ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-muted hover:bg-muted/80 text-muted-foreground'}`}
                        onClick={() => openPayModal(client)}
                      >
                        <CreditCard className="h-3.5 w-3.5 mr-1" />
                        Receber
                      </Button>
                    )}

                    {/* Botão Nova Mensalidade */}
                    {client.status === 'SEM_MENSALIDADE' && (
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => openNewModal(client)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                      </Button>
                    )}

                    {/* Botão expandir histórico */}
                    {client.entries.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground"
                        onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                      >
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />
                        }
                      </Button>
                    )}

                    {/* Add new recurrence when client already has one */}
                    {client.status !== 'SEM_MENSALIDADE' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => openNewModal(client)}
                        title="Adicionar nova recorrência"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Histórico expandido */}
                {isExpanded && client.entries.length > 0 && (
                  <div className="border-t border-border bg-muted/20">
                    <div className="px-4 py-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Histórico de mensalidades
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
                        {client.entries.map(entry => (
                          <div
                            key={entry.id}
                            className={`p-2 rounded-md border text-center text-xs ${
                              entry.status === 'PAID'
                                ? 'border-emerald-500/20 bg-emerald-500/5'
                                : entry.status === 'OVERDUE'
                                ? 'border-red-500/20 bg-red-500/5'
                                : entry.status === 'CANCELED'
                                ? 'border-muted bg-muted/30 opacity-40'
                                : 'border-amber-500/20 bg-amber-500/5'
                            }`}
                          >
                            <p className="font-medium text-foreground">{fmtMonth(entry.date)}</p>
                            <p className={`font-semibold ${entryStatusColor(entry.status)}`}>
                              {entryStatusLabel(entry.status)}
                            </p>
                            <p className="text-muted-foreground">{fmt(entry.amount)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Modal: Nova Mensalidade */}
      <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Nova Mensalidade
              {selectedClientForNew && (
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  — {selectedClientForNew.name}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Categoria */}
            <div>
              <Label>Categoria *</Label>
              <Select value={newForm.categoryId} onValueChange={v => setNewForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descrição */}
            <div>
              <Label>Descrição *</Label>
              <Input
                value={newForm.description}
                onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Mensalidade Personal"
              />
            </div>

            {/* Valor + Data início */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor mensal (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newForm.amount}
                  onChange={e => setNewForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div>
                <Label>Início *</Label>
                <Input
                  type="date"
                  value={newForm.startDate}
                  onChange={e => setNewForm(f => ({ ...f, startDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Total de meses + Meses pagos agora */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total de meses</Label>
                <Select value={newForm.monthsTotal} onValueChange={v => setNewForm(f => ({ ...f, monthsTotal: v, monthsPaidNow: '0' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 6, 12, 24].map(n => (
                      <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'mês' : 'meses'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Já pagos agora</Label>
                <Select value={newForm.monthsPaidNow} onValueChange={v => setNewForm(f => ({ ...f, monthsPaidNow: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: parseInt(newForm.monthsTotal) + 1 }, (_, i) => i).map(n => (
                      <SelectItem key={n} value={String(n)}>
                        {n === 0 ? 'Nenhum' : `${n} ${n === 1 ? 'mês' : 'meses'}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Resumo do pagamento antecipado */}
            {parseInt(newForm.monthsPaidNow) > 0 && newForm.amount && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm">
                <p className="text-emerald-400 font-semibold">
                  💳 Recebendo agora: {fmt(parseFloat(newForm.amount) * parseInt(newForm.monthsPaidNow))}
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  {newForm.monthsPaidNow} meses × {fmt(parseFloat(newForm.amount))} — marcados como PAGO
                </p>
                {parseInt(newForm.monthsTotal) - parseInt(newForm.monthsPaidNow) > 0 && (
                  <p className="text-muted-foreground text-xs">
                    {parseInt(newForm.monthsTotal) - parseInt(newForm.monthsPaidNow)} meses restantes ficarão como PENDENTE
                  </p>
                )}
              </div>
            )}

            {/* Forma de pagamento */}
            {parseInt(newForm.monthsPaidNow) > 0 && (
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={newForm.paymentMethod} onValueChange={v => setNewForm(f => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Observações */}
            <div>
              <Label>Observações</Label>
              <Textarea
                value={newForm.notes}
                onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Opcional..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleNewMensalidade}
              disabled={savingNew}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {savingNew ? 'Salvando...' : 'Criar Mensalidade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Quitar meses */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Registrar Pagamento
              {selectedClientForPay && (
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  — {selectedClientForPay.name}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status atual */}
            {selectedClientForPay && (
              <div className="p-3 rounded-lg bg-muted/30 space-y-1 text-sm">
                {selectedClientForPay.totalOverdue > 0 && (
                  <p className="text-red-400">
                    ⚠️ Em atraso: <strong>{fmt(selectedClientForPay.totalOverdue)}</strong>
                  </p>
                )}
                {selectedClientForPay.totalPending > 0 && (
                  <p className="text-amber-400">
                    Pendente: <strong>{fmt(selectedClientForPay.totalPending)}</strong>
                  </p>
                )}
                {selectedClientForPay.nextDueDate && (
                  <p className="text-muted-foreground text-xs">
                    Próximo vencimento: {fmtDate(selectedClientForPay.nextDueDate)}
                  </p>
                )}
              </div>
            )}

            {/* Quantos meses pagar */}
            <div>
              <Label>Quantos meses pagar agora?</Label>
              <Select value={payForm.monthsCount} onValueChange={v => setPayForm(f => ({ ...f, monthsCount: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 6, 12].map(n => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? 'mês' : 'meses'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Forma de pagamento */}
            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={payForm.paymentMethod} onValueChange={v => setPayForm(f => ({ ...f, paymentMethod: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Total a receber */}
            {selectedClientForPay && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-sm text-emerald-400 font-semibold">
                  💰 Total a receber: {fmt(
                    (selectedClientForPay.entries.find(e =>
                      e.status === 'OVERDUE' || e.status === 'PENDING'
                    )?.amount ?? 0) * parseInt(payForm.monthsCount)
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Os {payForm.monthsCount} meses mais antigos serão marcados como pagos
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleQuitarMeses}
              disabled={savingPay}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {savingPay ? 'Registrando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
