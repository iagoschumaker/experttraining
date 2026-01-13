'use client'

// ============================================================================
// EXPERT TRAINING - SUPERADMIN MÉTODO PAGE
// ============================================================================
// Visualização consolidada do Método Expert Training:
// - Hierarquia (níveis, capacidades, padrões)
// - Motor de Decisão (algoritmos, regras)
// - Blocos do Método
// - Exercícios (com CRUD)
// - Regras de Decisão
// ============================================================================

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { 
  Pyramid, Brain, Boxes, Dumbbell, GitBranch, Plus, Search, 
  Pencil, Trash2, Lock, Eye, CheckCircle, XCircle, Activity,
  Zap, Target, FileText, AlertTriangle, Settings, BarChart3
} from 'lucide-react'
import { FloatingActionButton } from '@/components/ui'
import {
  translateLevel,
  translateRisk,
  translateDifficulty,
  translateMuscleGroup,
  translateEquipment,
} from '@/lib/translations'

// ============================================================================
// TYPES
// ============================================================================

interface HierarchyData {
  levels: any[]
  capacities: any[]
  patterns: any[]
  stats: any
}

interface DecisionData {
  engines: any[]
  logs: any[]
  stats: any
}

interface Block {
  id: string
  code: string
  name: string
  description: string | null
  level: number
  levelName: string | null
  primaryCapacity: string
  secondaryCapacities: string[]
  complexity: number
  impact: number
  movementPattern: string | null
  riskLevel: string
  isLocked: boolean
  isActive: boolean
  _count?: { exercisesList: number }
}

interface Exercise {
  id: string
  name: string
  description: string | null
  type: string | null
  muscleGroup: string | null
  equipment: string | null
  difficulty: string | null
  defaultSets: number | null
  defaultReps: string | null
  defaultTime: string | null
  defaultRest: string | null
  technicalNotes: string | null
  instructions: string | null
  videoUrl: string | null
  orderInBlock: number | null
  isLocked: boolean
  isActive: boolean
  block: Block | null
}

