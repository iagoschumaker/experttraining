'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  TestTube,
  BarChart3,
  Code,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  GripVertical,
  Play,
  Save,
  Copy,
  Eye,
  Target,
  Zap,
  Activity,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { ASSESSMENT_FIELDS } from '@/lib/assessment-constants'

interface Rule {
  id: string
  name: string
  description?: string
  conditions: RuleCondition[]
  thenAction: {
    type: 'SET_NEXT_BLOCK'
    blockCode: string
  }
  isActive: boolean
  priority: number
  createdAt: string
  updatedAt: string
  createdBy: string
  usageCount?: number
  lastUsed?: string
  tags?: string[]
}

interface RuleCondition {
  id: string
  field: string
  operator: string
  value: string | number
  logicalOperator?: 'AND' | 'OR'
}

interface Block {
  id: string
  name: string
  code: string
  description?: string
  isActive: boolean
}

type TestData = {
  [key: string]: string | number | string[]
}

interface RuleStats {
  totalRules: number
  activeRules: number
  avgUsagePerRule: number
  mostUsedRule: {
    name: string
    usageCount: number
  }
  recentActivity: {
    date: string
    action: string
    rule: string
    user: string
  }[]
}

interface TestResult {
  ruleId: string
  ruleName: string
  matched: boolean
  conditions: {
    field: string
    expected: any
    actual: any
    matched: boolean
  }[]
  nextBlockCode?: string
}

const OPERATORS = {
  number: [
    { value: '==', label: 'Igual a' },
    { value: '!=', label: 'Diferente de' },
    { value: '>', label: 'Maior que' },
    { value: '>=', label: 'Maior ou igual a' },
    { value: '<', label: 'Menor que' },
    { value: '<=', label: 'Menor ou igual a' }
  ],
  select: [
    { value: '==', label: 'Igual a' },
    { value: '!=', label: 'Diferente de' }
  ],
  array: [
    { value: 'includes', label: 'Contém' },
    { value: 'not_includes', label: 'Não contém' },
    { value: 'any_of', label: 'Qualquer um de' },
    { value: 'none_of', label: 'Nenhum de' }
  ],
  object: [
    { value: 'has_property', label: 'Tem propriedade' },
    { value: 'property_equals', label: 'Propriedade igual a' }
  ]
}

