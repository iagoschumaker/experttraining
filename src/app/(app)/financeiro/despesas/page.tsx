'use client'

// ============================================================================
// KINEX PERFORMANCE — DESPESAS
// Saídas manuais de DESPESA (separado de Mensalidades)
// ============================================================================

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  TrendingDown, Plus, ArrowDownRight, CheckCircle, Trash2, Edit,
  RefreshCw, Undo2, Calendar, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

interface Entry {
  id: string
  type: 'RECEITA' | 'DESPESA'
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
  category: { id: string; code: string; name: string; type: string }
  client: { id: string; name: string } | null
}

interface Category {
  id: string
  code: string
  name: string
  type: string
  parentId: string | null
}

const PAYMENT_METHODS = [
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CARTAO_DEBITO', label: 'Cartão Débito' },
  { value: 'CARTAO_CREDITO', label: 'Cartão Crédito' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'OUTRO', label: 'Outro' },
]

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDING', label: 'Pendente' },
  { value: 'PAID', label: 'Pago' },
  { value: 'OVERDUE', label: 'Vencido' },
  { value: 'CANCELED', label: 'Cancelado' },
]

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function DespesasPage() {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<Entry[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [page] = useState(1)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [editEntry, setEditEntry] = useState<Entry | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({ description: '', amount: '', date: '', dueDate: '', categoryId: '', paymentMethod: '', notes: '', status: '' })
  const [savingEdit, setSavingEdit] = useState(false)

  const [filterStatus, setFilterStatus] = useState('')

  const [form, setForm] = useState({
    categoryId: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    paymentMethod: '',
    notes: '',
    isPaid: false,
    isRecurrent: false,
    recurrenceType: 'MONTHLY',
    recurrenceCount: '6',
  })

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: String(page), limit: '50', type: 'DESPESA' })
      if (filterStatus) params.set('status', filterStatus)
      const res = await fetchWithAuth(`/api/studio/financeiro/entries?${params}`)
      const result = await res.json()
      if (result.success) {
        setEntries(result.data.entries)
        setTotal(result.data.pagination?.total ?? result.data.entries.length)
      }
    } catch {
      toast.error('Erro ao carregar despesas')
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus])

  const loadCategories = async () => {
    try {
      const res = await fetchWithAuth('/api/studio/financeiro/categories')
      const result = await res.json()
      if (result.success) setCategories((result.data.flat ?? []).filter((c: Category) => c.type === 'DESPESA'))
    } catch { console.error('Erro ao carregar categorias') }
  }

  useEffect(() => { loadEntries(); loadCategories() }, [loadEntries])

  const resetForm = () => setForm({
    categoryId: '', description: '', amount: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '', paymentMethod: '', notes: '', isPaid: false,
    isRecurrent: false, recurrenceType: 'MONTHLY', recurrenceCount: '6',
  })

  const handleSubmit = async () => {
    if (!form.categoryId || !form.description || !form.amount || !form.date) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    setSaving(true)
    try {
      const body: any = {
        categoryId: form.categoryId,
        type: 'DESPESA',
        description: form.description,
        amount: parseFloat(form.amount),
        date: form.date,
        dueDate: form.dueDate || null,
        paymentMethod: form.paymentMethod || null,
        notes: form.notes || null,
      }
      if (form.isPaid) { body.paidAt = new Date().toISOString(); body.status = 'PAID' }
      if (form.isRecurrent && parseInt(form.recurrenceCount) > 1) {
        body.recurrence = { type: form.recurrenceType, count: parseInt(form.recurrenceCount) }
      }
      const res = await fetchWithAuth('/api/studio/financeiro/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await res.json()
      if (result.success) { toast.success('Despesa criada!'); setDialogOpen(false); resetForm(); loadEntries() }
      else toast.error(result.error)
    } catch { toast.error('Erro ao salvar') }
    finally { setSaving(false) }
  }

  const handleMarkPaid = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/studio/financeiro/entries/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID', paymentMethod: 'PIX' }),
      })
      const result = await res.json()
      if (result.success) { toast.success('Marcado como pago!'); loadEntries() }
    } catch { toast.error('Erro') }
  }

  const handleRevertToPending = async (id: string) => {
    try {
      const res = await fetchWithAuth(`/api/studio/financeiro/entries/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PENDING' }),
      })
      const result = await res.json()
      if (result.success) { toast.success('Revertido para pendente'); loadEntries() }
    } catch { toast.error('Erro') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta despesa?')) return
    try {
      const res = await fetchWithAuth(`/api/studio/financeiro/entries/${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (result.success) { toast.success('Excluído!'); loadEntries() }
    } catch { toast.error('Erro ao excluir') }
  }

  const handleOpenEdit = (entry: Entry) => {
    setEditEntry(entry)
    setEditForm({
      description: entry.description,
      amount: String(entry.amount),
      date: entry.date ? entry.date.split('T')[0] : '',
      dueDate: entry.dueDate ? entry.dueDate.split('T')[0] : '',
      categoryId: entry.category.id,
      paymentMethod: entry.paymentMethod || '',
      notes: entry.notes || '',
      status: entry.status,
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editEntry) return
    setSavingEdit(true)
    try {
      const body: any = {
        description: editForm.description,
        amount: parseFloat(editForm.amount),
        date: editForm.date || undefined,
        dueDate: editForm.dueDate || null,
        categoryId: editForm.categoryId || undefined,
        paymentMethod: editForm.paymentMethod || null,
        notes: editForm.notes || null,
        status: editForm.status,
      }
      if (editForm.status === 'PAID' && editEntry.status !== 'PAID') body.paidAt = new Date().toISOString()
      const res = await fetchWithAuth(`/api/studio/financeiro/entries/${editEntry.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const result = await res.json()
      if (result.success) { toast.success('Atualizado!'); setEditDialogOpen(false); setEditEntry(null); loadEntries() }
      else toast.error(result.error)
    } catch { toast.error('Erro ao editar') }
    finally { setSavingEdit(false) }
  }

  const handleCancelRecurrence = async (recurrenceId: string) => {
    if (!confirm('Cancelar todos os lançamentos pendentes desta recorrência?')) return
    try {
      const res = await fetchWithAuth(`/api/studio/financeiro/entries/recurrence?id=${recurrenceId}`, { method: 'DELETE' })
      const result = await res.json()
      if (result.success) { toast.success(result.message); loadEntries() }
      else toast.error(result.error)
    } catch { toast.error('Erro') }
  }

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')

  // Agrupar por mês
  const grouped: Record<string, Entry[]> = {}
  for (const entry of entries) {
    const d = new Date(entry.date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(entry)
  }
  const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  // Totais rápidos
  const totalPago = entries.filter(e => e.status === 'PAID').reduce((s, e) => s + e.amount, 0)
  const totalPendente = entries.filter(e => e.status === 'PENDING').reduce((s, e) => s + e.amount, 0)
  const totalVencido = entries.filter(e => e.status === 'OVERDUE').reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingDown className="h-6 w-6 text-red-500" />
            Despesas
          </h1>
          <p className="text-sm text-muted-foreground">{total} despesas registradas</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true) }}
          className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Nova Despesa
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-xs text-red-400/70 mb-1 uppercase tracking-wide">Pago</p>
          <p className="text-xl font-bold text-red-400">-{fmt(totalPago)}</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <p className="text-xs text-amber-400/70 mb-1 uppercase tracking-wide">Pendente</p>
          <p className="text-xl font-bold text-amber-400">-{fmt(totalPendente)}</p>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
          <p className="text-xs text-orange-400/70 mb-1 uppercase tracking-wide">Vencido</p>
          <p className="text-xl font-bold text-orange-400">-{fmt(totalVencido)}</p>
        </div>
      </div>

      {/* Filtro de status */}
      <div className="flex gap-2 flex-wrap">
        <Select value={filterStatus || 'ALL'} onValueChange={v => setFilterStatus(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-36 bg-card">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Lista agrupada por mês */}
      {loading ? (
        <Card className="bg-card border-border"><CardContent className="pt-4">
          <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14" />)}</div>
        </CardContent></Card>
      ) : entries.length === 0 ? (
        <Card className="bg-card border-border"><CardContent className="pt-4">
          <div className="text-center py-12 text-muted-foreground">
            <TrendingDown className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma despesa encontrada</p>
            <p className="text-xs mt-1">Clique em "Nova Despesa" para adicionar</p>
          </div>
        </CardContent></Card>
      ) : (
        sortedKeys.map(key => {
          const [yr, mo] = key.split('-').map(Number)
          const monthEntries = grouped[key]
          const monthTotal = monthEntries.filter(e => e.status !== 'CANCELED').reduce((s, e) => s + e.amount, 0)

          return (
            <Card key={key} className="bg-card border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-red-500" />
                    {MONTH_NAMES[mo - 1]} {yr}
                    <Badge className="bg-muted text-muted-foreground text-[10px] ml-1">{monthEntries.length}</Badge>
                  </CardTitle>
                  <span className="text-red-400 font-semibold text-sm">-{fmt(monthTotal)}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-0.5">
                  {monthEntries.map(entry => (
                    <div key={entry.id} className="p-2.5 rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded-md flex-shrink-0 bg-red-500/10">
                          <ArrowDownRight className="h-4 w-4 text-red-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{entry.description}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {entry.category.name}
                            {entry.client && ` · ${entry.client.name}`}
                            {entry.installment && ` · ${entry.installment}/${entry.totalInstallments}`}
                            {' · '}{fmtDate(entry.date)}
                            {entry.dueDate && ` · Venc: ${fmtDate(entry.dueDate)}`}
                          </p>
                        </div>
                        <span className="text-sm font-bold flex-shrink-0 text-red-400">
                          -{fmt(entry.amount)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-1.5 pl-9">
                        <Badge className={
                          entry.status === 'PAID' ? 'bg-red-500/20 text-red-400 text-[10px]' :
                          entry.status === 'OVERDUE' ? 'bg-orange-500/20 text-orange-400 text-[10px]' :
                          entry.status === 'CANCELED' ? 'bg-muted text-muted-foreground text-[10px]' :
                          'bg-amber-500/20 text-amber-400 text-[10px]'
                        }>
                          {entry.status === 'PAID' ? 'Pago' :
                           entry.status === 'OVERDUE' ? 'Vencido' :
                           entry.status === 'CANCELED' ? 'Cancelado' : 'Pendente'}
                        </Badge>
                        {entry.recurrenceId && (
                          <Badge className="bg-yellow-500/15 text-yellow-600 text-[10px]">
                            <RefreshCw className="h-3 w-3 mr-1" /> Rec.
                          </Badge>
                        )}
                        {(entry.status === 'PENDING' || entry.status === 'OVERDUE') && (
                          <Button size="sm" className={`h-6 px-2 text-xs ${
                            entry.status === 'OVERDUE' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'
                          }`} onClick={() => handleMarkPaid(entry.id)}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Pagar
                          </Button>
                        )}
                        {entry.status === 'PAID' && (
                          <Button size="sm" variant="outline" className="h-6 px-2 text-xs border-amber-500/30 text-amber-400"
                            onClick={() => handleRevertToPending(entry.id)}>
                            <Undo2 className="h-3 w-3 mr-1" /> Desfazer
                          </Button>
                        )}
                        {entry.recurrenceId && entry.status !== 'CANCELED' && (
                          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-orange-500"
                            onClick={() => handleCancelRecurrence(entry.recurrenceId!)}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-yellow-600"
                          onClick={() => handleOpenEdit(entry)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-red-500"
                          onClick={() => handleDelete(entry.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })
      )}

      {/* Dialog Nova Despesa */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownRight className="h-5 w-5 text-red-500" />
              Nova Despesa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Categoria *</Label>
              <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a categoria..." /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Descrição *</Label>
              <Input value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Aluguel, equipamento, manutenção..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0,00" />
              </div>
              <div>
                <Label>Data *</Label>
                <Input type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
              <div>
                <Label>Forma de Pagamento</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPaid}
                onChange={e => setForm(f => ({ ...f, isPaid: e.target.checked }))}
                className="rounded" />
              <span className="text-sm">Já está pago</span>
            </label>

            <div className="border rounded-lg p-3 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isRecurrent}
                  onChange={e => setForm(f => ({ ...f, isRecurrent: e.target.checked }))}
                  className="rounded" />
                <span className="text-sm flex items-center gap-1"><RefreshCw className="h-3.5 w-3.5" /> Despesa Recorrente</span>
              </label>
              {form.isRecurrent && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Frequência</Label>
                    <Select value={form.recurrenceType} onValueChange={v => setForm(f => ({ ...f, recurrenceType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MONTHLY">Mensal</SelectItem>
                        <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                        <SelectItem value="SEMIANNUAL">Semestral</SelectItem>
                        <SelectItem value="YEARLY">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Repetições</Label>
                    <Select value={form.recurrenceCount} onValueChange={v => setForm(f => ({ ...f, recurrenceCount: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 vezes</SelectItem>
                        <SelectItem value="6">6 vezes</SelectItem>
                        <SelectItem value="12">12 vezes</SelectItem>
                        <SelectItem value="24">24 vezes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} placeholder="Opcional..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-red-600 hover:bg-red-700">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Despesa</DialogTitle>
          </DialogHeader>
          {editEntry && (
            <div className="space-y-4">
              <div>
                <Label>Descrição *</Label>
                <Input value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor (R$) *</Label>
                  <Input type="number" step="0.01" value={editForm.amount}
                    onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div>
                  <Label>Data *</Label>
                  <Input type="date" value={editForm.date}
                    onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Vencimento</Label>
                  <Input type="date" value={editForm.dueDate}
                    onChange={e => setEditForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pendente</SelectItem>
                      <SelectItem value="PAID">Pago</SelectItem>
                      <SelectItem value="OVERDUE">Vencido</SelectItem>
                      <SelectItem value="CANCELED">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Categoria</Label>
                  <Select value={editForm.categoryId} onValueChange={v => setEditForm(f => ({ ...f, categoryId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Forma de Pagamento</Label>
                  <Select value={editForm.paymentMethod || 'none'}
                    onValueChange={v => setEditForm(f => ({ ...f, paymentMethod: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não informado</SelectItem>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Opcional..." />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit} className="bg-red-600 hover:bg-red-700">
              {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
