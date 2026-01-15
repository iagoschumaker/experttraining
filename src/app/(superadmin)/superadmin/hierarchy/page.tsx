'use client'

// ============================================================================
// EXPERT TRAINING - SUPERADMIN HIERARCHY PAGE
// ============================================================================
// Gerenciamento da hierarquia do Método Expert Training
// - Níveis de progressão (Condicionamento → Iniciante → Intermediário → Avançado)
// - Capacidades físicas e seus relacionamentos
// - Padrões de movimento e suas dependências
// - Regras de progressão e bloqueio
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
  Pyramid, Plus, Search, Pencil, Trash2, Lock, ArrowUpRight, 
  ArrowRight, Shield, Zap, Target, Activity, ChevronLeft, ChevronRight,
  Eye, Edit, AlertTriangle, CheckCircle, XCircle
} from 'lucide-react'
import { FloatingActionButton, StatsCard, StatsGrid } from '@/components/ui'

// ============================================================================
// TYPES
// ============================================================================

interface HierarchyLevel {
  id: string
  level: number
  name: string
  description: string | null
  requirements: string[]
  blockedCapacities: string[]
  allowedCapacities: string[]
  minScore: number
  isActive: boolean
  isLocked: boolean
  createdAt: string
  updatedAt: string
}

interface Capacity {
  id: string
  name: string
  code: string
  description: string | null
  category: string
  prerequisites: string[]
  blockedBy: string[]
  isActive: boolean
  isLocked: boolean
  _count?: { exercises: number; blocks: number }
}

interface MovementPattern {
  id: string
  name: string
  code: string
  description: string | null
  primaryCapacities: string[]
  secondaryCapacities: string[]
  progression: string[]
  isActive: boolean
  isLocked: boolean
  _count?: { blocks: number }
}

interface Stats {
  totalLevels: number
  totalCapacities: number
  totalPatterns: number
  activeLevels: number
  lockedItems: number
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LEVEL_NAMES = {
  0: 'Condicionamento',
  1: 'Iniciante', 
  2: 'Intermediário',
  3: 'Avançado'
}

const CAPACITY_CATEGORIES = [
  'CONDICIONAMENTO',
  'FORÇA', 
  'POTÊNCIA',
  'HIPERTROFIA',
  'RESISTÊNCIA',
  'MOBILIDADE',
  'ESTABILIDADE',
  'COORDENAÇÃO'
]

const MOVEMENT_PATTERNS = [
  'SQUAT', 'HINGE', 'LUNGE', 'PUSH', 'PULL', 'ROTATION', 'GAIT', 'CARRY'
]

// ============================================================================
// COMPONENT
// ============================================================================

export default function SuperAdminHierarchyPage() {
  // State
  const [levels, setLevels] = useState<HierarchyLevel[]>([])
  const [capacities, setCapacities] = useState<Capacity[]>([])
  const [patterns, setPatterns] = useState<MovementPattern[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('levels')

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [createType, setCreateType] = useState<'level' | 'capacity' | 'pattern'>('level')

  // Form
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    level: '1',
    requirements: [] as string[],
    blockedCapacities: [] as string[],
    allowedCapacities: [] as string[],
    minScore: '70',
    category: '',
    prerequisites: [] as string[],
    primaryCapacities: [] as string[],
    secondaryCapacities: [] as string[],
    code: '',
    isActive: true,
    isLocked: true,
  })

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchHierarchy = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/superadmin/hierarchy')
      const data = await res.json()
      