export default function RulesManagement() {
  const [rules, setRules] = useState<Rule[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [stats, setStats] = useState<RuleStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showTestSheet, setShowTestSheet] = useState(false)
  const [editingRule, setEditingRule] = useState<Rule | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [testData, setTestData] = useState<TestData>({})
  const [isTesting, setIsTesting] = useState(false)

  // Form states
  const [ruleName, setRuleName] = useState('')
  const [ruleDescription, setRuleDescription] = useState('')
  const [ruleConditions, setRuleConditions] = useState<RuleCondition[]>([])
  const [selectedBlockCode, setSelectedBlockCode] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [ruleTags, setRuleTags] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [rulesRes, blocksRes] = await Promise.all([
        fetch('/api/superadmin/rules'),
        fetch('/api/blocks')
      ])

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json()
        setRules(rulesData.rules || [])
        setStats(rulesData.stats)
      }

      if (blocksRes.ok) {
        const blocksData = await blocksRes.json()
        setBlocks(blocksData.blocks || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && rule.isActive) ||
      (filterStatus === 'inactive' && !rule.isActive)
    
    return matchesSearch && matchesStatus
  })

  const addCondition = () => {
    const newCondition: RuleCondition = {
      id: Date.now().toString(),
      field: '',
      operator: '',
      value: '',
      logicalOperator: ruleConditions.length > 0 ? 'AND' : undefined
    }
    setRuleConditions([...ruleConditions, newCondition])
  }

  const removeCondition = (id: string) => {
    setRuleConditions(ruleConditions.filter(c => c.id !== id))
  }

  const updateCondition = (id: string, updates: Partial<RuleCondition>) => {
    setRuleConditions(ruleConditions.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ))
  }

  const resetForm = () => {
    setRuleName('')
    setRuleDescription('')
    setRuleConditions([])
    setSelectedBlockCode('')
    setIsActive(true)
    setRuleTags('')
    setEditingRule(null)
  }

  const handleCreateOrUpdate = async () => {
    if (!ruleName.trim() || !selectedBlockCode || ruleConditions.length === 0) {
      return
    }

    const ruleData = {
      name: ruleName.trim(),
      description: ruleDescription.trim() || undefined,
      conditions: ruleConditions.filter(c => c.field && c.operator && c.value !== ''),
      thenAction: {
        type: 'SET_NEXT_BLOCK',
        blockCode: selectedBlockCode
      },
      isActive,
      tags: ruleTags.split(',').map(tag => tag.trim()).filter(tag => tag)
    }

    try {
      const url = editingRule ? `/api/superadmin/rules/${editingRule.id}` : '/api/superadmin/rules'
      const method = editingRule ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      })

      if (response.ok) {
        await loadData()
        setShowCreateDialog(false)
        resetForm()
      }
    } catch (error) {
      console.error('Error saving rule:', error)
    }
  }

  const handleEdit = (rule: Rule) => {
    setEditingRule(rule)
    setRuleName(rule.name)
    setRuleDescription(rule.description || '')
    setRuleConditions(rule.conditions)
    setSelectedBlockCode(rule.thenAction.blockCode)
    setIsActive(rule.isActive)
    setRuleTags(rule.tags?.join(', ') || '')
    setShowCreateDialog(true)
  }

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta regra?')) return

    try {
      const response = await fetch(`/api/superadmin/rules/${ruleId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadData()
      }
    } catch (error) {
      console.error('Error deleting rule:', error)
    }
  }

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return

    const newRules = Array.from(filteredRules)
    const [reorderedItem] = newRules.splice(result.source.index, 1)
    newRules.splice(result.destination.index, 0, reorderedItem)

    // Update priorities
    const updatedRules = newRules.map((rule, index) => ({
      ...rule,
      priority: index + 1
    }))

    setRules(prevRules => {
      const ruleMap = new Map(prevRules.map(r => [r.id, r]))
      return updatedRules.map(ur => ruleMap.get(ur.id) ? { ...ruleMap.get(ur.id)!, priority: ur.priority } : ur)
        .concat(prevRules.filter(pr => !updatedRules.find(ur => ur.id === pr.id)))
    })

    // Save priorities to backend
    try {
      await fetch('/api/superadmin/rules/priorities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priorities: updatedRules.map(rule => ({ id: rule.id, priority: rule.priority }))
        })
      })
    } catch (error) {
      console.error('Error updating priorities:', error)
    }
  }

  const handleTestRules = async () => {
    if (Object.keys(testData).length === 0) return

    setIsTesting(true)
    try {
      const response = await fetch('/api/superadmin/rules/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      })

      if (response.ok) {
        const results = await response.json()
        setTestResults(results.results || [])
      }
    } catch (error) {
      console.error('Error testing rules:', error)
    } finally {
      setIsTesting(false)
    }
  }

  const getFieldOptions = (fieldName: string) => {
    const field = ASSESSMENT_FIELDS.find(f => f.value === fieldName)
    return field?.options || []
  }

  const getOperatorsForField = (fieldName: string) => {
    const field = ASSESSMENT_FIELDS.find(f => f.value === fieldName)
    return OPERATORS[field?.type as keyof typeof OPERATORS] || []
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Regras</h1>
            <p className="text-gray-600 mt-1">Configure regras do motor de decisão de treino</p>
          </div>
          <div className="flex gap-2">
            <Sheet open={showTestSheet} onOpenChange={setShowTestSheet}>
              <SheetTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <TestTube className="w-4 h-4" />
                  Testar Regras
                </Button>
              </SheetTrigger>
            </Sheet>
            <Dialog open={showCreateDialog} onOpenChange={(open) => {
              setShowCreateDialog(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Nova Regra
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="rules" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="rules">Regras</TabsTrigger>
            <TabsTrigger value="analytics">Análises</TabsTrigger>
          </TabsList>

          <TabsContent value="rules" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar regras..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Regras</SelectItem>
                    <SelectItem value="active">Ativas</SelectItem>
                    <SelectItem value="inactive">Inativas</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Rules List */}
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="rules">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                    {filteredRules.map((rule, index) => (
                      <Draggable key={rule.id} draggableId={rule.id} index={index}>
                        {(provided, snapshot) => (
                          <Card 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`transition-shadow ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                          >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <div className="flex items-center gap-3">
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                  <GripVertical className="w-4 h-4 text-gray-400" />
                                </div>
                                <div>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    {rule.name}
                                    {!rule.isActive && (
                                      <Badge variant="secondary">Inativa</Badge>
                                    )}
                                    <Badge variant="outline" className="ml-2">
                                      Prioridade {rule.priority}
                                    </Badge>
                                  </CardTitle>
                                  <CardDescription>
                                    {rule.description || 'Sem descrição'}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleEdit(rule)}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar regra</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleDelete(rule.id)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Excluir regra</TooltipContent>
                                </Tooltip>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {/* Conditions */}
                                <div>
                                  <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                                    <Code className="w-4 h-4" />
                                    Condições
                                  </h4>
                                  <div className="space-y-2">
                                    {rule.conditions.map((condition, condIndex) => (
                                      <div key={condition.id} className="flex items-center gap-2 text-sm">
                                        {condIndex > 0 && (
                                          <Badge variant="secondary" className="text-xs">
                                            {condition.logicalOperator || 'AND'}
                                          </Badge>
                                        )}
                                        <span className="font-medium">
                                          {ASSESSMENT_FIELDS.find(f => f.value === condition.field)?.label || condition.field}
                                        </span>
                                        <span className="text-gray-500">
                                          {OPERATORS.number.find(op => op.value === condition.operator)?.label || 
                                           OPERATORS.select.find(op => op.value === condition.operator)?.label ||
                                           condition.operator}
                                        </span>
                                        <span className="font-medium text-blue-600">
                                          {condition.value}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Action */}
                                <div>
                                  <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
                                    <Target className="w-4 h-4" />
                                    Ação
                                  </h4>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline">Definir Próximo Bloco</Badge>
                                    <span className="font-medium text-green-600">
                                      {blocks.find(b => b.code === rule.thenAction.blockCode)?.name || rule.thenAction.blockCode}
                                    </span>
                                  </div>
                                </div>

                                {/* Stats */}
                                {(rule.usageCount || rule.lastUsed) && (
                                  <div className="flex items-center gap-4 text-sm text-gray-500 pt-2 border-t">
                                    {rule.usageCount && (
                                      <span className="flex items-center gap-1">
                                        <Activity className="w-3 h-3" />
                                        {rule.usageCount} usos
                                      </span>
                                    )}
                                    {rule.lastUsed && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        Último uso: {new Date(rule.lastUsed).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Tags */}
                                {rule.tags && rule.tags.length > 0 && (
                                  <div className="flex gap-1 flex-wrap">
                                    {rule.tags.map(tag => (
                                      <Badge key={tag} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {filteredRules.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Code className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma regra encontrada</h3>
                  <p className="text-gray-600 text-center">
                    {searchTerm || filterStatus !== 'all' 
                      ? 'Tente ajustar os filtros de busca'
                      : 'Crie sua primeira regra para começar'
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {stats && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total de Regras</CardTitle>
                      <Code className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalRules}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats.activeRules} ativas
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Taxa de Ativação</CardTitle>
                      <CheckCircle className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {((stats.activeRules / stats.totalRules) * 100).toFixed(1)}%
                      </div>
                      <Progress 
                        value={(stats.activeRules / stats.totalRules) * 100} 
                        className="mt-2"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Uso Médio</CardTitle>
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.avgUsagePerRule.toFixed(1)}</div>
                      <p className="text-xs text-muted-foreground">
                        usos por regra
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Mais Utilizada</CardTitle>
                      <Zap className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.mostUsedRule.usageCount}</div>
                      <p className="text-xs text-muted-foreground truncate">
                        {stats.mostUsedRule.name}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Atividade Recente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-4">
                        {stats.recentActivity.map((activity, index) => (
                          <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-gray-50">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{activity.action}</p>
                              <p className="text-xs text-gray-600">
                                {activity.rule} • {activity.user}
                              </p>
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(activity.date).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Create/Edit Rule Dialog */}
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? 'Editar Regra' : 'Nova Regra'}
            </DialogTitle>
            <DialogDescription>
              Configure as condições e ações da regra do motor de decisão
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ruleName">Nome da Regra *</Label>
                  <Input
                    id="ruleName"
                    placeholder="Ex: Iniciantes para Bloco A"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blockCode">Bloco de Destino *</Label>
                  <Select value={selectedBlockCode} onValueChange={setSelectedBlockCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o bloco" />
                    </SelectTrigger>
                    <SelectContent>
                      {blocks.filter(b => b.isActive).map(block => (
                        <SelectItem key={block.id} value={block.code}>
                          {block.name} ({block.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ruleDescription">Descrição</Label>
                <Textarea
                  id="ruleDescription"
                  placeholder="Descreva quando esta regra deve ser aplicada..."
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ruleTags">Tags (separadas por vírgula)</Label>
                  <Input
                    id="ruleTags"
                    placeholder="iniciante, cardio, força..."
                    value={ruleTags}
                    onChange={(e) => setRuleTags(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="isActive">Regra ativa</Label>
                </div>
              </div>
            </div>

            <Separator />

            {/* Conditions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Code className="w-5 h-5" />
                  Condições
                </h3>
                <Button onClick={addCondition} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Condição
                </Button>
              </div>

              {ruleConditions.length === 0 ? (
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    Adicione pelo menos uma condição para definir quando esta regra deve ser aplicada.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {ruleConditions.map((condition, index) => (
                    <Card key={condition.id} className="p-4">
                      <div className="space-y-4">
                        {index > 0 && (
                          <div>
                            <Label>Operador Lógico</Label>
                            <Select
                              value={condition.logicalOperator || 'AND'}
                              onValueChange={(value) => updateCondition(condition.id, { logicalOperator: value as 'AND' | 'OR' })}
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="AND">E</SelectItem>
                                <SelectItem value="OR">OU</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label>Campo</Label>
                            <Select
                              value={condition.field}
                              onValueChange={(value) => updateCondition(condition.id, { field: value, operator: '', value: '' })}
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
                          </div>

                          <div className="space-y-2">
                            <Label>Operador</Label>
                            <Select
                              value={condition.operator}
                              onValueChange={(value) => updateCondition(condition.id, { operator: value })}
                              disabled={!condition.field}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Operador" />
                              </SelectTrigger>
                              <SelectContent>
                                {getOperatorsForField(condition.field).map(op => (
                                  <SelectItem key={op.value} value={op.value}>
                                    {op.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Valor</Label>
                            {getFieldOptions(condition.field).length > 0 ? (
                              <Select
                                value={condition.value.toString()}
                                onValueChange={(value) => updateCondition(condition.id, { value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o valor" />
                                </SelectTrigger>
                                <SelectContent>
                                  {getFieldOptions(condition.field).map(option => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                placeholder="Valor"
                                value={condition.value}
                                onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                              />
                            )}
                          </div>

                          <div className="flex items-end">
                            <Button
                              onClick={() => removeCondition(condition.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOrUpdate} disabled={!ruleName.trim() || !selectedBlockCode || ruleConditions.length === 0}>
              <Save className="w-4 h-4 mr-2" />
              {editingRule ? 'Atualizar' : 'Criar'} Regra
            </Button>
          </DialogFooter>
        </DialogContent>

        {/* Test Rules Sheet */}
        <SheetContent side="right" className="w-[600px] sm:w-[700px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Teste de Regras
            </SheetTitle>
            <SheetDescription>
              Configure dados de assessment para testar as regras ativas
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Test Data Input */}
            <div className="space-y-4">
              <h3 className="font-medium">Dados de Assessment</h3>
              <div className="grid grid-cols-1 gap-4">
                {ASSESSMENT_FIELDS.slice(0, 10).map(field => (
                  <div key={field.value} className="space-y-2">
                    <Label>{field.label}</Label>
                    {field.options ? (
                      <Select
                        value={String(testData[field.value] || '')}
                        onValueChange={(value) => setTestData((prev: TestData) => ({ ...prev, [field.value]: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map(option => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type={field.type === 'number' ? 'number' : 'text'}
                        placeholder={`Digite ${field.label.toLowerCase()}`}
                        value={String(testData[field.value] || '')}
                        onChange={(e) => setTestData((prev: TestData) => ({ 
                          ...prev, 
                          [field.value]: field.type === 'number' ? Number(e.target.value) : e.target.value 
                        }))}
                      />
                    )}
                  </div>
                ))}
              </div>

              <Button 
                onClick={handleTestRules} 
                disabled={isTesting || Object.keys(testData).length === 0}
                className="w-full"
              >
                {isTesting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Testando...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Executar Teste
                  </>
                )}
              </Button>
            </div>

            {/* Test Results */}
            {testResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium">Resultados do Teste</h3>
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {testResults.map(result => (
                      <Card key={result.ruleId} className={result.matched ? 'border-green-200 bg-green-50' : 'border-gray-200'}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              {result.matched ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-gray-400" />
                              )}
                              {result.ruleName}
                            </CardTitle>
                            {result.matched && (
                              <Badge className="bg-green-100 text-green-800">
                                Ativada
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          {result.matched && result.nextBlockCode && (
                            <div className="mb-2">
                              <Badge variant="outline">
                                Próximo Bloco: {result.nextBlockCode}
                              </Badge>
                            </div>
                          )}
                          <div className="space-y-1 text-xs">
                            {result.conditions.map((cond, index) => (
                              <div key={index} className={`flex items-center justify-between p-2 rounded ${cond.matched ? 'bg-green-100' : 'bg-red-100'}`}>
                                <span>
                                  {ASSESSMENT_FIELDS.find(f => f.value === cond.field)?.label || cond.field}: 
                                  <span className="font-medium ml-1">{cond.actual}</span>
                                </span>
                                <span className={cond.matched ? 'text-green-600' : 'text-red-600'}>
                                  {cond.matched ? '✓' : '✗'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </SheetContent>
      </div>
    </TooltipProvider>
  )
}