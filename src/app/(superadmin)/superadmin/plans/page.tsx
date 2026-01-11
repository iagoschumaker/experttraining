'use client'

// ============================================================================
// EXPERT TRAINING - SUPERADMIN PLANS PAGE
// ============================================================================

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { CreditCard, Plus, Search, Pencil, Trash2, Building2 } from 'lucide-react'

interface Plan {
  id: string
  name: string
  price: number
  maxUsers: number
  maxClients: number
  features: string[]
  isActive: boolean
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
    name: '', price: 0, maxUsers: 5, maxClients: 50, features: '', isActive: true,
  })

  const fetchPlans = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: '15' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/superadmin/plans?${params}`)
      const data = await res.json()
      if (data.success) { setPlans(data.data.items); setTotalPages(data.data.totalPages); setTotal(data.data.total) }
    } catch (error) { console.error('Error:', error) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchPlans() }, [page, search])

  const resetForm = () => setFormData({ name: '', price: 0, maxUsers: 5, maxClients: 50, features: '', isActive: true })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const features = formData.features.split('\n').map((f) => f.trim()).filter(Boolean)
      const body = { name: formData.name, price: formData.price, maxUsers: formData.maxUsers, maxClients: formData.maxClients, features, isActive: formData.isActive }
      const res = await fetch('/api/superadmin/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) { setIsCreateOpen(false); resetForm(); fetchPlans() }
      else alert(data.error)
    } catch { alert('Erro ao criar') }
    finally { setSaving(false) }
  }

  const openEdit = (plan: Plan) => {
    setSelectedPlan(plan)
    setFormData({ name: plan.name, price: plan.price, maxUsers: plan.maxUsers, maxClients: plan.maxClients, features: plan.features.join('\n'), isActive: plan.isActive })
    setIsEditOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlan) return
    setSaving(true)
    try {
      const features = formData.features.split('\n').map((f) => f.trim()).filter(Boolean)
      const body = { name: formData.name, price: formData.price, maxUsers: formData.maxUsers, maxClients: formData.maxClients, features, isActive: formData.isActive }
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
        <DialogTitle className="text-white">{isEdit ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
        <DialogDescription className="text-gray-400">{isEdit ? 'Atualize o plano' : 'Cadastre um novo plano'}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label className="text-gray-300">Nome *</Label>
          <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-gray-800 border-gray-700 text-white" required />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Preço (R$) *</Label>
            <Input type="number" min={0} step={0.01} value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })} className="bg-gray-800 border-gray-700 text-white" required />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Máx. Usuários</Label>
            <Input type="number" min={1} value={formData.maxUsers} onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) || 1 })} className="bg-gray-800 border-gray-700 text-white" />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Máx. Clientes</Label>
            <Input type="number" min={1} value={formData.maxClients} onChange={(e) => setFormData({ ...formData, maxClients: parseInt(e.target.value) || 1 })} className="bg-gray-800 border-gray-700 text-white" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-gray-300">Features (uma por linha)</Label>
          <Textarea value={formData.features} onChange={(e) => setFormData({ ...formData, features: e.target.value })} className="bg-gray-800 border-gray-700 text-white" rows={4} placeholder="Até 5 usuários&#10;Até 50 clientes&#10;Suporte por email" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="rounded border-gray-700" />
          <Label htmlFor="isActive" className="text-gray-300">Plano ativo</Label>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => isEdit ? setIsEditOpen(false) : setIsCreateOpen(false)}>Cancelar</Button>
        <Button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">{saving ? 'Salvando...' : 'Salvar'}</Button>
      </DialogFooter>
    </form>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Planos</h1>
          <p className="text-sm text-gray-400">Gerencie os planos de assinatura</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-black" onClick={resetForm}><Plus className="h-4 w-4" /> Novo Plano</Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700"><FormContent onSubmit={handleCreate} /></DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total de Planos</CardTitle>
            <CreditCard className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{total}</div></CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Planos Ativos</CardTitle>
            <CreditCard className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{plans.filter((p) => p.isActive).length}</div></CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Studios Vinculados</CardTitle>
            <Building2 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{plans.reduce((a, p) => a + (p._count?.studios || 0), 0)}</div></CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Buscar planos..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-10 bg-gray-900 border-gray-700 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full bg-gray-700" />)}</div>
          ) : plans.length === 0 ? (
            <div className="py-12 text-center"><CreditCard className="mx-auto h-12 w-12 text-gray-600" /><h3 className="mt-4 text-lg font-medium text-white">Nenhum plano</h3></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Nome</TableHead>
                  <TableHead className="text-gray-400">Preço</TableHead>
                  <TableHead className="text-gray-400">Usuários</TableHead>
                  <TableHead className="text-gray-400">Clientes</TableHead>
                  <TableHead className="text-gray-400">Studios</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.id} className="border-gray-700">
                    <TableCell className="font-medium text-white">{p.name}</TableCell>
                    <TableCell className="text-amber-500 font-semibold">{formatCurrency(p.price)}</TableCell>
                    <TableCell className="text-gray-400">{p.maxUsers}</TableCell>
                    <TableCell className="text-gray-400">{p.maxClients}</TableCell>
                    <TableCell className="text-gray-400">{p._count?.studios || 0}</TableCell>
                    <TableCell><Badge className={p.isActive ? 'bg-green-500' : 'bg-gray-500'}>{p.isActive ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)} className="hover:bg-gray-700"><Pencil className="h-4 w-4 text-gray-400" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)} className="hover:bg-gray-700"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-400">Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="border-gray-700">Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border-gray-700">Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-gray-900 border-gray-700"><FormContent onSubmit={handleUpdate} isEdit /></DialogContent>
      </Dialog>
    </div>
  )
}
