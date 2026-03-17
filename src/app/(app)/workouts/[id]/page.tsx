// ============================================================================
// EXPERT TRAINING - WORKOUT DETAIL PAGE
// ============================================================================
// Visualização completa do treino - Compartilhado entre Studio e Personal
// ============================================================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  Download,
  Weight,
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
  studio?: {
    name: string
    logoUrl: string | null
    phone: string | null
    email: string | null
    address: string | null
  }
}

export default function WorkoutDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [updating, setUpdating] = useState(false)
  const [savingWeight, setSavingWeight] = useState<string | null>(null) // key like 'w0-s1-b2-e3'
  const [registeringAttendance, setRegisteringAttendance] = useState(false)
  const [attendanceSuccess, setAttendanceSuccess] = useState(false)

  useEffect(() => {
    loadWorkout()
  }, [params.id])

  // Auto-download PDF if autoDownload parameter is present
  useEffect(() => {
    if (searchParams.get('autoDownload') === 'true' && workout && !loading) {
      handleDownloadPDF()
    }
  }, [searchParams, workout, loading])

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

  // Save exercise weight
  const saveWeight = async (weekIdx: number, sessionIdx: number, blockIdx: number, exerciseIdx: number, weight: string) => {
    const key = `w${weekIdx}-s${sessionIdx}-b${blockIdx}-e${exerciseIdx}`
    setSavingWeight(key)
    try {
      await fetch(`/api/studio/workouts/${params.id}/exercise-weight`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekIdx, sessionIdx, blockIdx, exerciseIdx, weight: weight || null }),
      })
      // Update local state
      if (workout) {
        const s = JSON.parse(JSON.stringify(workout.scheduleJson)) as any
        if (s?.weeks?.[weekIdx]?.sessions?.[sessionIdx]?.blocks?.[blockIdx]?.exercises?.[exerciseIdx]) {
          s.weeks[weekIdx].sessions[sessionIdx].blocks[blockIdx].exercises[exerciseIdx].weight = weight || null
          setWorkout({ ...workout, scheduleJson: s })
        }
      }
    } catch (err) {
      console.error('Error saving weight:', err)
    } finally {
      setSavingWeight(null)
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

  async function handleRegisterAttendance() {
    setRegisteringAttendance(true)
    setAttendanceSuccess(false)

    try {
      const res = await fetch(`/api/studio/workouts/${params.id}/next-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (data.success) {
        setAttendanceSuccess(true)
        // Recarregar dados do treino para atualizar progresso
        loadWorkout()
        setTimeout(() => setAttendanceSuccess(false), 3000)
      } else {
        alert(data.error || 'Erro ao registrar presença')
      }
    } catch (err) {
      console.error('Attendance error:', err)
      alert('Erro de conexão')
    } finally {
      setRegisteringAttendance(false)
    }
  }

  // ========================================================================
  // PDF GENERATION — uses shared generator
  // ========================================================================
  async function handleDownloadPDF() {
    if (!workout || !schedule) return
    try {
      const { generateWorkoutPDF } = await import('@/lib/pdf-generator')
      await generateWorkoutPDF(workout, schedule)
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      alert('Erro ao gerar PDF')
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

  const rawSchedule = workout.scheduleJson as any

  // Função de fallback para gerar preparação quando não existe
  const generatePreparationFallback = (focus: string) => {
    const focusLabel = focus?.includes('LOWER') ? 'membros inferiores' :
      focus?.includes('UPPER') ? 'membros superiores' : 'geral'
    return {
      title: 'Preparação do Movimento',
      totalTime: '12 minutos',
      exercises: [
        { name: `Mobilidade articular (${focusLabel})`, duration: '3 min' },
        { name: 'Ativação de core e estabilizadores', duration: '3 min' },
        { name: 'Estabilidade articular', duration: '3 min' },
        { name: 'Ativação neuromuscular progressiva', duration: '3 min' },
      ],
    }
  }

  // Função de fallback para gerar protocolo final quando não existe
  const generateFinalProtocolFallback = (focus: string, phase: string) => {
    if (focus?.includes('CONDITIONING') || focus?.includes('CARDIO')) {
      return { name: 'Protocolo Metabólico', totalTime: '8 minutos', structure: '30s trabalho / 30s descanso × 8 rounds' }
    }
    if (phase === 'PEAK') {
      return { name: 'HIIT Intensivo', totalTime: '6 minutos', structure: '20s máximo / 40s recuperação × 6 rounds' }
    }
    return { name: 'Protocolo Regenerativo', totalTime: '6 minutos', structure: 'Respiração + alongamento ativo' }
  }

  // Enriquecer schedule com fallbacks para treinos antigos
  const schedule = rawSchedule ? {
    ...rawSchedule,
    weeks: rawSchedule.weeks?.map((week: any) => ({
      ...week,
      sessions: week.sessions?.map((session: any) => ({
        ...session,
        preparation: session.preparation || generatePreparationFallback(session.focus),
        finalProtocol: session.finalProtocol || generateFinalProtocolFallback(session.focus, week.phase),
      })),
    })),
  } : null

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

      {/* Attendance / Progress Card */}
      {workout.status === 'ACTIVE' && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="w-5 h-5 text-amber-500" />
              Progresso do Programa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const p = (workout as any).progress
              if (!p) return <p className="text-sm text-muted-foreground">Dados de progresso não disponíveis</p>

              const pct = Math.round((p.attendanceRate ?? 0) * 100)
              const statusColor = p.attendanceStatus === 'ON_TRACK' ? 'text-green-500'
                : p.attendanceStatus === 'BELOW_TARGET' ? 'text-yellow-500'
                  : 'text-red-500'
              const barColor = p.attendanceStatus === 'ON_TRACK' ? 'bg-green-500'
                : p.attendanceStatus === 'BELOW_TARGET' ? 'bg-yellow-500'
                  : 'bg-red-500'

              return (
                <>
                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Frequência</span>
                      <span className={`font-bold ${statusColor}`}>{pct}%</span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Meta: 85% para progressão</p>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-card rounded-lg p-3 border text-center">
                      <div className="text-2xl font-bold text-foreground">{p.sessionsCompleted ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Sessões feitas</div>
                    </div>
                    <div className="bg-card rounded-lg p-3 border text-center">
                      <div className="text-2xl font-bold text-foreground">{p.sessionsExpectedByNow ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Sessões esperadas</div>
                    </div>
                    <div className="bg-card rounded-lg p-3 border text-center">
                      <div className="text-2xl font-bold text-foreground">Sem. {p.currentWeek ?? 1}</div>
                      <div className="text-xs text-muted-foreground">Semana atual</div>
                    </div>
                    <div className="bg-card rounded-lg p-3 border text-center">
                      <div className="text-2xl font-bold text-amber-500">{p.currentPhaseLabel ?? 'Adaptação'}</div>
                      <div className="text-xs text-muted-foreground">Fase</div>
                    </div>
                  </div>

                  {/* Register Attendance Button */}
                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      onClick={handleRegisterAttendance}
                      disabled={registeringAttendance || p.isComplete}
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white flex-1 md:flex-none"
                    >
                      {registeringAttendance ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      {p.isComplete ? 'Programa Completo' : 'Registrar Presença'}
                    </Button>

                    {attendanceSuccess && (
                      <span className="text-sm text-green-500 font-medium animate-pulse">
                        ✅ Presença registrada!
                      </span>
                    )}

                    {p.mustExtend && (
                      <span className="text-sm text-yellow-500">
                        ⚠️ Frequência abaixo de 85% — programa prolongado
                      </span>
                    )}

                    {p.canReassess && !p.isComplete && (
                      <span className="text-sm text-green-500">
                        ✅ Apto a reavaliar e gerar novo treino
                      </span>
                    )}
                  </div>
                </>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Histórico de Presença */}
      {(workout as any).attendanceLessons?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-green-500" />
              Histórico de Presença
            </CardTitle>
            <CardDescription>
              {(workout as any).attendanceLessons.length} sessão(ões) registrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(workout as any).attendanceLessons.map((lesson: any, i: number) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {new Date(lesson.date).toLocaleDateString('pt-BR', {
                          timeZone: 'UTC',
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lesson.focus || 'Treino'} • Sem. {lesson.weekIndex || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">
                      {new Date(lesson.startedAt).toLocaleTimeString('pt-BR', {
                        timeZone: 'America/Sao_Paulo',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dia {lesson.dayIndex || i + 1}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              {schedule.weeks.length} semanas • {schedule.weeklyFrequency || 3} sessões por semana
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-10">
              {schedule.weeks.map((week: any) => (
                <div key={week.week} className="space-y-4">
                  {/* Week Header */}
                  <div className="flex items-center gap-3 pb-3 border-b-2 border-primary/20">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary font-bold text-lg">
                      {week.week}
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">Semana {week.week}</h4>
                      {week.phaseLabel && (
                        <span className="text-xs text-muted-foreground">
                          Fase: {week.phaseLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sessions Grid - responsive */}
                  <div className={`grid grid-cols-1 gap-4 ${
                    week.sessions.length <= 3 ? 'md:grid-cols-2 lg:grid-cols-3' :
                    week.sessions.length <= 4 ? 'md:grid-cols-2' :
                    'md:grid-cols-2 xl:grid-cols-3'
                  }`}>
                    {week.sessions.map((session: any) => (
                      <div key={session.session} className="border-2 border-border rounded-xl overflow-hidden bg-card hover:border-primary/50 transition-colors">
                        {/* Day Header */}
                        <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 border-b">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary text-primary-foreground font-bold text-sm">
                                {session.session}
                              </div>
                              <span className="font-semibold">Dia {session.session}</span>
                              {session.pillarLabel && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${session.pillar === 'LOWER' ? 'bg-amber-500/20 text-amber-600' :
                                  session.pillar === 'PUSH' ? 'bg-blue-500/20 text-blue-500' :
                                    'bg-purple-500/20 text-purple-500'
                                  }`}>
                                  {session.pillarLabel}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground font-mono">
                              {session.estimatedDuration} min
                            </span>
                          </div>
                        </div>

                        {/* Day Content */}
                        <div className="p-3 space-y-3">

                          {/* Preparation */}
                          {session.preparation && (
                            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                                  Preparação
                                </span>
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                                  {session.preparation.totalTime}
                                </span>
                              </div>
                              <div className="space-y-0.5">
                                {session.preparation.exercises?.slice(0, 4).map((ex: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span className="flex-1">{ex.name}</span>
                                    <span className="shrink-0 ml-2 font-mono text-[10px]">
                                      {ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.duration}
                                    </span>
                                  </div>
                                ))}
                                {session.preparation.exercises?.length > 4 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    +{session.preparation.exercises.length - 4} mais
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Training Blocks */}
                          <div className="space-y-2">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Blocos
                            </span>
                            {session.blocks.map((b: any, idx: number) => (
                              <div key={idx} className="p-2.5 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-foreground">
                                    {b.name || `Bloco ${idx + 1}`}
                                  </span>
                                  <span className="text-[10px] text-blue-500 font-mono">
                                    {b.restAfterBlock}
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {b.exercises?.map((ex: any, exIdx: number) => {
                                    const wIdx = schedule.weeks.indexOf(week)
                                    const sIdx = week.sessions.indexOf(session)
                                    const wKey = `w${wIdx}-s${sIdx}-b${idx}-e${exIdx}`
                                    return (
                                      <div key={exIdx} className="space-y-1">
                                        {/* Line 1: Role badge + Exercise name + Technique */}
                                        <div className="flex items-start gap-1.5">
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 mt-0.5 ${ex.role === 'FOCO_PRINCIPAL' ? 'bg-amber-500/20 text-amber-600' :
                                            (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? 'bg-purple-500/20 text-purple-500' :
                                              'bg-green-500/20 text-green-600'
                                            }`}>
                                            {ex.role === 'FOCO_PRINCIPAL' ? 'F' :
                                              (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? 'S' : 'C'}
                                          </span>
                                          <div className="flex flex-wrap items-center gap-1 min-w-0">
                                            <span className="text-xs font-medium leading-tight">{ex.name}</span>
                                            {ex.technique && (
                                              <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-semibold whitespace-nowrap">
                                                {ex.technique}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        {/* Line 2: Sets × Reps | Rest | Weight */}
                                        <div className="flex items-center gap-2 ml-6 text-[11px]">
                                          {ex.sets && ex.reps && (
                                            <span className="text-muted-foreground font-mono">{ex.sets}×{ex.reps}</span>
                                          )}
                                          <span className="text-amber-500 font-mono text-[10px]">{ex.rest}</span>
                                          <div className="flex items-center gap-0.5 ml-auto">
                                            <Weight className="w-3 h-3 text-muted-foreground" />
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              placeholder="—"
                                              defaultValue={ex.weight || ''}
                                              className={`w-14 text-[11px] text-center rounded border bg-background px-1 py-0.5 focus:ring-1 focus:ring-primary outline-none ${savingWeight === wKey ? 'border-green-400 bg-green-500/10' : 'border-border'
                                                }`}
                                              onBlur={(e) => {
                                                const val = e.target.value.trim()
                                                if (val !== (ex.weight || '')) {
                                                  saveWeight(wIdx, sIdx, idx, exIdx, val)
                                                }
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  (e.target as HTMLInputElement).blur()
                                                }
                                              }}
                                            />
                                            <span className="text-[9px] text-muted-foreground">kg</span>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Final Protocol */}
                          {session.finalProtocol && (
                            <div className="p-2.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                  {session.finalProtocol.name}
                                </span>
                                <span className="text-[10px] text-green-600 dark:text-green-400 font-mono">
                                  {session.finalProtocol.totalTime}
                                </span>
                              </div>
                              {session.finalProtocol.structure && (
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  {session.finalProtocol.structure}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
