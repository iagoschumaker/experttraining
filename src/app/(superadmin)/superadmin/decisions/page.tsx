'use client'

// ============================================================================
// EXPERT TRAINING - SUPERADMIN DECISIONS PAGE
// ============================================================================
// Gerenciamento do Motor de Decisão do Método Expert Training
// - Análise de avaliação funcional
// - Geração de recomendações
// - Lógica de seleção de blocos
// - Configuração de pesos e parâmetros
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
  Brain, Plus, Search, Pencil, Trash2, Lock, Settings, Play, 
  Pause, BarChart3, Target, Zap, AlertTriangle, CheckCircle, 
  Eye, RefreshCw, Download, Upload, FileText, Cpu
} from 'lucide-react'
import { FloatingActionButton } from '@/components/ui'

// ============================================================================
// TYPES
// ============================================================================

interface DecisionEngine {
  id: string
  name: string
  version: string
  status: 'ACTIVE' | 'INACTIVE' | 'TESTING'
  config: {
    baseConfidence: number
    levelModifiers: Record<string, number>
    painThresholds: Record<string, number>
    weights: {
      movementPattern: number
      painMap: number
      level: number
      complaints: number
    }
  }
  algorithms: Algorithm[]
  isActive: boolean
  isLocked: boolean
  createdAt: string
  updatedAt: string
}

interface Algorithm {
  id: string
  name: string
  type: 'PATTERN_ANALYSIS' | 'PAIN_ANALYSIS' | 'LEVEL_ASSESSMENT' | 'CONFIDENCE_CALCULATION'
  description: string | null
  config: any
  priority: number
  isActive: boolean
  isLocked: boolean
}

interface DecisionLog {
  id: string
  assessmentId: string
  input: any
  output: any
  processingTime: number
  confidence: number
  algorithm: string
  timestamp: string
  success: boolean
}

