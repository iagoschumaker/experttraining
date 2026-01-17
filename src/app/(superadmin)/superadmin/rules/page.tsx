'use client'

// ============================================================================
// EXPERT PRO TRAINING - SUPERADMIN RULES PAGE (100% FIXED)
// ============================================================================
// Gerenciamento completo de regras do motor de decisão
// - Condições IF (AND/OR)
// - Ações THEN (blocos permitidos/bloqueados)
// - Prioridade e recomendações
// - Interface alinhada com página de exercícios
// ============================================================================

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle, Plus, Search, Pencil, Trash2, Lock, Eye,
  ChevronLeft, ChevronRight, Settings, CheckCircle, XCircle, Code
} from 'lucide-react'
import { FloatingActionButton, StatsCard, StatsGrid } from '@/components/ui'

// ============================================================================
// TYPES
// ============================================================================

interface Condition {
  field: string
  operator: string
  value: number | string | boolean
}

interface RuleCondition {
  operator: 'AND' | 'OR'
  conditions: Condition[]
}

interface Rule {
  id: string
  name: string
  description: string | null
  conditionJson: RuleCondition
  allowedBlocks: string[]
  blockedBlocks: string[]
  recommendations: string[]
  priority: number
  isActive: boolean
  isLocked: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface Block {
  id: string
  name: string
  code: string
  level: number
  isActive: boolean
}

interface Stats {
  total: number
  active: number
  locked: number
  avgPriority: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ASSESSMENT_FIELDS = [
  { value: 'level', label: 'Nível', type: 'select', options: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] },
  { value: 'painMap.lower_back', label: 'Dor Lombar', type: 'number' },
  { value: 'painMap.knee', label: 'Dor no Joelho', type: 'number' },
  { value: 'painMap.shoulder', label: 'Dor no Ombro', type: 'number' },
  { value: 'painMap.neck', label: 'Dor no Pescoço', type: 'number' },
  { value: 'painMap.hip', label: 'Dor no Quadril', type: 'number' },
  { value: 'painMap.ankle', label: 'Dor no Tornozelo', type: 'number' },
  { value: 'movementTests.squat.score', label: 'Score Agachamento', type: 'number' },
  { value: 'movementTests.hinge.score', label: 'Score Dobradiça', type: 'number' },
  { value: 'movementTests.push.score', label: 'Score Empurrar', type: 'number' },
  { value: 'movementTests.pull.score', label: 'Score Puxar', type: 'number' },
  { value: 'movementTests.rotation.score', label: 'Score Rotação', type: 'number' },
  { value: 'movementTests.gait.score', label: 'Score Marcha', type: 'number' },
  { value: 'avgScore', label: 'Média Score Movimentos', type: 'number' },
]

const OPERATORS = [
  { value: '>=', label: 'Maior ou igual (≥)' },
  { value: '<=', label: 'Menor ou igual (≤)' },
  { value: '>', label: 'Maior que (>)' },
  { value: '<', label: 'Menor que (<)' },
  { value: '==', label: 'Igual (=)' },
  { value: '!=', label: 'Diferente (≠)' },
]

const LOGICAL_OPERATORS = [
  { value: 'AND', label: 'E (todas as condições devem ser verdadeiras)' },
  { value: 'OR', label: 'OU (pelo menos uma condição deve ser verdadeira)' },
]

// ============================================================================
// COMPONENT
// ============================================================================

export default function SuperAdminRulesPage() {
  // State
  const [rules, setRules] = useState<Rule[]>([])
  const [allRules, setAllRules] = useState<Rule[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null)

  // Form
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: '50',
    logicalOperator: 'AND' as 'AND' | 'OR',
    conditions: [] as Condition[],
    allowedBlocks: [] as string[],
    blockedBlocks: [] as string[],
    recommendations: [] as string[],
    recommendationInput: '',
  })

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchRules = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/superadmin/rules')
      const data = await res.json()

      if (data.success) {
        const fetchedRules = data.data.rules || []
        setAllRules(fetchedRules)

        // Apply filters
        let filtered = fetchedRules.filter((rule: Rule) => {
          const matchesSearch = search === '' ||
            rule.name.toLowerCase().includes(search.toLowerCase()) ||
            rule.description?.toLowerCase().includes(search.toLowerCase())

          const matchesStatus =
            filterStatus === 'all' ||
            (filterStatus === 'active' && rule.isActive) ||
            (filterStatus === 'inactive' && !rule.isActive) ||
            (filterStatus === 'locked' && rule.isLocked)

          return matchesSearch && matchesStatus
        })

        // Sort by priority (higher first)
        filtered.sort((a: Rule, b: Rule) => b.priority - a.priority)

        // Pagination
        const pageSize = 20
        const totalItems = filtered.length
        const totalPgs = Math.ceil(totalItems / pageSize)
        const start = (page - 1) * pageSize
        const end = start + pageSize
        const paginated = filtered.slice(start, end)

        setRules(paginated)
        setTotalPages(totalPgs)
        setTotal(totalItems)

        // Stats
        setStats({
          total: fetchedRules.length,
          active: fetchedRules.filter((r: Rule) => r.isActive).length,
          locked: fetchedRules.filter((r: Rule) => r.isLocked).length,
          avgPriority: fetchedRules.length > 0
            ? Math.round(fetchedRules.reduce((sum: number, r: Rule) => sum + r.priority, 0) / fetchedRules.length)
            : 0,
        })
      }
    } catch (error) {
      console.error('Error fetching rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBlocks = async () => {
    try {
      const res = await fetch('/api/blocks')
      const data = await res.json()
      if (data.success) {
        setBlocks(data.data.blocks || [])
      }
    } catch (error) {
      console.error('Error fetching blocks:', error)
    }
  }

  useEffect(() => {
    fetchBlocks()
  }, [])

  useEffect(() => {
    fetchRules()
  }, [page, search, filterStatus])

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      priority: '50',
      logicalOperator: 'AND',
      conditions: [],
      allowedBlocks: [],
      blockedBlocks: [],
      recommendations: [],
      recommendationInput: '',
    })
  }

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        { field: '', operator: '>=', value: 0 }
      ]
    }))
  }

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }))
  }

  const updateCondition = (index: number, field: keyof Condition, value: any) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      )
    }))
  }

  const addRecommendation = () => {
    if (formData.recommendationInput.trim()) {
      setFormData(prev => ({
        ...prev,
        recommendations: [...prev.recommendations, prev.recommendationInput.trim()],
        recommendationInput: '',
      }))
    }
  }

  const removeRecommendation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      recommendations: prev.recommendations.filter((_, i) => i !== index)
    }))
  }

  const toggleAllowedBlock = (code: string) => {
    setFormData(prev => ({
      ...prev,
      allowedBlocks: prev.allowedBlocks.includes(code)
        ? prev.allowedBlocks.filter(c => c !== code)
        : [...prev.allowedBlocks, code],
      // Remove from blocked if adding to allowed
      blockedBlocks: prev.allowedBlocks.includes(code)
        ? prev.blockedBlocks
        : prev.blockedBlocks.filter(c => c !== code)
    }))
  }

  const toggleBlockedBlock = (code: string) => {
    setFormData(prev => ({
      ...prev,
      blockedBlocks: prev.blockedBlocks.includes(code)
        ? prev.blockedBlocks.filter(c => c !== code)
        : [...prev.blockedBlocks, code],
      // Remove from allowed if adding to blocked
      allowedBlocks: prev.blockedBlocks.includes(code)
        ? prev.allowedBlocks
        : prev.allowedBlocks.filter(c => c !== code)
    }))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const validConditions = formData.conditions.filter(c => c.field && c.operator)

      const body = {
        name: formData.name,
        description: formData.description || undefined,
        conditionJson: {
          operator: formData.logicalOperator,
          conditions: validConditions,
        },
        allowedBlocks: formData.allowedBlocks,
        blockedBlocks: formData.blockedBlocks,
        recommendations: formData.recommendations,
        priority: parseInt(formData.priority),
        isActive: true,
      }

      const res = await fetch('/api/superadmin/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setIsCreateOpen(false)
        resetForm()
        fetchRules()
      } else {
        const error = await res.json()
        alert(`Erro: ${error.error || 'Erro ao criar regra'}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erro ao criar regra')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRule) return

    setSaving(true)

    try {
      const validConditions = formData.conditions.filter(c => c.field && c.operator)

      const body = {
        name: formData.name,
        description: formData.description || undefined,
        conditionJson: {
          operator: formData.logicalOperator,
          conditions: validConditions,
        },
        allowedBlocks: formData.allowedBlocks,
        blockedBlocks: formData.blockedBlocks,
        recommendations: formData.recommendations,
        priority: parseInt(formData.priority),
      }

      const res = await fetch(`/api/superadmin/rules/${selectedRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setIsEditOpen(false)
        setSelectedRule(null)
        resetForm()
        fetchRules()
      } else {
        const error = await res.json()
        alert(`Erro: ${error.error || 'Erro ao editar regra'}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erro ao editar regra')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, isLocked: boolean) => {
    if (isLocked) {
      alert('⚠️ Regras protegidas do método não podem ser excluídas')
      return
    }

    if (!confirm('Tem certeza que deseja excluir esta regra?')) return

    try {
      const res = await fetch(`/api/superadmin/rules/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchRules()
      } else {
        const error = await res.json()
        alert(`Erro: ${error.error || 'Erro ao excluir regra'}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erro ao excluir regra')
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/superadmin/rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      if (res.ok) {
        fetchRules()
      } else {
        const error = await res.json()
        alert(`Erro: ${error.error || 'Erro ao atualizar status'}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erro ao atualizar status')
    }
  }

  const openEditDialog = (rule: Rule) => {
    setSelectedRule(rule)
    setFormData({
      name: rule.name,
      description: rule.description || '',
      priority: rule.priority.toString(),
      logicalOperator: rule.conditionJson.operator,
      conditions: rule.conditionJson.conditions || [],
      allowedBlocks: rule.allowedBlocks || [],
      blockedBlocks: rule.blockedBlocks || [],
      recommendations: rule.recommendations || [],
      recommendationInput: '',
    })
    setIsEditOpen(true)
  }

  const openViewDialog = (rule: Rule) => {
    setSelectedRule(rule)
    setIsViewOpen(true)
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-amber-500" />
            Regras
          </h1>
          <p className="text-sm text-muted-foreground">Configure o motor de decisão do Método EXPERT PRO TRAINING</p>
        </div>
        <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="hidden md:flex gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
          <Plus className="h-4 w-4" /> Nova Regra
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <StatsGrid columns={4}>
          <StatsCard
            title="Total Regras"
            value={stats.total}
            icon={<Code className="h-4 w-4" />}
            iconColor="text-amber-500"
            iconBgColor="bg-amber-500/10"
          />
          <StatsCard
            title="Ativas"
            value={stats.active}
            icon={<CheckCircle className="h-4 w-4" />}
            iconColor="text-green-500"
            iconBgColor="bg-green-500/10"
          />
          <StatsCard
            title="Protegidas"
            value={stats.locked}
            icon={<Lock className="h-4 w-4" />}
            iconColor="text-amber-500"
            iconBgColor="bg-amber-500/10"
          />
          <StatsCard
            title="Prio. Média"
            value={stats.avgPriority}
            icon={<Settings className="h-4 w-4" />}
            iconColor="text-blue-500"
            iconBgColor="bg-blue-500/10"
          />
        </StatsGrid>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar regras por nome ou descrição..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Regras</SelectItem>
                <SelectItem value="active">Apenas Ativas</SelectItem>
                <SelectItem value="inactive">Apenas Inativas</SelectItem>
                <SelectItem value="locked">Apenas Protegidas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Regras ({total})</CardTitle>
          <CardDescription>
            Ordenadas por prioridade (maior = mais importante)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma regra encontrada</p>
              <p className="text-sm">
                {search || filterStatus !== 'all'
                  ? 'Tente ajustar os filtros de busca'
                  : 'Clique em "Nova Regra" para criar sua primeira regra'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: Cards */}
              <div className="md:hidden space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="p-4 border rounded-lg bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {rule.isLocked && <Lock className="h-4 w-4 text-amber-500" />}
                        <div>
                          <div className="font-medium">{rule.name}</div>
                          <div className="text-xs text-muted-foreground">{rule.description || '-'}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleToggleActive(rule.id, rule.isActive)}>
                        {rule.isActive ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div><span className="text-muted-foreground">Prioridade:</span> {rule.priority}</div>
                      <div><span className="text-muted-foreground">Condições:</span> {rule.conditionJson.conditions?.length || 0}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openViewDialog(rule)} className="flex-1">
                        <Eye className="h-4 w-4 mr-1" /> Ver
                      </Button>
                      {!rule.isLocked && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(rule)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id, rule.isLocked)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </>
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
                      <th>Prioridade</th>
                      <th>Condições</th>
                      <th>Ações</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((rule) => (
                      <tr key={rule.id}>
                        <td data-label="Nome">
                          <div className="flex items-center gap-2">
                            {rule.isLocked && <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                            <div className="min-w-0">
                              <div className="font-medium truncate">{rule.name}</div>
                              {rule.description && (
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                  {rule.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td data-label="Prioridade">
                          <Badge variant="outline" className="font-mono">
                            {rule.priority}
                          </Badge>
                        </td>
                        <td data-label="Condições">
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant="secondary" className="font-mono">
                              {rule.conditionJson.operator}
                            </Badge>
                            <span className="text-muted-foreground">
                              {rule.conditionJson.conditions?.length || 0} condições
                            </span>
                          </div>
                        </td>
                        <td data-label="Ações da Regra">
                          <div className="flex gap-1 flex-wrap">
                            {rule.allowedBlocks.length > 0 && (
                              <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs">
                                +{rule.allowedBlocks.length}
                              </Badge>
                            )}
                            {rule.blockedBlocks.length > 0 && (
                              <Badge className="bg-red-500/20 text-red-700 dark:text-red-400 text-xs">
                                -{rule.blockedBlocks.length}
                              </Badge>
                            )}
                            {rule.recommendations.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {rule.recommendations.length} rec.
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td data-label="Status">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(rule.id, rule.isActive)}
                            className="w-full"
                          >
                            {rule.isActive ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                        </td>
                        <td data-label="Ações">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openViewDialog(rule)}
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {!rule.isLocked && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(rule)}
                                  title="Editar"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(rule.id, rule.isLocked)}
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </>
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
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Página {page} de {totalPages} • {total} regras no total
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Próxima
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* CREATE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Nova Regra</DialogTitle>
            <DialogDescription>
              Configure as condições (IF) e ações (THEN) da regra do motor de decisão
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label>Nome da Regra *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Dor Lombar Moderada - Mobilidade Quadril"
                  required
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva quando esta regra deve ser aplicada e o que ela faz..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prioridade (0-100)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maior = mais importante (executada primeiro)
                  </p>
                </div>

                <div>
                  <Label>Operador Lógico</Label>
                  <Select
                    value={formData.logicalOperator}
                    onValueChange={(value: 'AND' | 'OR') =>
                      setFormData(prev => ({ ...prev, logicalOperator: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOGICAL_OPERATORS.map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Conditions (IF) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Condições (IF)</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Condição
                </Button>
              </div>

              {formData.conditions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Code className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma condição definida</p>
                  <p className="text-xs mt-1">Adicione pelo menos uma condição para a regra funcionar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.conditions.map((condition, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 border rounded-lg bg-muted">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Select
                          value={condition.field}
                          onValueChange={(value) => updateCondition(index, 'field', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o campo" />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSESSMENT_FIELDS.map(field => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={condition.operator}
                          onValueChange={(value) => updateCondition(index, 'operator', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map(op => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {ASSESSMENT_FIELDS.find(f => f.value === condition.field)?.type === 'select' ? (
                          <Select
                            value={String(condition.value)}
                            onValueChange={(value) => updateCondition(index, 'value', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o valor" />
                            </SelectTrigger>
                            <SelectContent>
                              {ASSESSMENT_FIELDS.find(f => f.value === condition.field)?.options?.map(opt => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type="number"
                            value={String(condition.value)}
                            onChange={(e) => updateCondition(index, 'value', parseFloat(e.target.value) || 0)}
                            placeholder="Valor (0-10)"
                          />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions (THEN) - Allowed Blocks */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold">Blocos Permitidos (THEN)</Label>
              <p className="text-sm text-muted-foreground">
                Selecione os blocos que devem ser <strong>liberados</strong> quando esta regra for ativada
              </p>
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                {blocks.filter(b => b.isActive).map(block => (
                  <label
                    key={block.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent transition-colors ${formData.allowedBlocks.includes(block.code)
                        ? 'bg-green-500/20 border border-green-500'
                        : 'border border-transparent'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.allowedBlocks.includes(block.code)}
                      onChange={() => toggleAllowedBlock(block.code)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm flex-1 min-w-0">
                      <div className="font-medium truncate">{block.code}</div>
                      <div className="text-xs text-muted-foreground truncate">{block.name}</div>
                    </span>
                  </label>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                ✅ {formData.allowedBlocks.length} blocos selecionados
              </div>
            </div>

            {/* Actions (THEN) - Blocked Blocks */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold">Blocos Bloqueados (THEN)</Label>
              <p className="text-sm text-muted-foreground">
                Selecione os blocos que devem ser <strong>bloqueados</strong> quando esta regra for ativada
              </p>
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                {blocks.filter(b => b.isActive).map(block => (
                  <label
                    key={block.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent transition-colors ${formData.blockedBlocks.includes(block.code)
                        ? 'bg-red-500/20 border border-red-500'
                        : 'border border-transparent'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.blockedBlocks.includes(block.code)}
                      onChange={() => toggleBlockedBlock(block.code)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm flex-1 min-w-0">
                      <div className="font-medium truncate">{block.code}</div>
                      <div className="text-xs text-muted-foreground truncate">{block.name}</div>
                    </span>
                  </label>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                ⛔ {formData.blockedBlocks.length} blocos selecionados
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-3">
              <Label className="text-lg font-semibold">Recomendações</Label>
              <p className="text-sm text-muted-foreground">
                Adicione orientações que aparecem quando esta regra é aplicada
              </p>
              <div className="flex gap-2">
                <Input
                  value={formData.recommendationInput}
                  onChange={(e) => setFormData(prev => ({ ...prev, recommendationInput: e.target.value }))}
                  placeholder="Ex: Focar em mobilidade do quadril antes de agachamentos..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addRecommendation()
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addRecommendation}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.recommendations.length > 0 && (
                <div className="space-y-1">
                  {formData.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded bg-muted">
                      <span className="text-sm flex-1">{rec}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRecommendation(index)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsCreateOpen(false); resetForm(); }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !formData.name || formData.conditions.length === 0}>
                {saving ? 'Salvando...' : 'Criar Regra'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG - Same structure as create */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Regra</DialogTitle>
            <DialogDescription>
              Modifique as condições e ações da regra
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Nome da Regra *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prioridade</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Operador Lógico</Label>
                  <Select
                    value={formData.logicalOperator}
                    onValueChange={(value: 'AND' | 'OR') =>
                      setFormData(prev => ({ ...prev, logicalOperator: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LOGICAL_OPERATORS.map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Condições</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar
                </Button>
              </div>

              <div className="space-y-2">
                {formData.conditions.map((condition, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 border rounded-lg bg-muted">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <Select
                        value={condition.field}
                        onValueChange={(value) => updateCondition(index, 'field', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSESSMENT_FIELDS.map(field => (
                            <SelectItem key={field.value} value={field.value}>
                              {field.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={condition.operator}
                        onValueChange={(value) => updateCondition(index, 'operator', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map(op => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        value={String(condition.value)}
                        onChange={(e) => updateCondition(index, 'value', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCondition(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-lg font-semibold">Blocos Permitidos</Label>
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                {blocks.filter(b => b.isActive).map(block => (
                  <label
                    key={block.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer ${formData.allowedBlocks.includes(block.code) ? 'bg-green-500/20 border border-green-500' : ''
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.allowedBlocks.includes(block.code)}
                      onChange={() => toggleAllowedBlock(block.code)}
                    />
                    <span className="text-xs">{block.code}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-lg font-semibold">Blocos Bloqueados</Label>
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                {blocks.filter(b => b.isActive).map(block => (
                  <label
                    key={block.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer ${formData.blockedBlocks.includes(block.code) ? 'bg-red-500/20 border border-red-500' : ''
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.blockedBlocks.includes(block.code)}
                      onChange={() => toggleBlockedBlock(block.code)}
                    />
                    <span className="text-xs">{block.code}</span>
                  </label>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setIsEditOpen(false); setSelectedRule(null); resetForm(); }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW DIALOG */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRule?.isLocked && <Lock className="w-5 h-5 text-amber-500" />}
              {selectedRule?.name}
            </DialogTitle>
            <DialogDescription>{selectedRule?.description}</DialogDescription>
          </DialogHeader>

          {selectedRule && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 border rounded-lg">
                  <Label className="text-xs text-muted-foreground">Prioridade</Label>
                  <div className="text-2xl font-bold">{selectedRule.priority}</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <Label className="text-xs text-muted-foreground">Operador</Label>
                  <div className="text-2xl font-bold">{selectedRule.conditionJson.operator}</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="text-2xl">
                    {selectedRule.isActive ? (
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    ) : (
                      <XCircle className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold">Condições (IF)</Label>
                <div className="space-y-1 mt-2">
                  {selectedRule.conditionJson.conditions?.map((cond, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-accent rounded text-sm">
                      <Code className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">
                        <strong>{ASSESSMENT_FIELDS.find(f => f.value === cond.field)?.label || cond.field}</strong>
                      </span>
                      <Badge variant="outline">{cond.operator}</Badge>
                      <span className="font-bold">{cond.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedRule.allowedBlocks.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold">Blocos Permitidos (THEN)</Label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedRule.allowedBlocks.map(code => (
                      <Badge key={code} className="bg-green-500/20 text-green-700 dark:text-green-400">
                        {code}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedRule.blockedBlocks.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold">Blocos Bloqueados (THEN)</Label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedRule.blockedBlocks.map(code => (
                      <Badge key={code} className="bg-red-500/20 text-red-700 dark:text-red-400">
                        {code}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedRule.recommendations.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold">Recomendações</Label>
                  <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                    {selectedRule.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="p-3 border rounded-lg bg-muted text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Criado em: {new Date(selectedRule.createdAt).toLocaleString('pt-BR')}</span>
                  <span>Atualizado em: {new Date(selectedRule.updatedAt).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            {selectedRule && !selectedRule.isLocked && (
              <Button variant="outline" onClick={() => { setIsViewOpen(false); openEditDialog(selectedRule); }}>
                <Pencil className="w-4 h-4 mr-2" />
                Editar Regra
              </Button>
            )}
            <Button onClick={() => setIsViewOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Floating Action Button for Mobile */}
      <FloatingActionButton 
        actions={[
          {
            label: 'Nova Regra',
            onClick: () => { resetForm(); setIsCreateOpen(true); },
            icon: <Plus className="h-5 w-5" />
          }
        ]}
      />
    </div>
  )
}
