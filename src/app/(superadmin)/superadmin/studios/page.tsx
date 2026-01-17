'use client'

// ============================================================================
// EXPERT PRO TRAINING - SUPERADMIN STUDIOS PAGE
// ============================================================================

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FloatingActionButton, StatsCard, StatsGrid } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, Plus, Search, Pencil, Trash2, Users, UserCheck, ExternalLink, Calendar, Clock } from 'lucide-react'

interface Studio {
  id: string
  name: string
  slug: string
  status: 'ACTIVE' | 'SUSPENDED'
  createdAt: string
  plan: { id: string; name: string } | null
  _count: {
    users: number
    clients: number
  }
  lessonsThisMonth?: number
  lastActivity?: string | null
  activeTrainers?: number
  totalTrainers?: number
}

interface Plan {
  id: string
  name: string
  tier: string
  minTrainers: number
  recommendedMax: number | null
  pricePerTrainer: number
}

const statusConfig: Record<'ACTIVE' | 'SUSPENDED', { label: string; color: string }> = {
  ACTIVE: { label: 'Ativo', color: 'bg-green-500' },
  SUSPENDED: { label: 'Suspenso', color: 'bg-red-500' },
}

export default function SuperAdminStudiosPage() {
  const [studios, setStudios] = useState<Studio[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null)

  const [formData, setFormData] = useState<{
    name: string
    slug: string
    planId: string
    status: 'ACTIVE' | 'SUSPENDED'
    adminEmail: string
    adminPassword: string
  }>({
    name: '',
    slug: '',
    planId: '',
    status: 'ACTIVE',
    adminEmail: '',
    adminPassword: '',
  })

  const [emailExists, setEmailExists] = useState(false)
  const [existingUserName, setExistingUserName] = useState('')
  const [resetPassword, setResetPassword] = useState(false)
  const [studioAdmins, setStudioAdmins] = useState<Array<{id: string, name: string, email: string}>>([])
  const [selectedAdminId, setSelectedAdminId] = useState('')

  const fetchStudios = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: '10' })
      if (search) params.set('search', search)

      const res = await fetch(`/api/superadmin/studios?${params}`)
      const data = await res.json()

      if (data.success) {
        setStudios(data.data.items)
        setTotalPages(data.data.totalPages)
        setTotal(data.data.total)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/superadmin/plans?pageSize=100')
      const data = await res.json()
      if (data.success) setPlans(data.data.items)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  useEffect(() => {
    fetchStudios()
    fetchPlans()
  }, [page, search])

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const checkEmailExists = async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailExists(false)
      setExistingUserName('')
      return
    }
    try {
      const res = await fetch(`/api/superadmin/users/check-email?email=${encodeURIComponent(email)}`)
      const data = await res.json()
      if (data.exists) {
        setEmailExists(true)
        setExistingUserName(data.user.name)
      } else {
        setEmailExists(false)
        setExistingUserName('')
      }
    } catch (error) {
      console.error('Error checking email:', error)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/superadmin/studios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success) {
        setIsCreateOpen(false)
        setFormData({ name: '', slug: '', planId: '', status: 'ACTIVE', adminEmail: '', adminPassword: '' })
        setEmailExists(false)
        setExistingUserName('')
        fetchStudios()
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert('Erro ao criar')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = async (studio: Studio) => {
    setSelectedStudio(studio)
    setFormData({ 
      name: studio.name, 
      slug: studio.slug, 
      planId: studio.plan?.id || '', 
      status: studio.status,
      adminEmail: '',
      adminPassword: '',
    })
    setResetPassword(false)
    setSelectedAdminId('')
    
    // Carregar admins do studio
    try {
      const res = await fetch(`/api/superadmin/studios/${studio.id}`)
      const data = await res.json()
      if (data.success && data.data.users) {
        const admins = data.data.users
          .filter((u: any) => u.role === 'STUDIO_ADMIN')
          .map((u: any) => ({
            id: u.user.id,
            name: u.user.name,
            email: u.user.email,
          }))
        setStudioAdmins(admins)
        if (admins.length > 0) {
          setSelectedAdminId(admins[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading admins:', error)
    }
    
    setIsEditOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudio) return
    setSaving(true)
    try {
      const updateData: any = {
        name: formData.name,
        slug: formData.slug,
        planId: formData.planId || null,
        status: formData.status,
      }
      
      // Adicionar dados de reset de senha se marcado
      if (resetPassword && selectedAdminId && formData.adminPassword) {
        updateData.resetPassword = true
        updateData.adminUserId = selectedAdminId
        updateData.newPassword = formData.adminPassword
      }
      
      const res = await fetch(`/api/superadmin/studios/${selectedStudio.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })
      const data = await res.json()
      if (data.success) {
        setIsEditOpen(false)
        setResetPassword(false)
        fetchStudios()
      } else {
        alert(data.error)
      }
    } catch (error) {
      alert('Erro ao atualizar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este studio?')) return
    try {
      const res = await fetch(`/api/superadmin/studios/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) fetchStudios()
      else alert(data.error)
    } catch (error) {
      alert('Erro ao excluir')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Studios</h1>
          <p className="text-sm text-muted-foreground">Gerencie os studios parceiros</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4" /> Novo Studio
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle className="text-foreground">Novo Studio</DialogTitle>
                <DialogDescription className="text-muted-foreground">Cadastre um novo studio</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Nome *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) })} className="bg-background border-border text-foreground" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Slug *</Label>
                  <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="bg-background border-border text-foreground" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Plano *</Label>
                  <Select value={formData.planId} onValueChange={(v) => setFormData({ ...formData, planId: v })} required>
                    <SelectTrigger className="bg-background border-border text-foreground"><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                    <SelectContent>
                      {plans?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>) || null}
                    </SelectContent>
                  </Select>
                  {formData.planId && (() => {
                    const selectedPlan = plans.find(p => p.id === formData.planId)
                    if (!selectedPlan) return null
                    return (
                      <div className="flex items-start gap-2 p-3 rounded bg-amber-500/10 border border-amber-500/20">
                        <UserCheck className="h-4 w-4 text-amber-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-amber-400 font-medium mb-1">
                            Plano: {selectedPlan.name}
                          </p>
                          <p className="text-xs text-amber-300">
                            Mínimo: <strong>{selectedPlan.minTrainers}</strong> trainer{selectedPlan.minTrainers > 1 ? 's' : ''}
                            {selectedPlan.recommendedMax && (
                              <> • Máximo recomendado: <strong>{selectedPlan.recommendedMax}</strong></>
                            )}
                          </p>
                          <p className="text-xs text-amber-300 mt-1">
                            Valor: <strong>R$ {selectedPlan.pricePerTrainer.toFixed(2)}</strong> por trainer ativo/mês
                          </p>
                        </div>
                      </div>
                    )
                  })()}
                </div>
                <div className="border-t border-border pt-4 mt-4">
                  <h4 className="text-sm font-medium text-foreground mb-3">Administrador do Studio</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Email do Admin *</Label>
                      <Input 
                        type="email" 
                        value={formData.adminEmail} 
                        onChange={(e) => {
                          setFormData({ ...formData, adminEmail: e.target.value })
                          checkEmailExists(e.target.value)
                        }}
                        className="bg-background border-border text-foreground" 
                        required 
                        placeholder="admin@studio.com"
                      />
                      {emailExists && (
                        <div className="flex items-center gap-2 p-2 rounded bg-blue-500/10 border border-blue-500/20">
                          <UserCheck className="h-4 w-4 text-blue-400" />
                          <p className="text-xs text-blue-400">
                            Usuário <strong>{existingUserName}</strong> já existe e será vinculado a este studio
                          </p>
                        </div>
                      )}
                    </div>
                    {!emailExists && (
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Senha Inicial *</Label>
                        <Input 
                          type="password" 
                          value={formData.adminPassword} 
                          onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                          className="bg-background border-border text-foreground" 
                          required={!emailExists}
                          placeholder="Mínimo 6 caracteres"
                          minLength={6}
                        />
                        <p className="text-xs text-muted-foreground">O usuário receberá este email e senha para acessar o studio</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">{saving ? 'Salvando...' : 'Criar'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <StatsGrid columns={3}>
        <StatsCard
          title="Total Studios"
          value={total}
          icon={<Building2 className="h-4 w-4" />}
          iconColor="text-amber-500"
          iconBgColor="bg-amber-500/10"
        />
        <StatsCard
          title="Personal"
          value={studios.reduce((a, s) => a + (s.totalTrainers ?? 0), 0)}
          icon={<Users className="h-4 w-4" />}
          iconColor="text-amber-500"
          iconBgColor="bg-amber-500/10"
        />
        <StatsCard
          title="Alunos"
          value={studios.reduce((a, s) => a + s._count.clients, 0)}
          icon={<UserCheck className="h-4 w-4" />}
          iconColor="text-amber-500"
          iconBgColor="bg-amber-500/10"
        />
      </StatsGrid>

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar studios..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-10 bg-background border-border text-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full bg-muted" />)}</div>
          ) : studios.length === 0 ? (
            <div className="py-12 text-center"><Building2 className="mx-auto h-12 w-12 text-muted-foreground" /><h3 className="mt-4 text-lg font-medium text-foreground">Nenhum studio</h3></div>
          ) : (
            <>
              {/* Mobile: Cards */}
              <div className="md:hidden space-y-3">
                {studios.map((s) => (
                  <div key={s.id} className="p-4 border rounded-lg bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.slug}</div>
                      </div>
                      <Badge className={statusConfig[s.status].color}>{statusConfig[s.status].label}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div><span className="text-muted-foreground">Plano:</span> {s.plan?.name || '-'}</div>
                      <div><span className="text-muted-foreground">Trainers:</span> {s.activeTrainers ?? 0}/{s.totalTrainers ?? 0}</div>
                      <div><span className="text-muted-foreground">Alunos:</span> {s._count.clients}</div>
                      <div><span className="text-muted-foreground">Aulas:</span> {s.lessonsThisMonth || 0}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => window.location.href = `/superadmin/studios/${s.id}`} className="flex-1">
                        <ExternalLink className="h-4 w-4 mr-1" /> Entrar
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Nome</TableHead>
                      <TableHead className="text-muted-foreground">Plano</TableHead>
                      <TableHead className="text-muted-foreground">Trainers</TableHead>
                      <TableHead className="text-muted-foreground">Alunos</TableHead>
                      <TableHead className="text-muted-foreground">Aulas (mês)</TableHead>
                      <TableHead className="text-muted-foreground">Última Atividade</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studios.map((s) => (
                      <TableRow key={s.id} className="border-border hover:bg-muted">
                        <TableCell className="font-medium text-foreground">
                          <div>
                            <div>{s.name}</div>
                            <div className="text-xs text-muted-foreground">{s.slug}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{s.plan?.name || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{s.activeTrainers ?? 0} / {s.totalTrainers ?? 0}</TableCell>
                        <TableCell className="text-muted-foreground">{s._count.clients}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${(s.lessonsThisMonth || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {s.lessonsThisMonth || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {s.lastActivity ? new Date(s.lastActivity).toLocaleDateString('pt-BR') : 'Nunca'}
                        </TableCell>
                        <TableCell><Badge className={statusConfig[s.status].color}>{statusConfig[s.status].label}</Badge></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => window.location.href = `/superadmin/studios/${s.id}`} className="hover:bg-muted" title="Entrar no Studio">
                            <ExternalLink className="h-4 w-4 text-amber-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="hover:bg-muted"><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="hover:bg-muted"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="border-border">Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border-border">Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-card border-border">
          <form onSubmit={handleUpdate}>
            <DialogHeader><DialogTitle className="text-foreground">Editar Studio</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nome *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-background border-border text-foreground" required />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Slug *</Label>
                <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="bg-background border-border text-foreground" required />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Plano *</Label>
                <Select value={formData.planId} onValueChange={(v) => setFormData({ ...formData, planId: v })} required>
                  <SelectTrigger className="bg-background border-border text-foreground"><SelectValue placeholder="Selecione um plano" /></SelectTrigger>
                  <SelectContent>
                    {plans?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>) || null}
                  </SelectContent>
                </Select>
                {formData.planId && (() => {
                  const selectedPlan = plans.find(p => p.id === formData.planId)
                  if (!selectedPlan) return null
                  return (
                    <div className="flex items-start gap-2 p-3 rounded bg-amber-500/10 border border-amber-500/20">
                      <UserCheck className="h-4 w-4 text-amber-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-amber-400 font-medium mb-1">
                          Plano: {selectedPlan.name}
                        </p>
                        <p className="text-xs text-amber-300">
                          Mínimo: <strong>{selectedPlan.minTrainers}</strong> trainer{selectedPlan.minTrainers > 1 ? 's' : ''}
                          {selectedPlan.recommendedMax && (
                            <> • Máximo recomendado: <strong>{selectedPlan.recommendedMax}</strong></>
                          )}
                        </p>
                        <p className="text-xs text-amber-300 mt-1">
                          Valor: <strong>R$ {selectedPlan.pricePerTrainer.toFixed(2)}</strong> por trainer ativo/mês
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Status</Label>
                <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="bg-background border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                    <SelectItem value="SUSPENDED">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {studioAdmins.length > 0 && (
                <div className="border-t border-border pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-foreground">Resetar Senha de Administrador</h4>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={resetPassword}
                        onChange={(e) => {
                          setResetPassword(e.target.checked)
                          if (!e.target.checked) {
                            setFormData({ ...formData, adminPassword: '' })
                          }
                        }}
                        className="w-4 h-4 rounded border-border bg-background text-amber-500 focus:ring-amber-500"
                      />
                      <span className="text-xs text-muted-foreground">Resetar senha</span>
                    </label>
                  </div>
                  
                  {resetPassword && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Selecionar Administrador</Label>
                        <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
                          <SelectTrigger className="bg-background border-border text-foreground">
                            <SelectValue placeholder="Selecione um admin" />
                          </SelectTrigger>
                          <SelectContent>
                            {studioAdmins.map((admin) => (
                              <SelectItem key={admin.id} value={admin.id}>
                                {admin.name} ({admin.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Nova Senha *</Label>
                        <Input
                          type="password"
                          value={formData.adminPassword}
                          onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                          className="bg-background border-border text-foreground"
                          placeholder="Mínimo 6 caracteres"
                          minLength={6}
                          required={resetPassword}
                        />
                        <p className="text-xs text-muted-foreground">
                          A senha será atualizada para o administrador selecionado
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">{saving ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Floating Action Button for Mobile */}
      <FloatingActionButton 
        actions={[
          {
            label: 'Novo Studio',
            onClick: () => setIsCreateOpen(true),
            icon: <Plus className="h-5 w-5" />
          }
        ]}
      />
    </div>
  )
}
