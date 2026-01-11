// ============================================================================
// EXPERT TRAINING - TEAM MANAGEMENT (STUDIO)
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Verificando permissões...</p>
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
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
              <p className="text-gray-600 mb-4">Você não tem permissão para acessar esta página.</p>
              <p className="text-sm text-gray-500">Redirecionando...</p>
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Equipe</h1>
          <p className="text-gray-600">Gerencie os membros do seu studio</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        {/* Actions Bar */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => {
              setShowCreateDialog(true)
              setError(null)
              setSuccess(null)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Adicionar Membro
          </button>
        </div>

        {/* Trainers Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Carregando equipe...</p>
          </div>
        ) : filteredTrainers.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-600">Nenhum membro encontrado</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cargo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTrainers.map((trainer) => (
                  <tr key={trainer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{trainer.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{trainer.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          trainer.role === 'STUDIO_ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {trainer.role === 'STUDIO_ADMIN' ? 'Admin' : 'Personal'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          trainer.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {trainer.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => openEditDialog(trainer)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(trainer)}
                        className="text-red-600 hover:text-red-800"
                        title="Remover"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Dialog */}
        {showCreateDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Adicionar Membro</h2>
                <button
                  onClick={() => {
                    setShowCreateDialog(false)
                    setCreateForm({ name: '', email: '', password: '', role: 'TRAINER' })
                    setEmailExists(false)
                    setExistingUser(null)
                    setError(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                {/* Name - always show first */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={emailExists && existingUser ? `Usar: ${existingUser.name}` : 'Digite o nome completo'}
                    disabled={emailExists && !!existingUser}
                    required={!emailExists}
                  />
                  {emailExists && existingUser && (
                    <p className="text-xs text-gray-500 mt-1">Nome será usado do usuário existente</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  {checkingEmail && (
                    <p className="text-xs text-gray-500 mt-1">Verificando email...</p>
                  )}
                  {emailExists && existingUser && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded flex items-center gap-2 text-sm text-blue-700">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Senha * (mínimo 6 caracteres)
                    </label>
                    <input
                      type="password"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      minLength={6}
                      required
                    />
                  </div>
                )}

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cargo *
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, role: e.target.value as 'TRAINER' | 'STUDIO_ADMIN' })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="TRAINER">Personal Trainer</option>
                    <option value="STUDIO_ADMIN">Administrador</option>
                  </select>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
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
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Editar Membro</h2>
                <button
                  onClick={() => {
                    setShowEditDialog(false)
                    setSelectedTrainer(null)
                    setEditForm({ role: 'TRAINER', isActive: true, resetPassword: false, newPassword: '' })
                    setError(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>{selectedTrainer.name}</strong>
                </p>
                <p className="text-xs text-gray-500">{selectedTrainer.email}</p>
              </div>

              <form onSubmit={handleEdit} className="space-y-4">
                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cargo *
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm({ ...editForm, role: e.target.value as 'TRAINER' | 'STUDIO_ADMIN' })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="TRAINER">Personal Trainer</option>
                    <option value="STUDIO_ADMIN">Administrador</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Usuário ativo</span>
                  </label>
                </div>

                {/* Reset Password */}
                <div className="border-t pt-4">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input
                      type="checkbox"
                      checked={editForm.resetPassword}
                      onChange={(e) =>
                        setEditForm({ ...editForm, resetPassword: e.target.checked, newPassword: '' })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Resetar senha</span>
                  </label>

                  {editForm.resetPassword && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nova Senha * (mínimo 6 caracteres)
                      </label>
                      <input
                        type="password"
                        value={editForm.newPassword}
                        onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        minLength={6}
                        required
                      />
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
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
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
