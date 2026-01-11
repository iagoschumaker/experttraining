'use client'

// ============================================================================
// EXPERT TRAINING - SUPERADMIN EXERCISES PAGE (100% IMPROVED)
// ============================================================================
// Gerenciamento completo de exercícios do método Expert Training
// - Prescrição padrão (sets, reps, time, rest)
// - Notas técnicas do método
// - Vinculação a blocos
// - Estatísticas de uso
// - Filtros avançados
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { 
  Dumbbell, Plus, Search, Pencil, Trash2, Video, Lock, 
  Clock, RotateCcw, Hash, FileText, Target, Activity,
  ChevronLeft, ChevronRight, Eye, Layers, AlertCircle
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface Block {
  id: string
  name: string
  code: string
  level: number
  levelName?: string
  primaryCapacity?: string
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

interface Stats {
  total: number
  withVideo: number
  withBlock: number
  orphans: number
  byDifficulty: {
    beginner: number
    intermediate: number
    advanced: number
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MUSCLE_GROUPS = [
  'Peitoral', 'Dorsal', 'Deltoides', 'Bíceps', 'Tríceps', 
  'Core', 'Quadríceps', 'Posterior', 'Glúteos', 'Panturrilha', 
  'Antebraço', 'Trapézio', 'Full Body', 'Cervical', 'Lombar'
]

const EXERCISE_TYPES = [
  'Força', 'Potência', 'Mobilidade', 'Estabilidade', 
  'Cardio', 'Aquecimento', 'Alongamento', 'Ativação', 
  'Funcional', 'Pliométrico', 'Isométrico'
]

const EQUIPMENTS = [
  'Peso Corporal', 'Barra', 'Halteres', 'Kettlebell', 
  'Cabo', 'Máquina', 'Elástico', 'TRX', 'Medicine Ball', 
  'Box', 'Foam Roller', 'Mini Band', 'Corda', 'Step', 'Banco'
]

const DIFFICULTIES = [
  { value: 'BEGINNER', label: 'Iniciante', color: 'bg-green-500/20 text-green-400' },
  { value: 'INTERMEDIATE', label: 'Intermediário', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'ADVANCED', label: 'Avançado', color: 'bg-red-500/20 text-red-400' },
]

const LEVEL_CONFIG: Record<number, { label: string; color: string }> = {
  0: { label: 'Condicionamento', color: 'bg-blue-500/20 text-blue-400' },
  1: { label: 'Iniciante', color: 'bg-green-500/20 text-green-400' },
  2: { label: 'Intermediário', color: 'bg-yellow-500/20 text-yellow-400' },
  3: { label: 'Avançado', color: 'bg-red-500/20 text-red-400' },
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function SuperAdminExercisesPage() {
  // State
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [muscleGroups, setMuscleGroups] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [search, setSearch] = useState('')
  const [filterMuscle, setFilterMuscle] = useState('all')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [filterBlock, setFilterBlock] = useState('all')
  const [showOrphans, setShowOrphans] = useState(false)
  
  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  
  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)

  // Form
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: '',
    muscleGroup: '',
    equipment: '',
    difficulty: '',
    defaultSets: '',
    defaultReps: '',
    defaultTime: '',
    defaultRest: '',
    technicalNotes: '',
    instructions: '',
    videoUrl: '',
    orderInBlock: '',
    blockId: '',
  })

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchExercises = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: '20' })
      if (search) params.set('search', search)
      if (filterMuscle && filterMuscle !== 'all') params.set('muscleGroup', filterMuscle)
      if (filterDifficulty && filterDifficulty !== 'all') params.set('difficulty', filterDifficulty)
      if (filterBlock && filterBlock !== 'all') params.set('blockId', filterBlock)
      if (showOrphans) params.set('orphans', 'true')
      
      const res = await fetch(`/api/exercises?${params}`)
      const data = await res.json()
      
      if (data.success) {
        setExercises(data.data.items)
        setTotalPages(data.data.totalPages)
        setTotal(data.data.total)
        setStats(data.data.stats)
        if (data.data.muscleGroups) setMuscleGroups(data.data.muscleGroups)
        if (data.data.blocks) setBlocks(data.data.blocks)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    fetchExercises() 
  }, [page, search, filterMuscle, filterDifficulty, filterBlock, showOrphans])

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const resetForm = () => setFormData({
    name: '', description: '', type: '', muscleGroup: '', equipment: '', 
    difficulty: '', defaultSets: '', defaultReps: '', defaultTime: '', 
    defaultRest: '', technicalNotes: '', instructions: '', videoUrl: '',
    orderInBlock: '', blockId: '',
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type || undefined,
        muscleGroup: formData.muscleGroup || undefined,
        equipment: formData.equipment || undefined,
        difficulty: formData.difficulty || undefined,
        defaultSets: formData.defaultSets ? parseInt(formData.defaultSets) : undefined,
        defaultReps: formData.defaultReps || undefined,
        defaultTime: formData.defaultTime || undefined,
        defaultRest: formData.defaultRest || undefined,
        technicalNotes: formData.technicalNotes || undefined,
        instructions: formData.instructions || undefined,
        videoUrl: formData.videoUrl || null,
        orderInBlock: formData.orderInBlock ? parseInt(formData.orderInBlock) : undefined,
        blockId: formData.blockId || null,
      }
      
      const res = await fetch('/api/exercises', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body) 
      })
      const data = await res.json()
      
      if (data.success) { 
        setIsCreateOpen(false)
        resetForm()
        fetchExercises()
      } else {
        alert(data.error)
      }
    } catch { 
      alert('Erro ao criar') 
    } finally { 
      setSaving(false) 
    }
  }

  const openEdit = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setFormData({
      name: exercise.name,
      description: exercise.description || '',
      type: exercise.type || '',
      muscleGroup: exercise.muscleGroup || '',
      equipment: exercise.equipment || '',
      difficulty: exercise.difficulty || '',
      defaultSets: exercise.defaultSets?.toString() || '',
      defaultReps: exercise.defaultReps || '',
      defaultTime: exercise.defaultTime || '',
      defaultRest: exercise.defaultRest || '',
      technicalNotes: exercise.technicalNotes || '',
      instructions: exercise.instructions || '',
      videoUrl: exercise.videoUrl || '',
      orderInBlock: exercise.orderInBlock?.toString() || '',
      blockId: exercise.block?.id || '',
    })
    setIsEditOpen(true)
  }

  const openView = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setIsViewOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedExercise) return
    setSaving(true)
    try {
      const body = {
        name: formData.name,
        description: formData.description || null,
        type: formData.type || null,
        muscleGroup: formData.muscleGroup || null,
        equipment: formData.equipment || null,
        difficulty: formData.difficulty || null,
        defaultSets: formData.defaultSets ? parseInt(formData.defaultSets) : null,
        defaultReps: formData.defaultReps || null,
        defaultTime: formData.defaultTime || null,
        defaultRest: formData.defaultRest || null,
        technicalNotes: formData.technicalNotes || null,
        instructions: formData.instructions || null,
        videoUrl: formData.videoUrl || null,
        orderInBlock: formData.orderInBlock ? parseInt(formData.orderInBlock) : null,
        blockId: formData.blockId || null,
      }
      
      const res = await fetch(`/api/exercises/${selectedExercise.id}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(body) 
      })
      const data = await res.json()
      
      if (data.success) { 
        setIsEditOpen(false)
        fetchExercises()
      } else {
        alert(data.error)
      }
    } catch { 
      alert('Erro ao atualizar') 
    } finally { 
      setSaving(false) 
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este exercício? (Soft delete - pode ser reativado)')) return
    try {
      const res = await fetch(`/api/exercises/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) fetchExercises()
      else alert(data.error)
    } catch { 
      alert('Erro ao excluir') 
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getDifficultyBadge = (difficulty: string | null) => {
    const config = DIFFICULTIES.find(d => d.value === difficulty)
    return config ? (
      <Badge className={config.color}>{config.label}</Badge>
    ) : (
      <span className="text-gray-500">-</span>
    )
  }

  const getBlockBadge = (block: Block | null) => {
    if (!block) return <Badge variant="outline" className="border-gray-600 text-gray-500">Sem bloco</Badge>
    const levelConfig = LEVEL_CONFIG[block.level]
    return (
      <Badge className={levelConfig?.color || 'bg-gray-500/20 text-gray-400'}>
        {block.code}
      </Badge>
    )
  }

  // ============================================================================
  // FORM COMPONENT
  // ============================================================================

  const FormContent = ({ onSubmit, isEdit = false }: { onSubmit: (e: React.FormEvent) => void; isEdit?: boolean }) => (
    <form id="exercise-form" onSubmit={onSubmit} className="space-y-4">
      <Tabs defaultValue="basic">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
          <TabsTrigger value="basic">Básico</TabsTrigger>
          <TabsTrigger value="prescription">Prescrição</TabsTrigger>
          <TabsTrigger value="notes">Notas</TabsTrigger>
        </TabsList>
        
        {/* Tab Básico */}
        <TabsContent value="basic" className="space-y-4 py-4 max-h-[50vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label className="text-gray-300">Nome *</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                className="bg-gray-800 border-gray-700 text-white" 
                placeholder="Ex: Agachamento Goblet"
                required 
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-300">Tipo</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {EXERCISE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-300">Bloco</Label>
              <Select value={formData.blockId} onValueChange={(v) => setFormData({ ...formData, blockId: v })}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {blocks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      [{b.code}] {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-300">Grupo Muscular</Label>
              <Select value={formData.muscleGroup} onValueChange={(v) => setFormData({ ...formData, muscleGroup: v })}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-300">Equipamento</Label>
              <Select value={formData.equipment} onValueChange={(v) => setFormData({ ...formData, equipment: v })}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPMENTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-300">Dificuldade</Label>
              <Select value={formData.difficulty} onValueChange={(v) => setFormData({ ...formData, difficulty: v })}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-300">Ordem no Bloco</Label>
              <Input 
                type="number"
                min="1"
                value={formData.orderInBlock} 
                onChange={(e) => setFormData({ ...formData, orderInBlock: e.target.value })} 
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="1"
              />
            </div>
            
            <div className="col-span-2 space-y-2">
              <Label className="text-gray-300">Descrição</Label>
              <Textarea 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                className="bg-gray-800 border-gray-700 text-white" 
                rows={2}
                placeholder="Descrição breve do exercício..."
              />
            </div>
          </div>
        </TabsContent>
        
        {/* Tab Prescrição */}
        <TabsContent value="prescription" className="space-y-4 py-4">
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-4">
            <p className="text-amber-400 text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Valores padrão do Método Expert Training (podem ser ajustados pelo trainer)
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <Hash className="h-4 w-4" /> Séries
              </Label>
              <Input 
                type="number"
                min="1"
                max="10"
                value={formData.defaultSets} 
                onChange={(e) => setFormData({ ...formData, defaultSets: e.target.value })} 
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="3"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <RotateCcw className="h-4 w-4" /> Repetições
              </Label>
              <Input 
                value={formData.defaultReps} 
                onChange={(e) => setFormData({ ...formData, defaultReps: e.target.value })} 
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="10-12 ou AMRAP"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Tempo
              </Label>
              <Input 
                value={formData.defaultTime} 
                onChange={(e) => setFormData({ ...formData, defaultTime: e.target.value })} 
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="30s ou 1min"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Descanso
              </Label>
              <Input 
                value={formData.defaultRest} 
                onChange={(e) => setFormData({ ...formData, defaultRest: e.target.value })} 
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="60s"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-gray-300 flex items-center gap-2">
              <Video className="h-4 w-4" /> URL do Vídeo
            </Label>
            <Input 
              value={formData.videoUrl} 
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })} 
              placeholder="https://youtube.com/..." 
              className="bg-gray-800 border-gray-700 text-white" 
            />
          </div>
        </TabsContent>
        
        {/* Tab Notas */}
        <TabsContent value="notes" className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-gray-300 flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-500" /> Notas Técnicas do Método
            </Label>
            <Textarea 
              value={formData.technicalNotes} 
              onChange={(e) => setFormData({ ...formData, technicalNotes: e.target.value })} 
              className="bg-gray-800 border-gray-700 text-white" 
              rows={4}
              placeholder="Pontos-chave de execução, cuidados, variações..."
            />
            <p className="text-xs text-gray-500">Visível apenas para trainers, não para alunos</p>
          </div>
          
          <div className="space-y-2">
            <Label className="text-gray-300 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Instruções para Aluno
            </Label>
            <Textarea 
              value={formData.instructions} 
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} 
              className="bg-gray-800 border-gray-700 text-white" 
              rows={4}
              placeholder="Instruções simplificadas para o aluno executar..."
            />
          </div>
        </TabsContent>
      </Tabs>
    </form>
  )

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-amber-500" />
            Biblioteca de Exercícios
          </h1>
          <p className="text-sm text-gray-400">
            Exercícios do Método Expert Training
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-black" onClick={resetForm}>
              <Plus className="h-4 w-4" /> Novo Exercício
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-amber-500" />
                Novo Exercício
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Cadastre um novo exercício do método
              </DialogDescription>
            </DialogHeader>
            
            <FormContent onSubmit={handleCreate} />
            
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" form="exercise-form" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
                {saving ? 'Salvando...' : 'Criar Exercício'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total</CardTitle>
            <Dumbbell className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Com Vídeo</CardTitle>
            <Video className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.withVideo || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Em Blocos</CardTitle>
            <Layers className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats?.withBlock || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Órfãos</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{stats?.orphans || 0}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Por Nível</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 text-xs">
              <Badge className="bg-green-500/20 text-green-400">{stats?.byDifficulty?.beginner || 0}</Badge>
              <Badge className="bg-yellow-500/20 text-yellow-400">{stats?.byDifficulty?.intermediate || 0}</Badge>
              <Badge className="bg-red-500/20 text-red-400">{stats?.byDifficulty?.advanced || 0}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input 
                placeholder="Buscar exercícios..." 
                value={search} 
                onChange={(e) => { setSearch(e.target.value); setPage(1) }} 
                className="pl-10 bg-gray-900 border-gray-700 text-white" 
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={filterBlock} onValueChange={(v) => { setFilterBlock(v); setPage(1) }}>
                <SelectTrigger className="w-[160px] bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Bloco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os blocos</SelectItem>
                  {blocks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterMuscle} onValueChange={(v) => { setFilterMuscle(v); setPage(1) }}>
                <SelectTrigger className="w-[150px] bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {muscleGroups.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              
              <Select value={filterDifficulty} onValueChange={(v) => { setFilterDifficulty(v); setPage(1) }}>
                <SelectTrigger className="w-[140px] bg-gray-900 border-gray-700 text-white">
                  <SelectValue placeholder="Nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {DIFFICULTIES.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectContent>
              </Select>
              
              <Button 
                variant={showOrphans ? "default" : "outline"} 
                size="sm"
                onClick={() => { setShowOrphans(!showOrphans); setPage(1) }}
                className={showOrphans ? "bg-yellow-500 hover:bg-yellow-600 text-black" : "border-gray-700"}
              >
                <AlertCircle className="h-4 w-4 mr-1" />
                Órfãos
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full bg-gray-700" />
              ))}
            </div>
          ) : exercises.length === 0 ? (
            <div className="py-12 text-center">
              <Dumbbell className="mx-auto h-12 w-12 text-gray-600" />
              <h3 className="mt-4 text-lg font-medium text-white">Nenhum exercício encontrado</h3>
              <p className="text-gray-400">Ajuste os filtros ou crie um novo exercício</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400">Nome</TableHead>
                  <TableHead className="text-gray-400">Bloco</TableHead>
                  <TableHead className="text-gray-400">Tipo</TableHead>
                  <TableHead className="text-gray-400">Grupo</TableHead>
                  <TableHead className="text-gray-400">Prescrição</TableHead>
                  <TableHead className="text-gray-400">Nível</TableHead>
                  <TableHead className="text-gray-400 text-center">Vídeo</TableHead>
                  <TableHead className="text-gray-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exercises.map((e) => (
                  <TableRow key={e.id} className="border-gray-700">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {e.isLocked && <Lock className="h-3 w-3 text-amber-500" />}
                        <span className="font-medium text-white">{e.name}</span>
                      </div>
                      {e.orderInBlock && (
                        <span className="text-xs text-gray-500">#{e.orderInBlock}</span>
                      )}
                    </TableCell>
                    <TableCell>{getBlockBadge(e.block)}</TableCell>
                    <TableCell className="text-gray-400">{e.type || '-'}</TableCell>
                    <TableCell className="text-gray-400">{e.muscleGroup || '-'}</TableCell>
                    <TableCell>
                      {e.defaultSets || e.defaultReps ? (
                        <span className="text-xs text-gray-400 font-mono">
                          {e.defaultSets && `${e.defaultSets}x`}
                          {e.defaultReps}
                          {e.defaultRest && ` (${e.defaultRest})`}
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getDifficultyBadge(e.difficulty)}</TableCell>
                    <TableCell className="text-center">
                      {e.videoUrl ? (
                        <a href={e.videoUrl} target="_blank" rel="noopener noreferrer">
                          <Video className="h-4 w-4 text-green-500 mx-auto hover:text-green-400" />
                        </a>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openView(e)} className="hover:bg-gray-700">
                        <Eye className="h-4 w-4 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(e)} className="hover:bg-gray-700">
                        <Pencil className="h-4 w-4 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)} className="hover:bg-gray-700">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Página {page} de {totalPages} ({total} exercícios)
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage((p) => Math.max(1, p - 1))} 
                  disabled={page === 1} 
                  className="border-gray-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
                  disabled={page === totalPages} 
                  className="border-gray-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {selectedExercise?.isLocked && <Lock className="h-4 w-4 text-amber-500" />}
              {selectedExercise?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedExercise?.block ? `Bloco: ${selectedExercise.block.code}` : 'Sem bloco vinculado'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedExercise && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 text-xs">Tipo</Label>
                  <p className="text-white">{selectedExercise.type || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Grupo Muscular</Label>
                  <p className="text-white">{selectedExercise.muscleGroup || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Equipamento</Label>
                  <p className="text-white">{selectedExercise.equipment || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500 text-xs">Dificuldade</Label>
                  {getDifficultyBadge(selectedExercise.difficulty)}
                </div>
              </div>
              
              {/* Prescrição */}
              <div className="p-3 rounded-lg bg-gray-800/50">
                <Label className="text-amber-500 text-xs mb-2 block">Prescrição Padrão</Label>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">{selectedExercise.defaultSets || '-'}</p>
                    <p className="text-xs text-gray-500">Séries</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{selectedExercise.defaultReps || '-'}</p>
                    <p className="text-xs text-gray-500">Reps</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{selectedExercise.defaultTime || '-'}</p>
                    <p className="text-xs text-gray-500">Tempo</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{selectedExercise.defaultRest || '-'}</p>
                    <p className="text-xs text-gray-500">Descanso</p>
                  </div>
                </div>
              </div>
              
              {/* Descrição */}
              {selectedExercise.description && (
                <div>
                  <Label className="text-gray-500 text-xs">Descrição</Label>
                  <p className="text-gray-300 text-sm">{selectedExercise.description}</p>
                </div>
              )}
              
              {/* Notas Técnicas */}
              {selectedExercise.technicalNotes && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <Label className="text-amber-400 text-xs flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Notas Técnicas do Método
                  </Label>
                  <p className="text-gray-300 text-sm mt-1 whitespace-pre-wrap">
                    {selectedExercise.technicalNotes}
                  </p>
                </div>
              )}
              
              {/* Instruções */}
              {selectedExercise.instructions && (
                <div>
                  <Label className="text-gray-500 text-xs">Instruções para o Aluno</Label>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{selectedExercise.instructions}</p>
                </div>
              )}
              
              {/* Vídeo */}
              {selectedExercise.videoUrl && (
                <div>
                  <a 
                    href={selectedExercise.videoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-green-400 hover:text-green-300"
                  >
                    <Video className="h-4 w-4" />
                    Ver Vídeo Demonstrativo
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-amber-500" />
              Editar Exercício
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Atualize os dados do exercício
            </DialogDescription>
          </DialogHeader>
          
          <FormContent onSubmit={handleUpdate} isEdit />
          
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="exercise-form" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
