'use client'

// ============================================================================
// EXPERT TRAINING - SUPERADMIN STUDIO DETAILS PAGE
// ============================================================================
// Visão completa do studio para auditoria e controle anti-burla
// Abas: Visão Geral, Trainers, Alunos
// ============================================================================

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Building2,
  Users,
  UserCheck,
  Calendar,
  ClipboardCheck,
  AlertTriangle,
  TrendingUp,
  Clock,
  Search,
  ExternalLink,
} from 'lucide-react'

interface StudioData {
  id: string
  name: string
  slug: string
  status: 'ACTIVE' | 'SUSPENDED'
  plan: { 
    id: string
    name: string
    minTrainers: number
    recommendedMax: number | null
    pricePerTrainer: number
  } | null
  metrics: {
    totalLessons: number
    lessonsThisMonth: number
    completedLessons: number
    totalAssessments: number
    assessmentsThisMonth: number
    totalClients: number
    activeClients: number
    totalTrainers: number
    activeTrainers: number
    avgLessonsPerWeek: number
    lastActivity: string | null
  }
  alerts: string[]
}

interface Trainer {
  id: string
  userId: string
  name: string
  email: string
  role: string
  isActive: boolean
  metrics: {
    clients: number
    lessonsTotal: number
    lessonsThisMonth: number
    assessmentsTotal: number
    assessmentsThisMonth: number
    lastActivity: string | null
  }
}

interface Aluno {
  id: string
  name: string
  email: string
  status: string
  trainer: { id: string; name: string } | null
  metrics: {
    totalAssessments: number
    totalLessons: number
    lastAssessment: string | null
    lastLesson: string | null
  }
}

type TabType = 'overview' | 'trainers' | 'alunos'

