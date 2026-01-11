'use client'

// ============================================================================
// EXPERT TRAINING - SUPERADMIN STUDIOS PAGE
// ============================================================================

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
}

interface Plan {
  id: string
  name: string
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
          <h1 className="text-2xl font-bold text-white">Studios</h1>
          <p className="text-sm text-gray-400">Gerencie os studios parceiros</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-black">
              <Plus className="h-4 w-4" /> Novo Studio
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle className="text-white">Novo Studio</DialogTitle>
                <DialogDescription className="text-gray-400">Cadastre um novo studio</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Nome *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) })} className="bg-gray-800 border-gray-700 text-white" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Slug *</Label>
                  <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="bg-gray-800 border-gray-700 text-white" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Plano</Label>
                  <Select value={formData.planId} onValueChange={(v) => setFormData({ ...formData, planId: v })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <h4 className="text-sm font-medium text-white mb-3">Administrador do Studio</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Email do Admin *</Label>
                      <Input 
                        type="email" 
                        value={formData.adminEmail} 
                        onChange={(e) => {
                          setFormData({ ...formData, adminEmail: e.target.value })
                          checkEmailExists(e.target.value)
                        }}
                        className="bg-gray-800 border-gray-700 text-white" 
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
                        <Label className="text-gray-300">Senha Inicial *</Label>
                        <Input 
                          type="password" 
                          value={formData.adminPassword} 
                          onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                          className="bg-gray-800 border-gray-700 text-white" 
                          required={!emailExists}
                          placeholder="Mínimo 6 caracteres"
                          minLength={6}
                        />
                        <p className="text-xs text-gray-500">O usuário receberá este email e senha para acessar o studio</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">{saving ? 'Salvando...' : 'Criar'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total</CardTitle>
            <Building2 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{total}</div></CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Usuários</CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{studios.reduce((a, s) => a + s._count.users, 0)}</div></CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Alunos</CardTitle>
            <UserCheck className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{studios.reduce((a, s) => a + s._count.clients, 0)}</div></CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Buscar studios..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-10 bg-gray-900 border-gray-700 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full bg-gray-700" />)}</div>
          ) : studios.length === 0 ? (
            <div className="py-12 text-center"><Building2 className="mx-auto h-12 w-12 text-gray-600" /><h3 className="mt-4 text-lg font-medium text-white">Nenhum studio</h3></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Nome</TableHead>
                  <TableHead className="text-gray-400">Plano</TableHead>
                  <TableHead className="text-gray-400">Trainers</TableHead>
                  <TableHead className="text-gray-400">Alunos</TableHead>
                  <TableHead className="text-gray-400">Aulas (mês)</TableHead>
                  <TableHead className="text-gray-400">Última Atividade</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studios.map((s) => (
                  <TableRow key={s.id} className="border-gray-700 hover:bg-gray-750">
                    <TableCell className="font-medium text-white">
                      <div>
                        <div>{s.name}</div>
                        <div className="text-xs text-gray-500">{s.slug}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400">{s.plan?.name || '-'}</TableCell>
                    <TableCell className="text-gray-400">{s._count.users}</TableCell>
                    <TableCell className="text-gray-400">{s._count.clients}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${(s.lessonsThisMonth || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {s.lessonsThisMonth || 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {s.lastActivity ? new Date(s.lastActivity).toLocaleDateString('pt-BR') : 'Nunca'}
                    </TableCell>
                    <TableCell><Badge className={statusConfig[s.status].color}>{statusConfig[s.status].label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => window.location.href = `/superadmin/studios/${s.id}`} className="hover:bg-gray-700" title="Entrar no Studio">
                        <ExternalLink className="h-4 w-4 text-amber-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="hover:bg-gray-700"><Pencil className="h-4 w-4 text-gray-400" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="hover:bg-gray-700"><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
        <DialogContent className="bg-gray-900 border-gray-700">
          <form onSubmit={handleUpdate}>
            <DialogHeader><DialogTitle className="text-white">Editar Studio</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Nome *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-gray-800 border-gray-700 text-white" required />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Slug *</Label>
                <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="bg-gray-800 border-gray-700 text-white" required />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Plano</Label>
                <Select value={formData.planId} onValueChange={(v) => setFormData({ ...formData, planId: v })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Status</Label>
                <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                    <SelectItem value="SUSPENDED">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {studioAdmins.length > 0 && (
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-white">Resetar Senha de Administrador</h4>
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
                        className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-amber-500 focus:ring-amber-500"
                      />
                      <span className="text-xs text-gray-400">Resetar senha</span>
                    </label>
                  </div>
                  
                  {resetPassword && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-gray-300">Selecionar Administrador</Label>
                        <Select value={selectedAdminId} onValueChange={setSelectedAdminId}>
                          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
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
                        <Label className="text-gray-300">Nova Senha *</Label>
                        <Input
                          type="password"
                          value={formData.adminPassword}
                          onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                          className="bg-gray-800 border-gray-700 text-white"
                          placeholder="Mínimo 6 caracteres"
                          minLength={6}
                          required={resetPassword}
                        />
                        <p className="text-xs text-gray-500">
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
              <Button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">{saving ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
