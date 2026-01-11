'use client'

// ============================================================================
// EXPERT TRAINING - SUPERADMIN TRAINER DETAILS PAGE
// ============================================================================
// Visão detalhada do trainer para auditoria
// Mostra: alunos atendidos, aulas, avaliações, frequência
// ============================================================================

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  CheckCircle,
  XCircle,
} from 'lucide-react'

interface TrainerData {
  trainer: {
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
    createdAt: string
  }
  studio: {
    id: string
    name: string
  }
  clients: Array<{
    id: string
    name: string
    status: string
    createdAt: string
  }>
  lessons: Array<{
    id: string
    type: string
    status: string
    startedAt: string
    endedAt: string | null
    duration: number | null
    clients: Array<{
      client: { id: string; name: string }
    }>
  }>
  assessments: Array<{
    id: string
    status: string
    createdAt: string
    completedAt: string | null
    client: { id: string; name: string }
  }>
  metrics: {
    totalClients: number
    activeClients: number
    totalLessons: number
    lessonsThisMonth: number
    lessonsThisWeek: number
    weeklyAverage: number
    totalAssessments: number
    assessmentsThisMonth: number
    lastActivity: string | null
  }
}

export default function TrainerDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const studioId = params.id as string
  const trainerId = params.trainerId as string

  const [data, setData] = useState<TrainerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'clients' | 'lessons' | 'assessments'>('clients')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/superadmin/studios/${studioId}/trainers/${trainerId}`)
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
  }, [studioId, trainerId])

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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 bg-gray-700" />
        <Skeleton className="h-[400px] w-full bg-gray-700" />
      </div>
    )
  }

  if (!data) return null

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
            <h1 className="text-2xl font-bold text-white">{data.trainer.name}</h1>
            <Badge className={data.trainer.role === 'STUDIO_ADMIN' ? 'bg-purple-500' : 'bg-blue-500'}>
              {data.trainer.role === 'STUDIO_ADMIN' ? 'Admin' : 'Trainer'}
            </Badge>
            {!data.trainer.isActive && (
              <Badge className="bg-red-500">Inativo</Badge>
            )}
          </div>
          <p className="text-sm text-gray-400">
            {data.trainer.email} • {data.studio.name}
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Alunos</CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {data.metrics.activeClients}
              <span className="text-sm text-gray-500 ml-1">/ {data.metrics.totalClients}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">ativos / total</p>
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
            <p className="text-xs text-gray-500 mt-1">{data.metrics.lessonsThisWeek} esta semana</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Média Semanal</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.metrics.weeklyAverage}</div>
            <p className="text-xs text-gray-500 mt-1">aulas por semana</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Avaliações (mês)</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.metrics.assessmentsThisMonth}</div>
            <p className="text-xs text-gray-500 mt-1">{data.metrics.totalAssessments} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Última Atividade</CardTitle>
            <CardDescription className="text-gray-400">
              {data.metrics.lastActivity 
                ? formatDateTime(data.metrics.lastActivity)
                : 'Nenhuma atividade registrada'}
            </CardDescription>
          </div>
          <Clock className="h-5 w-5 text-gray-500" />
        </CardHeader>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {[
          { id: 'clients', label: 'Alunos Atendidos', count: data.clients.length },
          { id: 'lessons', label: 'Histórico de Aulas', count: data.lessons.length },
          { id: 'assessments', label: 'Avaliações', count: data.assessments.length },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            className={activeTab === tab.id ? 'bg-amber-500 text-black' : 'text-gray-400'}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
          >
            {tab.label}
            <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-gray-700">
              {tab.count}
            </span>
          </Button>
        ))}
      </div>

      {/* Tab Content: Clients */}
      {activeTab === 'clients' && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            {data.clients.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                Nenhum aluno atribuído a este trainer
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-400">Nome</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Cadastrado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.clients.map((client) => (
                    <TableRow key={client.id} className="border-gray-700">
                      <TableCell className="font-medium text-white">{client.name}</TableCell>
                      <TableCell>
                        <Badge className={client.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-500'}>
                          {client.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-400">{formatDate(client.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab Content: Lessons */}
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
                    <TableHead className="text-gray-400">Tipo</TableHead>
                    <TableHead className="text-gray-400">Alunos</TableHead>
                    <TableHead className="text-gray-400">Duração</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lessons.map((lesson) => (
                    <TableRow key={lesson.id} className="border-gray-700">
                      <TableCell className="text-white">{formatDateTime(lesson.startedAt)}</TableCell>
                      <TableCell>
                        <Badge className={lesson.type === 'GROUP' ? 'bg-purple-500' : 'bg-blue-500'}>
                          {lesson.type === 'GROUP' ? 'Grupo' : 'Individual'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-400">
                        {lesson.clients.map((c) => c.client.name).join(', ')}
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

      {/* Tab Content: Assessments */}
      {activeTab === 'assessments' && (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            {data.assessments.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                Nenhuma avaliação realizada
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-400">Data</TableHead>
                    <TableHead className="text-gray-400">Aluno</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Concluída em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.assessments.map((assessment) => (
                    <TableRow key={assessment.id} className="border-gray-700">
                      <TableCell className="text-white">{formatDate(assessment.createdAt)}</TableCell>
                      <TableCell className="text-gray-400">{assessment.client.name}</TableCell>
                      <TableCell>
                        <Badge className={assessment.status === 'COMPLETED' ? 'bg-green-500' : 'bg-yellow-500'}>
                          {assessment.status === 'COMPLETED' ? 'Concluída' : 'Em progresso'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-400">{formatDate(assessment.completedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
