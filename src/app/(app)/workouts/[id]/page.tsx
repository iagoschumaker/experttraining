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
            <p className="text-2xl font-bold">
              {workout.blocks.length > 0
                ? workout.blocks.length
                : (() => {
                    // v2: count unique pillar types from schedule
                    const s = workout.scheduleJson as any
                    if (s?.pillarLabels) return Object.keys(s.pillarLabels).length
                    const w1 = s?.weeks?.[0]
                    if (w1?.sessions) {
                      const pillars = new Set(w1.sessions.map((ses: any) => ses.treino?.pilar || ses.pillar || ses.focus).filter(Boolean))
                      return pillars.size || w1.sessions.length
                    }
                    return 0
                  })()
              }
            </p>
            <p className="text-sm text-muted-foreground">
              {workout.blocks.length > 0 ? 'blocos no programa' : 'pilares de treino'}
            </p>
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

      {/* Blocks Used — only if legacy blocks exist */}
      {workout.blocks.length > 0 && (
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
      )}


      {/* Schedule Preview — GESTANTE */}
      {schedule && schedule.isGestante && (() => {
        const week1 = schedule.weeks?.[0]
        const session = week1?.sessions?.[0]?.gestante
        if (!session) return null

        return (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="text-3xl">🤰</span>
                <div>
                  <CardTitle>{schedule.phaseLabel}</CardTitle>
                  <CardDescription>
                    {schedule.totalWeeks} semanas • {week1?.sessions?.length || 3} sessões/semana
                    <span className="ml-1 text-pink-500">• Sem. gestacional {schedule.gestationalWeeksRange}</span>
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Safety Notes */}
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">🛡️ Regras de Segurança</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {session.safetyNotes?.map((note: string, i: number) => (
                    <p key={i} className="text-[11px] text-muted-foreground">{note}</p>
                  ))}
                </div>
              </div>

              {/* Session Card */}
              <div className="border-2 border-pink-500/30 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-pink-500/10 border-b border-pink-500/20">
                  <span className="text-sm font-bold text-pink-600 dark:text-pink-400">{session.title}</span>
                  <span className="ml-2 text-[10px] font-mono text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded">
                    ~{session.estimatedDuration} min
                  </span>
                </div>

                <div className="p-3 space-y-3">
                  {/* Warmup */}
                  {session.warmup && (
                    <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-sm">{session.warmup.icon}</span>
                        <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">{session.warmup.name}</span>
                        <span className="text-[10px] text-orange-500 font-mono ml-auto">{session.warmup.duration}</span>
                      </div>
                      <div className="space-y-0.5">
                        {session.warmup.exercises?.map((ex: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="flex-1">{ex.name}</span>
                            <span className="shrink-0 ml-2 font-mono text-[10px] text-orange-500">{ex.reps}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exercise Blocks */}
                  {session.blocks?.map((block: any, bIdx: number) => (
                    <div key={bIdx} className="rounded-lg border border-blue-500/20 overflow-hidden">
                      <div className="flex items-center justify-between px-2.5 py-1.5 bg-blue-500/5 border-b border-blue-500/15">
                        <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                          <span>{block.icon}</span> {block.name}
                        </span>
                        <span className="text-[10px] text-blue-500 font-mono">{block.duration}</span>
                      </div>
                      <div className="divide-y divide-border/30">
                        {block.exercises?.map((ex: any, exIdx: number) => (
                          <div key={exIdx} className="px-2.5 py-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-medium">{ex.name}</span>
                              <span className="text-[10px] font-mono text-muted-foreground">{ex.reps}</span>
                            </div>
                            {ex.notes && (
                              <p className="text-[10px] text-blue-500 mt-0.5">💡 {ex.notes}</p>
                            )}
                            {ex.caution && (
                              <p className="text-[10px] text-red-400 mt-0.5">⚠️ {ex.caution}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Stretching */}
                  {session.stretching && (
                    <div className="p-2.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-sm">{session.stretching.icon}</span>
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400">{session.stretching.name}</span>
                        <span className="text-[10px] text-green-500 font-mono ml-auto">{session.stretching.duration}</span>
                      </div>
                      <div className="space-y-0.5">
                        {session.stretching.exercises?.map((ex: any, i: number) => (
                          <div key={i} className="px-1">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span className="flex-1">{ex.name}</span>
                              <span className="shrink-0 ml-2 font-mono text-[10px] text-green-500">{ex.reps}</span>
                            </div>
                            {ex.notes && <p className="text-[10px] text-green-500/70">💡 {ex.notes}</p>}
                            {ex.caution && <p className="text-[10px] text-red-400">⚠️ {ex.caution}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Relaxation */}
                  {session.relaxation && (
                    <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-sm">{session.relaxation.icon}</span>
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">{session.relaxation.name}</span>
                        <span className="text-[10px] text-purple-500 font-mono ml-auto">{session.relaxation.duration}</span>
                      </div>
                      <div className="space-y-0.5">
                        {session.relaxation.exercises?.map((ex: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="flex-1">{ex.name}</span>
                            <span className="shrink-0 ml-2 font-mono text-[10px] text-purple-500">{ex.reps}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Schedule Preview — Expert Pro (pilares) */}
      {schedule && schedule.weeks && !schedule.isGestante && (() => {
        const week1 = schedule.weeks[0]

        // Detect format: new has session.treino, old has session.blocks
        const isNewFormat = !!week1?.sessions?.[0]?.treino

        // Collect one session per pillar — sorted by treino number (Treino 1, 2, 3)
        const pillarMap: Record<string, any> = {}
        week1?.sessions?.forEach((s: any) => {
          const key = s.pillar || 'UNKNOWN'
          if (!pillarMap[key]) pillarMap[key] = s
        })

        // Sort: extract number from pillarLabel ("Treino 1: Perna" → 1)
        const extractTreinoNum = (session: any) => {
          const label = session.treino?.pillarLabel || session.pillarLabel || ''
          const match = label.match(/(\d+)/)
          return match ? parseInt(match[1]) : 99
        }
        const pillarSessions: [string, any][] = Object.entries(pillarMap)
          .sort((a, b) => extractTreinoNum(a[1]) - extractTreinoNum(b[1]))

        // Group weeks by phase label (in new format, phaseLabel comes from schedule root)
        const schedulePhaseLabel = schedule.phaseLabel || ''
        const phases: { label: string; weeks: number[] }[] = []
        let currentPhase = ''
        schedule.weeks.forEach((w: any) => {
          const phase = w.phaseLabel || schedulePhaseLabel || 'Treino'
          if (phase !== currentPhase) {
            phases.push({ label: phase, weeks: [w.week] })
            currentPhase = phase
          } else {
            phases[phases.length - 1].weeks.push(w.week)
          }
        })

        const pillarMeta = (p: string) => {
          if (p === 'LOWER') return { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-600', pill: 'bg-amber-500/20 text-amber-600 border-amber-500/30' }
          if (p === 'PUSH') return { border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-500', pill: 'bg-blue-500/20 text-blue-500 border-blue-500/30' }
          return { border: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-500', pill: 'bg-purple-500/20 text-purple-500 border-purple-500/30' }
        }

        // Sessions per week = unique days in week1
        const sessionsPerWeek = week1?.sessions?.length || workout.sessionsPerWeek || workout.weeklyFrequency || 3

        return (
          <Card>
            <CardHeader>
              <CardTitle>Cronograma</CardTitle>
              <CardDescription>
                {schedule.weeks.length} semanas • {sessionsPerWeek} sessões/semana
                {schedulePhaseLabel && <span className="ml-1 text-muted-foreground">• {schedulePhaseLabel}</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">

              {/* Phase Timeline — only show if more than 1 phase OR phaseLabel differs per week */}
              {phases.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {phases.length > 1 ? 'Fases do Programa' : 'Fase Atual'}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {phases.map((phase, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border">
                        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary text-primary-foreground font-bold text-xs">
                          {phase.weeks.length}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{phase.label}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {phase.weeks.length === 1
                              ? `Sem. ${phase.weeks[0]}`
                              : `Sem. ${phase.weeks[0]}–${phase.weeks[phase.weeks.length - 1]}`}
                            {' '}({phase.weeks.length} sem.)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pillar Rotation Table */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  🔄 Rotação Semanal
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-2 py-1.5 font-semibold border-b">Sem.</th>
                        {week1?.sessions?.map((_: any, i: number) => (
                          <th key={i} className="text-center px-2 py-1.5 font-semibold border-b">Dia {i + 1}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {schedule.weeks.map((w: any) => (
                        <tr key={w.week} className="hover:bg-muted/30">
                          <td className="px-2 py-1 font-semibold border-b border-border/50 text-muted-foreground">{w.week}</td>
                          {w.sessions.map((s: any, si: number) => {
                            const meta = pillarMeta(s.pillar)
                            // Short label: "Perna & Quadril" → "Perna", "Empurrada" → "Empurra", "Puxada" → "Puxa"
                            const fullLabel = s.pillarLabel || (isNewFormat ? (s.treino?.pillarLabel || s.pillar) : s.pillar) || '—'
                            const shortLabel = fullLabel.replace('Perna & Quadril', 'Perna').replace('Empurrada', 'Empurra').replace('Treino \\d+: ', '')
                            return (
                              <td key={si} className="text-center px-1 py-1 border-b border-border/50">
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${meta.pill}`}>
                                  {shortLabel}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Exercises by Pillar — sorted Treino 1, 2, 3 */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  📋 Treinos
                  <span className="text-[10px] text-muted-foreground font-normal">exercícios fixos — só progressão muda cada semana</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {pillarSessions.map(([pillar, session]) => {
                    const meta = pillarMeta(pillar)
                    const treino = isNewFormat ? session.treino : null
                    const blocos = isNewFormat ? (treino?.blocos || []) : (session.blocks || [])
                    const prep = session.preparation
                    const protocol = isNewFormat ? treino?.protocoloFinal : session.finalProtocol
                    // Full label like "Treino 1: Perna" or for legacy "Perna & Quadril"
                    const pillarLabel = isNewFormat
                      ? (treino?.pillarLabel || session.pillarLabel || pillar)
                      : (session.pillarLabel || pillar)
                    // series = "3x", "3-4x", "4x" — from treino (new format)
                    const series = treino?.series || ''

                    return (
                      <div key={pillar} className={`border-2 rounded-xl overflow-hidden ${meta.border}`}>
                        {/* Header */}
                        <div className={`px-4 py-2.5 ${meta.bg} border-b ${meta.border}`}>
                          <span className={`text-sm font-bold ${meta.text}`}>{pillarLabel}</span>
                          {series && (
                            <span className="ml-2 text-[10px] font-mono text-muted-foreground bg-background/60 px-1.5 py-0.5 rounded">
                              {series} séries
                            </span>
                          )}
                        </div>

                        <div className="p-3 space-y-3">
                          {/* Preparation */}
                          {prep && (
                            <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                                  🔥 {prep.title || 'Preparação'}
                                </span>
                              </div>
                              <div className="space-y-0.5">
                                {(prep.exercises || []).map((ex: any, idx: number) => {
                                  const detail = typeof ex === 'string' ? ex : (ex.detail || (ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.duration))
                                  const name = typeof ex === 'string' ? ex : ex.name
                                  return (
                                    <div key={idx} className="flex items-center justify-between text-[11px] text-muted-foreground">
                                      <span className="flex-1">{name}</span>
                                      {detail && <span className="shrink-0 ml-2 font-mono text-[10px] text-orange-500">{detail}</span>}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Blocks */}
                          <div className="space-y-2">
                            {blocos.length === 0 && (
                              <p className="text-xs text-muted-foreground italic">Nenhum bloco cadastrado</p>
                            )}
                            {blocos.map((b: any, bIdx: number) => {
                              const exercises = b.exercises || []
                              return (
                                <div key={bIdx} className="rounded-lg border border-blue-500/20 overflow-hidden">
                                  {/* Block header */}
                                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-blue-500/5 border-b border-blue-500/15">
                                    <span className="text-[11px] font-semibold text-foreground">{b.name || `Bloco ${bIdx + 1}`}</span>
                                    {b.restAfterBlock && (
                                      <span className="text-[10px] text-blue-500 font-mono">{b.restAfterBlock}</span>
                                    )}
                                  </div>
                                  <div className="divide-y divide-border/30">
                                    {exercises.map((ex: any, exIdx: number) => {
                                      const sIdx = week1.sessions.findIndex((ss: any) => ss.pillar === pillar)
                                      const wKey = `w0-s${sIdx}-b${bIdx}-e${exIdx}`
                                      const posLabel = exIdx === 0 ? '🎯' : exIdx === 1 ? '🔄' : '⚡'
                                      // Compose reps display: series × reps
                                      const repsDisplay = isNewFormat
                                        ? (series && ex.reps ? `${series}×${ex.reps}` : ex.reps || '')
                                        : (ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : '')
                                      return (
                                        <div key={exIdx} className="px-2.5 py-2 flex items-center gap-2">
                                          {isNewFormat ? (
                                            <span className="text-base shrink-0 w-5">{posLabel}</span>
                                          ) : (
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                                              ex.role === 'FOCO_PRINCIPAL' ? 'bg-amber-500/20 text-amber-600' :
                                              (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? 'bg-purple-500/20 text-purple-500' :
                                              'bg-green-500/20 text-green-600'
                                            }`}>
                                              {ex.role === 'FOCO_PRINCIPAL' ? 'F' :
                                                (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? 'S' : 'C'}
                                            </span>
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <span className="text-[11px] font-medium leading-tight block truncate">{ex.name}</span>
                                            {(repsDisplay || ex.load) && (
                                              <span className="text-[10px] text-muted-foreground font-mono">
                                                {repsDisplay}
                                                {repsDisplay && ex.load ? ' · ' : ''}
                                                {ex.load && <span className="text-amber-500">{ex.load}</span>}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-0.5 shrink-0">
                                            <Weight className="w-3 h-3 text-muted-foreground" />
                                            <input
                                              type="text"
                                              inputMode="decimal"
                                              placeholder="—"
                                              defaultValue={ex.weight || ''}
                                              className={`w-12 text-[11px] text-center rounded border bg-background px-1 py-0.5 focus:ring-1 focus:ring-primary outline-none ${
                                                savingWeight === wKey ? 'border-green-400 bg-green-500/10' : 'border-border'
                                              }`}
                                              onBlur={(e) => {
                                                const val = e.target.value.trim()
                                                if (val !== (ex.weight || '')) saveWeight(0, sIdx, bIdx, exIdx, val)
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                              }}
                                            />
                                            <span className="text-[9px] text-muted-foreground">kg</span>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {/* Protocol Final */}
                          {protocol && (
                            <div className="p-2.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                              <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 block mb-0.5">
                                ⚡ Protocolo Final
                              </span>
                              {typeof protocol === 'string' ? (
                                <p className="text-[11px] text-muted-foreground">{protocol}</p>
                              ) : (
                                <>
                                  <span className="text-[10px] text-green-500 font-mono">{protocol.name}</span>
                                  {protocol.structure && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{protocol.structure}</p>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </CardContent>
          </Card>
        )
      })()}



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
