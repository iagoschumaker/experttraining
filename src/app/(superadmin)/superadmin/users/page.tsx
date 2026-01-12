'use client'

// ============================================================================
// EXPERT TRAINING - SUPERADMIN USERS PAGE
// ============================================================================

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FloatingActionButton } from '@/components/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ResponsiveTable, ResponsiveHeader, ResponsiveBody, ResponsiveRow, ResponsiveCell, ResponsiveHeaderCell
} from '@/components/ui'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, Plus, Search, Pencil, Trash2, Shield, User, GraduationCap } from 'lucide-react'

interface UserStudio { studio: { id: string; name: string }; role: string }
interface UserData {
  id: string
  name: string
  email: string
  isSuperAdmin: boolean
  createdAt: string
  userStudios: UserStudio[]
}

interface ClientData {
  id: string
  name: string
  email: string | null
  studio: { id: string; name: string } | null
  trainer: { id: string; name: string } | null
  createdAt: string
}

interface Studio { id: string; name: string }

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [clients, setClients] = useState<ClientData[]>([])
  const [studios, setStudios] = useState<Studio[]>([])
  const [loading, setLoading] = useState(true)
  const [clientsLoading, setClientsLoading] = useState(true)
  
  // Users State
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Clients State
  const [clientSearch, setClientSearch] = useState('')
  const [clientPage, setClientPage] = useState(1)
  const [clientTotalPages, setClientTotalPages] = useState(1)
  const [clientTotal, setClientTotal] = useState(0)
  
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', isSuperAdmin: false, studioId: '', studioRole: 'TRAINER',
  })

  useEffect(() => { fetchStudios() }, [])

  // Fetch Users
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: '15' })
      if (search) params.set('search', search)
      const res = await fetch(`/api/superadmin/users?${params}`)
      const data = await res.json()
      if (data.success) { setUsers(data.data.items); setTotalPages(data.data.totalPages); setTotal(data.data.total) }
    } catch (error) { console.error('Error:', error) }
    finally { setLoading(false) }
  }

  // Fetch Clients
  const fetchClients = async () => {
    setClientsLoading(true)
    try {
      const params = new URLSearchParams({ page: clientPage.toString(), pageSize: '15' })
      if (clientSearch) params.set('search', clientSearch)
      const res = await fetch(`/api/superadmin/clients?${params}`)
      const data = await res.json()
      if (data.success) { 
        setClients(data.data.items)
        setClientTotalPages(data.data.totalPages)
        setClientTotal(data.data.total) 
      }
    } catch (error) { console.error('Error:', error) }
    finally { setClientsLoading(false) }
  }

  const fetchStudios = async () => {
    try {
      const res = await fetch('/api/superadmin/studios?pageSize=100')
      const data = await res.json()
      if (data.success) setStudios(data.data.items)
    } catch (error) { console.error('Error:', error) }
  }

  useEffect(() => { fetchUsers() }, [page, search])
  useEffect(() => { fetchClients() }, [clientPage, clientSearch])

  const resetForm = () => setFormData({ name: '', email: '', password: '', isSuperAdmin: false, studioId: '', studioRole: 'TRAINER' })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const studioAssignments = formData.studioId ? [{ studioId: formData.studioId, role: formData.studioRole }] : []
      const body = { name: formData.name, email: formData.email, password: formData.password, isSuperAdmin: formData.isSuperAdmin, studioAssignments }
      const res = await fetch('/api/superadmin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) { setIsCreateOpen(false); resetForm(); fetchUsers() }
      else alert(data.error)
    } catch { alert('Erro ao criar') }
    finally { setSaving(false) }
  }

  const openEdit = (user: UserData) => {
    const firstStudio = user.userStudios[0]
    setSelectedUser(user)
    setFormData({ name: user.name, email: user.email, password: '', isSuperAdmin: user.isSuperAdmin, studioId: firstStudio?.studio.id || '', studioRole: firstStudio?.role || 'TRAINER' })
    setIsEditOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setSaving(true)
    try {
      const studioAssignments = formData.studioId ? [{ studioId: formData.studioId, role: formData.studioRole }] : []
      const body: any = { name: formData.name, email: formData.email, isSuperAdmin: formData.isSuperAdmin, studioAssignments }
      if (formData.password) body.password = formData.password
      const res = await fetch(`/api/superadmin/users/${selectedUser.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (data.success) { setIsEditOpen(false); fetchUsers() }
      else alert(data.error)
    } catch { alert('Erro ao atualizar') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este usuário?')) return
    try {
      const res = await fetch(`/api/superadmin/users/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) fetchUsers()
      else alert(data.error)
    } catch { alert('Erro ao excluir') }
  }

  const FormContent = ({ onSubmit, isEdit = false }: { onSubmit: (e: React.FormEvent) => void; isEdit?: boolean }) => (
    <form onSubmit={onSubmit}>
      <DialogHeader>
        <DialogTitle className="text-foreground">{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
        <DialogDescription className="text-muted-foreground">{isEdit ? 'Atualize os dados' : 'Cadastre um novo usuário'}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Nome *</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-card border-border text-foreground" required />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Email *</Label>
            <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-card border-border text-foreground" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Senha {isEdit ? '(deixe vazio para manter)' : '*'}</Label>
          <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="bg-card border-border text-foreground" required={!isEdit} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isSuperAdmin" checked={formData.isSuperAdmin} onChange={(e) => setFormData({ ...formData, isSuperAdmin: e.target.checked })} className="rounded border-border" />
          <Label htmlFor="isSuperAdmin" className="text-muted-foreground">Super Administrador</Label>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-4">
          <h4 className="font-medium text-amber-500">Vínculo com Studio</h4>
          <div className="grid grid-cols-2 gap-4">
            <Select value={formData.studioId} onValueChange={(v) => setFormData({ ...formData, studioId: v })}>
              <SelectTrigger className="bg-background border-border text-foreground"><SelectValue placeholder="Selecione o studio" /></SelectTrigger>
              <SelectContent>{studios.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={formData.studioRole} onValueChange={(v) => setFormData({ ...formData, studioRole: v })}>
              <SelectTrigger className="bg-background border-border text-foreground"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="OWNER">Proprietário</SelectItem><SelectItem value="ADMIN">Administrador</SelectItem><SelectItem value="TRAINER">Treinador</SelectItem></SelectContent>
            </Select>
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
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground">Gerencie os usuários do sistema</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="hidden md:flex gap-2 bg-accent text-accent-foreground hover:bg-accent/90" onClick={resetForm}><Plus className="h-4 w-4" /> Novo Usuário</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg"><FormContent onSubmit={handleCreate} /></DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total (Staff)</CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{total}</div></CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alunos</CardTitle>
            <GraduationCap className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{clientTotal}</div></CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Super Admins</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{users.filter((u) => u.isSuperAdmin).length}</div></CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usuários (Staff)</CardTitle>
            <User className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{users.filter((u) => !u.isSuperAdmin).length}</div></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="staff">Equipe (Staff)</TabsTrigger>
          <TabsTrigger value="clients">Alunos (Clients)</TabsTrigger>
        </TabsList>

        <TabsContent value="staff">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar staff..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-10 bg-background border-border text-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full bg-muted" />)}</div>
              ) : users.length === 0 ? (
                <div className="py-12 text-center"><Users className="mx-auto h-12 w-12 text-muted" /><h3 className="mt-4 text-lg font-medium text-foreground">Nenhum usuário</h3></div>
              ) : (
                <div className="responsive-table-wrapper">
                  <table className="responsive-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Studios</th>
                        <th>Tipo</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td data-label="Nome" className="font-medium text-foreground">{u.name}</td>
                          <td data-label="Email" className="text-muted-foreground">{u.email}</td>
                          <td data-label="Studios">
                            <div className="flex flex-wrap gap-1">
                              {u.userStudios && u.userStudios.length > 0 ? (
                                <>
                                  {u.userStudios.slice(0, 2).map((us) => (
                                    <Badge key={us.studio.id} variant="outline" className="border-border text-muted-foreground text-xs">{us.studio.name} ({us.role})</Badge>
                                  ))}
                                  {u.userStudios.length > 2 && <Badge variant="outline" className="border-border text-muted-foreground text-xs">+{u.userStudios.length - 2}</Badge>}
                                </>
                              ) : (
                                <span className="text-muted-foreground text-xs">Nenhum estúdio</span>
                              )}
                            </div>
                          </td>
                          <td data-label="Tipo">{u.isSuperAdmin ? <Badge className="bg-red-500">Super Admin</Badge> : <Badge className="bg-muted">Usuário</Badge>}</td>
                          <td data-label="Ações">
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(u)} className="hover:bg-muted"><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)} className="hover:bg-muted"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
        </TabsContent>

        <TabsContent value="clients">
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar alunos..." value={clientSearch} onChange={(e) => { setClientSearch(e.target.value); setClientPage(1) }} className="pl-10 bg-background border-border text-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              {clientsLoading ? (
                <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full bg-muted" />)}</div>
              ) : clients.length === 0 ? (
                <div className="py-12 text-center"><GraduationCap className="mx-auto h-12 w-12 text-muted" /><h3 className="mt-4 text-lg font-medium text-foreground">Nenhum aluno encontrado</h3></div>
              ) : (
                <div className="responsive-table-wrapper">
                  <table className="responsive-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Studio</th>
                        <th>Responsável</th>
                        <th>Data Cadastro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((c) => (
                        <tr key={c.id}>
                          <td data-label="Nome" className="font-medium text-foreground">{c.name}</td>
                          <td data-label="Email" className="text-muted-foreground">{c.email || '-'}</td>
                          <td data-label="Studio">
                            {c.studio ? (
                              <Badge variant="outline" className="border-border text-muted-foreground text-xs">{c.studio.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td data-label="Responsável" className="text-muted-foreground">{c.trainer?.name || '-'}</td>
                          <td data-label="Data Cadastro" className="text-muted-foreground">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {clientTotalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Página {clientPage} de {clientTotalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setClientPage((p) => Math.max(1, p - 1))} disabled={clientPage === 1} className="border-border">Anterior</Button>
                    <Button variant="outline" size="sm" onClick={() => setClientPage((p) => Math.min(clientTotalPages, p + 1))} disabled={clientPage === clientTotalPages} className="border-border">Próxima</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-card border-border max-w-lg"><FormContent onSubmit={handleUpdate} isEdit /></DialogContent>
      </Dialog>
      
      {/* Floating Action Button for Mobile */}
      <FloatingActionButton 
        actions={[
          {
            label: 'Novo Usuário',
            onClick: resetForm,
            icon: <Plus className="h-5 w-5" />
          }
        ]}
      />
    </div>
  )
}
