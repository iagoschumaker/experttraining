'use client'

// ============================================================================
// EXPERT PRO TRAINING — SUPERADMIN: PLANOS DE ALUNO
// ============================================================================
// CRUD de templates de planos (Mensal, Anual, Trial, etc.)
// ============================================================================

import { useEffect, useState } from 'react'
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
  Tag,
  Plus,
  CreditCard,
  Calendar,
  Users,
  Edit,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { toast } from 'sonner'

interface ClientPlan {
  id: string
  name: string
  description: string | null
  price: number
  billingCycle: string
  durationDays: number
  isActive: boolean
  isTrial: boolean
  trialDays: number | null
  features: string[]
  activeSubscriptions: number
  createdAt: string
}

const CYCLE_LABELS: Record<string, string> = {
  MONTHLY: 'Mensal',
  YEARLY: 'Anual',
  CUSTOM: 'Personalizado',
}

export default function SuperAdminClientPlansPage() {
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<ClientPlan[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    billingCycle: 'MONTHLY',
    durationDays: '30',
    isTrial: false,
    trialDays: '',
  })

  useEffect(() => { loadPlans() }, [])

  const loadPlans = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/superadmin/client-plans')
      const result = await res.json()
      if (result.success) setPlans(result.data)
    } catch { toast.error('Erro') }
    finally { setLoading(false) }
  }

  const handleCreate = async () => {
    if (!form.name || !form.price || !form.durationDays) {
      toast.error('Preencha nome, preço e duração')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/superadmin/client-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          price: parseFloat(form.price),
          billingCycle: form.billingCycle,
          durationDays: parseInt(form.durationDays),
          isTrial: form.isTrial,
          trialDays: form.isTrial && form.trialDays ? parseInt(form.trialDays) : null,
          features: ['TREINO', 'AREA_ALUNO'],
        }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success('Plano criado!')
        setDialogOpen(false)
        resetForm()
        loadPlans()
      } else toast.error(result.error)
    } catch { toast.error('Erro') }
    finally { setSaving(false) }
  }

  const toggleActive = async (plan: ClientPlan) => {
    try {
      const res = await fetch(`/api/superadmin/client-plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !plan.isActive }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success(plan.isActive ? 'Desativado!' : 'Ativado!')
        loadPlans()
      }
    } catch { toast.error('Erro') }
  }

  const resetForm = () => setForm({
    name: '', description: '', price: '', billingCycle: 'MONTHLY',
    durationDays: '30', isTrial: false, trialDays: '',
  })

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Tag className="h-6 w-6 text-amber-500" /> Planos de Aluno</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Tag className="h-6 w-6 text-amber-500" />
            Planos de Aluno
          </h1>
          <p className="text-sm text-muted-foreground">
            Templates de planos que studios atribuem aos alunos
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true) }} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
          <Plus className="h-4 w-4 mr-2" /> Novo Plano
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Nenhum plano criado</p>
          <p className="text-sm">Crie planos para que studios atribuam aos alunos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => (
            <Card key={plan.id} className={`bg-card border-border ${!plan.isActive ? 'opacity-50' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    {plan.isTrial && <Badge className="bg-blue-500/20 text-blue-400 text-xs">Trial</Badge>}
                    <Badge className={plan.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'}>
                      {plan.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">{fmt(plan.price)}</span>
                  <span className="text-sm text-muted-foreground">/{CYCLE_LABELS[plan.billingCycle]?.toLowerCase() || 'mês'}</span>
                </div>

                {plan.description && (
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Duração: {plan.durationDays} dias</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{plan.activeSubscriptions} assinaturas ativas</span>
                  </div>
                  {plan.isTrial && plan.trialDays && (
                    <div className="flex items-center gap-2 text-blue-400">
                      <CreditCard className="h-4 w-4" />
                      <span>Trial: {plan.trialDays} dias</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(plan)}
                    className="flex-1"
                  >
                    {plan.isActive
                      ? <><ToggleRight className="h-4 w-4 mr-1" /> Desativar</>
                      : <><ToggleLeft className="h-4 w-4 mr-1" /> Ativar</>
                    }
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog Criar Plano */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Plano de Aluno</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Plano Mensal" /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Acesso completo aos treinos..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Preço (R$) *</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="300.00" /></div>
              <div>
                <Label>Ciclo *</Label>
                <Select value={form.billingCycle} onValueChange={v => {
                  const days = v === 'MONTHLY' ? '30' : v === 'YEARLY' ? '365' : form.durationDays
                  setForm(f => ({ ...f, billingCycle: v, durationDays: days }))
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
            <div>
              <Label>Duração (dias) *</Label>
              <Input type="number" value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isTrial} onChange={e => setForm(f => ({ ...f, isTrial: e.target.checked }))} className="rounded" />
              <span className="text-sm">É plano trial (gratuito/teste)</span>
            </label>
            {form.isTrial && (
              <div><Label>Dias de Trial</Label><Input type="number" value={form.trialDays} onChange={e => setForm(f => ({ ...f, trialDays: e.target.value }))} placeholder="7" /></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">{saving ? 'Criando...' : 'Criar Plano'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
