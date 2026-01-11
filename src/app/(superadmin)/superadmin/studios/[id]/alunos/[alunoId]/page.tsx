'use client'

// ============================================================================
// EXPERT TRAINING - SUPERADMIN ALUNO DETAILS PAGE
// ============================================================================
// Visão individual do aluno para auditoria
// Mostra apenas dados operacionais, NÃO clínicos
// ============================================================================

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  User,
  Users,
  Calendar,
  ClipboardCheck,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Scale,
  CheckCircle,
  XCircle,
  Dumbbell,
  Eye,
} from 'lucide-react'

interface AlunoData {
  client: {
    id: string
    name: string
    email: string
    phone: string | null
    status: string
    createdAt: string
  }
  studio: {
    id: string
    name: string
  }
  currentTrainer: {
    id: string
    name: string
    email: string
  } | null
  trainersWhoAttended: Array<{
    id: string
    name: string
  }>
  assessments: Array<{
    id: string
    status: string
    createdAt: string
    completedAt: string | null
    level: number | null
    confidence: number | null
    assessor: { id: string; name: string }
    inputJson: any
    resultJson: any
    bodyMetricsJson: any
  }>
  lessons: Array<{
    id: string
    type: string
    status: string
    startedAt: string
    endedAt: string | null
    duration: number | null
    trainer: { id: string; name: string }
    attended: boolean
  }>
  workouts: Array<{
    id: string
    name: string | null
    blocksUsed: string[]
    startDate: string | null
    endDate: string | null
    isActive: boolean
    createdAt: string
  }>
  evolution: Array<{
    date: string
    weight: number | null
    bodyFat: number | null
    measurements: {
      waist?: number
      chest?: number
    } | null
  }>
  metrics: {
    totalAssessments: number
    completedAssessments: number
    totalLessons: number
    lessonsThisMonth: number
    totalWorkouts: number
    weeklyAverage: number
    lastAssessment: string | null
    lastLesson: string | null
    currentLevel: number | null
  }
}