interface Stats {
  totalEngines: number
  activeEngines: number
  totalAlgorithms: number
  dailyDecisions: number
  avgConfidence: number
  avgProcessingTime: number
  successRate: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ALGORITHM_TYPES = [
  { value: 'PATTERN_ANALYSIS', label: 'Análise de Padrão', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'PAIN_ANALYSIS', label: 'Análise de Dor', color: 'bg-red-500/20 text-red-400' },
  { value: 'LEVEL_ASSESSMENT', label: 'Avaliação de Nível', color: 'bg-green-500/20 text-green-400' },
  { value: 'CONFIDENCE_CALCULATION', label: 'Cálculo de Confiança', color: 'bg-purple-500/20 text-purple-400' },
]

const MOVEMENT_PATTERNS = [
  'SQUAT', 'HINGE', 'LUNGE', 'PUSH', 'PULL', 'ROTATION', 'GAIT'
]

const PAIN_REGIONS = [
  'lower_back', 'knee', 'shoulder', 'neck', 'hip', 'ankle', 'elbow', 'wrist'
]

// ============================================================================
// COMPONENT
// ============================================================================

export default function SuperAdminDecisionsPage() {
  // State
  const [engines, setEngines] = useState<DecisionEngine[]>([])
  const [logs, setLogs] = useState<DecisionLog[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('engines')

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isTestOpen, setIsTestOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [selectedEngine, setSelectedEngine] = useState<DecisionEngine | null>(null)
  const [selectedLog, setSelectedLog] = useState<DecisionLog | null>(null)

  // Form
  const [formData, setFormData] = useState({
    name: '',
    version: '1.0.0',
    baseConfidence: '60',
    movementPatternWeight: '40',
    painMapWeight: '30',
    levelWeight: '20',
    complaintsWeight: '10',
    description: '',
    isActive: true,
    isLocked: true,
  })

  // Test Form
  const [testData, setTestData] = useState({
    level: 'INTERMEDIATE',
    movementScores: {
      squat: 2,
      hinge: 2,
      lunge: 3,
      push: 2,
      pull: 2,
      rotation: 1,
      gait: 3,
    },
    painMap: {
      lower_back: 3,
      knee: 0,
      shoulder: 0,
      neck: 0,
      hip: 2,
      ankle: 0,
    },
    complaints: ['Dor lombar leve', 'Dificuldade em agachar'],
  })

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchDecisions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/superadmin/decisions')
      const data = await res.json()
      
      if (data.success) {
        setEngines(data.data.engines || [])
        setLogs(data.data.logs || [])
        setStats(data.data.stats || null)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDecisions() }, [])

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const resetForm = () => setFormData({
    name: '', version: '1.0.0', baseConfidence: '60', movementPatternWeight: '40',
    painMapWeight: '30', levelWeight: '20', complaintsWeight: '10',
    description: '', isActive: true, isLocked: true,
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const body = {
        name: formData.name,
        version: formData.version,
        config: {
          baseConfidence: parseInt(formData.baseConfidence),
          weights: {
            movementPattern: parseInt(formData.movementPatternWeight),
            painMap: parseInt(formData.painMapWeight),
            level: parseInt(formData.levelWeight),
            complaints: parseInt(formData.complaintsWeight),
          },
        },
        isActive: formData.isActive,
      }

      const res = await fetch('/api/superadmin/decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setIsCreateOpen(false)
        resetForm()
        fetchDecisions()
      } else {
        const error = await res.json()
        alert(`Erro: ${error.error || 'Erro ao criar motor'}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erro ao criar motor')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await fetch('/api/superadmin/decisions/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData),
      })

      const data = await res.json()
      if (data.success) {
        alert(`Teste concluído!\n\nConfiança: ${(data.data.confidence * 100).toFixed(1)}%\nPadrão: ${data.data.functionalPattern}\nTempo: ${data.data.processingTime}ms`)
      } else {
        alert(`Erro no teste: ${data.error}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erro ao executar teste')
    } finally {
      setTesting(false)
    }
  }

  const toggleEngineStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/superadmin/decisions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      if (res.ok) {
        fetchDecisions()
      }
    } catch (error) {
      console.error('Error:', error)
    }
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
            <Brain className="h-6 w-6 text-amber-500" />
            Motor de Decisão
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie o motor de IA que analisa avaliações e gera recomendações
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="hidden md:flex gap-2"
            onClick={() => setIsTestOpen(true)}
          >
            <Play className="h-4 w-4" /> Testar Motor
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="hidden md:flex gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-4 w-4" /> Novo Motor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Motor de Decisão</DialogTitle>
                <DialogDescription>
                  Configure um novo motor para análise de avaliações funcionais
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Motor Expert Training v2"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Versão *</Label>
                    <Input
                      value={formData.version}
                      onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                      placeholder="1.0.0"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Confiança Base (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.baseConfidence}
                    onChange={(e) => setFormData({ ...formData, baseConfidence: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Pesos dos Fatores</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Padrão de Movimento (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.movementPatternWeight}
                        onChange={(e) => setFormData({ ...formData, movementPatternWeight: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Mapa de Dor (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.painMapWeight}
                        onChange={(e) => setFormData({ ...formData, painMapWeight: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Nível (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.levelWeight}
                        onChange={(e) => setFormData({ ...formData, levelWeight: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Queixas (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.complaintsWeight}
                        onChange={(e) => setFormData({ ...formData, complaintsWeight: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Salvando...' : 'Criar Motor'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Motores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEngines}</div>
              <div className="text-xs text-green-400">{stats.activeEngines} ativos</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Algoritmos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAlgorithms}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Decisões/Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{stats.dailyDecisions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Confiança Média
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{(stats.avgConfidence * 100).toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tempo Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-400">{stats.avgProcessingTime}ms</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Sucesso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">{(stats.successRate * 100).toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="engines" className="flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Motores
          </TabsTrigger>
          <TabsTrigger value="algorithms" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Algoritmos
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Engines Tab */}
        <TabsContent value="engines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-amber-400" />
                Motores de Decisão
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {engines.map((engine) => (
                    <div key={engine.id} className="p-4 border rounded-lg bg-card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
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
                            <div>
                              <span className="text-muted-foreground">Atualizado:</span>{' '}
                              <span className="font-medium">
                                {new Date(engine.updatedAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleEngineStatus(engine.id, engine.isActive)}
                          >
                            {engine.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedEngine(engine); setIsViewOpen(true); }}
                          >
                            <Eye className="h-4 w-4" />
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

        {/* Algorithms Tab */}
        <TabsContent value="algorithms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-400" />
                Algoritmos do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {ALGORITHM_TYPES.map((type) => {
                  const algorithms = engines.flatMap(e => e.algorithms || []).filter(a => a.type === type.value)
                  return (
                    <div key={type.value} className="p-4 border rounded-lg bg-card">
                      <div className="flex items-center gap-3 mb-3">
                        <Badge className={type.color}>{type.label}</Badge>
                        <span className="text-sm text-muted-foreground">{algorithms.length} algoritmos</span>
                      </div>
                      <div className="space-y-2">
                        {algorithms.map((algo) => (
                          <div key={algo.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                            <div>
                              <span className="font-medium">{algo.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">Prioridade: {algo.priority}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {algo.isLocked && <Lock className="h-3 w-3 text-amber-500" />}
                              <Badge variant={algo.isActive ? 'success' : 'secondary'}>
                                {algo.isActive ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {algorithms.length === 0 && (
                          <div className="text-center py-4 text-muted-foreground">
                            Nenhum algoritmo deste tipo encontrado
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                Logs de Processamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Nenhum log encontrado</p>
                  <p className="text-sm">Os logs de processamento aparecerão aqui</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="p-3 border rounded-lg bg-card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className={log.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                              {log.success ? 'Sucesso' : 'Erro'}
                            </Badge>
                            <span className="font-medium">{log.algorithm}</span>
                            <span className="text-sm text-muted-foreground">
                              Confiança: {(log.confidence * 100).toFixed(1)}%
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Tempo: {log.processingTime}ms
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString('pt-BR')}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedLog(log); setIsViewOpen(true); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Dialog */}
      <Dialog open={isTestOpen} onOpenChange={setIsTestOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Testar Motor de Decisão</DialogTitle>
            <DialogDescription>
              Simule uma avaliação para testar o motor de decisão
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nível do Aluno</Label>
              <Select value={testData.level} onValueChange={(v: any) => setTestData({ ...testData, level: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BEGINNER">Iniciante</SelectItem>
                  <SelectItem value="INTERMEDIATE">Intermediário</SelectItem>
                  <SelectItem value="ADVANCED">Avançado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Scores dos Padrões de Movimento (0-3)</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(testData.movementScores).map(([pattern, score]) => (
                  <div key={pattern} className="flex items-center gap-2">
                    <Label className="text-sm capitalize">{pattern}:</Label>
                    <Input
                      type="number"
                      min="0"
                      max="3"
                      value={score}
                      onChange={(e) => setTestData({
                        ...testData,
                        movementScores: {
                          ...testData.movementScores,
                          [pattern]: parseInt(e.target.value)
                        }
                      })}
                      className="w-16"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Queixas (separadas por vírgula)</Label>
              <Textarea
                value={testData.complaints.join(', ')}
                onChange={(e) => setTestData({
                  ...testData,
                  complaints: e.target.value.split(',').map(c => c.trim()).filter(c => c)
                })}
                placeholder="Dor lombar, dificuldade em agachar..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsTestOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleTest} disabled={testing}>
              {testing ? 'Testando...' : 'Executar Teste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button for Mobile */}
      <FloatingActionButton 
        actions={[
          {
            label: 'Novo Motor',
            onClick: () => { resetForm(); setIsCreateOpen(true); },
            icon: <Plus className="h-5 w-5" />
          },
          {
            label: 'Testar Motor',
            onClick: () => setIsTestOpen(true),
            icon: <Play className="h-5 w-5" />
          }
        ]}
      />
    </div>
  )
}
