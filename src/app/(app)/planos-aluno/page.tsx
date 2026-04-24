'use client'

// ============================================================================
// EXPERT PRO TRAINING — STUDIO: PLANOS DE ALUNO
// ============================================================================
// Permite ao Studio ver planos disponíveis e atribuir alunos a planos
// ============================================================================

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  CreditCard,
  UserPlus,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'

interface Plan {
  id: string; name: string; price: number; billingCycle: string
  durationDays: number; description?: string | null; isTrial: boolean; trialDays?: number | null
}

interface Subscription {
  id: string; status: string; startDate: string; endDate: string; price: number
  isExpired: boolean; notes?: string | null
  client: { id: string; name: string; email?: string }
  plan: { id: string; name: string; price: number; billingCycle: string; durationDays: number }
}

interface Client {
  id: string; name: string; email?: string
}

const CYCLE_LABELS: Record<string, string> = { MONTHLY: 'Mensal', YEARLY: 'Anual', CUSTOM: 'Custom' }
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Ativo', color: 'bg-emerald-500/20 text-emerald-400' },
  EXPIRED: { label: 'Vencido', color: 'bg-red-500/20 text-red-400' },
  CANCELED: { label: 'Cancelado', color: 'bg-muted text-muted-foreground' },
  PAUSED: { label: 'Pausado', color: 'bg-amber-500/20 text-amber-400' },
}

export default function StudioClientPlansPage() {
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<Plan[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState('ACTIVE')
  const [searchClient, setSearchClient] = useState('')

  const [assignForm, setAssignForm] = useState({
    clientId: '', planId: '', notes: '',
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

  const handleAssign = async () => {
    if (!assignForm.clientId || !assignForm.planId) {
      toast.error('Selecione aluno e plano')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/studio/client-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignForm),
      })
      const result = await res.json()
      if (result.success) {
        toast.success(result.message || 'Plano atribuído!')
        setShowAssignDialog(false)
        setAssignForm({ clientId: '', planId: '', notes: '' })
        loadData()
      } else toast.error(result.error)
    } catch { toast.error('Erro') }
    finally { setSaving(false) }
  }

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')

  const filteredClients = searchClient
    ? clients.filter(c => c.name.toLowerCase().includes(searchClient.toLowerCase()))
    : clients

  // Separate active/expired subs
  const activeSubs = subscriptions.filter(s => s.status === 'ACTIVE' && !s.isExpired)
  const expiredSubs = subscriptions.filter(s => s.isExpired || s.status === 'EXPIRED')
  const clientsWithPlan = new Set(activeSubs.map(s => s.client.id))
  const clientsWithoutPlan = clients.filter(c => !clientsWithPlan.has(c.id))

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-emerald-500" />
            Planos de Aluno
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeSubs.length} ativos · {clientsWithoutPlan.length} sem plano
          </p>
        </div>
        <Button disabled={plans.length === 0} onClick={() => { setAssignForm({ clientId: '', planId: '', notes: '' }); setShowAssignDialog(true) }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <UserPlus className="h-4 w-4 mr-2" /> Atribuir Plano
        </Button>
      </div>

      {/* Planos disponíveis */}
      {plans.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {plans.map(plan => (
            <Card key={plan.id} className="bg-card border-border">
              <CardContent className="pt-4 pb-3">
                <p className="font-semibold text-sm">{plan.name}</p>
                <p className="text-xl font-bold text-emerald-400 mt-1">
                  {fmt(plan.price)}
                  <span className="text-xs text-muted-foreground font-normal">/{CYCLE_LABELS[plan.billingCycle]?.toLowerCase()}</span>
                </p>
                {plan.description && <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>}
                <p className="text-xs text-muted-foreground mt-1"><Calendar className="h-3 w-3 inline mr-1" />{plan.durationDays} dias</p>
                {plan.isTrial && <Badge className="bg-blue-500/20 text-blue-400 text-xs mt-1">Trial {plan.trialDays}d</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="bg-card border-border"><CardContent className="py-8 text-center text-muted-foreground">
          <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
          Nenhum plano disponível. Peça ao SuperAdmin para criar planos.
        </CardContent></Card>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        {['ACTIVE', 'EXPIRED', 'CANCELED'].map(s => (
          <Button key={s} variant={filterStatus === s ? 'default' : 'outline'} size="sm"
            className={filterStatus === s ? 'bg-emerald-600 text-white' : ''}
            onClick={() => setFilterStatus(s)}>
            {STATUS_LABELS[s]?.label || s}
          </Button>
        ))}
      </div>

      {/* Alunos sem plano (alerta) */}
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
                  onClick={() => { setAssignForm({ clientId: c.id, planId: '', notes: '' }); setShowAssignDialog(true) }}>
                  {c.name}
                </Badge>
              ))}
              {clientsWithoutPlan.length > 10 && <Badge className="bg-muted text-muted-foreground text-xs">+{clientsWithoutPlan.length - 10} mais</Badge>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assinaturas */}
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base">Assinaturas</CardTitle></CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Nenhuma assinatura encontrada</p>
          ) : (
            <div className="space-y-1">
              {subscriptions.map(sub => (
                <div key={sub.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${sub.isExpired ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                      {sub.isExpired ? <Clock className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-emerald-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{sub.client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {sub.plan.name} · {fmtDate(sub.startDate)} → {fmtDate(sub.endDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge className={STATUS_LABELS[sub.isExpired ? 'EXPIRED' : sub.status]?.color || ''}>
                      {sub.isExpired ? 'Vencido' : STATUS_LABELS[sub.status]?.label || sub.status}
                    </Badge>
                    <span className="text-sm font-medium text-emerald-400 min-w-[80px] text-right">{fmt(sub.price)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Atribuir Plano */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Atribuir Plano a Aluno</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Aluno *</Label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar aluno..." value={searchClient} onChange={e => setSearchClient(e.target.value)} className="pl-10" />
              </div>
              <Select value={assignForm.clientId} onValueChange={v => setAssignForm(f => ({ ...f, clientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {filteredClients.slice(0, 50).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {!clientsWithPlan.has(c.id) && '⚠️'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plano *</Label>
              <Select value={assignForm.planId} onValueChange={v => setAssignForm(f => ({ ...f, planId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — {fmt(p.price)}/{CYCLE_LABELS[p.billingCycle]?.toLowerCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={assignForm.notes} onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancelar</Button>
            <Button onClick={handleAssign} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">{saving ? 'Salvando...' : 'Atribuir'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