      if (data.success) {
        setLevels(data.data.levels || [])
        setCapacities(data.data.capacities || [])
        setPatterns(data.data.patterns || [])
        setStats(data.data.stats || null)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHierarchy() }, [])

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const resetForm = () => setFormData({
    name: '', description: '', level: '1', requirements: [], blockedCapacities: [],
    allowedCapacities: [], minScore: '70', category: '', prerequisites: [],
    primaryCapacities: [], secondaryCapacities: [], code: '', isActive: true, isLocked: true,
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      let endpoint = '/api/superadmin/hierarchy'
      let body: any = {}

      if (createType === 'level') {
        endpoint += '/levels'
        body = {
          level: parseInt(formData.level),
          name: formData.name,
          description: formData.description || undefined,
          requirements: formData.requirements,
          blockedCapacities: formData.blockedCapacities,
          allowedCapacities: formData.allowedCapacities,
          minScore: parseInt(formData.minScore),
          isActive: formData.isActive,
        }
      } else if (createType === 'capacity') {
        endpoint += '/capacities'
        body = {
          name: formData.name,
          code: formData.code.toUpperCase(),
          description: formData.description || undefined,
          category: formData.category,
          prerequisites: formData.prerequisites,
          isActive: formData.isActive,
        }
      } else if (createType === 'pattern') {
        endpoint += '/patterns'
        body = {
          name: formData.name,
          code: formData.code.toUpperCase(),
          description: formData.description || undefined,
          primaryCapacities: formData.primaryCapacities,
          secondaryCapacities: formData.secondaryCapacities,
          isActive: formData.isActive,
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setIsCreateOpen(false)
        resetForm()
        fetchHierarchy()
      } else {
        const error = await res.json()
        alert(`Erro: ${error.error || 'Erro ao criar'}`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Erro ao criar')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (item: any, type: string) => {
    setSelectedItem(item)
    setCreateType(type as any)
    
    if (type === 'level') {
      setFormData({
        name: item.name,
        description: item.description || '',
        level: item.level.toString(),
        requirements: item.requirements || [],
        blockedCapacities: item.blockedCapacities || [],
        allowedCapacities: item.allowedCapacities || [],
        minScore: item.minScore?.toString() || '70',
        category: '',
        prerequisites: [],
        primaryCapacities: [],
        secondaryCapacities: [],
        code: '',
        isActive: item.isActive,
        isLocked: item.isLocked,
      })
    } else if (type === 'capacity') {
      setFormData({
        name: item.name,
        description: item.description || '',
        code: item.code,
        category: item.category,
        prerequisites: item.prerequisites || [],
        level: '',
        requirements: [],
        blockedCapacities: [],
        allowedCapacities: [],
        minScore: '',
        primaryCapacities: [],
        secondaryCapacities: [],
        isActive: item.isActive,
        isLocked: item.isLocked,
      })
    } else if (type === 'pattern') {
      setFormData({
        name: item.name,
        description: item.description || '',
        code: item.code,
        primaryCapacities: item.primaryCapacities || [],
        secondaryCapacities: item.secondaryCapacities || [],
        level: '',
        requirements: [],
        blockedCapacities: [],
        allowedCapacities: [],
        minScore: '',
        category: '',
        prerequisites: [],
        isActive: item.isActive,
        isLocked: item.isLocked,
      })
    }
    
    setIsEditOpen(true)
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
            <Pyramid className="h-6 w-6 text-amber-500" />
            Hierarquia do Método
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie níveis, capacidades e padrões de movimento do Método Expert Training
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="hidden md:flex gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4" /> Novo Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Item</DialogTitle>
              <DialogDescription>
                Adicione um novo nível, capacidade ou padrão à hierarquia
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Type Selection */}
              <div className="space-y-2">
                <Label>Tipo de Item</Label>
                <Select value={createType} onValueChange={(v: any) => setCreateType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="level">Nível de Progressão</SelectItem>
                    <SelectItem value="capacity">Capacidade Física</SelectItem>
                    <SelectItem value="pattern">Padrão de Movimento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Common Fields */}
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={createType === 'level' ? 'Ex: Intermediário' : 'Ex: Força'}
                  required
                />
              </div>

              {createType !== 'level' && (
                <div className="space-y-2">
                  <Label>Código *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Ex: FORCA"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Descreva este item da hierarquia..."
                />
              </div>

              {/* Type-specific Fields */}
              {createType === 'level' && (
                <>
                  <div className="space-y-2">
                    <Label>Nível</Label>
                    <Select value={formData.level} onValueChange={(v) => setFormData({ ...formData, level: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 - Condicionamento</SelectItem>
                        <SelectItem value="1">1 - Iniciante</SelectItem>
                        <SelectItem value="2">2 - Intermediário</SelectItem>
                        <SelectItem value="3">3 - Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Score Mínimo</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.minScore}
                      onChange={(e) => setFormData({ ...formData, minScore: e.target.value })}
                    />
                  </div>
                </>
              )}

              {createType === 'capacity' && (
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAPACITY_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : 'Criar Item'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && (
        <StatsGrid columns={4}>
          <StatsCard
            title="Total de Itens"
            value={stats.totalLevels + stats.totalCapacities + stats.totalPatterns}
            icon={<Pyramid className="h-4 w-4" />}
            iconColor="text-amber-500"
            iconBgColor="bg-amber-500/10"
          />
          <StatsCard
            title="Níveis"
            value={stats.totalLevels}
            icon={<Target className="h-4 w-4" />}
            iconColor="text-blue-500"
            iconBgColor="bg-blue-500/10"
          />
          <StatsCard
            title="Capacidades"
            value={stats.totalCapacities}
            icon={<Zap className="h-4 w-4" />}
            iconColor="text-green-500"
            iconBgColor="bg-green-500/10"
          />
          <StatsCard
            title="Protegidos"
            value={stats.lockedItems}
            icon={<Lock className="h-4 w-4" />}
            iconColor="text-amber-500"
            iconBgColor="bg-amber-500/10"
          />
        </StatsGrid>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="levels" className="flex items-center justify-center gap-1 px-2">
            <Pyramid className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline text-xs">Níveis</span>
          </TabsTrigger>
          <TabsTrigger value="capacities" className="flex items-center justify-center gap-1 px-2">
            <Zap className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline text-xs">Capacidades</span>
          </TabsTrigger>
          <TabsTrigger value="patterns" className="flex items-center justify-center gap-1 px-2">
            <Activity className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline text-xs">Padrões</span>
          </TabsTrigger>
        </TabsList>

        {/* Levels Tab */}
        <TabsContent value="levels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pyramid className="h-5 w-5 text-blue-400" />
                Níveis de Progressão
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {levels
                    .sort((a, b) => a.level - b.level)
                    .map((level) => (
                      <div key={level.id} className="p-4 border rounded-lg bg-card">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge className="bg-blue-500/20 text-blue-400">
                                Nível {level.level}
                              </Badge>
                              <h3 className="font-semibold text-lg">{level.name}</h3>
                              {level.isLocked && <Lock className="h-4 w-4 text-amber-500" />}
                              {level.isActive ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            {level.description && (
                              <p className="text-muted-foreground mb-3">{level.description}</p>
                            )}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Score Mínimo:</span> {level.minScore || 70}
                              </div>
                              <div>
                                <span className="font-medium">Status:</span>{' '}
                                <Badge variant={level.isActive ? 'success' : 'secondary'}>
                                  {level.isActive ? 'Ativo' : 'Inativo'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(level, 'level')}
                            >
                              <Pencil className="h-4 w-4" />
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

        {/* Capacities Tab */}
        <TabsContent value="capacities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-400" />
                Capacidades Físicas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="grid gap-4">
                  {capacities.map((capacity) => (
                    <div key={capacity.id} className="p-4 border rounded-lg bg-card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-green-500/20 text-green-400 font-mono">
                              {capacity.code}
                            </Badge>
                            <h3 className="font-semibold">{capacity.name}</h3>
                            {capacity.isLocked && <Lock className="h-4 w-4 text-amber-500" />}
                            <Badge variant="outline">{capacity.category}</Badge>
                          </div>
                          {capacity.description && (
                            <p className="text-muted-foreground text-sm mb-2">{capacity.description}</p>
                          )}
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>Exercícios: {capacity._count?.exercises || 0}</span>
                            <span>Blocos: {capacity._count?.blocks || 0}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(capacity, 'capacity')}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-purple-400" />
                Padrões de Movimento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="grid gap-4">
                  {patterns.map((pattern) => (
                    <div key={pattern.id} className="p-4 border rounded-lg bg-card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge className="bg-purple-500/20 text-purple-400 font-mono">
                              {pattern.code}
                            </Badge>
                            <h3 className="font-semibold">{pattern.name}</h3>
                            {pattern.isLocked && <Lock className="h-4 w-4 text-amber-500" />}
                          </div>
                          {pattern.description && (
                            <p className="text-muted-foreground text-sm mb-2">{pattern.description}</p>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            {pattern.primaryCapacities.map((cap, i) => (
                              <Badge key={i} className="bg-green-500/20 text-green-400 text-xs">
                                {cap}
                              </Badge>
                            ))}
                            {pattern.secondaryCapacities.map((cap, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {cap}
                              </Badge>
                            ))}
                          </div>
                          <div className="mt-2 text-sm text-muted-foreground">
                            Blocos: {pattern._count?.blocks || 0}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(pattern, 'pattern')}
                        >
                          <Pencil className="h-4 w-4" />
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

      {/* Floating Action Button for Mobile */}
      <FloatingActionButton 
        actions={[
          {
            label: 'Novo Item',
            onClick: () => { resetForm(); setIsCreateOpen(true); },
            icon: <Plus className="h-5 w-5" />
          }
        ]}
      />
    </div>
  )
}