export default function StudioDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const studioId = params.id as string

  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [studio, setStudio] = useState<StudioData | null>(null)
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTab, setLoadingTab] = useState(false)

  // Filters for alunos
  const [alunoSearch, setAlunoSearch] = useState('')
  const [alunoTrainerFilter, setAlunoTrainerFilter] = useState('all')
  const [alunoStatusFilter, setAlunoStatusFilter] = useState('all')
  const [alunoPage, setAlunoPage] = useState(1)
  const [alunoTotalPages, setAlunoTotalPages] = useState(1)

  // Fetch studio details
  const fetchStudio = async () => {
    try {
      const res = await fetch(`/api/superadmin/studios/${studioId}`)
      const data = await res.json()
      if (data.success) {
        setStudio(data.data)
      } else {
        router.push('/superadmin/studios')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch trainers
  const fetchTrainers = async () => {
    setLoadingTab(true)
    try {
      const res = await fetch(`/api/superadmin/studios/${studioId}/trainers`)
      const data = await res.json()
      if (data.success) {
        setTrainers(data.data.items)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoadingTab(false)
    }
  }

  // Fetch alunos
  const fetchAlunos = async () => {
    setLoadingTab(true)
    try {
      const params = new URLSearchParams({
        page: alunoPage.toString(),
        pageSize: '20',
      })
      if (alunoSearch) params.set('search', alunoSearch)
      if (alunoTrainerFilter && alunoTrainerFilter !== 'all') params.set('trainerId', alunoTrainerFilter)
      if (alunoStatusFilter && alunoStatusFilter !== 'all') params.set('status', alunoStatusFilter)

      const res = await fetch(`/api/superadmin/studios/${studioId}/alunos?${params}`)
      const data = await res.json()
      if (data.success) {
        setAlunos(data.data.items)
        setAlunoTotalPages(data.data.totalPages)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoadingTab(false)
    }
  }

  useEffect(() => {
    fetchStudio()
  }, [studioId])

  useEffect(() => {
    if (activeTab === 'trainers') {
      fetchTrainers()
    } else if (activeTab === 'alunos') {
      fetchAlunos()
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'alunos') {
      fetchAlunos()
    }
  }, [alunoSearch, alunoTrainerFilter, alunoStatusFilter, alunoPage])

  const formatDate = (date: string | null) => {
    if (!date) return 'Nunca'
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 bg-gray-700" />
        <Skeleton className="h-[400px] w-full bg-gray-700" />
      </div>
    )
  }

  if (!studio) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/superadmin/studios">
            <Button variant="ghost" size="icon" className="hover:bg-gray-700">
              <ArrowLeft className="h-4 w-4 text-gray-400" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{studio.name}</h1>
              <Badge className={studio.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500'}>
                {studio.status === 'ACTIVE' ? 'Ativo' : 'Suspenso'}
              </Badge>
            </div>
            <p className="text-sm text-gray-400">
              {studio.plan?.name || 'Sem plano'} • {studio.slug}
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {studio.alerts.length > 0 && (
        <Card className="bg-red-900/20 border-red-800">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-400 mb-1">Alertas</h4>
                <ul className="space-y-1">
                  {studio.alerts.map((alert, i) => (
                    <li key={i} className="text-sm text-red-300">{alert}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {[
          { id: 'overview', label: 'Visão Geral', icon: Building2 },
          { id: 'trainers', label: 'Trainers', icon: Users },
          { id: 'alunos', label: 'Alunos', icon: UserCheck },
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            className={activeTab === tab.id ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'}
            onClick={() => setActiveTab(tab.id as TabType)}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Trainers</CardTitle>
                <Users className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{studio.metrics.totalTrainers}</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Alunos</CardTitle>
                <UserCheck className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">
                  {studio.metrics.activeClients}
                  <span className="text-sm text-gray-500 ml-1">/ {studio.metrics.totalClients}</span>
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
                <div className={`text-2xl font-bold ${studio.metrics.lessonsThisMonth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {studio.metrics.lessonsThisMonth}
                </div>
                <p className="text-xs text-gray-500 mt-1">{studio.metrics.avgLessonsPerWeek} por semana</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">Avaliações (mês)</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{studio.metrics.assessmentsThisMonth}</div>
                <p className="text-xs text-gray-500 mt-1">{studio.metrics.totalAssessments} total</p>
              </CardContent>
            </Card>
          </div>

          {/* Usage Indicator */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                Indicador de Uso
              </CardTitle>
              <CardDescription className="text-gray-400">
                Análise de uso real vs cadastro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Aulas por aluno (mês)</span>
                      <span className="text-white font-medium">
                        {studio.metrics.totalClients > 0 
                          ? (studio.metrics.lessonsThisMonth / studio.metrics.totalClients).toFixed(1)
                          : 0}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full">
                      <div 
                        className="h-2 bg-amber-500 rounded-full"
                        style={{ width: `${Math.min(100, (studio.metrics.lessonsThisMonth / Math.max(studio.metrics.totalClients, 1)) * 25)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">Alunos com avaliação</span>
                      <span className="text-white font-medium">
                        {studio.metrics.totalClients > 0 
                          ? Math.round((studio.metrics.totalAssessments / studio.metrics.totalClients) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full">
                      <div 
                        className="h-2 bg-green-500 rounded-full"
                        style={{ width: `${Math.min(100, (studio.metrics.totalAssessments / Math.max(studio.metrics.totalClients, 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-center">
                    <div className="flex items-center gap-2 text-gray-400 mb-2">
                      <Clock className="h-4 w-4" />
                      Última atividade
                    </div>
                    <div className="text-xl font-medium text-white">
                      {formatDate(studio.metrics.lastActivity)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Trainers */}
      {activeTab === 'trainers' && (
        <div className="space-y-4">
          {/* Plan Limits Info Card */}
          {studio?.plan && (
            <Card className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border-amber-500/30">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-amber-400">
                        Plano: {studio.plan.name}
                      </h3>
                      <Badge className={
                        (studio.metrics.activeTrainers || 0) >= studio.plan.minTrainers
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }>
                        {studio.metrics.activeTrainers || 0} / {studio.plan.minTrainers} trainers ativos
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <p className="text-gray-400 mb-1">Trainers Cadastrados</p>
                        <p className="text-white font-medium text-base">{trainers.length}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Trainers Ativos</p>
                        <p className="text-green-400 font-medium text-base">
                          {trainers.filter(t => t.isActive).length}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 mb-1">Limite do Plano</p>
                        <p className="text-amber-400 font-medium text-base">
                          Mín: {studio.plan.minTrainers}
                          {studio.plan.recommendedMax && ` • Máx: ${studio.plan.recommendedMax}`}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-amber-500/20">
                      <p className="text-xs text-amber-300">
                        💡 <strong>Importante:</strong> O limite do plano é para trainers <strong>ATIVOS</strong>, não cadastrados. 
                        Você pode ter vários trainers cadastrados, mas apenas os que o plano cobrir poderão estar ativos.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Trainers do Studio</CardTitle>
              <CardDescription className="text-gray-400">
                {trainers.length} trainer(s) cadastrado(s) • {trainers.filter(t => t.isActive).length} ativo(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTab ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full bg-gray-700" />)}
                </div>
              ) : trainers.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  Nenhum trainer cadastrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-400">Nome</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400">Role</TableHead>
                      <TableHead className="text-gray-400">Alunos</TableHead>
                      <TableHead className="text-gray-400">Aulas (mês)</TableHead>
                      <TableHead className="text-gray-400">Avaliações (mês)</TableHead>
                      <TableHead className="text-gray-400">Última Atividade</TableHead>
                      <TableHead className="text-gray-400 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trainers.map((t) => (
                      <TableRow key={t.id} className="border-gray-700">
                        <TableCell>
                          <div>
                            <div className="font-medium text-white">{t.name}</div>
                            <div className="text-xs text-gray-500">{t.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={t.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                            {t.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={t.role === 'STUDIO_ADMIN' ? 'bg-purple-500' : 'bg-blue-500'}>
                            {t.role === 'STUDIO_ADMIN' ? 'Admin' : 'Trainer'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-400">{t.metrics.clients}</TableCell>
                        <TableCell>
                          <span className={t.metrics.lessonsThisMonth > 0 ? 'text-green-400' : 'text-red-400'}>
                            {t.metrics.lessonsThisMonth}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-400">{t.metrics.assessmentsThisMonth}</TableCell>
                        <TableCell className="text-gray-400 text-sm">
                          {formatDate(t.metrics.lastActivity)}
                        </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/superadmin/studios/${studioId}/trainers/${t.userId}`}>
                          <Button variant="ghost" size="icon" className="hover:bg-gray-700">
                            <ExternalLink className="h-4 w-4 text-amber-500" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        </div>
      )}

      {/* Tab: Alunos */}
      {activeTab === 'alunos' && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar aluno..."
                    value={alunoSearch}
                    onChange={(e) => { setAlunoSearch(e.target.value); setAlunoPage(1) }}
                    className="pl-10 bg-gray-900 border-gray-700 text-white"
                  />
                </div>
              </div>
              <Select value={alunoTrainerFilter} onValueChange={(v) => { setAlunoTrainerFilter(v); setAlunoPage(1) }}>
                <SelectTrigger className="w-[180px] bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Trainer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {trainers.map((t) => (
                    <SelectItem key={t.userId} value={t.userId}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={alunoStatusFilter} onValueChange={(v) => { setAlunoStatusFilter(v); setAlunoPage(1) }}>
                <SelectTrigger className="w-[150px] bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ACTIVE">Ativo</SelectItem>
                  <SelectItem value="INACTIVE">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTab ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full bg-gray-700" />)}
              </div>
            ) : alunos.length === 0 ? (
              <div className="py-8 text-center text-gray-400">
                Nenhum aluno encontrado
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-400">Nome</TableHead>
                      <TableHead className="text-gray-400">Trainer</TableHead>
                      <TableHead className="text-gray-400">Avaliações</TableHead>
                      <TableHead className="text-gray-400">Última Avaliação</TableHead>
                      <TableHead className="text-gray-400">Aulas</TableHead>
                      <TableHead className="text-gray-400">Última Presença</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alunos.map((a) => (
                      <TableRow key={a.id} className="border-gray-700">
                        <TableCell>
                          <div>
                            <div className="font-medium text-white">{a.name}</div>
                            <div className="text-xs text-gray-500">{a.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-400">{a.trainer?.name || '-'}</TableCell>
                        <TableCell className="text-gray-400">{a.metrics.totalAssessments}</TableCell>
                        <TableCell className="text-gray-400 text-sm">{formatDate(a.metrics.lastAssessment)}</TableCell>
                        <TableCell className="text-gray-400">{a.metrics.totalLessons}</TableCell>
                        <TableCell className="text-gray-400 text-sm">{formatDate(a.metrics.lastLesson)}</TableCell>
                        <TableCell>
                          <Badge className={a.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-500'}>
                            {a.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/superadmin/studios/${studioId}/alunos/${a.id}`}>
                            <Button variant="ghost" size="icon" className="hover:bg-gray-700">
                              <ExternalLink className="h-4 w-4 text-amber-500" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {alunoTotalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-400">Página {alunoPage} de {alunoTotalPages}</p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setAlunoPage((p) => Math.max(1, p - 1))} 
                        disabled={alunoPage === 1}
                        className="border-gray-700"
                      >
                        Anterior
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setAlunoPage((p) => Math.min(alunoTotalPages, p + 1))} 
                        disabled={alunoPage === alunoTotalPages}
                        className="border-gray-700"
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
