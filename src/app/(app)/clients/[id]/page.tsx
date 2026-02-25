'use client'

// ============================================================================
// EXPERT TRAINING - CLIENT DETAIL PAGE
// ============================================================================
// Detalhes do cliente com histórico de avaliações e treinos
// ============================================================================

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
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
  ArrowLeft,
  User,
  Mail,
  Phone,
  Target,
  FileText,
  ClipboardCheck,
  Dumbbell,
  Calendar,
  Pencil,
  Plus,
  MessageCircle,
  Award,
} from 'lucide-react'
import { useAuth } from '@/hooks'
import { ClientEvolution } from '@/components/clients/client-evolution'
import { ClientGoalsForm } from '@/components/clients/client-goals-form'

interface Assessment {
  id: string
  status: string
  confidence: number | null
  createdAt: string
  completedAt: string | null
}

interface Workout {
  id: string
  name: string
  createdAt: string
}

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  objectives: string | null
  history: string | null
  goal: string | null
  isActive: boolean
  createdAt: string
  trainerId: string | null
  goalType: string | null
  goalWeight: number | null
  bodyFat: number | null
  trainer?: {
    id: string
    name: string
  } | null
  assessments: Assessment[]
  workouts: Workout[]
}

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string
  const { user } = useAuth()

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Check permissions
  const isAdmin = user?.role === 'STUDIO_ADMIN'
  const canEdit = isAdmin || (client?.trainerId === user?.id)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    objectives: '',
    history: '',
  })

  // Fetch client
  useEffect(() => {
    const fetchClient = async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}`)
        const data = await res.json()

        if (data.success) {
          setClient(data.data)
          setFormData({
            name: data.data.name,
            email: data.data.email || '',
            phone: data.data.phone || '',
            objectives: data.data.objectives || '',
            history: data.data.history || '',
          })
        } else {
          alert('Cliente não encontrado')
          router.push('/clients')
        }
      } catch (error) {
        console.error('Error fetching client:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchClient()
  }, [clientId, router])

  // Update client
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (data.success) {
        setClient((prev) => (prev ? { ...prev, ...formData } : null))
        setIsEditOpen(false)
      } else {
        alert(data.error || 'Erro ao atualizar')
      }
    } catch (error) {
      console.error('Error updating:', error)
      alert('Erro ao atualizar')
    } finally {
      setSaving(false)
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  if (!client) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate max-w-[200px] sm:max-w-none">{client.name}</h1>
            <p className="text-sm text-gray-500">
              Cliente desde {formatDate(client.createdAt)}
              {client.trainer && (
                <span className="ml-2">
                  • Personal: <span className="font-medium">{client.trainer.name}</span>
                  {client.trainerId === user?.id && (
                    <Badge variant="outline" className="ml-1 text-xs">Você</Badge>
                  )}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Link href={`/clients/${client.id}/edit`}>
              <Button variant="outline">
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </Link>
          )}
          <Link href={`/assessments/new?clientId=${client.id}`}>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black">
              <Plus className="mr-2 h-4 w-4" />
              Nova Avaliação
            </Button>
          </Link>
        </div>
      </div>

      {/* Client Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{client.email || 'Não informado'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{client.phone || 'Não informado'}</span>
              {client.phone && (
                <a
                  href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto"
                >
                  <Button size="sm" variant="outline" className="gap-2">
                    <MessageCircle className="h-4 w-4 text-green-500" />
                    WhatsApp
                  </Button>
                </a>
              )}
            </div>
            <Separator />
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Award className="h-4 w-4" />
                Meta Principal
              </div>
              <p className="mt-1">
                {client.goal === 'HYPERTROPHY' && 'Hipertrofia'}
                {client.goal === 'STRENGTH' && 'Força'}
                {client.goal === 'CONDITIONING' && 'Condicionamento'}
                {client.goal === 'WEIGHT_LOSS' && 'Emagrecimento'}
                {client.goal === 'REHABILITATION' && 'Reabilitação'}
                {client.goal === 'PERFORMANCE' && 'Performance'}
                {!client.goal && 'Não definida'}
              </p>
            </div>
            <Separator />
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="h-4 w-4" />
                Objetivos
              </div>
              <p className="mt-1">{client.objectives || 'Não definidos'}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                Histórico
              </div>
              <p className="mt-1">{client.history || 'Sem histórico registrado'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Resumo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-500">
                  {client.assessments?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Avaliações</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-500">
                  {client.workouts?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Treinos</div>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={client.isActive ? 'default' : 'secondary'}>
                {client.isActive ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assessments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Avaliações
          </CardTitle>
          <Link href={`/assessments/new?clientId=${client.id}`}>
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Nova
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {client.assessments && client.assessments.length > 0 ? (
            <div className="space-y-3">
              {client.assessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatDate(assessment.createdAt)}
                      </span>
                      <Badge
                        variant={
                          assessment.status === 'COMPLETED'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {assessment.status === 'COMPLETED'
                          ? 'Concluída'
                          : assessment.status === 'IN_PROGRESS'
                          ? 'Em Andamento'
                          : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                  <Link href={`/assessments/${assessment.id}`}>
                    <Button variant="ghost" size="sm">
                      Ver
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-muted-foreground">
              Nenhuma avaliação realizada
            </p>
          )}
        </CardContent>
      </Card>

      {/* Meta do Aluno */}
      {canEdit && (
        <ClientGoalsForm
          clientId={client.id}
          initialGoalType={client.goalType}
          initialGoalWeight={client.goalWeight}
        />
      )}

      {/* Evolução do Cliente */}
      <ClientEvolution clientId={client.id} />

      {/* Workouts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Treinos
          </CardTitle>
          <Link href="/workouts/generate">
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Novo
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {client.workouts && client.workouts.length > 0 ? (
            <div className="space-y-3">
              {client.workouts.map((workout) => (
                <div
                  key={workout.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <span className="font-medium">{workout.name}</span>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(workout.createdAt)}
                    </p>
                  </div>
                  <Link href={`/workouts/${workout.id}`}>
                    <Button variant="ghost" size="sm">
                      Ver
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-center text-muted-foreground">
              Nenhum treino criado
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
