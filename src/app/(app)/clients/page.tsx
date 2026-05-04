'use client'

// ============================================================================
// EXPERT PRO TRAINING - CLIENTS PAGE
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
import { ResponsiveTable, FloatingActionButton, StatsCard, StatsGrid } from '@/components/ui'
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
  AlertTriangle,
  Cake,
  Gift,
  Calendar,
} from 'lucide-react'

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  objectives: string | null
  isActive: boolean
  createdAt: string
  birthDate: string | null
  trainerId: string | null
  trainer?: {
    id: string
    name: string
  } | null
  _count?: {
    assessments: number
    workouts: number
  }
  assessments?: { createdAt: string }[]
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
  const [activeTab, setActiveTab] = useState<'all' | 'birthdays'>('all')
  const [allClients, setAllClients] = useState<Client[]>([])
  const [loadingBirthdays, setLoadingBirthdays] = useState(false)

  // Check permissions
  const isAdmin = user?.role === 'STUDIO_ADMIN'
  const canEdit = (client: Client) => isAdmin || client.trainerId === user?.id
  const canDelete = isAdmin // Only admins can delete

  // Check if client needs reassessment (61+ days since last assessment)
  const needsReassessment = (client: Client) => {
    if (!client.assessments || client.assessments.length === 0) return false
    const lastDate = new Date(client.assessments[0].createdAt)
    const diffDays = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 61
  }
  const daysSinceAssessment = (client: Client) => {
    if (!client.assessments || client.assessments.length === 0) return null
    return Math.floor((Date.now() - new Date(client.assessments[0].createdAt).getTime()) / (1000 * 60 * 60 * 24))
  }

  // Birthday check — compares only month+day (ignores year)
  const isBirthdayToday = (client: Client) => {
    if (!client.birthDate) return false
    const today = new Date()
    const bd = new Date(client.birthDate)
    return bd.getMonth() === today.getMonth() && bd.getDate() === today.getDate()
  }

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

  // Fetch all clients for birthday tab
  const fetchAllClientsForBirthdays = async () => {
    if (allClients.length > 0) return // cache
    setLoadingBirthdays(true)
    try {
      const res = await fetch('/api/clients?pageSize=500&page=1')
      const data: ClientsResponse = await res.json()
      if (data.success) setAllClients(data.data.items)
    } catch { console.error('Error fetching clients for birthdays') }
    finally { setLoadingBirthdays(false) }
  }

  useEffect(() => {
    if (activeTab === 'birthdays') fetchAllClientsForBirthdays()
  }, [activeTab])

  // Birthday helpers
  const getBirthdayClients = () => {
    const now = new Date()
    return allClients
      .filter(c => c.birthDate)
      .map(c => {
        const bd = new Date(c.birthDate!)
        const thisYearBd = new Date(now.getFullYear(), bd.getMonth(), bd.getDate())
        if (thisYearBd.getTime() < now.getTime() - 86400000) thisYearBd.setFullYear(now.getFullYear() + 1)
        const daysUntil = Math.floor((thisYearBd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const age = thisYearBd.getFullYear() - bd.getFullYear()
        return { ...c, daysUntil: daysUntil < 0 ? 0 : daysUntil, age, bdMonth: bd.getMonth(), bdDay: bd.getDate() }
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
  }

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
      </div>

      {/* Birthday Banner */}
      {(() => {
        const birthdayKids = clients.filter(isBirthdayToday)
        if (birthdayKids.length === 0) return null
        return (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-pink-500/30 bg-pink-500/10">
            <span className="text-2xl flex-shrink-0">🎂</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-pink-500">Aniversário hoje!</p>
              <p className="text-xs text-muted-foreground">
                {birthdayKids.map(c => c.name).join(', ')}
              </p>
            </div>
          </div>
        )
      })()}

      {/* Stats */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Total de Alunos"
          value={total}
          icon={<Users className="h-4 w-4" />}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-500/10"
        />
      </StatsGrid>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === 'all' ? 'bg-blue-500/10 text-blue-400 border-b-2 border-blue-500' : 'text-muted-foreground hover:text-foreground'
          }`}>
          <Users className="h-4 w-4" /> Todos
        </button>
        <button
          onClick={() => setActiveTab('birthdays')}
          className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
            activeTab === 'birthdays' ? 'bg-pink-500/10 text-pink-400 border-b-2 border-pink-500' : 'text-muted-foreground hover:text-foreground'
          }`}>
          <Cake className="h-4 w-4" /> Aniversários
        </button>
      </div>

      {/* TAB: Todos */}
      {activeTab === 'all' && (
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
              {/* Mobile: Cards */}
              <div className="md:hidden space-y-3">
                {clients.map((client) => (
                  <div key={client.id} className="p-4 border rounded-lg bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{client.name}</div>
                          {isBirthdayToday(client) && (
                            <span title="Aniversário hoje!">🎂</span>
                          )}
                          {needsReassessment(client) && (
                            <span title={`${daysSinceAssessment(client)} dias sem avaliação`}>
                              <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{client.email || client.phone || '-'}</div>
                      </div>
                      <Badge variant={client.isActive ? 'default' : 'secondary'}>
                        {client.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div><span className="text-muted-foreground">Personal:</span> {client.trainer?.name || '-'}</div>
                      <div><span className="text-muted-foreground">Avaliações:</span> {client._count?.assessments || 0}</div>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/clients/${client.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="h-4 w-4 mr-1" /> Ver
                        </Button>
                      </Link>
                      <Link href={`/assessments/new?clientId=${client.id}`}>
                        <Button variant="ghost" size="icon"><ClipboardCheck className="h-4 w-4" /></Button>
                      </Link>
                      {canEdit(client) && (
                        <Link href={`/clients/${client.id}/edit`}>
                          <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop: Table */}
              <div className="hidden md:block">
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
                          <div className="flex items-center gap-2">
                            <div>
                              {client.name}
                              {isBirthdayToday(client) && <span className="ml-1" title="Aniversário hoje!">🎂</span>}
                              <span className="block text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                                {client.objectives || '-'}
                              </span>
                            </div>
                            {needsReassessment(client) && (
                              <span title={`${daysSinceAssessment(client)} dias sem avaliação`}>
                                <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse flex-shrink-0" />
                              </span>
                            )}
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
      )}

      {/* TAB: Aniversários */}
      {activeTab === 'birthdays' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Cake className="h-5 w-5 text-pink-500" />
              Aniversários dos Alunos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingBirthdays ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14" />)}</div>
            ) : (() => {
              const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
              const bClients = getBirthdayClients()
              const noDate = allClients.filter(c => !c.birthDate)

              if (bClients.length === 0 && noDate.length === 0) {
                return <p className="text-center py-8 text-muted-foreground text-sm">Nenhum aluno com data de nascimento cadastrada</p>
              }

              // Group by daysUntil categories
              const today = bClients.filter(c => c.daysUntil === 0)
              const thisWeek = bClients.filter(c => c.daysUntil > 0 && c.daysUntil <= 7)
              const thisMonth = bClients.filter(c => c.daysUntil > 7 && c.daysUntil <= 30)
              const later = bClients.filter(c => c.daysUntil > 30)

              const Section = ({ title, icon, clients, color }: { title: string; icon: string; clients: typeof bClients; color: string }) => {
                if (clients.length === 0) return null
                return (
                  <div className="mb-6">
                    <h3 className={`text-sm font-semibold ${color} mb-2 flex items-center gap-2`}>
                      <span>{icon}</span> {title}
                      <Badge className="bg-muted text-muted-foreground text-[10px]">{clients.length}</Badge>
                    </h3>
                    <div className="space-y-1">
                      {clients.map(c => (
                        <Link key={c.id} href={`/clients/${c.id}`}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                            c.daysUntil === 0 ? 'border-pink-500/50 bg-pink-500/5' : 'border-border'
                          }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                              c.daysUntil === 0 ? 'bg-pink-500/20' : c.daysUntil <= 7 ? 'bg-amber-500/10' : 'bg-muted'
                            }`}>
                              <span className="text-base">{c.daysUntil === 0 ? '🎂' : c.daysUntil <= 7 ? '🎉' : '🎁'}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{c.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(c.birthDate!).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                                {c.age > 0 && ` · Faz ${c.age} anos`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {c.daysUntil === 0 ? (
                              <Badge className="bg-pink-500/20 text-pink-400">Hoje!</Badge>
                            ) : c.daysUntil === 1 ? (
                              <Badge className="bg-amber-500/20 text-amber-400">Amanhã</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">em {c.daysUntil} dias</span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              }

              return (
                <>
                  <Section title="Aniversário Hoje" icon="🎂" clients={today} color="text-pink-500" />
                  <Section title="Esta Semana" icon="🎉" clients={thisWeek} color="text-amber-400" />
                  <Section title="Este Mês" icon="🎁" clients={thisMonth} color="text-blue-400" />
                  <Section title="Próximos" icon="📅" clients={later} color="text-muted-foreground" />
                  {noDate.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        ⚠️ {noDate.length} aluno(s) sem data de nascimento cadastrada
                      </p>
                    </div>
                  )}
                </>
              )
            })()}
          </CardContent>
        </Card>
      )}

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
