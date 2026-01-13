'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FloatingActionButton } from '@/components/ui'
import { Dumbbell, Plus, Search, Eye, FileText } from 'lucide-react'

interface Workout {
  id: string
  name: string
  description: string | null
  createdAt: string
  client: {
    id: string
    name: string
  }
  assessment: {
    id: string
    completedAt: string | null
  } | null
}

interface WorkoutsResponse {
  success: boolean
  data: {
    items: Workout[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export default function WorkoutsPage() {
  const router = useRouter()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchWorkouts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
      })

      const res = await fetch(`/api/workouts?${params}`)
      const data: WorkoutsResponse = await res.json()

      if (data.success) {
        setWorkouts(data.data.items)
        setTotalPages(data.data.totalPages)
        setTotal(data.data.total)
      }
    } catch (error) {
      console.error('Error fetching workouts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkouts()
  }, [page])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Treinos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os treinos criados para os alunos
          </p>
        </div>
        <Link href="/workouts/generate" className="hidden md:block">
          <Button className="gap-2 bg-amber-500 text-accent-foreground hover:bg-amber-600">
            <Plus className="h-4 w-4" />
            Novo Treino
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Treinos
            </CardTitle>
            <Dumbbell className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Com Avaliação
            </CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {workouts.filter(w => w.assessment?.completedAt).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {workouts.filter(w => !w.assessment?.completedAt).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Lista de Treinos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar treinos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 bg-background border-border"
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full bg-muted" />
              ))}
            </div>
          ) : workouts.length === 0 ? (
            <div className="py-12 text-center">
              <Dumbbell className="mx-auto h-12 w-12 text-muted" />
              <h3 className="mt-4 text-lg font-medium text-foreground">
                Nenhum treino encontrado
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Crie seu primeiro treino para começar
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {workouts.map((workout) => (
                <div
                  key={workout.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium text-foreground">{workout.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Cliente: {workout.client.name}
                      </p>
                      {workout.description && (
                        <p className="text-sm text-muted-foreground">
                          {workout.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Criado em {formatDate(workout.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {workout.assessment?.completedAt ? (
                        <span className="text-xs bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-1 rounded-full">
                          Com Avaliação
                        </span>
                      ) : (
                        <span className="text-xs bg-orange-500/10 text-orange-500 border border-orange-500/20 px-2 py-1 rounded-full">
                          Pendente
                        </span>
                      )}
                      <Link href={`/workouts/${workout.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="border-border"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="border-border"
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <FloatingActionButton 
        actions={[
          {
            label: 'Novo Treino',
            onClick: () => router.push('/workouts/generate'),
            icon: <Plus className="h-5 w-5" />
          }
        ]}
      />
    </div>
  )
}
