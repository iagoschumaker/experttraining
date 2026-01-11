'use client'

// ============================================================================
// EXPERT TRAINING - SUPERADMIN BLOCKS PAGE (DADOS PROTEGIDOS DO MÉTODO)
// ============================================================================
// ⚠️ Blocos são CORE DATA do Método Expert Training
// - is_locked = true significa dado imutável do método
// - Apenas SuperAdmin pode criar/alterar/excluir
// ============================================================================

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Blocks, Plus, Search, Pencil, Trash2, Lock, Shield, Heart, Target, Zap, ArrowUpRight, Eye } from 'lucide-react'

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
  suggestedFrequency: number | null
  estimatedDuration: number | null
  blockOrder: number | null
  blockedIf: string[]
  allowedIf: string[]
  exercises: any[]
  isLocked: boolean
  createdBy: string
  isActive: boolean
  _count?: { exercisesList: number }
}

interface Stats {
  total: number
  locked: number
  byLevel: {
    CONDICIONAMENTO: number
    INICIANTE: number
    INTERMEDIARIO: number
    AVANCADO: number
  }
}

// Configurações de nível
const LEVEL_CONFIG: Record<number, { label: string; color: string; icon: any }> = {
  0: { label: 'Condicionamento', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Heart },
  1: { label: 'Iniciante', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Target },
  2: { label: 'Intermediário', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Zap },
  3: { label: 'Avançado', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: ArrowUpRight },
}

// Configurações de risco
const RISK_CONFIG: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Baixo', color: 'bg-green-500/20 text-green-400' },
  MODERATE: { label: 'Moderado', color: 'bg-yellow-500/20 text-yellow-400' },
  HIGH: { label: 'Alto', color: 'bg-red-500/20 text-red-400' },
  CRITICAL: { label: 'Crítico', color: 'bg-purple-500/20 text-purple-400' },
}

// Labels das capacidades
const CAPACITY_LABELS: Record<string, string> = {
  CONDITIONING: 'Condicionamento',
  STRENGTH: 'Força',
  POWER: 'Potência',
  HYPERTROPHY: 'Hipertrofia',
  ENDURANCE: 'Resistência',
  MOBILITY: 'Mobilidade',
  STABILITY: 'Estabilidade',
  COORDINATION: 'Coordenação',
  AGILITY: 'Agilidade',
}

const PRIMARY_CAPACITIES = ['CONDITIONING', 'STRENGTH', 'POWER', 'HYPERTROPHY', 'ENDURANCE', 'MOBILITY', 'STABILITY']
const MOVEMENT_PATTERNS = ['SQUAT', 'HINGE', 'LUNGE', 'PUSH', 'PULL', 'ROTATION', 'GAIT', 'CARRY', 'CARDIO']

