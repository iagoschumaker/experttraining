'use client'

// ============================================================================
// EXPERT TRAINING - ASSESSMENTS PAGE
// ============================================================================
// Lista de avaliações com status e ações
// ============================================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ResponsiveTable, FloatingActionButton, ResponsiveHeader, ResponsiveBody, ResponsiveRow, ResponsiveCell, ResponsiveHeaderCell, StatsCard, StatsGrid } from '@/components/ui'
import {
  ClipboardCheck,
  Plus,
  Search,
  Eye,
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  Pencil,
  Trash2,
} from 'lucide-react'

interface Assessment {
  id: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED'
  confidence: number | null
  createdAt: string
  completedAt: string | null
  client: {
    id: string
    name: string
  }
}

interface AssessmentsResponse {
  success: boolean
  data: {
    items: Assessment[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

const statusConfig = {
  PENDING: {
    label: 'Pendente',
    variant: 'outline' as const,
    icon: Clock,
  },
  IN_PROGRESS: {
    label: 'Em Andamento',
    variant: 'secondary' as const,
    icon: AlertCircle,
  },
  COMPLETED: {
    label: 'Concluída',
    variant: 'default' as const,
    icon: CheckCircle,
  },
  ARCHIVED: {
    label: 'Arquivada',
    variant: 'secondary' as const,
    icon: Clock,
  },
}

export default function AssessmentsPage() {
  const router = useRouter()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Fetch assessments
  const fetchAssessments = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
      })

      const res = await fetch(`/api/assessments?${params}`)
      const data: AssessmentsResponse = await res.json()

      if (data.success) {
        setAssessments(data.data.items)
        setTotalPages(data.data.totalPages)
        setTotal(data.data.total)
      }
    } catch (error) {
      console.error('Error fetching assessments:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssessments()
  }, [page])

  // Delete assessment
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta avaliação?')) return

    setDeleting(id)
    try {
      const res = await fetch(`/api/studio/assessments/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchAssessments()
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao excluir avaliação')
      }
    } catch (error) {
      console.error('Error deleting assessment:', error)
      alert('Erro ao excluir avaliação')
    } finally {
      setDeleting(null)
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get assessment code (sequential number / total for client)
  const getAssessmentCode = (assessment: Assessment) => {
    const clientAssessments = assessments
      .filter(a => a.client.id === assessment.client.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    
    const index = clientAssessments.findIndex(a => a.id === assessment.id)
    const total = clientAssessments.length
    
    return `${String(index + 1).padStart(2, '0')}/${String(total).padStart(2, '0')}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Avaliações</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as avaliações funcionais dos alunos
          </p>
        </div>
        <Link href="/assessments/new">
          <Button className="gap-2 bg-amber-500 text-accent-foreground hover:bg-amber-600 hidden md:flex">
            <Plus className="h-4 w-4" />
            Nova Avaliação
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <StatsGrid columns={3}>
        <StatsCard
          title="Total"
          value={total}
          icon={<ClipboardCheck className="h-4 w-4" />}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-500/10"
        />
        <StatsCard
          title="Pendentes"
          value={assessments.filter((a) => a.status === 'PENDING').length}
          icon={<Clock className="h-4 w-4" />}
          iconColor="text-yellow-500"
          iconBgColor="bg-yellow-500/10"
        />
        <StatsCard
          title="Concluídas"
          value={assessments.filter((a) => a.status === 'COMPLETED').length}
          icon={<CheckCircle className="h-4 w-4" />}
          iconColor="text-green-500"
          iconBgColor="bg-green-500/10"
        />
      </StatsGrid>

      {/* List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar avaliações..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : assessments.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium text-foreground">
                Nenhuma avaliação encontrada
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Comece criando uma nova avaliação
              </p>
              <Link href="/assessments/new">
                <Button className="mt-4 bg-amber-500 hover:bg-amber-600 text-black">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Avaliação
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <ResponsiveTable>
                <ResponsiveHeader>
                  <tr>
                    <ResponsiveHeaderCell>Código</ResponsiveHeaderCell>
                    <ResponsiveHeaderCell>Aluno</ResponsiveHeaderCell>
                    <ResponsiveHeaderCell>Data</ResponsiveHeaderCell>
                    <ResponsiveHeaderCell>Status</ResponsiveHeaderCell>
                    <ResponsiveHeaderCell className="text-right">Ações</ResponsiveHeaderCell>
                  </tr>
                </ResponsiveHeader>
                <ResponsiveBody>
                  {assessments.map((assessment) => {
                    const config = statusConfig[assessment.status]
                    const StatusIcon = config.icon

                    return (
                      <ResponsiveRow key={assessment.id}>
                        <ResponsiveCell label="Código" priority="high" className="font-mono font-semibold text-amber-600">
                          {getAssessmentCode(assessment)}
                        </ResponsiveCell>
                        <ResponsiveCell label="Aluno" priority="high" className="font-medium">
                          <Link
                            href={`/clients/${assessment.client.id}`}
                            className="hover:underline"
                          >
                            {assessment.client.name}
                          </Link>
                        </ResponsiveCell>
                        <ResponsiveCell label="Data" priority="medium">{formatDate(assessment.createdAt)}</ResponsiveCell>
                        <ResponsiveCell label="Status" priority="high">
                          <Badge variant={config.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                        </ResponsiveCell>
                        <ResponsiveCell label="Ações" priority="high" className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/assessments/${assessment.id}`}
                            >
                              <Button variant="ghost" size="icon" title="Visualizar">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            {assessment.status === 'PENDING' && (
                              <Link
                                href={`/assessments/${assessment.id}/input`}
                              >
                                <Button variant="ghost" size="icon" title="Preencher">
                                  <Play className="h-4 w-4 text-green-500" />
                                </Button>
                              </Link>
                            )}
                            <Link
                              href={`/assessments/${assessment.id}/input`}
                            >
                              <Button variant="ghost" size="icon" title="Editar">
                                <Pencil className="h-4 w-4 text-blue-500" />
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Excluir"
                              onClick={() => handleDelete(assessment.id)}
                              disabled={deleting === assessment.id}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </ResponsiveCell>
                      </ResponsiveRow>
                    )
                  })}
                </ResponsiveBody>
              </ResponsiveTable>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Página {page} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
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
      
      {/* FAB para mobile */}
      <FloatingActionButton
        actions={[
          {
            icon: <Plus className="h-5 w-5" />,
            label: "Nova Avaliação",
            onClick: () => router.push('/assessments/new')
          }
        ]}
      />
    </div>
  )
}
