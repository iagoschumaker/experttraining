'use client'

// ============================================================================
// KINEX PERFORMANCE — MENSALIDADES (Assinaturas Recorrentes)
// ============================================================================

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Search,
  CreditCard,
  Bell,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronRight,

  Tag,
} from 'lucide-react'
import { toast } from 'sonner'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Mensalidade {
  id: string
  clientId: string
  clientName: string
  clientEmail: string | null
  clientPhone: string | null
  clientIsActive: boolean
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL'
  amount: number
  adhesionDate: string
  nextBillingDate: string
  lastPaymentDate: string | null
  status: 'ACTIVE' | 'PENDING' | 'OVERDUE' | 'INACTIVE'
  notes: string | null
  planId: string | null
  planName: string | null
  isAlertDue: boolean
  daysUntilDue: number
}

interface StudioPlan {
  id: string
  name: string
  description: string | null
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL'
  price: number
}

interface ClientWithoutMens {
  id: string
  name: string
  email: string | null
  phone: string | null
}

interface Stats {
  total: number
  comMensalidade: number
  semMensalidade: number
  ativos: number
  pendentes: number
  atrasados: number
  inativos: number
  alertas: number
  totalAReceber: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const CYCLE_LABELS: Record<string, string> = {
  MONTHLY:    'Mensal',
  QUARTERLY:  'Trimestral',
  SEMIANNUAL: 'Semestral',
  ANNUAL:     'Anual',
}

const STATUS_CONFIG = {
  ACTIVE:   { label: 'Em dia',   color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  PENDING:  { label: 'Pendente', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  OVERDUE:  { label: 'Atrasado', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  INACTIVE: { label: 'Inativo',  color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

// Mesma lógica do backend — calcula próxima cobrança futura
const CYCLE_MONTHS_UI: Record<string, number> = {
  MONTHLY: 1, QUARTERLY: 3, SEMIANNUAL: 6, ANNUAL: 12,
}
function calcSmartNextBillingDateUI(adhesionDate: Date, cycle: string): Date {
  const months = CYCLE_MONTHS_UI[cycle] ?? 1
  const next = new Date(adhesionDate)
  next.setMonth(next.getMonth() + months)
  const now = new Date()
  while (next <= now) {
    next.setMonth(next.getMonth() + months)
  }
  return next
}

// ─── Card de cada aluno ──────────────────────────────────────────────────────

function MensalidadeCard({
  m,
  onPay,
  onConfigure,
}: {
  m: Mensalidade
  onPay: (m: Mensalidade) => void
  onConfigure: (m: Mensalidade) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STATUS_CONFIG[m.status]

  return (
    <div className={cn(
      'rounded-xl border transition-all',
      m.status === 'OVERDUE'
        ? 'border-red-500/30 bg-red-500/5'
        : m.isAlertDue
        ? 'border-yellow-500/30 bg-yellow-500/5'
        : 'border-border bg-card'
    )}>
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn(
          'w-2.5 h-2.5 rounded-full flex-shrink-0',
          m.status === 'ACTIVE'   ? 'bg-emerald-400' :
          m.status === 'PENDING'  ? 'bg-yellow-400'  :
          m.status === 'OVERDUE'  ? 'bg-red-400'     : 'bg-zinc-500'
        )} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-foreground truncate">{m.clientName}</span>
            {m.planName && (
              <span className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 flex items-center gap-1">
                <Tag className="w-2.5 h-2.5" />
                {m.planName}
              </span>
            )}
            {m.isAlertDue && m.status !== 'OVERDUE' && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full px-2 py-0.5 flex items-center gap-1">
                <Bell className="w-2.5 h-2.5" />
                Vence em {m.daysUntilDue}d
              </span>
            )}
            {m.status === 'OVERDUE' && (
              <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-2 py-0.5 flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                Em atraso
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span>{CYCLE_LABELS[m.billingCycle]}</span>
            <span>•</span>
            <span>{formatCurrency(m.amount)}</span>
            <span>•</span>
            <span>Próx: {formatDate(m.nextBillingDate)}</span>
          </div>
        </div>

        <Badge className={cn('text-xs font-medium border hidden sm:flex', cfg.color)}>
          {cfg.label}
        </Badge>

        {expanded
          ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border/50 pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
            <div>
              <span className="text-muted-foreground text-xs block mb-1">Adesão</span>
              <span>{formatDate(m.adhesionDate)}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block mb-1">Próx. cobrança</span>
              <span className={cn(
                m.status === 'OVERDUE' ? 'text-red-400' :
                m.isAlertDue ? 'text-yellow-400' : ''
              )}>{formatDate(m.nextBillingDate)}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block mb-1">Último pagamento</span>
              <span>{formatDate(m.lastPaymentDate)}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs block mb-1">Aluno ativo</span>
              <span className={m.clientIsActive ? 'text-emerald-400' : 'text-red-400'}>
                {m.clientIsActive ? 'Sim' : 'Não'}
              </span>
            </div>
          </div>
          {m.notes && (
            <p className="text-xs text-muted-foreground mb-3 bg-muted/30 rounded-lg p-2">{m.notes}</p>
          )}
          <div className="flex gap-2">
            {/* Botão Receber só aparece se o aluno tem um plano configurado */}
            {m.planId && (
              <Button size="sm" onClick={(e) => { e.stopPropagation(); onPay(m) }} className="flex-1 sm:flex-none">
                <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                Receber
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onConfigure(m) }}>
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Configurar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

type TabKey = 'all' | 'overdue' | 'alerts' | 'no_mens'

export default function MensalidadesPage() {
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([])
  const [clientsWithoutMens, setClientsWithoutMens] = useState<ClientWithoutMens[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [studioPlans, setStudioPlans] = useState<StudioPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<TabKey>('all')

  // Modal: pagar
  const [payModal, setPayModal] = useState<Mensalidade | null>(null)
  const [payMethod, setPayMethod] = useState('PIX')
  const [payDate, setPayDate] = useState('')
  const [paying, setPaying] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [payCategory, setPayCategory] = useState('')

  // Modal: configurar
  const [configModal, setConfigModal] = useState<Mensalidade | ClientWithoutMens | null>(null)
  const [isConfigNew, setIsConfigNew] = useState(false)
  const [configPlanId, setConfigPlanId] = useState('')
  const [configAmount, setConfigAmount] = useState('')
  const [configAdhesion, setConfigAdhesion] = useState('')
  const [configNotes, setConfigNotes] = useState('')
  const [configuring, setConfiguring] = useState(false)

  // Preview: próxima data de cobrança calculada em tempo real
  const previewNextBillingDate = useMemo(() => {
    if (!configAdhesion || !configPlanId) return null
    const plan = studioPlans.find(p => p.id === configPlanId)
    if (!plan) return null
    try {
      const adhesion = new Date(configAdhesion)
      if (isNaN(adhesion.getTime())) return null
      return calcSmartNextBillingDateUI(adhesion, plan.billingCycle)
    } catch { return null }
  }, [configAdhesion, configPlanId, studioPlans])

  // ─── Carregamento dos dados (fetches independentes para não bloquear uns aos outros) ───

  const loadMensalidades = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/studio/financeiro/mensalidades')
      const data = await res.json()
      if (data.success) {
        setMensalidades(data.data.mensalidades ?? [])
        setClientsWithoutMens(data.data.clientsWithoutMens ?? [])
        setStats(data.data.stats ?? null)
      }
    } catch (e) {
      console.error('Mensalidades load error:', e)
    }
  }, [])

  const loadPlans = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/studio/financeiro/planos')
      const data = await res.json()
      if (data.success) setStudioPlans(data.data ?? [])
    } catch (e) {
      console.error('Plans load error:', e)
    }
  }, [])

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/studio/financeiro/categories?type=RECEITA')
      const data = await res.json()
      if (data.success) setCategories(data.data?.slice(0, 20) ?? [])
    } catch (e) {
      // sem categorias, não bloqueia
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    await Promise.allSettled([loadMensalidades(), loadPlans(), loadCategories()])
    setLoading(false)
  }, [loadMensalidades, loadPlans, loadCategories])

  useEffect(() => { load() }, [load])

  // ─── Filtros ─────────────────────────────────────────────────────────────

  const filtered = mensalidades.filter(m => {
    const matchSearch = !search ||
      m.clientName.toLowerCase().includes(search.toLowerCase()) ||
      (m.clientEmail?.toLowerCase() ?? '').includes(search.toLowerCase()) ||
      (m.clientPhone ?? '').includes(search)
    const matchStatus = filterStatus === 'all' || m.status === filterStatus
    return matchSearch && matchStatus
  })

  const tabData: Record<TabKey, Mensalidade[] | ClientWithoutMens[]> = {
    all:      filtered,
    overdue:  filtered.filter(m => m.status === 'OVERDUE'),
    alerts:   filtered.filter(m => m.isAlertDue && m.status !== 'OVERDUE'),
    no_mens:  clientsWithoutMens,
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  async function handlePay() {
    if (!payModal) return
    setPaying(true)
    try {
      const res = await fetchWithAuth(`/api/studio/financeiro/mensalidades/${payModal.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: payMethod,
          paidDate: payDate || undefined,
          categoryId: payCategory || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message ?? 'Pagamento registrado')
        setPayModal(null)
        load()
      } else {
        toast.error(data.error)
      }
    } finally {
      setPaying(false)
    }
  }

  async function handleConfigure() {
    if (!configModal) return
    if (!configPlanId) {
      toast.error('Selecione um plano')
      return
    }
    setConfiguring(true)
    try {
      const clientId = 'clientId' in configModal ? configModal.clientId : configModal.id
      // Busca dados do plano para saber o ciclo
      const plan = studioPlans.find(p => p.id === configPlanId)
      const res = await fetchWithAuth('/api/studio/financeiro/mensalidades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          planId: configPlanId,
          billingCycle: plan?.billingCycle,
          amount: configAmount !== '' ? parseFloat(configAmount) : undefined,
          adhesionDate: configAdhesion || undefined,
          notes: configNotes || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Mensalidade configurada com sucesso')
        setConfigModal(null)
        load()
      } else {
        toast.error(data.error)
      }
    } finally {
      setConfiguring(false)
    }
  }

  function openConfigure(m: Mensalidade) {
    setIsConfigNew(false)
    setConfigModal(m)
    setConfigPlanId(m.planId ?? '')
    setConfigAmount(m.amount > 0 ? m.amount.toString() : '')
    setConfigAdhesion(m.adhesionDate ? m.adhesionDate.slice(0, 10) : '')
    setConfigNotes(m.notes ?? '')
  }

  function openConfigureNew(c: ClientWithoutMens) {
    setIsConfigNew(true)
    setConfigModal(c)
    setConfigPlanId('')
    setConfigAmount('')
    setConfigAdhesion(new Date().toISOString().slice(0, 10))
    setConfigNotes('')
  }

  // ─── Loading skeleton ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'all'     as TabKey, label: 'Todos',      count: (tabData.all as Mensalidade[]).length },
    { key: 'overdue' as TabKey, label: 'Em atraso',  count: (tabData.overdue as Mensalidade[]).length, alert: (tabData.overdue as Mensalidade[]).length > 0 },
    { key: 'alerts'  as TabKey, label: 'Vencendo',   count: (tabData.alerts as Mensalidade[]).length,  alert: (tabData.alerts as Mensalidade[]).length > 0 },
    { key: 'no_mens' as TabKey, label: 'Sem config', count: (tabData.no_mens as ClientWithoutMens[]).length },
  ]

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mensalidades</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Assinaturas recorrentes dos alunos</p>
      </div>

      {/* Stats */}
      {stats && (
        <StatsGrid cols={4}>
          <StatsCard
            title="Alunos"
            value={stats.total}
            icon={<Users className="w-5 h-5" />}
            description={`${stats.comMensalidade} configurados`}
          />
          <StatsCard
            title="Em dia"
            value={stats.ativos}
            icon={<CheckCircle className="w-5 h-5" />}
            description={`${stats.pendentes} pendentes`}
            variant="success"
          />
          <StatsCard
            title="Em atraso"
            value={stats.atrasados}
            icon={<AlertTriangle className="w-5 h-5" />}
            variant={stats.atrasados > 0 ? 'danger' : 'default'}
          />
          <StatsCard
            title="Sem config"
            value={stats.semMensalidade}
            icon={<Settings className="w-5 h-5" />}
            description="sem plano vinculado"
            variant={stats.semMensalidade > 0 ? 'warning' : 'default'}
          />
        </StatsGrid>
      )}

      {/* Banner: vencendo em 3 dias */}
      {(tabData.alerts as Mensalidade[]).length > 0 && activeTab !== 'alerts' && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-400">
          <Bell className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>{(tabData.alerts as Mensalidade[]).length}</strong> aluno(s) com cobrança vencendo em até 3 dias.
          </span>
          <button className="ml-auto text-xs underline" onClick={() => setActiveTab('alerts')}>
            Ver →
          </button>
        </div>
      )}

      {/* Filtros + Tabs */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar aluno..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ACTIVE">Em dia</SelectItem>
              <SelectItem value="PENDING">Pendente</SelectItem>
              <SelectItem value="OVERDUE">Atrasado</SelectItem>
              <SelectItem value="INACTIVE">Inativo</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} className="h-9">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Abas */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-3 py-2 text-sm font-medium transition-all border-b-2 -mb-px flex items-center gap-1.5',
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              <span className={cn(
                'text-xs rounded-full px-1.5 py-0.5',
                tab.alert ? 'bg-red-500/20 text-red-400' : 'bg-muted text-muted-foreground'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {activeTab !== 'no_mens' ? (
          (tabData[activeTab] as Mensalidade[]).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {activeTab === 'overdue'  ? '✓ Nenhum aluno em atraso'
                : activeTab === 'alerts' ? '✓ Nenhum vencimento nos próximos 3 dias'
                : 'Nenhum aluno encontrado'}
            </div>
          ) : (
            (tabData[activeTab] as Mensalidade[]).map(m => (
              <MensalidadeCard key={m.id} m={m} onPay={setPayModal} onConfigure={openConfigure} />
            ))
          )
        ) : (
          (tabData.no_mens as ClientWithoutMens[]).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              ✓ Todos os alunos têm mensalidade configurada
            </div>
          ) : (
            (tabData.no_mens as ClientWithoutMens[]).map(c => (
              <div key={c.id} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-500 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-foreground">{c.name}</span>
                  {c.phone && <span className="text-xs text-muted-foreground ml-2">{c.phone}</span>}
                </div>
                <Button size="sm" variant="outline" onClick={() => openConfigureNew(c)}>
                  <Settings className="w-3.5 h-3.5 mr-1.5" />
                  Configurar
                </Button>
              </div>
            ))
          )
        )}
      </div>

      {/* ─── Modal: Receber pagamento ─── */}
      <Dialog open={!!payModal} onOpenChange={() => setPayModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          {payModal && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
                <div className="font-medium">{payModal.clientName}</div>
                <div className="text-muted-foreground">
                  {CYCLE_LABELS[payModal.billingCycle]} · {formatCurrency(payModal.amount)}
                </div>
                <div className="text-muted-foreground text-xs">
                  Próxima cobrança: {formatDate(payModal.nextBillingDate)}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Forma de pagamento</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                    <SelectItem value="CARTAO_DEBITO">Cartão Débito</SelectItem>
                    <SelectItem value="CARTAO_CREDITO">Cartão Crédito</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data do recebimento (opcional)</Label>
                <Input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
              </div>
              {categories.length > 0 && (
                <div className="space-y-2">
                  <Label>Categoria (opcional)</Label>
                  <Select value={payCategory} onValueChange={setPayCategory}>
                    <SelectTrigger><SelectValue placeholder="Selecionar categoria" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModal(null)}>Cancelar</Button>
            <Button onClick={handlePay} disabled={paying}>
              {paying
                ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                : <CreditCard className="w-4 h-4 mr-2" />}
              Confirmar Recebimento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Configurar mensalidade ─── */}
      <Dialog open={!!configModal} onOpenChange={() => setConfigModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isConfigNew ? 'Configurar Mensalidade' : 'Editar Mensalidade'}</DialogTitle>
          </DialogHeader>
          {configModal && (
            <div className="space-y-4 py-2">
              {/* Nome do aluno */}
              <div className="bg-muted/30 rounded-lg p-3 text-sm font-medium">
                {'clientName' in configModal ? configModal.clientName : configModal.name}
              </div>

              {/* Seletor de plano — sempre visível */}
              <div className="space-y-2">
                <Label>Plano *</Label>
                {studioPlans.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground text-center space-y-2">
                    <p>Nenhum plano criado ainda.</p>
                    <a
                      href="/financeiro/planos"
                      target="_blank"
                      className="inline-flex items-center gap-1 text-primary text-xs underline"
                    >
                      <Tag className="w-3 h-3" /> Criar planos →
                    </a>
                  </div>
                ) : (
                  <Select
                    value={configPlanId || ''}
                    onValueChange={(v) => {
                      setConfigPlanId(v)
                      const plan = studioPlans.find(p => p.id === v)
                      if (plan && (!configAmount || parseFloat(configAmount) === 0)) {
                        setConfigAmount(plan.price.toString())
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um plano..." />
                    </SelectTrigger>
                    <SelectContent>
                      {studioPlans.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{p.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {CYCLE_LABELS[p.billingCycle]} · {formatCurrency(p.price)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Valor — pode sobrescrever o padrão do plano */}
              <div className="space-y-2">
                <Label>
                  Valor (R$)
                  <span className="text-xs text-muted-foreground ml-1 font-normal">
                    — opcional, sobrescreve o valor do plano
                  </span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={
                    configPlanId
                      ? `Padrão: R$ ${studioPlans.find(p => p.id === configPlanId)?.price.toFixed(2) ?? '0.00'}`
                      : 'Selecione um plano primeiro'
                  }
                  value={configAmount}
                  onChange={e => setConfigAmount(e.target.value)}
                />
              </div>

              {/* Data de adesão */}
              <div className="space-y-2">
                <Label>Data de adesão</Label>
                <Input
                  type="date"
                  value={configAdhesion}
                  onChange={e => setConfigAdhesion(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Data em que o aluno aderiu / fez o primeiro pagamento.
                </p>
              </div>

              {/* Preview: próxima cobrança calculada */}
              {previewNextBillingDate && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-start gap-2">
                  <CreditCard className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="font-medium text-primary">Próxima cobrança:</span>
                    <span className="ml-1 text-foreground font-semibold">
                      {previewNextBillingDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Calculado com base na adesão e no ciclo do plano selecionado.
                    </p>
                  </div>
                </div>
              )}

              {/* Observações */}
              <div className="space-y-2">
                <Label>Observações</Label>
                <Input
                  placeholder="Desconto especial, condição diferenciada..."
                  value={configNotes}
                  onChange={e => setConfigNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigModal(null)}>Cancelar</Button>
            <Button onClick={handleConfigure} disabled={configuring || studioPlans.length === 0}>
              {configuring
                ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                : <Settings className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
