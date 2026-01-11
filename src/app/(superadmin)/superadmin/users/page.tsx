'use client'

// ============================================================================
// EXPERT TRAINING - SUPERADMIN USERS PAGE
// ============================================================================

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Users, Plus, Search, Pencil, Trash2, Shield, User } from 'lucide-react'

interface UserStudio { studio: { id: string; name: string }; role: string }
interface UserData {
  id: string
  name: string
  email: string
  isSuperAdmin: boolean
  createdAt: string
  userStudios: UserStudio[]
}

interface Studio { id: string; name: string }

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [studios, setStudios] = useState<Studio[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)

  const [formData, setFormData] = useState({
    name: '', email: '', password: '', isSuperAdmin: false, studioId: '', studioRole: 'TRAINER',
  })

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

  const fetchStudios = async () => {
    try {
      const res = await fetch('/api/superadmin/studios?pageSize=100')
      const data = await res.json()
      if (data.success) setStudios(data.data.items)
    } catch (error) { console.error('Error:', error) }
  }

  useEffect(() => { fetchUsers(); fetchStudios() }, [page, search])

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
        <DialogTitle className="text-white">{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
        <DialogDescription className="text-gray-400">{isEdit ? 'Atualize os dados' : 'Cadastre um novo usuário'}</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-300">Nome *</Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-gray-800 border-gray-700 text-white" required />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-300">Email *</Label>
            <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-gray-800 border-gray-700 text-white" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-gray-300">Senha {isEdit ? '(deixe vazio para manter)' : '*'}</Label>
          <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="bg-gray-800 border-gray-700 text-white" required={!isEdit} />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isSuperAdmin" checked={formData.isSuperAdmin} onChange={(e) => setFormData({ ...formData, isSuperAdmin: e.target.checked })} className="rounded border-gray-700" />
          <Label htmlFor="isSuperAdmin" className="text-gray-300">Super Administrador</Label>
        </div>
        <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 space-y-4">
          <h4 className="font-medium text-amber-500">Vínculo com Studio</h4>
          <div className="grid grid-cols-2 gap-4">
            <Select value={formData.studioId} onValueChange={(v) => setFormData({ ...formData, studioId: v })}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white"><SelectValue placeholder="Selecione o studio" /></SelectTrigger>
              <SelectContent>{studios.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={formData.studioRole} onValueChange={(v) => setFormData({ ...formData, studioRole: v })}>
              <SelectTrigger className="bg-gray-900 border-gray-700 text-white"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="OWNER">Proprietário</SelectItem><SelectItem value="ADMIN">Administrador</SelectItem><SelectItem value="TRAINER">Treinador</SelectItem></SelectContent>
            </Select>
          </div>
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
          <h1 className="text-2xl font-bold text-white">Usuários</h1>
          <p className="text-sm text-gray-400">Gerencie os usuários do sistema</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-black" onClick={resetForm}><Plus className="h-4 w-4" /> Novo Usuário</Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-lg"><FormContent onSubmit={handleCreate} /></DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total</CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{total}</div></CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Super Admins</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{users.filter((u) => u.isSuperAdmin).length}</div></CardContent>
        </Card>
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Usuários</CardTitle>
            <User className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{users.filter((u) => !u.isSuperAdmin).length}</div></CardContent>
        </Card>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Buscar usuários..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-10 bg-gray-900 border-gray-700 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full bg-gray-700" />)}</div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center"><Users className="mx-auto h-12 w-12 text-gray-600" /><h3 className="mt-4 text-lg font-medium text-white">Nenhum usuário</h3></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Nome</TableHead>
                  <TableHead className="text-gray-400">Email</TableHead>
                  <TableHead className="text-gray-400">Studios</TableHead>
                  <TableHead className="text-gray-400">Tipo</TableHead>
                  <TableHead className="text-gray-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="border-gray-700">
                    <TableCell className="font-medium text-white">{u.name}</TableCell>
                    <TableCell className="text-gray-400">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.userStudios && u.userStudios.length > 0 ? (
                          <>
                            {u.userStudios.slice(0, 2).map((us) => (
                              <Badge key={us.studio.id} variant="outline" className="border-gray-600 text-gray-400 text-xs">{us.studio.name} ({us.role})</Badge>
                            ))}
                            {u.userStudios.length > 2 && <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs">+{u.userStudios.length - 2}</Badge>}
                          </>
                        ) : (
                          <span className="text-gray-500 text-xs">Nenhum estúdio</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{u.isSuperAdmin ? <Badge className="bg-red-500">Super Admin</Badge> : <Badge className="bg-gray-600">Usuário</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)} className="hover:bg-gray-700"><Pencil className="h-4 w-4 text-gray-400" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)} className="hover:bg-gray-700"><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
        <DialogContent className="bg-gray-900 border-gray-700 max-w-lg"><FormContent onSubmit={handleUpdate} isEdit /></DialogContent>
      </Dialog>
    </div>
  )
}
