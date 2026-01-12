'use client'

// ============================================================================
// EXPERT TRAINING - CLIENTS PAGE
// ============================================================================
// Lista de clientes com busca, filtros e ações
// ============================================================================

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ResponsiveTable, FloatingActionButton } from '@/components/ui'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/hooks'

import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ClipboardCheck,
} from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  objectives: string | null
  isActive: boolean
  createdAt: string
  trainerId: string | null
  trainer?: {
    id: string
    name: string
  } | null
  _count?: {
    assessments: number
    workouts: number
  }
}

interface ClientsResponse {
  success: boolean
  data: {
    items: Client[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export default function ClientsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Check permissions
  const isAdmin = user?.role === 'STUDIO_ADMIN'
  const canEdit = (client: Client) => isAdmin || client.trainerId === user?.id
  const canDelete = isAdmin // Only admins can delete

  // Fetch clients
  const fetchClients = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '10',
      })
      if (search) params.set('search', search)

      const res = await fetch(`/api/clients?${params}`)
      const data: ClientsResponse = await res.json()

      if (data.success) {
        setClients(data.data.items)
        setTotalPages(data.data.totalPages)
        setTotal(data.data.total)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [page, search])

  // Delete client
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este aluno?')) return

    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      const data = await res.json()

      if (data.success) {
        fetchClients()
      } else {
        alert(data.error || 'Erro ao excluir cliente')
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Erro ao excluir cliente')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alunos</h1>
          <p className="text-sm text-muted-foreground">
            Gerenciamento de alunos do estúdio
          </p>
        </div>
        <Link href="/clients/new">
          <Button className="gap-2 bg-amber-500 text-accent-foreground hover:bg-amber-600 w-full sm:w-auto hidden md:flex">
            <Plus className="h-4 w-4" />
            Novo Aluno
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar alunos..."
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
          ) : clients.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium text-foreground">
                Nenhum aluno encontrado
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {search
                  ? 'Tente uma busca diferente'
                  : 'Comece cadastrando seu primeiro aluno'}
              </p>
            </div>
          ) : (
            <>
              <div className="responsive-table-wrapper">
                <table className="responsive-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Contato</th>
                      <th>Personal</th>
                      <th>Avaliações</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td data-label="Nome" className="font-medium">
                        <div>
                          {client.name}
                          <span className="block text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                            {client.objectives || '-'}
                          </span>
                        </div>
                      </td>
                      <td data-label="Contato">
                        <div className="text-sm">
                          {client.email && <div>{client.email}</div>}
                          {client.phone && (
                            <div className="text-muted-foreground">{client.phone}</div>
                          )}
                        </div>
                      </td>
                      <td data-label="Personal">
                        <div className="text-sm">
                          {client.trainer?.name || (
                            <span className="text-muted-foreground">Não atribuído</span>
                          )}
                          {client.trainerId === user?.id && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Você
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td data-label="Avaliações">
                        {client._count?.assessments || 0}
                      </td>
                      <td data-label="Status">
                        <Badge
                          variant={client.isActive ? 'default' : 'secondary'}
                        >
                          {client.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                      <td data-label="Ações">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/clients/${client.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Ver detalhes">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Link href={`/assessments/new?clientId=${client.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Nova avaliação">
                              <ClipboardCheck className="h-4 w-4" />
                            </Button>
                          </Link>
                          {canEdit(client) && (
                            <Link href={`/clients/${client.id}/edit`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Excluir"
                              onClick={() => handleDelete(client.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground order-2 sm:order-1">
                    Página {page} de {totalPages}
                  </p>
                  <div className="flex gap-2 order-1 sm:order-2">
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
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
            label: "Novo Aluno",
            onClick: () => router.push('/clients/new')
          }
        ]}
      />
    </div>
  )
}
