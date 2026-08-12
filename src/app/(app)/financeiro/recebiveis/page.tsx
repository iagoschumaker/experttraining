'use client'

// ============================================================================
// KINEX PERFORMANCE — RECEBÍVEIS
// Layout: navegação por mês, abas Contratos / Faturas, FAB
// Contratos = receitas recorrentes | Faturas = entradas avulsas do mês
// SEPARADO de Mensalidades (que fica em /financeiro/mensalidades)
// ============================================================================

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  TrendingUp, Plus, ChevronLeft, ChevronRight, CalendarDays,
  FileText, ClipboardList, CheckCircle, Trash2, Edit, Undo2,
  Search, DollarSign, Clock, AlertTriangle, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

// ── Types ──────────────────────────────────────────────────────────────────

interface Entry {
  id: string
  type: string
  description: string
  amount: number
  date: string
  dueDate: string | null
  status: string
  paymentMethod: string | null
  notes: string | null
  installment: number | null
  totalInstallments: number | null
  recurrenceId: string | null
  paidAt: string | null
  category: { id: string; code: string; name: string; type: string }
  client: { id: string; name: string } | null
}

interface Category { id: string; code: string; name: string; type: string }

interface Contract {
  recurrenceId: string
  description: string
  amount: number
  totalInstallments: number
  status: 'ACTIVE' | 'PAUSED' | 'CANCELED'
  clientName: string | null
  categoryName: string
  startDate: string
  entries: Entry[]
  paidCount: number
  pendingCount: number
}

// ── Constants ──────────────────────────────────────────────────────────────

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const PAYMENT_METHODS = [
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CARTAO_DEBITO', label: 'Cartão Débito' },
  { value: 'CARTAO_CREDITO', label: 'Cartão Crédito' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'OUTRO', label: 'Outro' },
]

// ── Page ────────────────────────────────────────────────────────────────────