export default function SuperAdminBlocksPage() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [capacities, setCapacities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null)

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    level: 1,
    levelName: 'INICIANTE',
    primaryCapacity: '',
    secondaryCapacities: [] as string[],
    complexity: 1,
    impact: 1,
    movementPattern: '',
    riskLevel: 'LOW',
    suggestedFrequency: 2,
    estimatedDuration: 15,
    blockOrder: 1,
    isLocked: true,
    isActive: true,
  })

  const fetchBlocks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: '50' })
      if (search) params.set('search', search)
      if (filterLevel && filterLevel !== 'all') params.set('level', filterLevel)
      const res = await fetch(`/api/superadmin/blocks?${params}`)
      const data = await res.json()
      if (data.success) {
        setBlocks(data.data.items)
        setTotalPages(data.data.totalPages)
        setTotal(data.data.total)
        setStats(data.data.stats)
        if (data.data.capacities) setCapacities(data.data.capacities)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBlocks() }, [page, search, filterLevel])

  const resetForm = () => setFormData({
    code: '', name: '', description: '', level: 1, levelName: 'INICIANTE',
    primaryCapacity: '', secondaryCapacities: [], complexity: 1, impact: 1,
    movementPattern: '', riskLevel: 'LOW', suggestedFrequency: 2,
    estimatedDuration: 15, blockOrder: 1, isLocked: true, isActive: true,
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/superadmin/blocks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      const data = await res.json()
      if (data.success) { setIsCreateOpen(false); resetForm(); fetchBlocks() }
      else alert(data.error)
    } catch { alert('Erro ao criar') }
    finally { setSaving(false) }
  }

  const openEdit = (block: Block) => {
    setSelectedBlock(block)
    setFormData({
      code: block.code,
      name: block.name,
      description: block.description || '',
      level: block.level,
      levelName: block.levelName || '',
      primaryCapacity: block.primaryCapacity,
      secondaryCapacities: block.secondaryCapacities || [],
      complexity: block.complexity,
      impact: block.impact,
      movementPattern: block.movementPattern || '',
      riskLevel: block.riskLevel,
      suggestedFrequency: block.suggestedFrequency || 2,
      estimatedDuration: block.estimatedDuration || 15,
      blockOrder: block.blockOrder || 1,
      isLocked: block.isLocked,
      isActive: block.isActive,
    })
    setIsEditOpen(true)
  }

  const openView = (block: Block) => {
    setSelectedBlock(block)
    setIsViewOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBlock) return
    setSaving(true)
    try {
      const res = await fetch(`/api/superadmin/blocks/${selectedBlock.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      const data = await res.json()
      if (data.success) { setIsEditOpen(false); fetchBlocks() }
      else alert(data.error)
    } catch { alert('Erro ao atualizar') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string, isLocked: boolean) => {
    if (isLocked) {
      alert('⚠️ Este bloco é PROTEGIDO e faz parte do Método Expert Training.\n\nNão é recomendado excluí-lo.')
    }
    if (!confirm('Tem certeza que deseja excluir este bloco?')) return
    try {
      const res = await fetch(`/api/superadmin/blocks/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) fetchBlocks()
      else alert(data.error)
    } catch { alert('Erro ao excluir') }
  }

  // Render barras de complexidade/impacto
  const renderBar = (value: number, color: string) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={`w-2 h-3 rounded-sm ${i <= value ? color : 'bg-gray-700'}`} />
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Blocks className="h-6 w-6 text-amber-500" />
            Blocos do Método
          </h1>
          <p className="text-sm text-gray-400">Gerencie os blocos funcionais do Método Expert Training</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-black" onClick={resetForm}>
              <Plus className="h-4 w-4" /> Novo Bloco
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle className="text-white">Novo Bloco do Método</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Cadastre um novo bloco funcional. Por padrão, blocos são PROTEGIDOS.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Código *</Label>
                  <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="INI_FORCA_C" className="bg-gray-800 border-gray-700 text-white font-mono" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Nome *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-gray-800 border-gray-700 text-white" required />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="text-gray-300">Descrição</Label>
                  <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Nível *</Label>
                  <Select value={formData.level.toString()} onValueChange={(v) => setFormData({ ...formData, level: parseInt(v), levelName: ['CONDICIONAMENTO', 'INICIANTE', 'INTERMEDIÁRIO', 'AVANÇADO'][parseInt(v)] })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Condicionamento (0)</SelectItem>
                      <SelectItem value="1">Iniciante (1)</SelectItem>
                      <SelectItem value="2">Intermediário (2)</SelectItem>
                      <SelectItem value="3">Avançado (3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Capacidade Principal *</Label>
                  <Select value={formData.primaryCapacity} onValueChange={(v) => setFormData({ ...formData, primaryCapacity: v })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{PRIMARY_CAPACITIES.map((c) => <SelectItem key={c} value={c}>{CAPACITY_LABELS[c] || c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Padrão de Movimento</Label>
                  <Select value={formData.movementPattern} onValueChange={(v) => setFormData({ ...formData, movementPattern: v })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{MOVEMENT_PATTERNS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Risco</Label>
                  <Select value={formData.riskLevel} onValueChange={(v) => setFormData({ ...formData, riskLevel: v })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Baixo</SelectItem>
                      <SelectItem value="MODERATE">Moderado</SelectItem>
                      <SelectItem value="HIGH">Alto</SelectItem>
                      <SelectItem value="CRITICAL">Crítico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Complexidade (1-5)</Label>
                  <Input type="number" min={1} max={5} value={formData.complexity} onChange={(e) => setFormData({ ...formData, complexity: parseInt(e.target.value) })} className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Impacto (1-5)</Label>
                  <Input type="number" min={1} max={5} value={formData.impact} onChange={(e) => setFormData({ ...formData, impact: parseInt(e.target.value) })} className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Duração (min)</Label>
                  <Input type="number" value={formData.estimatedDuration} onChange={(e) => setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) })} className="bg-gray-800 border-gray-700 text-white" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Frequência/sem</Label>
                  <Input type="number" value={formData.suggestedFrequency} onChange={(e) => setFormData({ ...formData, suggestedFrequency: parseInt(e.target.value) })} className="bg-gray-800 border-gray-700 text-white" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">{saving ? 'Salvando...' : 'Criar Bloco'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Protection Banner */}
      <Card className="bg-amber-500/10 border-amber-500/30">
        <CardContent className="py-3">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-500" />
            <div className="text-amber-400">
              <span className="font-medium">Dados Protegidos do Método Expert Training</span>
              <span className="ml-2 text-amber-400/70">
                • {stats?.locked || 0} blocos com is_locked = true
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total</CardTitle>
            <Blocks className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{stats?.total || 0}</div></CardContent>
        </Card>
        {Object.entries(LEVEL_CONFIG).map(([level, config]) => {
          const levelKeys = ['CONDICIONAMENTO', 'INICIANTE', 'INTERMEDIARIO', 'AVANCADO'] as const
          const key = levelKeys[parseInt(level)]
          const count = stats?.byLevel?.[key] ?? 0
          const Icon = config.icon
          return (
            <Card key={level} className="bg-gray-800 border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-300">{config.label}</CardTitle>
                <Icon className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-white">{count}</div></CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters and Table */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Buscar por nome ou código..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-10 bg-gray-900 border-gray-700 text-white" />
            </div>
            <Select value={filterLevel} onValueChange={(v) => { setFilterLevel(v); setPage(1) }}>
              <SelectTrigger className="w-[180px] bg-gray-900 border-gray-700 text-white"><SelectValue placeholder="Nível" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os níveis</SelectItem>
                <SelectItem value="0">Condicionamento</SelectItem>
                <SelectItem value="1">Iniciante</SelectItem>
                <SelectItem value="2">Intermediário</SelectItem>
                <SelectItem value="3">Avançado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full bg-gray-700" />)}</div>
          ) : blocks.length === 0 ? (
            <div className="py-12 text-center">
              <Blocks className="mx-auto h-12 w-12 text-gray-600" />
              <h3 className="mt-4 text-lg font-medium text-white">Nenhum bloco encontrado</h3>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-400 w-8"></TableHead>
                  <TableHead className="text-gray-400">Código</TableHead>
                  <TableHead className="text-gray-400">Nome</TableHead>
                  <TableHead className="text-gray-400">Nível</TableHead>
                  <TableHead className="text-gray-400">Capacidade</TableHead>
                  <TableHead className="text-gray-400">Complexidade</TableHead>
                  <TableHead className="text-gray-400">Impacto</TableHead>
                  <TableHead className="text-gray-400">Risco</TableHead>
                  <TableHead className="text-gray-400">Exercícios</TableHead>
                  <TableHead className="text-gray-400 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blocks.map((b) => {
                  const levelConfig = LEVEL_CONFIG[b.level]
                  const riskConfig = RISK_CONFIG[b.riskLevel]
                  return (
                    <TableRow key={b.id} className="border-gray-700">
                      <TableCell>
                        {b.isLocked && <Lock className="h-4 w-4 text-amber-500" />}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-gray-400">{b.code}</TableCell>
                      <TableCell className="font-medium text-white">{b.name}</TableCell>
                      <TableCell>
                        <Badge className={levelConfig?.color}>{levelConfig?.label}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-400">{CAPACITY_LABELS[b.primaryCapacity] || b.primaryCapacity}</TableCell>
                      <TableCell>{renderBar(b.complexity, 'bg-blue-500')}</TableCell>
                      <TableCell>{renderBar(b.impact, 'bg-orange-500')}</TableCell>
                      <TableCell>
                        <Badge className={riskConfig?.color}>{riskConfig?.label}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-400">
                        {Array.isArray(b.exercises) ? b.exercises.length : 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openView(b)} className="hover:bg-gray-700">
                          <Eye className="h-4 w-4 text-gray-400" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(b)} className="hover:bg-gray-700">
                          <Pencil className="h-4 w-4 text-gray-400" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id, b.isLocked)} className="hover:bg-gray-700">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-400">Página {page} de {totalPages} ({total} blocos)</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="border-gray-700">Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border-gray-700">Próxima</Button>
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
              {selectedBlock?.isLocked && <Lock className="h-4 w-4 text-amber-500" />}
              {selectedBlock?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Código: {selectedBlock?.code} | Criado por: {selectedBlock?.createdBy}
            </DialogDescription>
          </DialogHeader>
          {selectedBlock && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-white mb-2">Descrição</h4>
                <p className="text-sm text-gray-400">{selectedBlock.description || 'Sem descrição'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-white mb-2">Capacidades</h4>
                  <div className="flex flex-wrap gap-1">
                    <Badge className="bg-amber-500/20 text-amber-400">{CAPACITY_LABELS[selectedBlock.primaryCapacity]}</Badge>
                    {selectedBlock.secondaryCapacities?.map((cap, i) => (
                      <Badge key={i} variant="outline" className="border-gray-600 text-gray-400">{CAPACITY_LABELS[cap] || cap}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">Métricas</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>Complexidade:</span>
                      {renderBar(selectedBlock.complexity, 'bg-blue-500')}
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Impacto:</span>
                      {renderBar(selectedBlock.impact, 'bg-orange-500')}
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Duração:</span>
                      <span>{selectedBlock.estimatedDuration || '-'} min</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-white mb-2">Exercícios do Bloco</h4>
                <div className="border border-gray-700 rounded-lg divide-y divide-gray-700 max-h-48 overflow-y-auto">
                  {Array.isArray(selectedBlock.exercises) && selectedBlock.exercises.map((ex: any, i: number) => (
                    <div key={i} className="p-2 text-sm flex justify-between items-center">
                      <span className="text-white">{ex.order || i + 1}. {ex.name}</span>
                      <div className="flex gap-2 text-gray-500 text-xs">
                        {ex.sets && <span>{ex.sets}x</span>}
                        {ex.reps && <span>{ex.reps}</span>}
                        {ex.time && <span>{ex.time}</span>}
                      </div>
                    </div>
                  ))}
                  {(!selectedBlock.exercises || selectedBlock.exercises.length === 0) && (
                    <div className="p-4 text-center text-gray-500">Nenhum exercício definido</div>
                  )}
                </div>
              </div>

              {(selectedBlock.blockedIf?.length > 0 || selectedBlock.allowedIf?.length > 0) && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedBlock.blockedIf?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-400 mb-2">Bloqueado Se</h4>
                      <ul className="text-sm space-y-1">
                        {selectedBlock.blockedIf.map((condition: string, i: number) => (
                          <li key={i} className="text-gray-400">• {condition}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedBlock.allowedIf?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-400 mb-2">Permitido Se</h4>
                      <ul className="text-sm space-y-1">
                        {selectedBlock.allowedIf.map((condition: string, i: number) => (
                          <li key={i} className="text-gray-400">• {condition}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                {selectedBlock?.isLocked && <Lock className="h-4 w-4 text-amber-500" />}
                Editar Bloco
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {selectedBlock?.isLocked && '⚠️ Este bloco é PROTEGIDO. Edite com cuidado.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Código</Label>
                <Input value={formData.code} disabled className="bg-gray-800 border-gray-700 text-gray-500 font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Nome *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-gray-800 border-gray-700 text-white" required />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-gray-300">Descrição</Label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Nível</Label>
                <Select value={formData.level.toString()} onValueChange={(v) => setFormData({ ...formData, level: parseInt(v) })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Condicionamento</SelectItem>
                    <SelectItem value="1">Iniciante</SelectItem>
                    <SelectItem value="2">Intermediário</SelectItem>
                    <SelectItem value="3">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Capacidade Principal</Label>
                <Select value={formData.primaryCapacity} onValueChange={(v) => setFormData({ ...formData, primaryCapacity: v })}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIMARY_CAPACITIES.map((c) => <SelectItem key={c} value={c}>{CAPACITY_LABELS[c]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Complexidade (1-5)</Label>
                <Input type="number" min={1} max={5} value={formData.complexity} onChange={(e) => setFormData({ ...formData, complexity: parseInt(e.target.value) })} className="bg-gray-800 border-gray-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Impacto (1-5)</Label>
                <Input type="number" min={1} max={5} value={formData.impact} onChange={(e) => setFormData({ ...formData, impact: parseInt(e.target.value) })} className="bg-gray-800 border-gray-700 text-white" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">{saving ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