interface Rule {
  id: string
  name: string
  description: string | null
  conditionJson: any
  allowedBlocks: string[]
  blockedBlocks: string[]
  recommendations: string[]
  priority: number
  isActive: boolean
  isLocked: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MUSCLE_GROUPS = [
  'Peitoral', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Antebraço',
  'Core', 'Quadríceps', 'Posterior', 'Glúteos', 'Panturrilha', 'Corpo Todo'
]

const DIFFICULTIES = ['Iniciante', 'Intermediário', 'Avançado']

const EQUIPMENTS = [
  'Peso Corporal', 'Halteres', 'Barra', 'Kettlebell', 'Elástico',
  'TRX', 'Medicine Ball', 'Caixa', 'Corda', 'Outro'
]

// ============================================================================
// COMPONENT
// ============================================================================

export default function SuperAdminMetodoPage() {
  // State
  const [activeTab, setActiveTab] = useState('hierarchy')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Data
  const [hierarchyData, setHierarchyData] = useState<HierarchyData | null>(null)
  const [decisionData, setDecisionData] = useState<DecisionData | null>(null)
  const [blocks, setBlocks] = useState<Block[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [rules, setRules] = useState<Rule[]>([])

  // Exercise CRUD
  const [isCreateExerciseOpen, setIsCreateExerciseOpen] = useState(false)
  const [isEditExerciseOpen, setIsEditExerciseOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [saving, setSaving] = useState(false)

  const [exerciseForm, setExerciseForm] = useState({
    name: '',
    description: '',
    type: '',
    muscleGroup: '',
    equipment: '',
    difficulty: '',
    defaultSets: '3',
    defaultReps: '10-12',
    defaultTime: '',
    defaultRest: '60s',
    technicalNotes: '',
    instructions: '',
    videoUrl: '',
    blockId: '',
  })

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [hierarchyRes, decisionRes, blocksRes, exercisesRes, rulesRes] = await Promise.all([
        fetch('/api/superadmin/hierarchy'),
        fetch('/api/superadmin/decisions'),
        fetch('/api/superadmin/blocks'),
        fetch('/api/superadmin/exercises'),
        fetch('/api/superadmin/rules'),
      ])

      const [hierarchyJson, decisionJson, blocksJson, exercisesJson, rulesJson] = await Promise.all([
        hierarchyRes.json(),
        decisionRes.json(),
        blocksRes.json(),
        exercisesRes.json(),
        rulesRes.json(),
      ])

      if (hierarchyJson.success) setHierarchyData(hierarchyJson.data)
      if (decisionJson.success) setDecisionData(decisionJson.data)
      if (blocksJson.success) setBlocks(blocksJson.data.items || [])
      if (exercisesJson.success) setExercises(exercisesJson.data || [])
      if (rulesJson.success) setRules(rulesJson.data.rules || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAllData() }, [])

  // ============================================================================
  // EXERCISE CRUD HANDLERS
  // ============================================================================

  const resetExerciseForm = () => setExerciseForm({
    name: '', description: '', type: '', muscleGroup: '', equipment: '',
    difficulty: '', defaultSets: '3', defaultReps: '10-12', defaultTime: '',
    defaultRest: '60s', technicalNotes: '', instructions: '', videoUrl: '', blockId: '',
  })

  const handleCreateExercise = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/superadmin/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: exerciseForm.name,
          description: exerciseForm.description || undefined,
          type: exerciseForm.type || undefined,
          muscleGroup: exerciseForm.muscleGroup || undefined,
          equipment: exerciseForm.equipment || undefined,
          difficulty: exerciseForm.difficulty || undefined,
          defaultSets: exerciseForm.defaultSets ? parseInt(exerciseForm.defaultSets) : undefined,
          defaultReps: exerciseForm.defaultReps || undefined,
          defaultTime: exerciseForm.defaultTime || undefined,
          defaultRest: exerciseForm.defaultRest || undefined,
          technicalNotes: exerciseForm.technicalNotes || undefined,
          instructions: exerciseForm.instructions || undefined,
          videoUrl: exerciseForm.videoUrl || undefined,
          blockId: exerciseForm.blockId || undefined,
        }),
      })

      if (res.ok) {
        setIsCreateExerciseOpen(false)
        resetExerciseForm()
        fetchAllData()
      } else {
        const error = await res.json()
        alert(`Erro: ${error.error || 'Erro ao criar exercício'}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erro ao criar exercício')
    } finally {
      setSaving(false)
    }
  }

  const handleEditExercise = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedExercise) return

    setSaving(true)
    try {
      const res = await fetch(`/api/superadmin/exercises/${selectedExercise.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: exerciseForm.name,
          description: exerciseForm.description || undefined,
          type: exerciseForm.type || undefined,
          muscleGroup: exerciseForm.muscleGroup || undefined,
          equipment: exerciseForm.equipment || undefined,
          difficulty: exerciseForm.difficulty || undefined,
          defaultSets: exerciseForm.defaultSets ? parseInt(exerciseForm.defaultSets) : undefined,
          defaultReps: exerciseForm.defaultReps || undefined,
          defaultTime: exerciseForm.defaultTime || undefined,
          defaultRest: exerciseForm.defaultRest || undefined,
          technicalNotes: exerciseForm.technicalNotes || undefined,
          instructions: exerciseForm.instructions || undefined,
          videoUrl: exerciseForm.videoUrl || undefined,
          blockId: exerciseForm.blockId || undefined,
        }),
      })

      if (res.ok) {
        setIsEditExerciseOpen(false)
        setSelectedExercise(null)
        resetExerciseForm()
        fetchAllData()
      } else {
        const error = await res.json()
        alert(`Erro: ${error.error || 'Erro ao atualizar exercício'}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erro ao atualizar exercício')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteExercise = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este exercício?')) return

    try {
      const res = await fetch(`/api/superadmin/exercises/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchAllData()
      } else {
        const error = await res.json()
        alert(`Erro: ${error.error || 'Erro ao excluir exercício'}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erro ao excluir exercício')
    }
  }

  const openEditExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setExerciseForm({
      name: exercise.name,
      description: exercise.description || '',
      type: exercise.type || '',
      muscleGroup: exercise.muscleGroup || '',
      equipment: exercise.equipment || '',
      difficulty: exercise.difficulty || '',
      defaultSets: exercise.defaultSets?.toString() || '3',
      defaultReps: exercise.defaultReps || '10-12',
      defaultTime: exercise.defaultTime || '',
      defaultRest: exercise.defaultRest || '60s',
      technicalNotes: exercise.technicalNotes || '',
      instructions: exercise.instructions || '',
      videoUrl: exercise.videoUrl || '',
      blockId: exercise.block?.id || '',
    })
    setIsEditExerciseOpen(true)
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
            <Target className="h-6 w-6 text-amber-500" />
            Método Expert Training
          </h1>
          <p className="text-sm text-muted-foreground">
            Visualização completa da estrutura, motor de decisão e biblioteca de exercícios
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="hierarchy" className="flex items-center gap-2">
            <Pyramid className="h-4 w-4" />
            Hierarquia
          </TabsTrigger>
          <TabsTrigger value="decisions" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Motor
          </TabsTrigger>
          <TabsTrigger value="blocks" className="flex items-center gap-2">
            <Boxes className="h-4 w-4" />
            Blocos
          </TabsTrigger>
          <TabsTrigger value="exercises" className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4" />
            Exercícios
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Regras
          </TabsTrigger>
        </TabsList>

        {/* HIERARCHY TAB - READ ONLY */}
        <TabsContent value="hierarchy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pyramid className="h-5 w-5 text-blue-400" />
                Estrutura Hierárquica do Método
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Níveis */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Badge className="bg-blue-500/20 text-blue-400">Níveis de Progressão</Badge>
                      <span className="text-sm text-muted-foreground">
                        {hierarchyData?.levels.length || 0} níveis
                      </span>
                    </h3>
                    <div className="grid gap-3">
                      {hierarchyData?.levels.map((level) => (
                        <div key={level.id} className="p-3 border rounded-lg bg-card/50">
                          <div className="flex items-center gap-3">
                            <Badge className="bg-blue-500/20 text-blue-400">
                              Nível {level.level}
                            </Badge>
                            <span className="font-medium">{level.name}</span>
                            {level.isLocked && <Lock className="h-4 w-4 text-amber-500" />}
                          </div>
                          {level.description && (
                            <p className="text-sm text-muted-foreground mt-2">{level.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Capacidades */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Badge className="bg-green-500/20 text-green-400">Capacidades Físicas</Badge>
                      <span className="text-sm text-muted-foreground">
                        {hierarchyData?.capacities.length || 0} capacidades
                      </span>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {hierarchyData?.capacities.map((cap) => (
                        <div key={cap.id} className="p-2 border rounded bg-card/50 text-sm">
                          <div className="flex items-center gap-2">
                            <Zap className="h-3 w-3 text-green-400" />
                            <span className="font-medium">{cap.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {cap._count?.blocks || 0} blocos
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Padrões */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Badge className="bg-purple-500/20 text-purple-400">Padrões de Movimento</Badge>
                      <span className="text-sm text-muted-foreground">
                        {hierarchyData?.patterns.length || 0} padrões
                      </span>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {hierarchyData?.patterns.map((pattern) => (
                        <div key={pattern.id} className="p-2 border rounded bg-card/50 text-sm">
                          <div className="flex items-center gap-2">
                            <Activity className="h-3 w-3 text-purple-400" />
                            <span className="font-medium">{pattern.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {pattern._count?.blocks || 0} blocos
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DECISIONS TAB - READ ONLY */}
        <TabsContent value="decisions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-400" />
                Motor de Decisão e Algoritmos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Engines */}
                  {decisionData?.engines.map((engine) => (
                    <div key={engine.id} className="p-4 border rounded-lg bg-card">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{engine.name}</h3>
                            <Badge variant="outline">{engine.version}</Badge>
                            {engine.isLocked && <Lock className="h-4 w-4 text-amber-500" />}
                            <Badge className={engine.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                              {engine.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Confiança Base:</span>{' '}
                              <span className="font-medium">{engine.config.baseConfidence}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Algoritmos:</span>{' '}
                              <span className="font-medium">{engine.algorithms?.length || 0}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Status:</span>{' '}
                              <Badge variant="outline">{engine.status}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Algorithms */}
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-muted-foreground">Algoritmos:</h4>
                        <div className="grid gap-2">
                          {engine.algorithms?.map((algo: any) => (
                            <div key={algo.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                              <div className="flex items-center gap-2">
                                <Badge className={
                                  algo.type === 'PATTERN_ANALYSIS' ? 'bg-blue-500/20 text-blue-400' :
                                  algo.type === 'PAIN_ANALYSIS' ? 'bg-red-500/20 text-red-400' :
                                  algo.type === 'LEVEL_ASSESSMENT' ? 'bg-green-500/20 text-green-400' :
                                  'bg-purple-500/20 text-purple-400'
                                }>
                                  {algo.name}
                                </Badge>
                                <span className="text-xs text-muted-foreground">Prioridade: {algo.priority}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {algo.isLocked && <Lock className="h-3 w-3 text-amber-500" />}
                                <Badge variant={algo.isActive ? 'success' : 'secondary'} className="text-xs">
                                  {algo.isActive ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Weights */}
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="font-medium text-sm text-muted-foreground mb-2">Pesos dos Fatores:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Movimento:</span>{' '}
                            <span className="font-medium">{engine.config.weights.movementPattern}%</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Dor:</span>{' '}
                            <span className="font-medium">{engine.config.weights.painMap}%</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Nível:</span>{' '}
                            <span className="font-medium">{engine.config.weights.level}%</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">Queixas:</span>{' '}
                            <span className="font-medium">{engine.config.weights.complaints}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Stats */}
                  {decisionData?.stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-blue-400">
                            {decisionData.stats.dailyDecisions}
                          </div>
                          <div className="text-xs text-muted-foreground">Decisões/Dia</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-green-400">
                            {(decisionData.stats.avgConfidence * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Confiança Média</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-purple-400">
                            {decisionData.stats.avgProcessingTime}ms
                          </div>
                          <div className="text-xs text-muted-foreground">Tempo Médio</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-2xl font-bold text-amber-400">
                            {(decisionData.stats.successRate * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Taxa de Sucesso</div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* BLOCKS TAB - READ ONLY */}
        <TabsContent value="blocks" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-amber-400" />
                  Blocos do Método
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Buscar blocos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-64"
                  />
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {blocks
                    .filter(b => 
                      search === '' || 
                      b.name.toLowerCase().includes(search.toLowerCase()) ||
                      b.code.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((block) => (
                      <div key={block.id} className="p-4 border rounded-lg bg-card">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className="bg-amber-500/20 text-amber-400 font-mono">
                                {block.code}
                              </Badge>
                              <h3 className="font-semibold">{block.name}</h3>
                              {block.isLocked && <Lock className="h-4 w-4 text-amber-500" />}
                              <Badge className="bg-blue-500/20 text-blue-400">
                                {translateLevel(block.level)}
                              </Badge>
                            </div>
                            {block.description && (
                              <p className="text-sm text-muted-foreground mb-3">{block.description}</p>
                            )}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Capacidade:</span>{' '}
                                <span className="font-medium">{block.primaryCapacity}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Complexidade:</span>{' '}
                                <span className="font-medium">{block.complexity}/5</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Impacto:</span>{' '}
                                <span className="font-medium">{block.impact}/5</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Exercícios:</span>{' '}
                                <span className="font-medium">{block._count?.exercisesList || 0}</span>
                              </div>
                            </div>
                            {block.secondaryCapacities.length > 0 && (
                              <div className="mt-2 flex gap-2 flex-wrap">
                                {block.secondaryCapacities.map((cap, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {cap}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXERCISES TAB - WITH CRUD */}
        <TabsContent value="exercises" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-green-400" />
                  Biblioteca de Exercícios
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Buscar exercícios..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-64"
                  />
                  <Button 
                    onClick={() => { resetExerciseForm(); setIsCreateExerciseOpen(true); }}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Exercício
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {exercises
                    .filter(ex => 
                      search === '' || 
                      ex.name.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((exercise) => (
                      <div key={exercise.id} className="p-4 border rounded-lg bg-card">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">{exercise.name}</h3>
                              {exercise.isLocked && <Lock className="h-4 w-4 text-amber-500" />}
                              {exercise.block && (
                                <Badge variant="outline" className="text-xs">
                                  {exercise.block.code}
                                </Badge>
                              )}
                              {exercise.difficulty && (
                                <Badge className="text-xs">{translateDifficulty(exercise.difficulty)}</Badge>
                              )}
                            </div>
                            {exercise.description && (
                              <p className="text-sm text-muted-foreground mb-2">{exercise.description}</p>
                            )}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              {exercise.muscleGroup && (
                                <div>
                                  <span className="text-muted-foreground">Grupo:</span>{' '}
                                  <span className="font-medium">{translateMuscleGroup(exercise.muscleGroup)}</span>
                                </div>
                              )}
                              {exercise.equipment && (
                                <div>
                                  <span className="text-muted-foreground">Equipamento:</span>{' '}
                                  <span className="font-medium">{translateEquipment(exercise.equipment)}</span>
                                </div>
                              )}
                              {exercise.defaultSets && (
                                <div>
                                  <span className="text-muted-foreground">Séries:</span>{' '}
                                  <span className="font-medium">{exercise.defaultSets}</span>
                                </div>
                              )}
                              {exercise.defaultReps && (
                                <div>
                                  <span className="text-muted-foreground">Reps:</span>{' '}
                                  <span className="font-medium">{exercise.defaultReps}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditExercise(exercise)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteExercise(exercise.id)}
                              disabled={exercise.isLocked}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RULES TAB - READ ONLY */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-red-400" />
                Regras de Decisão
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div key={rule.id} className="p-4 border rounded-lg bg-card">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-red-500/20 text-red-400">
                              Prioridade {rule.priority}
                            </Badge>
                            <h3 className="font-semibold">{rule.name}</h3>
                            {rule.isLocked && <Lock className="h-4 w-4 text-amber-500" />}
                            {rule.isActive ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          {rule.description && (
                            <p className="text-sm text-muted-foreground mb-3">{rule.description}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground font-medium">Blocos Permitidos:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {rule.allowedBlocks.length > 0 ? (
                              rule.allowedBlocks.slice(0, 3).map((block, i) => (
                                <Badge key={i} className="bg-green-500/20 text-green-400 text-xs">
                                  {block}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">Nenhum</span>
                            )}
                            {rule.allowedBlocks.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{rule.allowedBlocks.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground font-medium">Blocos Bloqueados:</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {rule.blockedBlocks.length > 0 ? (
                              rule.blockedBlocks.slice(0, 3).map((block, i) => (
                                <Badge key={i} className="bg-red-500/20 text-red-400 text-xs">
                                  {block}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">Nenhum</span>
                            )}
                            {rule.blockedBlocks.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{rule.blockedBlocks.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground font-medium">Recomendações:</span>
                          <div className="mt-1">
                            {rule.recommendations.length > 0 ? (
                              <span className="text-xs">{rule.recommendations.length} recomendações</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Nenhuma</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Exercise Create Dialog */}
      <Dialog open={isCreateExerciseOpen} onOpenChange={setIsCreateExerciseOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Exercício</DialogTitle>
            <DialogDescription>
              Adicione um novo exercício à biblioteca
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateExercise} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={exerciseForm.name}
                onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
                placeholder="Ex: Agachamento Livre"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={exerciseForm.description}
                onChange={(e) => setExerciseForm({ ...exerciseForm, description: e.target.value })}
                rows={2}
                placeholder="Descrição breve do exercício..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grupo Muscular</Label>
                <Select value={exerciseForm.muscleGroup} onValueChange={(v) => setExerciseForm({ ...exerciseForm, muscleGroup: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSCLE_GROUPS.map((group) => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Equipamento</Label>
                <Select value={exerciseForm.equipment} onValueChange={(v) => setExerciseForm({ ...exerciseForm, equipment: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENTS.map((eq) => (
                      <SelectItem key={eq} value={eq}>{eq}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dificuldade</Label>
                <Select value={exerciseForm.difficulty} onValueChange={(v) => setExerciseForm({ ...exerciseForm, difficulty: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((diff) => (
                      <SelectItem key={diff} value={diff}>{diff}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Bloco</Label>
                <Select value={exerciseForm.blockId} onValueChange={(v) => setExerciseForm({ ...exerciseForm, blockId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {blocks.map((block) => (
                      <SelectItem key={block.id} value={block.id}>
                        {block.code} - {block.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Séries</Label>
                <Input
                  type="number"
                  value={exerciseForm.defaultSets}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, defaultSets: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Repetições</Label>
                <Input
                  value={exerciseForm.defaultReps}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, defaultReps: e.target.value })}
                  placeholder="10-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Tempo</Label>
                <Input
                  value={exerciseForm.defaultTime}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, defaultTime: e.target.value })}
                  placeholder="30s"
                />
              </div>
              <div className="space-y-2">
                <Label>Descanso</Label>
                <Input
                  value={exerciseForm.defaultRest}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, defaultRest: e.target.value })}
                  placeholder="60s"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>URL do Vídeo</Label>
              <Input
                value={exerciseForm.videoUrl}
                onChange={(e) => setExerciseForm({ ...exerciseForm, videoUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateExerciseOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Criar Exercício'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Exercise Edit Dialog */}
      <Dialog open={isEditExerciseOpen} onOpenChange={setIsEditExerciseOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Exercício</DialogTitle>
            <DialogDescription>
              Atualize as informações do exercício
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditExercise} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={exerciseForm.name}
                onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={exerciseForm.description}
                onChange={(e) => setExerciseForm({ ...exerciseForm, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Grupo Muscular</Label>
                <Select value={exerciseForm.muscleGroup} onValueChange={(v) => setExerciseForm({ ...exerciseForm, muscleGroup: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSCLE_GROUPS.map((group) => (
                      <SelectItem key={group} value={group}>{group}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Equipamento</Label>
                <Select value={exerciseForm.equipment} onValueChange={(v) => setExerciseForm({ ...exerciseForm, equipment: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENTS.map((eq) => (
                      <SelectItem key={eq} value={eq}>{eq}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dificuldade</Label>
                <Select value={exerciseForm.difficulty} onValueChange={(v) => setExerciseForm({ ...exerciseForm, difficulty: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((diff) => (
                      <SelectItem key={diff} value={diff}>{diff}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Bloco</Label>
                <Select value={exerciseForm.blockId} onValueChange={(v) => setExerciseForm({ ...exerciseForm, blockId: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {blocks.map((block) => (
                      <SelectItem key={block.id} value={block.id}>
                        {block.code} - {block.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Séries</Label>
                <Input
                  type="number"
                  value={exerciseForm.defaultSets}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, defaultSets: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Repetições</Label>
                <Input
                  value={exerciseForm.defaultReps}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, defaultReps: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tempo</Label>
                <Input
                  value={exerciseForm.defaultTime}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, defaultTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Descanso</Label>
                <Input
                  value={exerciseForm.defaultRest}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, defaultRest: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>URL do Vídeo</Label>
              <Input
                value={exerciseForm.videoUrl}
                onChange={(e) => setExerciseForm({ ...exerciseForm, videoUrl: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditExerciseOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button for Mobile */}
      <FloatingActionButton 
        actions={[
          {
            label: 'Novo Exercício',
            onClick: () => { resetExerciseForm(); setIsCreateExerciseOpen(true); },
            icon: <Plus className="h-5 w-5" />
          }
        ]}
      />
    </div>
  )
}
