'use client'

// ============================================================================
// KINEX PERFORMANCE — PLANOS DO STUDIO
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
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Tag,
  Calendar,
  DollarSign,
} from 'lucide-react'
import { toast } from 'sonner'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

interface StudioPlan {
  id: string
  name: string
  description: string | null
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL'
  price: number
  isActive: boolean
  createdAt: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const CYCLE_LABELS: Record<string, string> = {
  MONTHLY:    'Mensal',
  QUARTERLY:  'Trimestral',
  SEMIANNUAL: 'Semestral',
  ANNUAL:     'Anual',
}

const CYCLE_COLORS: Record<string, string> = {
  MONTHLY:    'bg-blue-500/15 text-blue-400 border-blue-500/30',
  QUARTERLY:  'bg-purple-500/15 text-purple-400 border-purple-500/30',
  SEMIANNUAL: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  ANNUAL:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
}

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Componente ─────────────────────────────────────────────────────────────

export default function PlanosPage() {
  const [plans, setPlans] = useState<StudioPlan[]>([])
  const [loading, setLoading] = useState(true)

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<StudioPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCycle, setFormCycle] = useState<string>('MONTHLY')
  const [formPrice, setFormPrice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth('/api/studio/financeiro/planos')
      const data = await res.json()
      if (data.success) setPlans(data.data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditingPlan(null)
    setFormName('')
    setFormDescription('')
    setFormCycle('MONTHLY')
    setFormPrice('')
    setModalOpen(true)
  }

  function openEdit(plan: StudioPlan) {
    setEditingPlan(plan)
    setFormName(plan.name)
    setFormDescription(plan.description ?? '')
    setFormCycle(plan.billingCycle)
    setFormPrice(plan.price.toString())
    setModalOpen(true)
  }

  async function handleSave() {
    if (!formName.trim() || !formPrice || !formCycle) {
      toast.error('Preencha nome, ciclo e valor')
      return
    }
    setSaving(true)
    try {
      const url = editingPlan
        ? `/api/studio/financeiro/planos/${editingPlan.id}`
        : '/api/studio/financeiro/planos'
      const method = editingPlan ? 'PUT' : 'POST'
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          billingCycle: formCycle,
          price: parseFloat(formPrice),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(editingPlan ? 'Plano atualizado' : 'Plano criado com sucesso')
        setModalOpen(false)
        load()
      } else {
        toast.error(data.error)
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(plan: StudioPlan) {
    if (!confirm(`Remover o plano "${plan.name}"? Alunos vinculados não serão afetados.`)) return
    setDeletingId(plan.id)
    try {
      const res = await fetchWithAuth(`/api/studio/financeiro/planos/${plan.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        toast.success('Plano removido')
        load()
      } else {
        toast.error(data.error)
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Templates de mensalidade do studio
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      {/* Lista de planos */}
      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Tag className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium mb-1">Nenhum plano criado ainda</p>
          <p className="text-sm text-muted-foreground/70 mb-4">
            Crie planos para facilitar a vinculação de alunos às mensalidades.
          </p>
          <Button onClick={openCreate} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Criar primeiro plano
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div
              key={plan.id}
              className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 group hover:border-primary/40 transition-all"
            >
              {/* Top: name + cycle */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {plan.description}
                    </p>
                  )}
                </div>
                <Badge className={cn('text-xs border flex-shrink-0', CYCLE_COLORS[plan.billingCycle])}>
                  {CYCLE_LABELS[plan.billingCycle]}
                </Badge>
              </div>

              {/* Price */}
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(plan.price)}
                </span>
                <span className="text-xs text-muted-foreground">
                  / {CYCLE_LABELS[plan.billingCycle].toLowerCase()}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1 border-t border-border/50">
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 h-8"
                  onClick={() => openEdit(plan)}
                >
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  disabled={deletingId === plan.id}
                  onClick={() => handleDelete(plan)}
                >
                  {deletingId === plan.id
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Instrução */}
      {plans.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Para vincular um aluno a um plano, acesse <strong>Mensalidades</strong> e clique em <strong>Configurar</strong> no aluno.
        </p>
      )}

      {/* Modal criar/editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do plano *</Label>
              <Input
                placeholder="Ex: Mensal Standard, Anual Premium..."
                value={formName}
                onChange={e => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Ex: 3x por semana, acesso livre..."
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Ciclo de cobrança *</Label>
                <Select value={formCycle} onValueChange={setFormCycle}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Mensal</SelectItem>
                    <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                    <SelectItem value="SEMIANNUAL">Semestral</SelectItem>
                    <SelectItem value="ANNUAL">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor padrão (R$) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 200.00"
                  value={formPrice}
                  onChange={e => setFormPrice(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                : <Plus className="w-4 h-4 mr-2" />}
              {editingPlan ? 'Salvar alterações' : 'Criar plano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
