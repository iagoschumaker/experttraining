'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  CreditCard, UserPlus, Calendar, Clock, CheckCircle, AlertCircle,
  Search, Plus, Globe, Building2, Trash2, Edit, X, Users, FileDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { generatePaymentReceiptPDF, generateInvoicePDF } from '@/lib/financial-pdf-generator'

interface Plan {
  id: string; name: string; price: number; billingCycle: string
  durationDays: number; description?: string | null; isTrial: boolean
  trialDays?: number | null; isGlobal?: boolean; studioId?: string | null
}
interface Subscription {
  id: string; status: string; startDate: string; endDate: string; price: number
  isExpired: boolean; isPaidThisMonth?: boolean; lastPaymentDate?: string | null; notes?: string | null
  client: { id: string; name: string; email?: string }
  plan: { id: string; name: string; price: number; billingCycle: string; durationDays: number }
}
interface Client { id: string; name: string; email?: string }

const CYCLE_LABELS: Record<string, string> = { MONTHLY: 'Mensal', YEARLY: 'Anual', CUSTOM: 'Custom' }
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Ativo', color: 'bg-emerald-500/20 text-emerald-400' },
  EXPIRED: { label: 'Vencido', color: 'bg-red-500/20 text-red-400' },
  CANCELED: { label: 'Cancelado', color: 'bg-muted text-muted-foreground' },
  PAUSED: { label: 'Pausado', color: 'bg-amber-500/20 text-amber-400' },
}

const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

