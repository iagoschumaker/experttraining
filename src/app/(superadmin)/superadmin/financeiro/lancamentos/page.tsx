'use client'

// ============================================================================
// EXPERT PRO TRAINING — SUPERADMIN LANÇAMENTOS
// ============================================================================
// O SuperAdmin tem seu próprio financeiro (custos de servidor, marketing, etc.)
// Reutiliza a mesma API de entries — associado ao studioId "superadmin"
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
  FileText,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

interface Entry {
  id: string
  type: 'RECEITA' | 'DESPESA'
  description: string
  amount: number
  date: string
  dueDate: string | null
  status: string
  paymentMethod: string | null
  category: { id: string; code: string; name: string }
  client: { id: string; name: string } | null
}

interface Category {
  id: string
  code: string
  name: string
  type: string
}

const PAYMENT_METHODS = [
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CARTAO_DEBITO', label: 'Cartão Débito' },
  { value: 'CARTAO_CREDITO', label: 'Cartão Crédito' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'OUTRO', label: 'Outro' },
]

export default function SuperAdminLancamentosPage() {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<Entry[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [form, setForm] = useState({
    type: 'DESPESA' as 'RECEITA' | 'DESPESA',
    categoryId: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    paymentMethod: '',
    notes: '',
    isPaid: false,
  })

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ limit: '50' })
      if (filterType) params.set('type', filterType)
      if (filterStatus) params.set('status', filterStatus)
      const res = await fetch(`/api/superadmin/financeiro/entries?${params}`)
      const result = await res.json()
      if (result.success) {
        setEntries(result.data.entries)
        setTotal(result.data.pagination.total)
      }
    } catch { toast.error('Erro') }
    finally { setLoading(false) }
  }, [filterType, filterStatus])

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/superadmin/financeiro/categories')
      const result = await res.json()
      if (result.success) setCategories(result.data.flat)
    } catch { /* fallback */ }
  }

  useEffect(() => { loadEntries(); loadCategories() }, [loadEntries])

  const handleSubmit = async () => {
    if (!form.categoryId || !form.description || !form.amount || !form.date) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    setSaving(true)
    try {
      const body: any = {
        categoryId: form.categoryId,
        type: form.type,
        description: form.description,
        amount: parseFloat(form.amount),
        date: form.date,
        dueDate: form.dueDate || null,
        paymentMethod: form.paymentMethod || null,
        notes: form.notes || null,
      }
      if (form.isPaid) { body.paidAt = new Date().toISOString(); body.status = 'PAID' }
      
      const res = await fetch('/api/superadmin/financeiro/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await res.json()
      if (result.success) {
        toast.success('Lançamento criado!')
        setDialogOpen(false)
        resetForm()
        loadEntries()
      } else toast.error(result.error)
    } catch { toast.error('Erro') }
    finally { setSaving(false) }
  }

  const handleMarkPaid = async (id: string) => {
    try {
      const res = await fetch(`/api/superadmin/financeiro/entries/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      })
      if ((await res.json()).success) { toast.success('Pago!'); loadEntries() }
    } catch { toast.error('Erro') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir?')) return
    try {
      const res = await fetch(`/api/superadmin/financeiro/entries/${id}`, { method: 'DELETE' })
      if ((await res.json()).success) { toast.success('Excluído!'); loadEntries() }
    } catch { toast.error('Erro') }
  }

  const resetForm = () => setForm({
    type: 'DESPESA', categoryId: '', description: '', amount: '',
    date: new Date().toISOString().split('T')[0], dueDate: '', paymentMethod: '', notes: '', isPaid: false,
  })

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')

  const filteredCats = categories.filter(c =>
    form.type === 'RECEITA' ? c.type === 'RECEITA' : c.type !== 'RECEITA'
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-emerald-500" />
            Lançamentos — SaaS
          </h1>
          <p className="text-sm text-muted-foreground">{total} lançamentos</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true) }} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" /> Novo Lançamento
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={filterType || 'ALL'} onValueChange={v => { setFilterType(v === 'ALL' ? '' : v); }}>
          <SelectTrigger className="w-36 bg-card"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="RECEITA">Receita</SelectItem>
            <SelectItem value="DESPESA">Despesa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus || 'ALL'} onValueChange={v => { setFilterStatus(v === 'ALL' ? '' : v); }}>
          <SelectTrigger className="w-36 bg-card"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="PENDING">Pendente</SelectItem>
            <SelectItem value="PAID">Pago</SelectItem>
            <SelectItem value="OVERDUE">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="pt-4">
          {loading ? (
            <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-14" />)}</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum lançamento</p>
            </div>
          ) : (
            <div className="space-y-1">
              {entries.map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 group">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-1.5 rounded-md flex-shrink-0 ${e.type === 'RECEITA' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                      {e.type === 'RECEITA' ? <ArrowUpRight className="h-4 w-4 text-emerald-500" /> : <ArrowDownRight className="h-4 w-4 text-red-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.category.code} - {e.category.name} · {fmtDate(e.date)}
                        {e.dueDate && ` · Venc: ${fmtDate(e.dueDate)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge className={
                      e.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-400' :
                      e.status === 'OVERDUE' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }>
                      {e.status === 'PAID' ? 'Pago' : e.status === 'OVERDUE' ? 'Vencido' : 'Pendente'}
                    </Badge>
                    <span className={`text-sm font-semibold whitespace-nowrap min-w-[90px] text-right ${e.type === 'RECEITA' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {e.type === 'DESPESA' ? '-' : '+'}{fmt(e.amount)}
                    </span>
                    {e.status === 'PENDING' && (
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 text-emerald-500 h-7 px-2" onClick={() => handleMarkPaid(e.id)}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 text-red-500 h-7 px-2" onClick={() => handleDelete(e.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Lançamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button type="button" className={`flex-1 ${form.type === 'DESPESA' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                variant={form.type === 'DESPESA' ? 'default' : 'outline'}
                onClick={() => setForm(f => ({ ...f, type: 'DESPESA', categoryId: '' }))}>
                <ArrowDownRight className="h-4 w-4 mr-1" /> Despesa
              </Button>
              <Button type="button" className={`flex-1 ${form.type === 'RECEITA' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                variant={form.type === 'RECEITA' ? 'default' : 'outline'}
                onClick={() => setForm(f => ({ ...f, type: 'RECEITA', categoryId: '' }))}>
                <ArrowUpRight className="h-4 w-4 mr-1" /> Receita
              </Button>
            </div>
            <div>
              <Label>Categoria *</Label>
              <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{filteredCats.map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Descrição *</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ex: Servidor AWS maio" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div><Label>Data *</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Vencimento</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} /></div>
              <div>
                <Label>Pagamento</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPaid} onChange={e => setForm(f => ({ ...f, isPaid: e.target.checked }))} className="rounded" />
              <span className="text-sm">Já está pago</span>
            </label>
            <div><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
