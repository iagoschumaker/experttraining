'use client'

// ============================================================================
// EXPERT PRO TRAINING - RESULTS PAGE
// ============================================================================
// Página de resultados - histórico de avaliações do cliente
// ============================================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCard, StatsGrid } from '@/components/ui'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart3,
  Search,
  Eye,
  TrendingUp,
  Calendar,
  Target,
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

export default function ResultsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Fetch completed assessments
  useEffect(() => {
    const fetchAssessments = async () => {
      try {
        const res = await fetch('/api/assessments?status=COMPLETED&pageSize=50')
        const data = await res.json()

        if (data.success) {
          setAssessments(data.data.items)
        }
      } catch (error) {
        console.error('Error fetching assessments:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAssessments()
  }, [])

  // Format date with time
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Filter by search
  const filteredAssessments = assessments.filter((a) =>
    a.client.name.toLowerCase().includes(search.toLowerCase())
  )

  // Stats
  const avgConfidence =
    assessments.length > 0
      ? Math.round(
          assessments.reduce((acc, a) => acc + (a.confidence || 0), 0) /
            assessments.length
        )
      : 0

  const thisMonth = assessments.filter((a) => {
    const date = new Date(a.completedAt || a.createdAt)
    const now = new Date()
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    )
  }).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Resultados</h1>
        <p className="text-sm text-muted-foreground">
          Histórico de avaliações concluídas
        </p>
      </div>

      {/* Stats */}
      <StatsGrid columns={3}>
        <StatsCard
          title="Total Avaliações"
          value={assessments.length}
          icon={<BarChart3 className="h-4 w-4" />}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-500/10"
        />
        <StatsCard
          title="Este Mês"
          value={thisMonth}
          icon={<Calendar className="h-4 w-4" />}
          iconColor="text-amber-500"
          iconBgColor="bg-amber-500/10"
        />
        <StatsCard
          title="Tendência"
          value="+12%"
          subtitle="vs. mês anterior"
          icon={<TrendingUp className="h-4 w-4" />}
          iconColor="text-green-500"
          iconBgColor="bg-green-500/10"
        />
      </StatsGrid>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar por cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="py-12 text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-foreground">
                Nenhum resultado encontrado
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {search
                  ? 'Tente uma busca diferente'
                  : 'Complete avaliações para ver os resultados aqui'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAssessments.map((assessment) => (
                <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {assessment.client.name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        {formatDate(
                          assessment.completedAt || assessment.createdAt
                        )}
                      </span>
                      <Link href={`/assessments/${assessment.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="mr-1 h-4 w-4" />
                          Ver
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