export default function StudioClientPlansPage() {
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [showPlanDialog, setShowPlanDialog] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('ACTIVE')
  const [payingSubId, setPayingSubId] = useState<string | null>(null)
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [payMethod, setPayMethod] = useState('PIX')

  // Assign form - search like presenca
  const [assignSearch, setAssignSearch] = useState('')
  const [assignClientId, setAssignClientId] = useState('')
  const [assignClientName, setAssignClientName] = useState('')
  const [assignPlanId, setAssignPlanId] = useState('')
  const [assignNotes, setAssignNotes] = useState('')

  const [planForm, setPlanForm] = useState({
    name: '', description: '', price: '', billingCycle: 'MONTHLY',
    durationDays: '30', isTrial: false, trialDays: '',
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [plansRes, subsRes, clientsRes] = await Promise.all([
        fetch('/api/studio/client-plans'),
        fetch(`/api/studio/client-subscriptions?status=${filterStatus}`),
        fetch('/api/studio/clients?status=ACTIVE&pageSize=500'),
      ])
      const [plansData, subsData, clientsData] = await Promise.all([
        plansRes.json(), subsRes.json(), clientsRes.json(),
      ])
      if (plansData.success) setPlans(plansData.data)
      if (subsData.success) setSubscriptions(subsData.data)
      if (clientsData.success) setClients(clientsData.data?.items || clientsData.data || [])
    } catch { toast.error('Erro ao carregar') }
    finally { setLoading(false) }
  }, [filterStatus])

  useEffect(() => { loadData() }, [loadData])

  // Assign plan
  const handleAssign = async () => {
    if (!assignClientId || !assignPlanId) { toast.error('Selecione aluno e plano'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/studio/client-subscriptions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: assignClientId, planId: assignPlanId, notes: assignNotes }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success('Plano atribuído!')
        setShowAssignDialog(false)
        loadData()
      } else toast.error(result.error)
    } catch { toast.error('Erro') }
    finally { setSaving(false) }
  }

  // Create/Edit plan
  const handleSavePlan = async () => {
    if (!planForm.name || !planForm.price || !planForm.durationDays) {
      toast.error('Preencha nome, preço e duração'); return
    }
    setSaving(true)
    try {
      const url = editingPlan ? `/api/studio/client-plans/${editingPlan.id}` : '/api/studio/client-plans'
      const method = editingPlan ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: planForm.name, description: planForm.description || null,
          price: planForm.price, billingCycle: planForm.billingCycle,
          durationDays: planForm.durationDays, isTrial: planForm.isTrial,
          trialDays: planForm.trialDays || null,
        }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success(editingPlan ? 'Plano atualizado!' : 'Plano criado!')
        setShowPlanDialog(false); setEditingPlan(null); loadData()
      } else toast.error(result.error)
    } catch { toast.error('Erro') }
    finally { setSaving(false) }
  }

  // Delete plan
  const handleDeletePlan = async (plan: Plan) => {
    if (!confirm(`Excluir o plano "${plan.name}"?`)) return
    try {
      const res = await fetch(`/api/studio/client-plans/${plan.id}`, { method: 'DELETE' })
      const result = await res.json()
      if (result.success) { toast.success(result.message || 'Excluído!'); loadData() }
      else toast.error(result.error)
    } catch { toast.error('Erro') }
  }

  // Pay subscription
  const handlePay = async () => {
    if (!payingSubId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/studio/client-subscriptions/${payingSubId}/pay`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: payMethod }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success(result.message || 'Pagamento registrado!')
        setShowPayDialog(false); setPayingSubId(null); loadData()
      } else toast.error(result.error)
    } catch { toast.error('Erro') }
    finally { setSaving(false) }
  }

  const handleReversePay = async (subId: string) => {
    if (!confirm('Estornar pagamento deste mês?')) return
    try {
      const res = await fetch(`/api/studio/client-subscriptions/${subId}/pay`, { method: 'DELETE' })
      const result = await res.json()
      if (result.success) { toast.success('Pagamento estornado'); loadData() }
      else toast.error(result.error)
    } catch { toast.error('Erro') }
  }

  const openEditPlan = (plan: Plan) => {
    setEditingPlan(plan)
    setPlanForm({
      name: plan.name, description: plan.description || '',
      price: String(plan.price), billingCycle: plan.billingCycle,
      durationDays: String(plan.durationDays), isTrial: plan.isTrial,
      trialDays: plan.trialDays ? String(plan.trialDays) : '',
    })
    setShowPlanDialog(true)
  }

  const openCreatePlan = () => {
    setEditingPlan(null)
    setPlanForm({ name: '', description: '', price: '', billingCycle: 'MONTHLY', durationDays: '30', isTrial: false, trialDays: '' })
    setShowPlanDialog(true)
  }

  const openAssignDialog = (preselectedClientId?: string, preselectedName?: string) => {
    setAssignClientId(preselectedClientId || '')
    setAssignClientName(preselectedName || '')
    setAssignPlanId(''); setAssignNotes(''); setAssignSearch('')
    setShowAssignDialog(true)
  }

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')

  const activeSubs = subscriptions.filter(s => s.status === 'ACTIVE' && !s.isExpired)
  const clientsWithPlan = new Set(activeSubs.map(s => s.client.id))
  const clientsWithoutPlan = clients.filter(c => !clientsWithPlan.has(c.id))
  const studioPlans = plans.filter(p => !p.isGlobal && p.studioId)
  const globalPlans = plans.filter(p => p.isGlobal || !p.studioId)

  // Filtered clients for assign dialog (like presenca pattern)
  const filteredAssignClients = assignSearch
    ? clients.filter(c => c.name.toLowerCase().includes(assignSearch.toLowerCase()))
    : clients

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><CreditCard className="h-6 w-6 text-emerald-500" /> Planos de Aluno</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}</div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-emerald-500" /> Planos de Aluno
          </h1>
          <p className="text-sm text-muted-foreground">{activeSubs.length} ativos · {clientsWithoutPlan.length} sem plano</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreatePlan} variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
            <Plus className="h-4 w-4 mr-2" /> Criar Plano
          </Button>
          <Button disabled={plans.length === 0} onClick={() => openAssignDialog()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <UserPlus className="h-4 w-4 mr-2" /> Atribuir Plano
          </Button>
        </div>
      </div>

      {/* Studio Plans */}
      {studioPlans.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2"><Building2 className="h-4 w-4" /> Planos do Studio</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {studioPlans.map(plan => (
              <Card key={plan.id} className="bg-card border-emerald-500/20 group">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-sm">{plan.name}</p>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEditPlan(plan)} className="p-1 rounded hover:bg-muted"><Edit className="h-3.5 w-3.5 text-muted-foreground" /></button>
                      <button onClick={() => handleDeletePlan(plan)} className="p-1 rounded hover:bg-muted"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{fmt(plan.price)}<span className="text-xs text-muted-foreground font-normal">/{CYCLE_LABELS[plan.billingCycle]?.toLowerCase()}</span></p>
                  {plan.description && <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1"><Calendar className="h-3 w-3 inline mr-1" />{plan.durationDays} dias</p>
                  {plan.isTrial && <Badge className="bg-blue-500/20 text-blue-400 text-xs mt-1">Trial {plan.trialDays}d</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Global Plans */}
      {globalPlans.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2"><Globe className="h-4 w-4" /> Planos Globais</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {globalPlans.map(plan => (
              <Card key={plan.id} className="bg-card border-border">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-sm">{plan.name}</p>
                    <Badge className="bg-muted text-muted-foreground text-[10px]">Global</Badge>
                  </div>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{fmt(plan.price)}<span className="text-xs text-muted-foreground font-normal">/{CYCLE_LABELS[plan.billingCycle]?.toLowerCase()}</span></p>
                  {plan.description && <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1"><Calendar className="h-3 w-3 inline mr-1" />{plan.durationDays} dias</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {plans.length === 0 && (
        <Card className="bg-card border-border"><CardContent className="py-8 text-center text-muted-foreground">
          <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum plano disponível.</p>
          <p className="text-xs mt-1">Crie um plano clicando no botão acima.</p>
        </CardContent></Card>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {['ACTIVE', 'EXPIRED', 'CANCELED'].map(s => (
          <Button key={s} variant={filterStatus === s ? 'default' : 'outline'} size="sm"
            className={filterStatus === s ? 'bg-emerald-600 text-white' : ''}
            onClick={() => setFilterStatus(s)}>{STATUS_LABELS[s]?.label || s}</Button>
        ))}
      </div>

      {/* Students without plan */}
      {clientsWithoutPlan.length > 0 && filterStatus === 'ACTIVE' && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-400 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {clientsWithoutPlan.length} alunos sem plano ativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {clientsWithoutPlan.slice(0, 10).map(c => (
                <Badge key={c.id} className="bg-muted text-muted-foreground text-xs cursor-pointer hover:bg-amber-500/20 hover:text-amber-400"
                  onClick={() => openAssignDialog(c.id, c.name)}>{c.name}</Badge>
              ))}
              {clientsWithoutPlan.length > 10 && <Badge className="bg-muted text-muted-foreground text-xs">+{clientsWithoutPlan.length - 10} mais</Badge>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscriptions */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base">Assinaturas</CardTitle></CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Nenhuma assinatura encontrada</p>
          ) : (
            <div className="space-y-1">
              {subscriptions.map(sub => {
                const isPaid = sub.isPaidThisMonth
                const isOverdue = !isPaid && sub.status === 'ACTIVE' && !sub.isExpired && new Date().getDate() > 10
                return (
                  <div key={sub.id} className={`flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 group ${isOverdue ? 'bg-red-500/5' : ''}`}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${sub.isExpired ? 'bg-red-500/10' : isPaid ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                        {sub.isExpired ? <Clock className="h-4 w-4 text-red-500" /> : isPaid ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{sub.client.name}</p>
                        <p className="text-xs text-muted-foreground">{sub.plan.name} · {fmtDate(sub.startDate)} → {fmtDate(sub.endDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {sub.status === 'ACTIVE' && !sub.isExpired && (
                        isPaid ? (
                          <Badge className="bg-emerald-500/20 text-emerald-400 cursor-pointer hover:bg-red-500/20 hover:text-red-400"
                            onClick={() => handleReversePay(sub.id)} title="Clique para estornar">
                            ✅ Pago
                          </Badge>
                        ) : (
                          <Button size="sm" className="h-7 bg-amber-600 hover:bg-amber-700 text-xs"
                            onClick={() => { setPayingSubId(sub.id); setPayMethod('PIX'); setShowPayDialog(true) }}>
                            💰 Pagar
                          </Button>
                        )
                      )}
                      <Badge className={STATUS_LABELS[sub.isExpired ? 'EXPIRED' : sub.status]?.color || ''}>
                        {sub.isExpired ? 'Vencido' : STATUS_LABELS[sub.status]?.label || sub.status}
                      </Badge>
                      {sub.status === 'ACTIVE' && !sub.isExpired && (
                        isPaid ? (
                          <button onClick={() => {
                            const now = new Date()
                            generatePaymentReceiptPDF({
                              studio: { name: 'Studio' }, clientName: sub.client.name,
                              planName: sub.plan.name, amount: sub.price,
                              paymentMethod: 'PIX', paymentDate: sub.lastPaymentDate || now.toISOString(),
                              period: `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
                              receiptId: sub.id.slice(-8),
                            }).catch(() => toast.error('Erro ao gerar PDF'))
                          }} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity" title="Comprovante">
                            <FileDown className="h-3.5 w-3.5 text-emerald-500" />
                          </button>
                        ) : (
                          <button onClick={() => {
                            const now = new Date()
                            generateInvoicePDF({
                              studio: { name: 'Studio' }, clientName: sub.client.name,
                              planName: sub.plan.name, amount: sub.price,
                              dueDate: new Date(now.getFullYear(), now.getMonth(), 10).toISOString(),
                              period: `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
                              invoiceNumber: `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${sub.id.slice(-4)}`,
                            }).catch(() => toast.error('Erro ao gerar PDF'))
                          }} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity" title="Gerar Cobrança">
                            <FileDown className="h-3.5 w-3.5 text-amber-500" />
                          </button>
                        )
                      )}
                      <span className="text-sm font-medium text-emerald-400 min-w-[80px] text-right">{fmt(sub.price)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>Selecione o método de pagamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Método de pagamento</Label>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>Cancelar</Button>
            <Button onClick={handlePay} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Salvando...' : 'Confirmar Pagamento'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Create/Edit Plan */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar Plano' : 'Criar Plano'}</DialogTitle>
            <DialogDescription>{editingPlan ? 'Atualize as informações do plano.' : 'Crie um plano personalizado para o seu studio.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Mensal 3x/semana" /></div>
            <div><Label>Descrição</Label><Input value={planForm.description} onChange={e => setPlanForm(f => ({ ...f, description: e.target.value }))} placeholder="Opcional..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Preço (R$) *</Label><Input type="number" step="0.01" value={planForm.price} onChange={e => setPlanForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div>
                <Label>Ciclo *</Label>
                <Select value={planForm.billingCycle} onValueChange={v => {
                  const days = v === 'MONTHLY' ? '30' : v === 'YEARLY' ? '365' : planForm.durationDays
                  setPlanForm(f => ({ ...f, billingCycle: v, durationDays: days }))
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                    <SelectItem value="YEARLY">Anual</SelectItem>
                    <SelectItem value="CUSTOM">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Duração (dias) *</Label><Input type="number" value={planForm.durationDays} onChange={e => setPlanForm(f => ({ ...f, durationDays: e.target.value }))} /></div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input type="checkbox" checked={planForm.isTrial} onChange={e => setPlanForm(f => ({ ...f, isTrial: e.target.checked }))} className="rounded" />
                  <span className="text-sm">Trial</span>
                </label>
                {planForm.isTrial && <Input type="number" value={planForm.trialDays} onChange={e => setPlanForm(f => ({ ...f, trialDays: e.target.value }))} placeholder="dias" className="h-9 flex-1" />}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>Cancelar</Button>
            <Button onClick={handleSavePlan} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Salvando...' : editingPlan ? 'Salvar' : 'Criar Plano'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Assign Plan - search like presenca */}
      {showAssignDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-card rounded-2xl border shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-sm">Atribuir Plano a Aluno</h3>
              <button onClick={() => setShowAssignDialog(false)}><X className="w-4 h-4 text-muted-foreground hover:text-foreground" /></button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Step 1: Select Student */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">1. SELECIONE O ALUNO</Label>
                {assignClientId ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-500 font-bold text-xs">{initials(assignClientName)}</span>
                    </div>
                    <span className="text-sm font-medium flex-1">{assignClientName}</span>
                    <button onClick={() => { setAssignClientId(''); setAssignClientName('') }} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Buscar aluno..." value={assignSearch} onChange={e => setAssignSearch(e.target.value)} className="pl-10" autoFocus />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                      {filteredAssignClients.length === 0 ? (
                        <p className="text-center text-xs text-muted-foreground py-4">Nenhum aluno encontrado</p>
                      ) : filteredAssignClients.slice(0, 30).map(c => (
                        <button key={c.id} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
                          onClick={() => { setAssignClientId(c.id); setAssignClientName(c.name); setAssignSearch('') }}>
                          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-amber-500 font-bold text-xs">{initials(c.name)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            {!clientsWithPlan.has(c.id) && <p className="text-[10px] text-amber-400">Sem plano ativo</p>}
                          </div>
                          <Plus className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Step 2: Select Plan */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">2. SELECIONE O PLANO</Label>
                <div className="space-y-1">
                  {plans.map(p => (
                    <button key={p.id}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                        assignPlanId === p.id ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => setAssignPlanId(p.id)}>
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{CYCLE_LABELS[p.billingCycle]} · {p.durationDays} dias {p.isGlobal ? '🌐' : '🏢'}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-400">{fmt(p.price)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3: Notes */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">3. OBSERVAÇÕES (OPCIONAL)</Label>
                <Input value={assignNotes} onChange={e => setAssignNotes(e.target.value)} placeholder="Opcional..." />
              </div>
            </div>

            <div className="p-4 border-t flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancelar</Button>
              <Button onClick={handleAssign} disabled={saving || !assignClientId || !assignPlanId} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? 'Salvando...' : 'Atribuir Plano'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
