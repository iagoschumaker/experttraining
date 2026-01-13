// ============================================================================
// EXPERT TRAINING - WORKOUT DETAIL PAGE
// ============================================================================
// Visualização completa do treino - Compartilhado entre Studio e Personal
// ============================================================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  Activity,
  User,
  FileText,
  Edit,
  Archive,
  Play,
  Pause,
  CheckCircle,
  Trash2,
  Printer,
} from 'lucide-react'
import Link from 'next/link'

interface Block {
  id: string
  code: string
  name: string
  category: string
  description: string
  weeklyFrequency: number
}

interface Workout {
  id: string
  status: string
  weeklyFrequency: number
  phaseDuration: number
  notes: string | null
  createdAt: string
  blocksUsed: string[]
  scheduleJson: any
  client: {
    id: string
    name: string
    email: string
    status: string
  }
  creator: {
    name: string
  }
  assessment: {
    id: string
    resultJson: any
    confidence: number
  } | null
  blocks: Block[]
}

export default function WorkoutDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadWorkout()
  }, [params.id])

  async function loadWorkout() {
    try {
      const res = await fetch(`/api/studio/workouts/${params.id}`)
      const data = await res.json()

      if (data.success) {
        setWorkout(data.data)
      } else {
        setError('Treino não encontrado')
      }
    } catch (err) {
      console.error('Error loading workout:', err)
      setError('Erro ao carregar treino')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateStatus(newStatus: string) {
    if (!workout) return
    setUpdating(true)

    try {
      const res = await fetch(`/api/studio/workouts/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await res.json()

      if (data.success) {
        setWorkout({ ...workout, status: newStatus })
      } else {
        alert(data.error || 'Erro ao atualizar status')
      }
    } catch (err) {
      console.error('Update error:', err)
      alert('Erro de conexão')
    } finally {
      setUpdating(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir este treino?')) return
    setUpdating(true)

    try {
      const res = await fetch(`/api/studio/workouts/${params.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (data.success) {
        router.push('/workouts')
      } else {
        alert(data.error || 'Erro ao excluir treino')
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert('Erro de conexão')
    } finally {
      setUpdating(false)
    }
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, any> = {
      ACTIVE: { variant: 'default', label: 'Ativo', icon: Play },
      PAUSED: { variant: 'secondary', label: 'Pausado', icon: Pause },
      COMPLETED: { variant: 'outline', label: 'Concluído', icon: CheckCircle },
      ARCHIVED: { variant: 'destructive', label: 'Arquivado', icon: Archive },
    }
    const config = variants[status] || variants.ACTIVE
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (error || !workout) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
        <h2 className="text-xl font-semibold">{error || 'Treino não encontrado'}</h2>
        <Link href="/workouts">
          <Button className="mt-4 bg-amber-500 hover:bg-amber-600 text-black">Voltar</Button>
        </Link>
      </div>
    )
  }

  const schedule = workout.scheduleJson as any

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/workouts" className="no-print">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Treino</h1>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-muted-foreground font-medium">Cliente: {workout.client.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => window.print()}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir PDF
            </Button>
            {getStatusBadge(workout.status)}
          </div>
        </div>
      </div>

      {/* Print Header - Only visible when printing */}
      <div className="print-only print-header">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Expert Training</h1>
          <p className="text-sm text-gray-600">Sistema de Treino Funcional</p>
        </div>
        <div className="border-t border-b py-4 mb-6">
          <h2 className="text-xl font-bold mb-2">Plano de Treino</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Cliente:</strong> {workout.client.name}</p>
              <p><strong>Email:</strong> {workout.client.email}</p>
            </div>
            <div>
              <p><strong>Data:</strong> {new Date(workout.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}</p>
              <p><strong>Status:</strong> {workout.status === 'ACTIVE' ? 'Ativo' : workout.status === 'PAUSED' ? 'Pausado' : workout.status === 'COMPLETED' ? 'Concluído' : 'Arquivado'}</p>
              <p><strong>Frequência:</strong> {workout.weeklyFrequency}x por semana</p>
              <p><strong>Duração:</strong> {workout.phaseDuration} semanas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="w-4 h-4" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{workout.client.name}</p>
            <p className="text-sm text-muted-foreground">{workout.client.email}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Frequência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{workout.weeklyFrequency}x</p>
            <p className="text-sm text-muted-foreground">por semana</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Duração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{workout.phaseDuration}</p>
            <p className="text-sm text-muted-foreground">semanas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Blocos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{workout.blocks.length}</p>
            <p className="text-sm text-muted-foreground">no programa</p>
          </CardContent>
        </Card>
      </div>

      {/* Assessment Link */}
      {workout.assessment && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Baseado em Avaliação</h3>
                <p className="text-sm text-muted-foreground">
                  {workout.assessment.resultJson?.functionalPattern}
                </p>
              </div>
              <Link href={`/results/${workout.assessment.id}`}>
                <Button variant="outline">Ver Avaliação</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Blocks Used */}
      <Card>
        <CardHeader>
          <CardTitle>Blocos Utilizados</CardTitle>
          <CardDescription>Exercícios e padrões de movimento do programa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {workout.blocks.map((block) => (
              <div key={block.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{block.name}</h4>
                  <Badge variant="outline">{block.code}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{block.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Categoria: <span className="font-medium">{block.category}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Frequência: <span className="font-medium">{block.weeklyFrequency}x/sem</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Preview */}
      {schedule && schedule.weeks && (
        <Card>
          <CardHeader>
            <CardTitle>Cronograma</CardTitle>
            <CardDescription>
              Visualização das {schedule.weeks.length} semanas do programa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {schedule.weeks.slice(0, 4).map((week: any) => (
                <div key={week.week} className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3">Semana {week.week}</h4>
                  <div className="grid gap-2">
                    {week.sessions.map((session: any) => (
                      <div key={session.session} className="flex items-center gap-3 text-sm">
                        <Badge variant="outline" className="w-20">
                          Dia {session.session}
                        </Badge>
                        <div className="flex-1">
                          {session.blocks.map((b: any, idx: number) => (
                            <span key={idx} className="text-muted-foreground">
                              {b.blockName}
                              {idx < session.blocks.length - 1 && ' • '}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {schedule.weeks.length > 4 && (
                <p className="text-sm text-muted-foreground text-center">
                  + {schedule.weeks.length - 4} semanas adicionais
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {workout.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{workout.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold">Ações do Treino</h3>
              <p className="text-sm text-muted-foreground">
                Criado por {workout.creator.name} em{' '}
                {new Date(workout.createdAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {workout.status === 'ACTIVE' && (
                <Button
                  variant="outline"
                  onClick={() => handleUpdateStatus('PAUSED')}
                  disabled={updating}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pausar
                </Button>
              )}
              {workout.status === 'PAUSED' && (
                <Button
                  variant="outline"
                  onClick={() => handleUpdateStatus('ACTIVE')}
                  disabled={updating}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Reativar
                </Button>
              )}
              {(workout.status === 'ACTIVE' || workout.status === 'PAUSED') && (
                <Button
                  variant="outline"
                  onClick={() => handleUpdateStatus('COMPLETED')}
                  disabled={updating}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Concluir
                </Button>
              )}
              {workout.status !== 'ARCHIVED' && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={updating}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Footer - Only visible when printing */}
      <div className="print-only print-footer">
        <p>Expert Training - Sistema de Treino Funcional | www.experttraining.com.br</p>
        <p>Documento gerado em {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      </div>
    </div>
  )
}
