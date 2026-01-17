// ============================================================================
// EXPERT PRO TRAINING - TEAM MANAGEMENT (STUDIO)
// ============================================================================
// Página para STUDIO_ADMIN gerenciar trainers (personals)
// Features:
// - Lista de trainers com nome, email, role, status
// - Adicionar trainer: email + senha (ou vincular existente)
// - Editar trainer: role, status, resetar senha
// - Remover trainer do studio
// ============================================================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, UserCheck, Trash2, Edit2, Search, X, AlertCircle } from 'lucide-react'
import { FloatingActionButton } from '@/components/ui'

interface Trainer {
  id: string
  userId: string
  name: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
}

interface EmailCheckResult {
  exists: boolean
  user?: {
    id: string
    name: string
    email: string
    isSuperAdmin: boolean
  }
}

export default function TeamPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [checkingPermission, setCheckingPermission] = useState(true)
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null)

  // Create form
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TRAINER' as 'TRAINER' | 'STUDIO_ADMIN',
  })
  const [emailExists, setEmailExists] = useState(false)
  const [existingUser, setExistingUser] = useState<EmailCheckResult['user'] | null>(null)
  const [checkingEmail, setCheckingEmail] = useState(false)

  // Edit form
  const [editForm, setEditForm] = useState({
    role: 'TRAINER' as 'TRAINER' | 'STUDIO_ADMIN',
    isActive: true,
    resetPassword: false,
    newPassword: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load trainers
  const loadTrainers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/studio/users')
      const data = await res.json()

      if (data.success) {
        setTrainers(data.data?.items || [])
      } else {
        setError(data.error || 'Erro ao carregar equipe')
      }
    } catch (err) {
      setError('Erro ao carregar equipe')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Check permission
  const checkPermission = async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      
      if (data.success && data.data?.currentStudio) {
        const role = data.data.currentStudio.role
        setUserRole(role)
        
        // Se não for STUDIO_ADMIN, redirecionar
        if (role !== 'STUDIO_ADMIN') {
          setError('Você não tem permissão para acessar esta página')
          setTimeout(() => router.push('/'), 2000)
          return
        }
      }
    } catch (err) {
      console.error('Error checking permission:', err)
    } finally {
      setCheckingPermission(false)
    }
  }

  useEffect(() => {
    checkPermission()
  }, [])

  useEffect(() => {
    if (userRole === 'STUDIO_ADMIN') {
      loadTrainers()
    }
  }, [userRole])

  // Check email exists
  const checkEmailExists = async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailExists(false)
      setExistingUser(null)
      return
    }

    try {
      setCheckingEmail(true)
      const res = await fetch(`/api/studio/users/check-email?email=${encodeURIComponent(email)}`)
      const data = await res.json()

      if (data.success && data.exists) {
        setEmailExists(true)
        setExistingUser(data.user)
        setCreateForm((prev) => ({ ...prev, name: data.user.name, password: '' }))
      } else {
        setEmailExists(false)
        setExistingUser(null)
      }
    } catch (err) {
      console.error('Error checking email:', err)
      setEmailExists(false)
      setExistingUser(null)
    } finally {
      setCheckingEmail(false)
    }
  }

  // Handle email change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (createForm.email) {
        checkEmailExists(createForm.email)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [createForm.email])

  // Handle create trainer
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Validate
    if (!createForm.name.trim()) {
      setError('Nome é obrigatório')
      return
    }
    if (!createForm.email.trim()) {
      setError('Email é obrigatório')
      return
    }
    if (!emailExists && !createForm.password) {
      setError('Senha é obrigatória para novo usuário')
      return
    }
    if (!emailExists && createForm.password.length < 6) {
      setError('Senha deve ter no mínimo 6 caracteres')
      return
    }

    try {
      setSubmitting(true)

      const res = await fetch('/api/studio/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          email: createForm.email,
          password: emailExists ? undefined : createForm.password,
          role: createForm.role,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(
          emailExists
            ? `${existingUser?.name} foi vinculado ao studio com sucesso!`
            : `${createForm.name} foi adicionado com sucesso!`
        )
        setShowCreateDialog(false)
        setCreateForm({ name: '', email: '', password: '', role: 'TRAINER' })
        setEmailExists(false)
        setExistingUser(null)
        loadTrainers()
      } else {
        setError(data.error || 'Erro ao adicionar membro')
      }
    } catch (err) {
      setError('Erro ao adicionar membro')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle edit
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTrainer) return

    setError(null)
    setSuccess(null)

    // Validate password reset
    if (editForm.resetPassword) {
      if (!editForm.newPassword) {
        setError('Nova senha é obrigatória')
        return
      }
      if (editForm.newPassword.length < 6) {
        setError('Senha deve ter no mínimo 6 caracteres')
        return
      }
    }

    try {
      setSubmitting(true)

      const res = await fetch(`/api/studio/users/${selectedTrainer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editForm.role,
          isActive: editForm.isActive,
          resetPassword: editForm.resetPassword,
          newPassword: editForm.resetPassword ? editForm.newPassword : undefined,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setSuccess('Membro atualizado com sucesso!')
        setShowEditDialog(false)
        setSelectedTrainer(null)
        setEditForm({ role: 'TRAINER', isActive: true, resetPassword: false, newPassword: '' })
        loadTrainers()
      } else {
        setError(data.error || 'Erro ao atualizar membro')
      }
    } catch (err) {
      setError('Erro ao atualizar membro')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle delete
  const handleDelete = async (trainer: Trainer) => {
    if (!confirm(`Tem certeza que deseja remover ${trainer.name} do studio?`)) {
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      setSuccess(null)

      const res = await fetch(`/api/studio/users/${trainer.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (data.success) {
        setSuccess(`${trainer.name} foi removido do studio`)
        loadTrainers()
      } else {
        setError(data.error || 'Erro ao remover membro')
      }
    } catch (err) {
      setError('Erro ao remover membro')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // Open edit dialog
  const openEditDialog = (trainer: Trainer) => {
    setSelectedTrainer(trainer)
    setEditForm({
      role: trainer.role as 'TRAINER' | 'STUDIO_ADMIN',
      isActive: trainer.isActive,
      resetPassword: false,
      newPassword: '',
    })
    setShowEditDialog(true)
    setError(null)
    setSuccess(null)
  }

  // Filter trainers
  const filteredTrainers = trainers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Loading/permission check
  if (checkingPermission) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Verificando permissões...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Access denied
  if (userRole && userRole !== 'STUDIO_ADMIN') {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Acesso Negado</h2>
              <p className="text-muted-foreground mb-4">Você não tem permissão para acessar esta página.</p>
              <p className="text-sm text-muted-foreground">Redirecionando...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Equipe</h1>
          <p className="text-muted-foreground">Gerencie os membros do seu studio</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
            {success}
          </div>
        )}

        {/* Actions Bar */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => {
              setShowCreateDialog(true)
              setError(null)
              setSuccess(null)
            }}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-amber-500 text-accent-foreground rounded-lg hover:bg-amber-600 transition-colors"
          >
            <Plus size={20} />
            Adicionar Membro
          </button>
        </div>

        {/* Trainers Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            <p className="mt-4 text-muted-foreground">Carregando equipe...</p>
          </div>
        ) : filteredTrainers.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border-2 border-dashed border-border">
            <p className="text-muted-foreground">Nenhum membro encontrado</p>
          </div>
        ) : (
          <>
            {/* Mobile: Cards */}
            <div className="md:hidden space-y-3">
              {filteredTrainers.map((trainer) => (
                <div key={trainer.id} className="p-4 border border-border rounded-lg bg-card">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-foreground">{trainer.name}</div>
                      <div className="text-xs text-muted-foreground">{trainer.email}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      trainer.isActive ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'
                    }`}>
                      {trainer.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      trainer.role === 'STUDIO_ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {trainer.role === 'STUDIO_ADMIN' ? 'Admin' : 'Personal'}
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => openEditDialog(trainer)} className="text-amber-400 hover:text-amber-300" title="Editar"><Edit2 size={18} /></button>
                      <button onClick={() => handleDelete(trainer)} className="text-red-400 hover:text-red-300" title="Remover"><Trash2 size={18} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: Table */}
            <div className="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
              <table className="responsive-table w-full">
                <thead className="bg-muted border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cargo</th>
                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTrainers.map((trainer) => (
                    <tr key={trainer.id} className="hover:bg-muted">
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-foreground">{trainer.name}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-muted-foreground">{trainer.email}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          trainer.role === 'STUDIO_ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {trainer.role === 'STUDIO_ADMIN' ? 'Admin' : 'Personal'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          trainer.isActive ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'
                        }`}>
                          {trainer.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button onClick={() => openEditDialog(trainer)} className="text-amber-400 hover:text-amber-300 mr-3" title="Editar"><Edit2 size={18} /></button>
                        <button onClick={() => handleDelete(trainer)} className="text-red-400 hover:text-red-300" title="Remover"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Create Dialog */}
        {showCreateDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">Adicionar Membro</h2>
                <button
                  onClick={() => {
                    setShowCreateDialog(false)
                    setCreateForm({ name: '', email: '', password: '', role: 'TRAINER' })
                    setEmailExists(false)
                    setExistingUser(null)
                    setError(null)
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                {/* Name - always show first */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder={emailExists && existingUser ? `Usar: ${existingUser.name}` : 'Digite o nome completo'}
                    disabled={emailExists && !!existingUser}
                    required={!emailExists}
                  />
                  {emailExists && existingUser && (
                    <p className="text-xs text-muted-foreground mt-1">Nome será usado do usuário existente</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    required
                  />
                  {checkingEmail && (
                    <p className="text-xs text-muted-foreground mt-1">Verificando email...</p>
                  )}
                  {emailExists && existingUser && (
                    <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded flex items-center gap-2 text-sm text-amber-400">
                      <UserCheck size={16} />
                      <span>
                        Usuário já cadastrado - será vinculado ao studio
                      </span>
                    </div>
                  )}
                </div>

                {/* Password - only if new user */}
                {!emailExists && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Senha * (mínimo 6 caracteres)
                    </label>
                    <input
                      type="password"
                      value={createForm.password}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      minLength={6}
                      required
                    />
                  </div>
                )}

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Cargo *
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, role: e.target.value as 'TRAINER' | 'STUDIO_ADMIN' }))
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="TRAINER" className="bg-background text-foreground">Personal Trainer</option>
                    <option value="STUDIO_ADMIN" className="bg-background text-foreground">Administrador</option>
                  </select>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateDialog(false)
                      setCreateForm({ name: '', email: '', password: '', role: 'TRAINER' })
                      setEmailExists(false)
                      setExistingUser(null)
                      setError(null)
                    }}
                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted text-foreground"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-amber-500 text-accent-foreground rounded-lg hover:bg-amber-600 disabled:opacity-50"
                  >
                    {submitting ? 'Adicionando...' : 'Adicionar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Dialog */}
        {showEditDialog && selectedTrainer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">Editar Membro</h2>
                <button
                  onClick={() => {
                    setShowEditDialog(false)
                    setSelectedTrainer(null)
                    setEditForm({ role: 'TRAINER', isActive: true, resetPassword: false, newPassword: '' })
                    setError(null)
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-foreground">
                  <strong>{selectedTrainer.name}</strong>
                </p>
                <p className="text-xs text-muted-foreground">{selectedTrainer.email}</p>
              </div>

              <form onSubmit={handleEdit} className="space-y-4">
                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Cargo *
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, role: e.target.value as 'TRAINER' | 'STUDIO_ADMIN' }))
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="TRAINER" className="bg-background text-foreground">Personal Trainer</option>
                    <option value="STUDIO_ADMIN" className="bg-background text-foreground">Administrador</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                      className="w-4 h-4 text-amber-500 border-border rounded focus:ring-amber-500"
                    />
                    <span className="text-sm font-medium text-foreground">Usuário ativo</span>
                  </label>
                </div>

                {/* Reset Password */}
                <div className="border-t border-border pt-4">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={editForm.resetPassword}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, resetPassword: e.target.checked, newPassword: '' }))
                      }
                      className="w-4 h-4 text-amber-500 border-border rounded focus:ring-amber-500"
                    />
                    <span className="text-sm font-medium text-foreground">Resetar senha</span>
                  </label>

                  {editForm.resetPassword && (
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">
                        Nova Senha * (mínimo 6 caracteres)
                      </label>
                      <input
                        type="password"
                        value={editForm.newPassword}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        minLength={6}
                        required
                      />
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditDialog(false)
                      setSelectedTrainer(null)
                      setEditForm({ role: 'TRAINER', isActive: true, resetPassword: false, newPassword: '' })
                      setError(null)
                    }}
                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted text-foreground"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-amber-500 text-accent-foreground rounded-lg hover:bg-amber-600 disabled:opacity-50"
                  >
                    {submitting ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      
      {/* Floating Action Button for Mobile */}
      <FloatingActionButton 
        actions={[
          {
            label: 'Adicionar Membro',
            onClick: () => {
              setShowCreateDialog(true)
              setError(null)
              setSuccess(null)
            },
            icon: <Plus className="h-5 w-5" />
          }
        ]}
      />
    </div>
  )
}