export default function AlunoDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const studioId = params.id as string
  const alunoId = params.alunoId as string

  const [data, setData] = useState<AlunoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'assessments' | 'lessons' | 'workouts'>('overview')
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null)
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null)
  const [showAssessmentDialog, setShowAssessmentDialog] = useState(false)
  const [showWorkoutDialog, setShowWorkoutDialog] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/superadmin/studios/${studioId}/alunos/${alunoId}`)
        const result = await res.json()
        if (result.success) {
          setData(result.data)
        } else {
          router.push(`/superadmin/studios/${studioId}`)
        }
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [studioId, alunoId])

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const formatDateTime = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return '-'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`
  }

  const getLevelName = (level: number | null) => {
    if (!level) return '-'
    const levels: Record<number, string> = {
      1: 'Nível 1',
      2: 'Nível 2',
      3: 'Nível 3',
      4: 'Nível 4',
    }
    return levels[level] || `Nível ${level}`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 bg-gray-700" />
        <Skeleton className="h-[400px] w-full bg-gray-700" />
      </div>
    )
  }

  if (!data) return null

  // Calculate evolution delta
  const hasEvolution = data.evolution.length >= 2
  const latestWeight = data.evolution[0]?.weight
  const previousWeight = data.evolution[1]?.weight
  const weightDelta = hasEvolution && latestWeight && previousWeight
    ? latestWeight - previousWeight
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/superadmin/studios/${studioId}`}>
          <Button variant="ghost" size="icon" className="hover:bg-gray-700">
            <ArrowLeft className="h-4 w-4 text-gray-400" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{data.client.name}</h1>
            <Badge className={data.client.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-500'}>
              {data.client.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          <p className="text-sm text-gray-400">
            {data.client.email} • {data.studio.name}
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Trainer Atual</CardTitle>
            <User className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-white">
              {data.currentTrainer?.name || 'Não atribuído'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Avaliações</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {data.metrics.completedAssessments}
              <span className="text-sm text-gray-500 ml-1">/ {data.metrics.totalAssessments}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">concluídas / total</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Treinos</CardTitle>
            <Dumbbell className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {data.metrics.totalWorkouts}
            </div>
            <p className="text-xs text-gray-500 mt-1">total criados</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Aulas (mês)</CardTitle>
            <Calendar className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.metrics.lessonsThisMonth > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {data.metrics.lessonsThisMonth}
            </div>
            <p className="text-xs text-gray-500 mt-1">{data.metrics.weeklyAverage} por semana</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Nível Atual</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {getLevelName(data.metrics.currentLevel)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {[
          { id: 'overview', label: 'Visão Geral' },
          { id: 'assessments', label: 'Avaliações', count: data.assessments.length },
          { id: 'lessons', label: 'Aulas', count: data.lessons.length },
          { id: 'workouts', label: 'Treinos', count: data.workouts.length },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            className={activeTab === tab.id ? 'bg-amber-500 text-black' : 'text-gray-400'}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-gray-700">
                {tab.count}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Activity Timeline */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Atividade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-gray-400">Última Avaliação</div>
                  <div className="text-lg font-medium text-white">
                    {formatDate(data.metrics.lastAssessment)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Última Aula</div>
                  <div className="text-lg font-medium text-white">
                    {formatDate(data.metrics.lastLesson)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Cadastrado em</div>
                  <div className="text-lg font-medium text-white">
                    {formatDate(data.client.createdAt)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Trainers que atenderam</div>
                  <div className="text-lg font-medium text-white">
                    {data.trainersWhoAttended.length > 0
                      ? data.trainersWhoAttended.map((t) => t.name).join(', ')
                      : 'Nenhum'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evolution (only weight/measurements - no clinical data) */}
          {data.evolution.length > 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Scale className="h-5 w-5 text-amber-500" />
                  Evolução Objetiva
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Apenas métricas corporais (peso e medidas)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-400">Data</TableHead>
                      <TableHead className="text-gray-400">Peso (kg)</TableHead>
                      <TableHead className="text-gray-400">% Gordura</TableHead>
                      <TableHead className="text-gray-400">Cintura (cm)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.evolution.slice(0, 5).map((e, i) => (
                      <TableRow key={i} className="border-gray-700">
                        <TableCell className="text-white">{formatDate(e.date)}</TableCell>
                        <TableCell className="text-gray-400">
                          {e.weight || '-'}
                          {i === 0 && weightDelta && (
                            <span className={`ml-2 text-xs ${weightDelta > 0 ? 'text-red-400' : 'text-green-400'}`}>
                              {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-400">{e.bodyFat || '-'}</TableCell>
                        <TableCell className="text-gray-400">{e.measurements?.waist || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab: Assessments */}
      {activeTab === 'assessments' && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            {data.assessments.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                Nenhuma avaliação registrada
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-400">Data Criação</TableHead>
                    <TableHead className="text-gray-400">Data Conclusão</TableHead>
                    <TableHead className="text-gray-400">Avaliador</TableHead>
                    <TableHead className="text-gray-400">Nível</TableHead>
                    <TableHead className="text-gray-400">Confiança</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.assessments.map((assessment) => (
                    <TableRow key={assessment.id} className="border-gray-700">
                      <TableCell className="text-white">{formatDate(assessment.createdAt)}</TableCell>
                      <TableCell className="text-gray-400">
                        {assessment.completedAt ? formatDate(assessment.completedAt) : '-'}
                      </TableCell>
                      <TableCell className="text-gray-400">{assessment.assessor.name}</TableCell>
                      <TableCell>
                        {assessment.level ? (
                          <Badge className="bg-amber-500">{getLevelName(assessment.level)}</Badge>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-400">
                        {assessment.confidence ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ width: `${Math.round(assessment.confidence)}%` }}
                              />
                            </div>
                            <span className="text-xs">{Math.round(assessment.confidence)}%</span>
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={assessment.status === 'COMPLETED' ? 'bg-green-500' : 'bg-yellow-500'}>
                          {assessment.status === 'COMPLETED' ? 'Concluída' : 'Em progresso'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedAssessment(assessment)
                            setShowAssessmentDialog(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Lessons */}
      {activeTab === 'lessons' && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            {data.lessons.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                Nenhuma aula registrada
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-400">Data/Hora</TableHead>
                    <TableHead className="text-gray-400">Trainer</TableHead>
                    <TableHead className="text-gray-400">Tipo</TableHead>
                    <TableHead className="text-gray-400">Duração</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lessons.map((lesson) => (
                    <TableRow key={lesson.id} className="border-gray-700">
                      <TableCell className="text-white">{formatDateTime(lesson.startedAt)}</TableCell>
                      <TableCell className="text-gray-400">{lesson.trainer.name}</TableCell>
                      <TableCell>
                        <Badge className={lesson.type === 'GROUP' ? 'bg-purple-500' : 'bg-blue-500'}>
                          {lesson.type === 'GROUP' ? 'Grupo' : 'Individual'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-400">{formatDuration(lesson.duration)}</TableCell>
                      <TableCell>
                        {lesson.status === 'COMPLETED' ? (
                          <span className="flex items-center gap-1 text-green-400">
                            <CheckCircle className="h-4 w-4" /> Finalizada
                          </span>
                        ) : lesson.status === 'CANCELLED' ? (
                          <span className="flex items-center gap-1 text-red-400">
                            <XCircle className="h-4 w-4" /> Cancelada
                          </span>
                        ) : (
                          <span className="text-blue-400">Em andamento</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Workouts */}
      {/* Tab: Workouts */}
      {activeTab === 'workouts' && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            {data.workouts.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                Nenhum treino registrado
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-400">Nome</TableHead>
                    <TableHead className="text-gray-400">Blocos Utilizados</TableHead>
                    <TableHead className="text-gray-400">Período</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Criado em</TableHead>
                    <TableHead className="text-gray-400">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.workouts.map((workout) => (
                    <TableRow key={workout.id} className="border-gray-700">
                      <TableCell>
                        <div className="text-white font-medium">{workout.name || 'Sem nome'}</div>
                        <div className="text-xs text-gray-500 mt-1">ID: {workout.id.slice(0, 8)}...</div>
                      </TableCell>
                      <TableCell className="text-gray-400">
                        <div className="flex flex-wrap gap-1">
                          {workout.blocksUsed.length > 0 ? (
                            workout.blocksUsed.slice(0, 3).map((block, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {block}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-500">Nenhum</span>
                          )}
                          {workout.blocksUsed.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{workout.blocksUsed.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-400">
                        {workout.startDate && workout.endDate ? (
                          <div className="text-sm">
                            <div>{formatDate(workout.startDate)}</div>
                            <div className="text-xs text-gray-500">até {formatDate(workout.endDate)}</div>
                          </div>
                        ) : workout.startDate ? (
                          <span className="text-sm">A partir de {formatDate(workout.startDate)}</span>
                        ) : (
                          <span className="text-gray-500">Sem período definido</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={workout.isActive ? 'bg-green-500' : 'bg-gray-500'}>
                          {workout.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-400">
                        <div className="text-sm">{formatDate(workout.createdAt)}</div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedWorkout(workout)
                            setShowWorkoutDialog(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog: Assessment Details */}
      <Dialog open={showAssessmentDialog} onOpenChange={setShowAssessmentDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Detalhes da Avaliação</DialogTitle>
            <DialogDescription className="text-gray-400">
              Avaliação realizada em {selectedAssessment && formatDate(selectedAssessment.createdAt)}
            </DialogDescription>
          </DialogHeader>
          {selectedAssessment && (
            <div className="space-y-4 mt-4">
              {/* Info básica */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400">Avaliador</div>
                  <div className="font-medium">{selectedAssessment.assessor.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Status</div>
                  <Badge className={selectedAssessment.status === 'COMPLETED' ? 'bg-green-500' : 'bg-yellow-500'}>
                    {selectedAssessment.status === 'COMPLETED' ? 'Concluída' : 'Em progresso'}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Data Conclusão</div>
                  <div className="font-medium">
                    {selectedAssessment.completedAt ? formatDate(selectedAssessment.completedAt) : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Nível</div>
                  <div className="font-medium">{getLevelName(selectedAssessment.level)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Confiança</div>
                  <div className="font-medium">
                    {selectedAssessment.confidence ? `${Math.round(selectedAssessment.confidence)}%` : '-'}
                  </div>
                </div>
              </div>

              {/* Resultados Completos */}
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 text-amber-500 mb-2">
                  <ClipboardCheck className="h-5 w-5" />
                  <h3 className="font-medium">Resultados Completos</h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Visualização completa disponível para SuperAdmin para fins de auditoria contratual e licenciamento.
                </p>
                
                {selectedAssessment.status === 'COMPLETED' ? (
                  <div className="space-y-4">
                    {/* Input JSON - Dados da Avaliação */}
                    <div className="bg-indigo-950 rounded-lg p-4 border border-indigo-800">
                      <div className="text-sm font-semibold text-indigo-300 mb-3">📋 Dados da Avaliação (Input)</div>
                      
                      {selectedAssessment.inputJson ? (
                        <>
                          {/* Queixas */}
                          {selectedAssessment.inputJson.complaints && selectedAssessment.inputJson.complaints.length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs text-gray-400 mb-2">🩹 Queixas Relatadas</div>
                              <div className="flex flex-wrap gap-2">
                                {selectedAssessment.inputJson.complaints.map((complaint: string, idx: number) => (
                                  <Badge key={idx} className="bg-orange-600 text-xs">
                                    {complaint}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Mapa de Dor */}
                          {selectedAssessment.inputJson.painMap && Object.keys(selectedAssessment.inputJson.painMap).length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs text-gray-400 mb-3">📍 Mapa de Dor (0-10)</div>
                              <div className="grid grid-cols-2 gap-2">
                                {Object.entries(selectedAssessment.inputJson.painMap).map(([location, intensity]: [string, any]) => (
                                  <div key={location} className="flex items-center justify-between bg-gray-900 rounded p-2">
                                    <span className="text-xs text-gray-300 capitalize">{location.replace(/_/g, ' ')}</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 bg-gray-700 rounded-full h-2">
                                        <div 
                                          className={`h-2 rounded-full ${
                                            intensity >= 7 ? 'bg-red-500' : 
                                            intensity >= 4 ? 'bg-yellow-500' : 
                                            'bg-green-500'
                                          }`}
                                          style={{ width: `${(intensity / 10) * 100}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-bold text-white w-6">{intensity}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Testes de Movimento */}
                          {selectedAssessment.inputJson.movementTests && Object.keys(selectedAssessment.inputJson.movementTests).length > 0 && (
                            <div className="mb-4">
                              <div className="text-xs text-gray-400 mb-3">🏃 Testes de Movimento</div>
                              <div className="space-y-2">
                                {Object.entries(selectedAssessment.inputJson.movementTests).map(([test, data]: [string, any]) => (
                                  <div key={test} className="bg-gray-900 rounded p-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-white capitalize">{test.replace(/_/g, ' ')}</span>
                                      <Badge className={
                                        data.score >= 3 ? 'bg-green-600' : 
                                        data.score === 2 ? 'bg-yellow-600' : 
                                        'bg-red-600'
                                      }>
                                        Score: {data.score}
                                      </Badge>
                                    </div>
                                    {data.observations && (
                                      <p className="text-xs text-gray-400 mt-1">💬 {data.observations}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Nível da Avaliação */}
                          {selectedAssessment.inputJson.level && (
                            <div className="mb-4">
                              <div className="text-xs text-gray-400 mb-2">🎯 Nível Avaliado</div>
                              <Badge className="bg-indigo-600 text-sm">
                                {selectedAssessment.inputJson.level}
                              </Badge>
                            </div>
                          )}

                          {/* Mostrar JSON completo do input (sempre visível para auditoria) */}
                          <details className="mt-4">
                            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                              🔍 Ver dados brutos do input (JSON)
                            </summary>
                            <div className="bg-gray-900 rounded p-3 mt-2">
                              <div className="text-xs font-mono text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                {JSON.stringify(selectedAssessment.inputJson, null, 2)}
                              </div>
                            </div>
                          </details>
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">Nenhum dado de input disponível</p>
                      )}
                    </div>

                    {/* Result JSON - Formatted */}
                    {selectedAssessment.resultJson && (
                      <div className="space-y-4">
                        {/* Confiança e Padrão */}
                        <div className="bg-gray-950 rounded-lg p-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Confiança da Avaliação</div>
                              <div className="flex items-center gap-2">
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                  <div 
                                    className="bg-green-500 h-2 rounded-full" 
                                    style={{ width: `${selectedAssessment.resultJson.confidence}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-white">{selectedAssessment.resultJson.confidence}%</span>
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Padrão Funcional</div>
                              <Badge className="bg-purple-500">
                                {selectedAssessment.resultJson.functionalPattern?.replace(/_/g, ' ') || 'N/A'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Foco Primário e Secundário */}
                        <div className="bg-gray-950 rounded-lg p-4">
                          <div className="mb-3">
                            <div className="text-xs text-gray-500 mb-2">Foco Primário</div>
                            <Badge className="bg-blue-500 text-sm">
                              {selectedAssessment.resultJson.primaryFocus?.replace(/_/g, ' ').toUpperCase() || 'N/A'}
                            </Badge>
                          </div>
                          {selectedAssessment.resultJson.secondaryFocus && selectedAssessment.resultJson.secondaryFocus.length > 0 && (
                            <div>
                              <div className="text-xs text-gray-500 mb-2">Focos Secundários</div>
                              <div className="flex flex-wrap gap-2">
                                {selectedAssessment.resultJson.secondaryFocus.map((focus: string, idx: number) => (
                                  <Badge key={idx} variant="outline" className="border-blue-400 text-blue-400 text-xs">
                                    {focus.replace(/_/g, ' ')}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Blocos Permitidos */}
                        {selectedAssessment.resultJson.allowedBlocks && selectedAssessment.resultJson.allowedBlocks.length > 0 && (
                          <div className="bg-gray-950 rounded-lg p-4">
                            <div className="text-xs text-gray-500 mb-2">
                              ✅ Blocos Permitidos ({selectedAssessment.resultJson.allowedBlocks.length})
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedAssessment.resultJson.allowedBlocks.map((block: string, idx: number) => (
                                <Badge key={idx} className="bg-green-600 text-xs">
                                  {block}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Blocos Bloqueados */}
                        {selectedAssessment.resultJson.blockedBlocks && selectedAssessment.resultJson.blockedBlocks.length > 0 && (
                          <div className="bg-gray-950 rounded-lg p-4">
                            <div className="text-xs text-gray-500 mb-2">
                              🚫 Blocos Bloqueados ({selectedAssessment.resultJson.blockedBlocks.length})
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedAssessment.resultJson.blockedBlocks.map((block: string, idx: number) => (
                                <Badge key={idx} className="bg-red-600 text-xs">
                                  {block}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Recomendações */}
                        {selectedAssessment.resultJson.recommendations && selectedAssessment.resultJson.recommendations.length > 0 && (
                          <div className="bg-gray-950 rounded-lg p-4">
                            <div className="text-xs text-gray-500 mb-2">💡 Recomendações</div>
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                              {selectedAssessment.resultJson.recommendations.map((rec: string, idx: number) => (
                                <li key={idx}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Body Metrics JSON */}
                    {selectedAssessment.bodyMetricsJson && (
                      <div className="bg-gray-950 rounded-lg p-4">
                        <div className="text-xs font-semibold text-amber-400 mb-3">📊 Métricas Corporais</div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {Object.entries(selectedAssessment.bodyMetricsJson).map(([key, value]: [string, any]) => (
                            <div key={key}>
                              <div className="text-xs text-gray-500">{key.replace(/_/g, ' ')}</div>
                              <div className="text-white font-medium">{typeof value === 'object' ? JSON.stringify(value) : value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Avaliação ainda não concluída</p>
                )}
                
                <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-800">
                  ID da avaliação: <span className="font-mono">{selectedAssessment.id}</span>
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Workout Details */}
      <Dialog open={showWorkoutDialog} onOpenChange={setShowWorkoutDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Detalhes do Treino</DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedWorkout?.name || 'Treino sem nome'}
            </DialogDescription>
          </DialogHeader>
          {selectedWorkout && (
            <div className="space-y-4 mt-4">
              {/* Info básica */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400">ID do Treino</div>
                  <div className="font-mono text-sm">{selectedWorkout.id}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Status</div>
                  <Badge className={selectedWorkout.isActive ? 'bg-green-500' : 'bg-gray-500'}>
                    {selectedWorkout.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Data de Início</div>
                  <div className="font-medium">
                    {selectedWorkout.startDate ? formatDate(selectedWorkout.startDate) : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Data de Fim</div>
                  <div className="font-medium">
                    {selectedWorkout.endDate ? formatDate(selectedWorkout.endDate) : '-'}
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-gray-400">Criado em</div>
                  <div className="font-medium">{formatDate(selectedWorkout.createdAt)}</div>
                </div>
              </div>

              {/* Blocos utilizados */}
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 text-amber-500 mb-3">
                  <Dumbbell className="h-5 w-5" />
                  <h3 className="font-medium">Blocos Utilizados ({selectedWorkout.blocksUsed.length})</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedWorkout.blocksUsed.length > 0 ? (
                    selectedWorkout.blocksUsed.map((block: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {block}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">Nenhum bloco vinculado</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
