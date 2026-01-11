// ============================================================================
// EXPERT TRAINING - LESSONS (AULAS) PAGE
// ============================================================================
// Página para gerenciamento de aulas com controle de presença
// Features:
// - Listagem de aulas com filtros (data, trainer, status)
// - Iniciar nova aula (individual ou em grupo)
// - Upload de foto de presença (anti-burla)
// - Finalizar aula com duração automática
// ============================================================================

'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Plus, 
  Camera, 
  Clock, 
  Users, 
  User, 
  CheckCircle, 
  XCircle, 
  Play,
  Square,
  Search,
  Filter,
  Calendar,
  ChevronDown
} from 'lucide-react'

interface Client {
  id: string
  name: string
}

interface LessonClient {
  id: string
  clientId: string
  client: Client
  attended: boolean
}

interface Trainer {
  id: string
  name: string
}

interface Lesson {
  id: string
  type: 'INDIVIDUAL' | 'GROUP'
  status: 'STARTED' | 'COMPLETED' | 'CANCELLED'
  photoUrl: string | null
  startedAt: string
  endedAt: string | null
  duration: number | null
  notes: string | null
  trainer: Trainer
  clients: LessonClient[]
}

interface TrainerOption {
  id: string
  userId: string
  name: string
}

export default function LessonsPage() {
  // State
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [trainers, setTrainers] = useState<TrainerOption[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loadingRole, setLoadingRole] = useState(true)
  
  // Filters
  const [filterTrainer, setFilterTrainer] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDate, setFilterDate] = useState('')
  
  // Create lesson dialog
  const [showStartDialog, setShowStartDialog] = useState(false)
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [lessonPhoto, setLessonPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Active lesson (to complete)
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load lessons
  const loadLessons = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterTrainer) params.set('trainerId', filterTrainer)
      if (filterStatus) params.set('status', filterStatus)
      if (filterDate) {
        const startDate = new Date(filterDate)
        const endDate = new Date(filterDate)
        endDate.setDate(endDate.getDate() + 1)
        params.set('startDate', startDate.toISOString())
        params.set('endDate', endDate.toISOString())
      }
      
      const res = await fetch(`/api/studio/lessons?${params.toString()}`)
      const data = await res.json()
      
      if (data.success) {
        setLessons(data.data?.items || [])
      }
    } catch (err) {
      console.error('Error loading lessons:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load trainers and clients for filters/forms
  const loadData = async () => {
    try {
      // Primeiro, carregar role do usuário
      const meRes = await fetch('/api/auth/me')
      const meData = await meRes.json()
      if (meData.success && meData.data?.currentStudio) {
        setUserRole(meData.data.currentStudio.role)
      }
      
      const [trainersRes, clientsRes] = await Promise.all([
        fetch('/api/studio/users'),
        fetch('/api/studio/clients?limit=100'),
      ])
      
      const trainersData = await trainersRes.json()
      const clientsData = await clientsRes.json()
      
      if (trainersData.success) {
        setTrainers(trainersData.data?.items || [])
      }
      if (clientsData.success) {
        setClients(clientsData.data?.items || [])
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoadingRole(false)
    }
  }

  useEffect(() => {
    loadData()
    loadLessons()
  }, [])

  useEffect(() => {
    loadLessons()
  }, [filterTrainer, filterStatus, filterDate])

  // Handle photo selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLessonPhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Start lesson
  const handleStartLesson = async () => {
    if (selectedClients.length === 0) {
      setError('Selecione ao menos um aluno para a aula')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Create lesson
      const res = await fetch('/api/studio/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientIds: selectedClients,
          notes: notes || undefined,
          // TODO: Handle photo upload to S3 and get URL
          photoUrl: photoPreview || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao iniciar aula')
      }

      setSuccess('Aula iniciada com sucesso!')
      setShowStartDialog(false)
      resetStartForm()
      loadLessons()

      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Erro ao iniciar aula')
    } finally {
      setSubmitting(false)
    }
  }

  // Complete lesson
  const handleCompleteLesson = async () => {
    if (!activeLesson) return

    try {
      setSubmitting(true)
      setError(null)

      const res = await fetch(`/api/studio/lessons/${activeLesson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'COMPLETED',
          notes: notes || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao finalizar aula')
      }

      setSuccess('Aula finalizada com sucesso!')
      setShowCompleteDialog(false)
      setActiveLesson(null)
      setNotes('')
      loadLessons()

      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Erro ao finalizar aula')
    } finally {
      setSubmitting(false)
    }
  }

  // Cancel lesson
  const handleCancelLesson = async (lesson: Lesson) => {
    if (!confirm('Tem certeza que deseja cancelar esta aula?')) return

    try {
      const res = await fetch(`/api/studio/lessons/${lesson.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao cancelar aula')
      }

      setSuccess('Aula cancelada')
      loadLessons()

      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Erro ao cancelar aula')
    }
  }

  // Reset start form
  const resetStartForm = () => {
    setSelectedClients([])
    setLessonPhoto(null)
    setPhotoPreview(null)
    setNotes('')
  }

  // Toggle client selection
  const toggleClient = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
  }

  // Format duration
  const formatDuration = (minutes: number | null): string => {
    if (!minutes) return '-'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}min`
    }
    return `${mins}min`
  }

  // Format date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'STARTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Play className="w-3 h-3" />
            Em andamento
          </span>
        )
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3" />
            Finalizada
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="w-3 h-3" />
            Cancelada
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aulas</h1>
          <p className="text-gray-600 mt-1">
            Controle de aulas e presenças do studio
          </p>
        </div>
        <button
          onClick={() => setShowStartDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Iniciar Aula
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {/* Filtro de Trainer - Só para STUDIO_ADMIN */}
          {userRole === 'STUDIO_ADMIN' && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trainer
              </label>
              <select
                value={filterTrainer}
                onChange={(e) => setFilterTrainer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Todos</option>
                {trainers.map((t) => (
                  <option key={t.userId} value={t.userId}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos</option>
              <option value="STARTED">Em andamento</option>
              <option value="COMPLETED">Finalizadas</option>
              <option value="CANCELLED">Canceladas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lessons Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Carregando aulas...
          </div>
        ) : lessons.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhuma aula encontrada
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trainer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alunos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duração
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Foto
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lessons.map((lesson) => (
                <tr key={lesson.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(lesson.startedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      lesson.type === 'GROUP' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {lesson.type === 'GROUP' ? (
                        <>
                          <Users className="w-3 h-3" />
                          Grupo
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3" />
                          Individual
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {lesson.trainer.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {lesson.clients.map(lc => lc.client.name).join(', ')}
                    {lesson.clients.length > 2 && (
                      <span className="text-gray-400 ml-1">
                        (+{lesson.clients.length - 2})
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {formatDuration(lesson.duration)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(lesson.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {lesson.photoUrl ? (
                      <a
                        href={lesson.photoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <Camera className="w-5 h-5" />
                      </a>
                    ) : (
                      <span className="text-gray-400">
                        <Camera className="w-5 h-5 opacity-30" />
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {lesson.status === 'STARTED' && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setActiveLesson(lesson)
                            setShowCompleteDialog(true)
                          }}
                          className="text-green-600 hover:text-green-800"
                          title="Finalizar aula"
                        >
                          <Square className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleCancelLesson(lesson)}
                          className="text-red-600 hover:text-red-800"
                          title="Cancelar aula"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Start Lesson Dialog */}
      {showStartDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Iniciar Nova Aula</h2>
            
            {/* Clients Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecione os Alunos *
              </label>
              <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                {clients.map((client) => (
                  <label
                    key={client.id}
                    className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                      selectedClients.includes(client.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(client.id)}
                      onChange={() => toggleClient(client.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm text-gray-900">{client.name}</span>
                  </label>
                ))}
                {clients.length === 0 && (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Nenhum aluno disponível
                  </div>
                )}
              </div>
              {selectedClients.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  {selectedClients.length} aluno(s) selecionado(s) -{' '}
                  <span className="font-medium">
                    {selectedClients.length > 1 ? 'Aula em Grupo' : 'Aula Individual'}
                  </span>
                </p>
              )}
            </div>

            {/* Photo Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foto de Presença
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Camera className="w-5 h-5 text-gray-500" />
                  {photoPreview ? 'Trocar Foto' : 'Tirar Foto'}
                </button>
                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded-lg border"
                  />
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Foto opcional como comprovante de presença
              </p>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre a aula..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowStartDialog(false)
                  resetStartForm()
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleStartLesson}
                disabled={submitting || selectedClients.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-5 h-5" />
                {submitting ? 'Iniciando...' : 'Iniciar Aula'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Lesson Dialog */}
      {showCompleteDialog && activeLesson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Finalizar Aula</h2>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Início:</strong> {formatDate(activeLesson.startedAt)}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Alunos:</strong> {activeLesson.clients.map(lc => lc.client.name).join(', ')}
              </p>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observações Finais
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Como foi a aula..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCompleteDialog(false)
                  setActiveLesson(null)
                  setNotes('')
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCompleteLesson}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="w-5 h-5" />
                {submitting ? 'Finalizando...' : 'Finalizar Aula'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
