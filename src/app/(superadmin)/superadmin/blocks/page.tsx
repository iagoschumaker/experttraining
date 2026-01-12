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
import { FloatingActionButton } from '@/components/ui'

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
        <div key={i} className={`w-2 h-3 rounded-sm ${i <= value ? color : 'bg-muted'}`} />
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Blocks className="h-6 w-6 text-amber-500" />
            Blocos do Método
          </h1>
          <p className="text-sm text-muted-foreground">Gerencie os blocos funcionais do Método Expert Training</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="hidden md:flex gap-2 bg-accent text-accent-foreground hover:bg-accent/90" onClick={resetForm}>
              <Plus className="h-4 w-4" /> Novo Bloco
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle className="text-foreground">Novo Bloco do Método</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Cadastre um novo bloco funcional. Por padrão, blocos são PROTEGIDOS.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Código *</Label>
                  <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="INI_FORCA_C" className="bg-card border-border text-foreground font-mono" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Nome *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-card border-border text-foreground" required />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label className="text-muted-foreground">Descrição</Label>
                  <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-card border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Nível *</Label>
                  <Select value={formData.level.toString()} onValueChange={(v) => setFormData({ ...formData, level: parseInt(v), levelName: ['CONDICIONAMENTO', 'INICIANTE', 'INTERMEDIÁRIO', 'AVANÇADO'][parseInt(v)] })}>
                    <SelectTrigger className="bg-card border-border text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Condicionamento (0)</SelectItem>
                      <SelectItem value="1">Iniciante (1)</SelectItem>
                      <SelectItem value="2">Intermediário (2)</SelectItem>
                      <SelectItem value="3">Avançado (3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Capacidade Principal *</Label>
                  <Select value={formData.primaryCapacity} onValueChange={(v) => setFormData({ ...formData, primaryCapacity: v })}>
                    <SelectTrigger className="bg-card border-border text-foreground"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{PRIMARY_CAPACITIES.map((c) => <SelectItem key={c} value={c}>{CAPACITY_LABELS[c] || c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Padrão de Movimento</Label>
                  <Select value={formData.movementPattern} onValueChange={(v) => setFormData({ ...formData, movementPattern: v })}>
                    <SelectTrigger className="bg-card border-border text-foreground"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{MOVEMENT_PATTERNS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Risco</Label>
                  <Select value={formData.riskLevel} onValueChange={(v) => setFormData({ ...formData, riskLevel: v })}>
                    <SelectTrigger className="bg-card border-border text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Baixo</SelectItem>
                      <SelectItem value="MODERATE">Moderado</SelectItem>
                      <SelectItem value="HIGH">Alto</SelectItem>
                      <SelectItem value="CRITICAL">Crítico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Complexidade (1-5)</Label>
                  <Input type="number" min={1} max={5} value={formData.complexity} onChange={(e) => setFormData({ ...formData, complexity: parseInt(e.target.value) })} className="bg-card border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Impacto (1-5)</Label>
                  <Input type="number" min={1} max={5} value={formData.impact} onChange={(e) => setFormData({ ...formData, impact: parseInt(e.target.value) })} className="bg-card border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Duração (min)</Label>
                  <Input type="number" value={formData.estimatedDuration} onChange={(e) => setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) })} className="bg-card border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Frequência/sem</Label>
                  <Input type="number" value={formData.suggestedFrequency} onChange={(e) => setFormData({ ...formData, suggestedFrequency: parseInt(e.target.value) })} className="bg-card border-border text-foreground" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">{saving ? 'Salvando...' : 'Criar Bloco'}</Button>
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
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
            <Blocks className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-foreground">{stats?.total || 0}</div></CardContent>
        </Card>
        {Object.entries(LEVEL_CONFIG).map(([level, config]) => {
          const levelKeys = ['CONDICIONAMENTO', 'INICIANTE', 'INTERMEDIARIO', 'AVANCADO'] as const
          const key = levelKeys[parseInt(level)]
          const count = stats?.byLevel?.[key] ?? 0
          const Icon = config.icon
          return (
            <Card key={level} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{config.label}</CardTitle>
                <Icon className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-foreground">{count}</div></CardContent>
            </Card>
          )
        })}
      </div>

      {/* Filters and Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou código..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-10 bg-background border-border text-foreground" />
            </div>
            <Select value={filterLevel} onValueChange={(v) => { setFilterLevel(v); setPage(1) }}>
              <SelectTrigger className="w-[180px] bg-background border-border text-foreground"><SelectValue placeholder="Nível" /></SelectTrigger>
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
            <div className="space-y-4">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full bg-muted" />)}</div>
          ) : blocks.length === 0 ? (
            <div className="py-12 text-center">
              <Blocks className="mx-auto h-12 w-12 text-muted" />
              <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum bloco encontrado</h3>
            </div>
          ) : (
            <div className="responsive-table-wrapper">
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th>Lock</th>
                    <th>Código</th>
                    <th>Nome</th>
                    <th>Nível</th>
                    <th>Capacidade</th>
                    <th>Complexidade</th>
                    <th>Impacto</th>
                    <th>Risco</th>
                    <th>Exercícios</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((b) => {
                    const levelConfig = LEVEL_CONFIG[b.level]
                    const riskConfig = RISK_CONFIG[b.riskLevel]
                    return (
                      <tr key={b.id}>
                        <td data-label="Lock">
                          {b.isLocked && <Lock className="h-4 w-4 text-amber-500" />}
                        </td>
                        <td data-label="Código" className="font-mono text-xs text-muted-foreground">{b.code}</td>
                        <td data-label="Nome" className="font-medium text-foreground">{b.name}</td>
                        <td data-label="Nível">
                          <Badge className={levelConfig?.color}>{levelConfig?.label}</Badge>
                        </td>
                        <td data-label="Capacidade" className="text-muted-foreground">{CAPACITY_LABELS[b.primaryCapacity] || b.primaryCapacity}</td>
                        <td data-label="Complexidade">{renderBar(b.complexity, 'bg-blue-500')}</td>
                        <td data-label="Impacto">{renderBar(b.impact, 'bg-orange-500')}</td>
                        <td data-label="Risco">
                          <Badge className={riskConfig?.color}>{riskConfig?.label}</Badge>
                        </td>
                        <td data-label="Exercícios" className="text-muted-foreground">
                          {Array.isArray(b.exercises) ? b.exercises.length : 0}
                        </td>
                        <td data-label="Ações">
                        <Button variant="ghost" size="icon" onClick={() => openView(b)} className="hover:bg-muted">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(b)} className="hover:bg-muted">
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id, b.isLocked)} className="hover:bg-muted">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Página {page} de {totalPages} ({total} blocos)</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="border-border">Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="border-border">Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              {selectedBlock?.isLocked && <Lock className="h-4 w-4 text-amber-500" />}
              {selectedBlock?.name}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Código: {selectedBlock?.code} | Criado por: {selectedBlock?.createdBy}
            </DialogDescription>
          </DialogHeader>
          {selectedBlock && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-foreground mb-2">Descrição</h4>
                <p className="text-sm text-muted-foreground">{selectedBlock.description || 'Sem descrição'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-foreground mb-2">Capacidades</h4>
                  <div className="flex flex-wrap gap-1">
                    <Badge className="bg-amber-500/20 text-amber-400">{CAPACITY_LABELS[selectedBlock.primaryCapacity]}</Badge>
                    {selectedBlock.secondaryCapacities?.map((cap, i) => (
                      <Badge key={i} variant="outline" className="border-border text-muted-foreground">{CAPACITY_LABELS[cap] || cap}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">Métricas</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Complexidade:</span>
                      {renderBar(selectedBlock.complexity, 'bg-blue-500')}
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Impacto:</span>
                      {renderBar(selectedBlock.impact, 'bg-orange-500')}
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Duração:</span>
                      <span>{selectedBlock.estimatedDuration || '-'} min</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-2">Exercícios do Bloco</h4>
                <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                  {Array.isArray(selectedBlock.exercises) && selectedBlock.exercises.map((ex: any, i: number) => (
                    <div key={i} className="p-2 text-sm flex justify-between items-center">
                      <span className="text-foreground">{ex.order || i + 1}. {ex.name}</span>
                      <div className="flex gap-2 text-muted-foreground text-xs">
                        {ex.sets && <span>{ex.sets}x</span>}
                        {ex.reps && <span>{ex.reps}</span>}
                        {ex.time && <span>{ex.time}</span>}
                      </div>
                    </div>
                  ))}
                  {(!selectedBlock.exercises || selectedBlock.exercises.length === 0) && (
                    <div className="p-4 text-center text-muted-foreground">Nenhum exercício definido</div>
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
                          <li key={i} className="text-muted-foreground">• {condition}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedBlock.allowedIf?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-400 mb-2">Permitido Se</h4>
                      <ul className="text-sm space-y-1">
                        {selectedBlock.allowedIf.map((condition: string, i: number) => (
                          <li key={i} className="text-muted-foreground">• {condition}</li>
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
        <DialogContent className="bg-card border-border max-w-2xl">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                {selectedBlock?.isLocked && <Lock className="h-4 w-4 text-amber-500" />}
                Editar Bloco
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {selectedBlock?.isLocked && '⚠️ Este bloco é PROTEGIDO. Edite com cuidado.'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Código</Label>
                <Input value={formData.code} disabled className="bg-card border-border text-muted-foreground font-mono" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nome *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-card border-border text-foreground" required />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-muted-foreground">Descrição</Label>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-card border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Nível</Label>
                <Select value={formData.level.toString()} onValueChange={(v) => setFormData({ ...formData, level: parseInt(v) })}>
                  <SelectTrigger className="bg-card border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Condicionamento</SelectItem>
                    <SelectItem value="1">Iniciante</SelectItem>
                    <SelectItem value="2">Intermediário</SelectItem>
                    <SelectItem value="3">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Capacidade Principal</Label>
                <Select value={formData.primaryCapacity} onValueChange={(v) => setFormData({ ...formData, primaryCapacity: v })}>
                  <SelectTrigger className="bg-card border-border text-foreground"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIMARY_CAPACITIES.map((c) => <SelectItem key={c} value={c}>{CAPACITY_LABELS[c]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Complexidade (1-5)</Label>
                <Input type="number" min={1} max={5} value={formData.complexity} onChange={(e) => setFormData({ ...formData, complexity: parseInt(e.target.value) })} className="bg-card border-border text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Impacto (1-5)</Label>
                <Input type="number" min={1} max={5} value={formData.impact} onChange={(e) => setFormData({ ...formData, impact: parseInt(e.target.value) })} className="bg-card border-border text-foreground" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-accent text-accent-foreground hover:bg-accent/90">{saving ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Floating Action Button for Mobile */}
      <FloatingActionButton 
        actions={[
          {
            label: 'Novo Bloco',
            onClick: resetForm,
            icon: <Plus className="h-5 w-5" />
          }
        ]}
      />
    </div>
  )
}
