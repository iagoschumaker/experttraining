'use client'

// ============================================================================
// EXPERT TRAINING - SUPERADMIN PLANS PAGE
// ============================================================================

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FloatingActionButton } from '@/components/ui'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { CreditCard, Plus, Search, Pencil, Trash2, Building2, Users, Star, CheckCircle2 } from 'lucide-react'

interface Plan {
  id: string
  name: string
  slug: string
  tier: 'START' | 'PRO' | 'PREMIUM'
  description: string | null
  pricePerTrainer: number
  minTrainers: number
  recommendedMax: number | null
  features: string[]
  isActive: boolean
  isVisible: boolean
  _count?: { studios: number }
}

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    tier: 'START' as 'START' | 'PRO' | 'PREMIUM',
    description: '',
    pricePerTrainer: 0,
    minTrainers: 1,
    recommendedMax: 4,
    features: '',
    isActive: true,
    isVisible: true,
  })

  const fetchPlans = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: '15' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/superadmin/plans?${params}`)
      const data = await res.json()
      if (data.success) { setPlans(data.data.items || []); setTotalPages(data.data.totalPages); setTotal(data.data.total) }
    } catch (error) { console.error('Error:', error) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchPlans() }, [page, search])

  const resetForm = () => setFormData({
    name: '',
    slug: '',
    tier: 'START' as 'START' | 'PRO' | 'PREMIUM',
    description: '',
    pricePerTrainer: 0,
    minTrainers: 1,
    recommendedMax: 4,
    features: '',
    isActive: true,
    isVisible: true,
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const features = formData.features.split('\n').map((f) => f.trim()).filter(Boolean)
      const body = { ...formData, features }
      const res = await fetch('/api/superadmin/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) { setIsCreateOpen(false); resetForm(); fetchPlans() }
      else alert(data.error)
    } catch { alert('Erro ao criar') }
    finally { setSaving(false) }
  }

  const openEdit = (plan: Plan) => {
    setSelectedPlan(plan)
    setFormData({
      name: plan.name,
      slug: plan.slug,
      tier: plan.tier,
      description: plan.description || '',
      pricePerTrainer: plan.pricePerTrainer,
      minTrainers: plan.minTrainers,
      recommendedMax: plan.recommendedMax || 0,
      features: plan.features.join('\n'),
      isActive: plan.isActive,
      isVisible: plan.isVisible,
    })
    setIsEditOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlan) return
    setSaving(true)
    try {
      const features = formData.features.split('\n').map((f) => f.trim()).filter(Boolean)
      const body = { ...formData, features }
      const res = await fetch(`/api/superadmin/plans/${selectedPlan.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) { setIsEditOpen(false); fetchPlans() }
      else alert(data.error)
    } catch { alert('Erro ao atualizar') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este plano?')) return
    try {
      const res = await fetch(`/api/superadmin/plans/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) fetchPlans()
      else alert(data.error)
    } catch { alert('Erro ao excluir') }
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const FormContent = ({ onSubmit, isEdit = false }: { onSubmit: (e: React.FormEvent) => void; isEdit?: boolean }) => (
    <form onSubmit={onSubmit}>
      <DialogHeader>
        <DialogTitle className="text-foreground">{isEdit ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
        <DialogDescription className="text-muted-foreground">{isEdit ? 'Atualize o plano' : 'Cadastre um novo plano'}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Nome *</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })} className="bg-background border-border text-foreground" required />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Slug</Label>
            <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="bg-background border-border text-foreground" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Preço/Trainer (R$) *</Label>
            <Input type="number" min={0} step={0.01} value={formData.pricePerTrainer} onChange={(e) => setFormData({ ...formData, pricePerTrainer: parseFloat(e.target.value) || 0 })} className="bg-background border-border text-foreground" required />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Mín. Trainers</Label>
            <Input type="number" min={1} value={formData.minTrainers} onChange={(e) => setFormData({ ...formData, minTrainers: parseInt(e.target.value) || 1 })} className="bg-background border-border text-foreground" />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Máx. Rec.</Label>
            <Input type="number" min={1} value={formData.recommendedMax} onChange={(e) => setFormData({ ...formData, recommendedMax: parseInt(e.target.value) || 1 })} className="bg-background border-border text-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Descrição</Label>
          <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-background border-border text-foreground" rows={2} />
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Features (uma por linha)</Label>
          <Textarea value={formData.features} onChange={(e) => setFormData({ ...formData, features: e.target.value })} className="bg-background border-border text-foreground" rows={4} placeholder="Acesso completo ao sistema&#10;Alunos ilimitados" />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="rounded border-border" />
            <Label htmlFor="isActive" className="text-muted-foreground">Plano ativo</Label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isVisible" checked={formData.isVisible} onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })} className="rounded border-border" />
            <Label htmlFor="isVisible" className="text-muted-foreground">Plano visível</Label>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => isEdit ? setIsEditOpen(false) : setIsCreateOpen(false)}>Cancelar</Button>
        <Button type="submit" disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">{saving ? 'Salvando...' : 'Salvar'}</Button>
      </DialogFooter>
    </form>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os planos de assinatura</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="hidden md:flex gap-2 bg-accent text-accent-foreground hover:bg-accent/90" onClick={resetForm}><Plus className="h-4 w-4" /> Novo Plano</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border"><FormContent onSubmit={handleCreate} /></DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-8 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card border-border">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-1/4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="py-12 text-center">
          <CreditCard className="mx-auto h-12 w-12 text-muted" />
          <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum plano encontrado</h3>
          <p className="text-muted-foreground">Crie um novo plano para começar a gerenciar as assinaturas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-start">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`bg-card border-border flex flex-col ${plan.tier === 'PRO' ? 'border-amber-500' : ''}`}
            >
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-bold text-foreground">{plan.name}</CardTitle>
                  {plan.tier === 'PRO' && <Badge className="bg-amber-500 text-black">Mais Popular</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="flex-grow space-y-6">
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-amber-500">{formatCurrency(plan.pricePerTrainer)}</span>
                  <span className="ml-2 text-sm text-muted-foreground">/ trainer / mês</span>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Mínimo de <span className="font-bold text-foreground">{plan.minTrainers}</span> {plan.minTrainers > 1 ? 'trainers' : 'trainer'}.
                  {plan.recommendedMax && ` Recomendado até ${plan.recommendedMax} trainers.`}
                </div>

                <ul className="space-y-2 text-sm">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <div className="p-6 pt-0">
                <Button className="w-full" variant={plan.tier === 'PRO' ? 'default' : 'outline'} onClick={() => openEdit(plan)}>
                  <Pencil className="h-4 w-4 mr-2" /> Editar Plano
                </Button>
                <div className="mt-2 text-center text-xs text-muted-foreground">
                  {plan._count?.studios || 0} studios neste plano
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-card border-border"><FormContent onSubmit={handleUpdate} isEdit /></DialogContent>
      </Dialog>
      
      {/* Floating Action Button for Mobile */}
      <FloatingActionButton 
        actions={[
          {
            label: 'Novo Plano',
            onClick: resetForm,
            icon: <Plus className="h-5 w-5" />
          }
        ]}
      />
    </div>
  )
}