export default function RecebiveisPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth()) // 0-indexed
  const [year, setYear] = useState(now.getFullYear())
  const [tab, setTab] = useState<'contratos' | 'faturas'>('contratos')
  const [loading, setLoading] = useState(true)

  // Dados
  const [allEntries, setAllEntries] = useState<Entry[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [faturas, setFaturas] = useState<Entry[]>([])

  // Filtros
  const [contractFilter, setContractFilter] = useState('ALL')
  const [faturaFilter, setFaturaFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  // Modals
  const [fabOpen, setFabOpen] = useState(false)
  const [contractDialogOpen, setContractDialogOpen] = useState(false)
  const [faturaDialogOpen, setFaturaDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Forms
  const [contractForm, setContractForm] = useState({
    description: '', amount: '', categoryId: '',
    billingDay: '5', startDate: new Date().toISOString().split('T')[0],
    endDate: '', notes: '', recurrenceCount: '12',
  })

  const [faturaForm, setFaturaForm] = useState({
    description: '', amount: '', categoryId: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '', paymentMethod: '', notes: '', isPaid: false,
  })

  // ── Navegação de mês ───────────────────────────────────────────────────

  const goBack = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const goForward = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // ── Data fetching ──────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Buscar TODOS os entries RECEITA (limite alto) para montar contratos + faturas
      const startDate = new Date(year, month, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]
      
      const [entriesRes, allRes] = await Promise.all([
        // Entries do mês selecionado
        fetchWithAuth(`/api/studio/financeiro/entries?type=RECEITA&dateFrom=${startDate}&dateTo=${endDate}&limit=200`),
        // Todos os entries RECEITA para mapear contratos
        fetchWithAuth(`/api/studio/financeiro/entries?type=RECEITA&limit=500`),
      ])

      const entriesData = await entriesRes.json()
      const allData = await allRes.json()

      const monthEntries: Entry[] = entriesData.success ? entriesData.data.entries : []
      const allEntriesArr: Entry[] = allData.success ? allData.data.entries : []
      setAllEntries(allEntriesArr)

      // Separar contratos (recurrenceId != null) e faturas avulsas
      const contractMap = new Map<string, Entry[]>()
      const avulsas: Entry[] = []

      for (const e of monthEntries) {
        if (e.recurrenceId) {
          if (!contractMap.has(e.recurrenceId)) contractMap.set(e.recurrenceId, [])
          contractMap.get(e.recurrenceId)!.push(e)
        } else {
          avulsas.push(e)
        }
      }

      // Montar lista de contratos a partir de TODOS os entries (não só do mês)
      const contractsMap = new Map<string, Entry[]>()
      for (const e of allEntriesArr) {
        if (e.recurrenceId) {
          if (!contractsMap.has(e.recurrenceId)) contractsMap.set(e.recurrenceId, [])
          contractsMap.get(e.recurrenceId)!.push(e)
        }
      }

      const contractsList: Contract[] = []
      contractsMap.forEach((entries, recId) => {
        const sorted = entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        const first = sorted[0]
        const paidCount = sorted.filter(e => e.status === 'PAID').length
        const pendingCount = sorted.filter(e => e.status === 'PENDING' || e.status === 'OVERDUE').length
        const canceledCount = sorted.filter(e => e.status === 'CANCELED').length
        
        let status: Contract['status'] = 'ACTIVE'
        if (canceledCount === sorted.length) status = 'CANCELED'
        else if (pendingCount === 0 && paidCount === sorted.length) status = 'ACTIVE'

        // Limpar nome: remover (1/12) do final
        const cleanDesc = first.description.replace(/\s*\(\d+\/\d+\)$/, '')

        contractsList.push({
          recurrenceId: recId,
          description: cleanDesc,
          amount: first.amount,
          totalInstallments: first.totalInstallments || sorted.length,
          status,
          clientName: first.client?.name || null,
          categoryName: first.category.name,
          startDate: first.date,
          entries: sorted,
          paidCount,
          pendingCount,
        })
      })

      setContracts(contractsList)
      
      // Faturas = entradas avulsas do mês + entries de contratos do mês
      setFaturas(monthEntries)
    } catch { toast.error('Erro ao carregar dados') }
    finally { setLoading(false) }
  }, [month, year])

  const loadCategories = async () => {
    try {
      const res = await fetchWithAuth('/api/studio/financeiro/categories')
      const result = await res.json()
      if (result.success) setCategories((result.data.flat ?? []).filter((c: Category) => c.type === 'RECEITA'))
    } catch {}
  }

  useEffect(() => { loadData(); loadCategories() }, [loadData])

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleCreateContract = async () => {
    if (!contractForm.description || !contractForm.amount || !contractForm.categoryId || !contractForm.startDate) {
      toast.error('Preencha todos os campos obrigatórios'); return
    }
    setSaving(true)
    try {
      const body = {
        categoryId: contractForm.categoryId,
        type: 'RECEITA',
        description: contractForm.description,
        amount: parseFloat(contractForm.amount),
        date: contractForm.startDate,
        dueDate: contractForm.startDate,
        notes: contractForm.notes || null,
        recurrence: {
          type: 'MONTHLY',
          count: parseInt(contractForm.recurrenceCount) || 12,
        },
      }
      const res = await fetchWithAuth('/api/studio/financeiro/entries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const result = await res.json()
      if (result.success) { toast.success('Contrato criado!'); setContractDialogOpen(false); resetContractForm(); loadData() }
      else toast.error(result.error)
    } catch { toast.error('Erro ao criar contrato') }
    finally { setSaving(false) }
  }

  const handleCreateFatura = async () => {
    if (!faturaForm.description || !faturaForm.amount || !faturaForm.categoryId || !faturaForm.date) {
      toast.error('Preencha todos os campos obrigatórios'); return
    }
    setSaving(true)
    try {
      const body: any = {
        categoryId: faturaForm.categoryId,
        type: 'RECEITA',
        description: faturaForm.description,
        amount: parseFloat(faturaForm.amount),
        date: faturaForm.date,
        dueDate: faturaForm.dueDate || faturaForm.date,
        paymentMethod: faturaForm.paymentMethod || null,
        notes: faturaForm.notes || null,
      }
      if (faturaForm.isPaid) { body.paidAt = new Date().toISOString(); body.status = 'PAID' }
      const res = await fetchWithAuth('/api/studio/financeiro/entries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const result = await res.json()
      if (result.success) { toast.success('Fatura criada!'); setFaturaDialogOpen(false); resetFaturaForm(); loadData() }
      else toast.error(result.error)
    } catch { toast.error('Erro ao criar fatura') }
    finally { setSaving(false) }
  }

  const handleMarkPaid = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/studio/financeiro/entries/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID', paymentMethod: 'PIX' }),
      })
      const r = await res.json()
      if (r.success) { toast.success('Recebimento registrado!'); loadData() }
    } catch { toast.error('Erro') }
  }

  const handleRevert = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/studio/financeiro/entries/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PENDING' }),
      })
      const r = await res.json()
      if (r.success) { toast.success('Pagamento desfeito'); loadData() }
    } catch { toast.error('Erro') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta fatura?')) return
    try {
      const res = await fetchWithAuth(`/api/studio/financeiro/entries/${id}`, { method: 'DELETE' })
      const r = await res.json()
      if (r.success) { toast.success('Excluído!'); loadData() }
    } catch { toast.error('Erro ao excluir') }
  }

  const handleDeleteContract = async (recurrenceId: string) => {
    if (!confirm('Excluir TODAS as faturas pendentes deste contrato?')) return
    try {
      const res = await fetchWithAuth(`/api/studio/financeiro/entries/recurrence?id=${recurrenceId}`, { method: 'DELETE' })
      const r = await res.json()
      if (r.success) { toast.success(r.message || 'Contrato cancelado'); loadData() }
      else toast.error(r.error)
    } catch { toast.error('Erro') }
  }

  const resetContractForm = () => setContractForm({
    description: '', amount: '', categoryId: '',
    billingDay: '5', startDate: new Date().toISOString().split('T')[0],
    endDate: '', notes: '', recurrenceCount: '12',
  })
  const resetFaturaForm = () => setFaturaForm({
    description: '', amount: '', categoryId: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '', paymentMethod: '', notes: '', isPaid: false,
  })

  // ── Computed ───────────────────────────────────────────────────────────

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')

  const activeContracts = contracts.filter(c => c.status === 'ACTIVE')
  const filteredContracts = contracts.filter(c => {
    if (contractFilter === 'ACTIVE') return c.status === 'ACTIVE'
    if (contractFilter === 'CANCELED') return c.status === 'CANCELED'
    return true
  }).filter(c => !search || c.description.toLowerCase().includes(search.toLowerCase()) || (c.clientName || '').toLowerCase().includes(search.toLowerCase()))

  const filteredFaturas = faturas.filter(f => {
    if (faturaFilter === 'PENDING') return f.status === 'PENDING'
    if (faturaFilter === 'PAID') return f.status === 'PAID'
    if (faturaFilter === 'OVERDUE') return f.status === 'OVERDUE'
    if (faturaFilter === 'CANCELED') return f.status === 'CANCELED'
    return true
  }).filter(f => !search || f.description.toLowerCase().includes(search.toLowerCase()) || (f.client?.name || '').toLowerCase().includes(search.toLowerCase()))

  const totalAReceber = faturas.filter(f => f.status === 'PENDING' || f.status === 'OVERDUE').reduce((s, e) => s + e.amount, 0)
  const totalRecebido = faturas.filter(f => f.status === 'PAID').reduce((s, e) => s + e.amount, 0)
  const totalAtrasado = faturas.filter(f => f.status === 'OVERDUE').reduce((s, e) => s + e.amount, 0)

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 relative pb-20">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Recebíveis</h1>
        <p className="text-sm text-muted-foreground">Gerencie contratos e faturas</p>
      </div>

      {/* Navegação de mês */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="outline" size="icon" className="h-9 w-9 border-border" onClick={goBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 text-base font-semibold min-w-[180px] justify-center">
          <CalendarDays className="h-4 w-4 text-blue-500" />
          {MONTHS[month]} {year}
        </div>
        <Button variant="outline" size="icon" className="h-9 w-9 border-border" onClick={goForward}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-blue-500/20"><ClipboardList className="h-4 w-4 text-blue-400" /></div>
            <span className="text-2xl font-bold text-blue-400">{activeContracts.length}</span>
          </div>
          <p className="text-xs text-muted-foreground">Contratos Ativos</p>
          <p className="text-[10px] text-muted-foreground/60">de {contracts.length} total</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-amber-500/20"><DollarSign className="h-4 w-4 text-amber-400" /></div>
            <span className="text-lg font-bold text-amber-400">{fmt(totalAReceber)}</span>
          </div>
          <p className="text-xs text-muted-foreground">A Receber</p>
          <p className="text-[10px] text-muted-foreground/60">{faturas.filter(f => f.status === 'PENDING').length} fatura(s)</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-emerald-500/20"><CheckCircle className="h-4 w-4 text-emerald-400" /></div>
            <span className="text-lg font-bold text-emerald-400">{fmt(totalRecebido)}</span>
          </div>
          <p className="text-xs text-muted-foreground">Recebido</p>
          <p className="text-[10px] text-muted-foreground/60">{faturas.filter(f => f.status === 'PAID').length} fatura(s)</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-red-500/20"><AlertTriangle className="h-4 w-4 text-red-400" /></div>
            <span className="text-lg font-bold text-red-400">{fmt(totalAtrasado)}</span>
          </div>
          <p className="text-xs text-muted-foreground">Atrasado</p>
          <p className="text-[10px] text-muted-foreground/60">{faturas.filter(f => f.status === 'OVERDUE').length} fatura(s)</p>
        </div>
      </div>

      {/* Abas */}
      <div className="border-b border-border">
        <div className="flex gap-0">
          <button
            onClick={() => setTab('contratos')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'contratos'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Contratos
            <Badge className="bg-blue-500/20 text-blue-400 text-[10px] h-5 px-1.5">{contracts.length}</Badge>
          </button>
          <button
            onClick={() => setTab('faturas')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === 'faturas'
                ? 'border-emerald-500 text-emerald-500'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-4 w-4" />
            Faturas
            <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] h-5 px-1.5">{faturas.length}</Badge>
          </button>
        </div>
      </div>

      {/* Filtros + Busca */}
      <div className="flex flex-wrap items-center gap-2">
        {tab === 'contratos' ? (
          <>
            {['ALL','ACTIVE','CANCELED'].map(f => (
              <button key={f} onClick={() => setContractFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  contractFilter === f
                    ? f === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : f === 'CANCELED' ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-muted/50 text-muted-foreground border-border hover:border-foreground/30'
                }`}>
                {f === 'ALL' ? `Todos ${contracts.length}` : f === 'ACTIVE' ? `Ativos ${contracts.filter(c => c.status === 'ACTIVE').length}` : `Cancelados ${contracts.filter(c => c.status === 'CANCELED').length}`}
              </button>
            ))}
          </>
        ) : (
          <>
            {['ALL','PENDING','PAID','OVERDUE','CANCELED'].map(f => (
              <button key={f} onClick={() => setFaturaFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  faturaFilter === f
                    ? f === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                    : f === 'PAID' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : f === 'OVERDUE' ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : f === 'CANCELED' ? 'bg-muted text-muted-foreground border-border'
                    : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-muted/50 text-muted-foreground border-border hover:border-foreground/30'
                }`}>
                {f === 'ALL' ? `Todas ${faturas.length}` : f === 'PENDING' ? `Pendentes ${faturas.filter(e => e.status === 'PENDING').length}` : f === 'PAID' ? `Pagas ${faturas.filter(e => e.status === 'PAID').length}` : f === 'OVERDUE' ? `Atrasadas ${faturas.filter(e => e.status === 'OVERDUE').length}` : `Canceladas ${faturas.filter(e => e.status === 'CANCELED').length}`}
              </button>
            ))}
          </>
        )}
        <div className="ml-auto relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-8 h-8 w-40 text-xs bg-card"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : tab === 'contratos' ? (
        /* ═══ ABA CONTRATOS ═══ */
        filteredContracts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum contrato encontrado</p>
            <p className="text-xs mt-1">Clique no + para criar um novo contrato</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredContracts.map(c => (
              <div key={c.recurrenceId} className="bg-card border border-border rounded-xl p-4 hover:border-blue-500/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Indicator */}
                  <div className={`w-1 h-12 rounded-full flex-shrink-0 ${c.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">{c.description}</span>
                      <Badge className="bg-blue-500/20 text-blue-400 text-[10px]">Mensal</Badge>
                      <Badge className={`text-[10px] ${c.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {c.status === 'ACTIVE' ? 'Ativo' : 'Cancelado'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {c.clientName && <><span className="text-foreground/70">⤷ {c.clientName}</span> · </>}
                      {fmtDate(c.startDate)} → {c.totalInstallments > 100 ? 'Indeterminado' : `${c.totalInstallments} meses`}
                      {' · '}{c.paidCount} paga(s) · {c.pendingCount} pendente(s)
                    </p>
                  </div>
                  {/* Valor + Ações */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <span className="text-emerald-400 font-bold text-sm">{fmt(c.amount)}</span>
                      <p className="text-[10px] text-muted-foreground">/mês</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-500/10"
                      onClick={() => handleDeleteContract(c.recurrenceId)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* ═══ ABA FATURAS ═══ */
        filteredFaturas.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma fatura em {MONTHS[month]}</p>
            <p className="text-xs mt-1">Clique no + para criar uma fatura avulsa</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFaturas.map(f => (
              <div key={f.id} className="bg-card border border-border rounded-xl p-4 hover:border-emerald-500/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Indicator */}
                  <div className={`w-1 h-12 rounded-full flex-shrink-0 ${
                    f.status === 'PAID' ? 'bg-emerald-500' : f.status === 'OVERDUE' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">{f.description}</span>
                      <Badge className={`text-[10px] ${
                        f.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' :
                        f.status === 'OVERDUE' ? 'bg-red-500/20 text-red-400' :
                        f.status === 'CANCELED' ? 'bg-muted text-muted-foreground' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {f.status === 'PAID' ? 'Pago' : f.status === 'OVERDUE' ? 'Atrasado' : f.status === 'CANCELED' ? 'Cancelado' : 'Pendente'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {f.dueDate && <>Venc: {fmtDate(f.dueDate)} · </>}
                      {f.client?.name && <>{f.client.name} · </>}
                      {f.category.name}
                      {f.paidAt && <> · Pago em {fmtDate(f.paidAt)}</>}
                    </p>
                  </div>
                  {/* Valor + Ações */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-emerald-400 font-bold text-sm mr-1">{fmt(f.amount)}</span>
                    {(f.status === 'PENDING' || f.status === 'OVERDUE') && (
                      <Button size="icon" className="h-7 w-7 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleMarkPaid(f.id)}>
                        <CheckCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {f.status === 'PAID' && (
                      <>
                        <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] cursor-default">Recibo</Badge>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-400"
                          onClick={() => handleRevert(f.id)}>
                          <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-500/10"
                      onClick={() => handleDelete(f.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ═══ FAB (Floating Action Button) ═══ */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {fabOpen && (
          <div className="flex flex-col gap-2 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              onClick={() => { setFabOpen(false); resetContractForm(); setContractDialogOpen(true) }}
              className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 shadow-lg hover:border-blue-500/40 transition-colors"
            >
              <div className="p-2 rounded-lg bg-blue-500"><ClipboardList className="h-4 w-4 text-white" /></div>
              <span className="font-medium text-sm whitespace-nowrap">Novo Contrato</span>
            </button>
            <button
              onClick={() => { setFabOpen(false); resetFaturaForm(); setFaturaDialogOpen(true) }}
              className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 shadow-lg hover:border-emerald-500/40 transition-colors"
            >
              <div className="p-2 rounded-lg bg-blue-500"><FileText className="h-4 w-4 text-white" /></div>
              <span className="font-medium text-sm whitespace-nowrap">Nova Fatura</span>
            </button>
          </div>
        )}
        <button
          onClick={() => setFabOpen(!fabOpen)}
          className={`h-14 w-14 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-lg flex items-center justify-center transition-transform ${fabOpen ? 'rotate-45' : ''}`}
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Overlay do FAB */}
      {fabOpen && <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setFabOpen(false)} />}

      {/* ═══ Modal Novo Contrato ═══ */}
      <Dialog open={contractDialogOpen} onOpenChange={setContractDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={contractForm.description}
                onChange={e => setContractForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Aluguel de sala, Patrocínio..." />
            </div>
            <div>
              <Label>Categoria *</Label>
              <Select value={contractForm.categoryId} onValueChange={v => setContractForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor Mensal (R$) *</Label>
                <Input type="number" step="0.01" value={contractForm.amount}
                  onChange={e => setContractForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0,00" />
              </div>
              <div>
                <Label>Dia da Cobrança</Label>
                <Input type="number" min="1" max="28" value={contractForm.billingDay}
                  onChange={e => setContractForm(f => ({ ...f, billingDay: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data do 1º Vencimento *</Label>
                <Input type="date" value={contractForm.startDate}
                  onChange={e => setContractForm(f => ({ ...f, startDate: e.target.value }))} />
                <p className="text-[10px] text-muted-foreground mt-1">Define quando será gerada a primeira fatura</p>
              </div>
              <div>
                <Label>Duração (meses)</Label>
                <Select value={contractForm.recurrenceCount} onValueChange={v => setContractForm(f => ({ ...f, recurrenceCount: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 meses</SelectItem>
                    <SelectItem value="6">6 meses</SelectItem>
                    <SelectItem value="12">12 meses</SelectItem>
                    <SelectItem value="24">24 meses</SelectItem>
                    <SelectItem value="36">36 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={contractForm.notes}
                onChange={e => setContractForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} placeholder="Detalhes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContractDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateContract} disabled={saving} className="bg-blue-500 hover:bg-blue-600">
              {saving ? 'Criando...' : 'Criar Contrato'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Modal Nova Fatura ═══ */}
      <Dialog open={faturaDialogOpen} onOpenChange={setFaturaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Fatura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição *</Label>
              <Input value={faturaForm.description}
                onChange={e => setFaturaForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Venda de produto, serviço avulso..." />
            </div>
            <div>
              <Label>Categoria *</Label>
              <Select value={faturaForm.categoryId} onValueChange={v => setFaturaForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" value={faturaForm.amount}
                  onChange={e => setFaturaForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0,00" />
              </div>
              <div>
                <Label>Data *</Label>
                <Input type="date" value={faturaForm.date}
                  onChange={e => setFaturaForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={faturaForm.dueDate}
                  onChange={e => setFaturaForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div>
                <Label>Forma de Recebimento</Label>
                <Select value={faturaForm.paymentMethod} onValueChange={v => setFaturaForm(f => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={faturaForm.isPaid}
                onChange={e => setFaturaForm(f => ({ ...f, isPaid: e.target.checked }))}
                className="rounded" />
              <span className="text-sm">Já foi recebido</span>
            </label>
            <div>
              <Label>Observações</Label>
              <Textarea value={faturaForm.notes}
                onChange={e => setFaturaForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} placeholder="Opcional..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFaturaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateFatura} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? 'Criando...' : 'Criar Fatura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
