'use client'

// ============================================================================
// KINEX PERFORMANCE — SUPERADMIN — PLANO DE CONTAS GLOBAL
// ============================================================================

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  FolderTree, Plus, ChevronDown, ChevronRight, RefreshCw,
  AlertTriangle, CheckCircle, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

interface Category {
  id: string
  code: string
  name: string
  type: string
  isActive: boolean
  parentId: string | null
  children: Category[]
}

interface MigrationStatus {
  globalCategories: number
  perStudioActive: number
  perStudioTotal: number
  migrationNeeded: boolean
  totalEntries: number
}

const TYPE_COLORS: Record<string, string> = {
  RECEITA: 'bg-emerald-500/15 text-emerald-400',
  CUSTO:   'bg-orange-500/15 text-orange-400',
  DESPESA: 'bg-red-500/15 text-red-400',
}

function CategoryNode({ cat, depth = 0, onEdit }: {
  cat: Category
  depth?: number
  onEdit: (cat: Category) => void
}) {
  const [open, setOpen] = useState(depth === 0)
  const hasChildren = cat.children.length > 0

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer ${!cat.isActive ? 'opacity-40' : ''}`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => hasChildren && setOpen(o => !o)}
      >
        {hasChildren
          ? open ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                 : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
          : <span className="w-3.5 flex-shrink-0" />
        }
        <span className="font-mono text-xs text-muted-foreground w-16 flex-shrink-0">{cat.code}</span>
        <span className="text-sm flex-1">{cat.name}</span>
        <Badge className={`text-[10px] ${TYPE_COLORS[cat.type] || ''}`}>{cat.type}</Badge>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs opacity-0 hover:opacity-100 ml-1"
          onClick={e => { e.stopPropagation(); onEdit(cat) }}>
          Editar
        </Button>
      </div>
      {open && hasChildren && (
        <div>
          {cat.children.map(child => (
            <CategoryNode key={child.id} cat={child} depth={depth + 1} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function SuperadminCategoriasPage() {
  const [tree, setTree] = useState<Category[]>([])
  const [flat, setFlat] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [migStatus, setMigStatus] = useState<MigrationStatus | null>(null)
  const [migrating, setMigrating] = useState(false)

  // Modal criar
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', type: 'RECEITA', parentId: '' })
  const [saving, setSaving] = useState(false)

  // Modal editar
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [editName, setEditName] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [catRes, statusRes] = await Promise.all([
        fetch('/api/superadmin/categories'),
        fetch('/api/superadmin/migrate-global-categories'),
      ])
      const catData = await catRes.json()
      const statusData = await statusRes.json()
      if (catData.success) {
        setTree(catData.data.categories)
        setFlat(catData.data.flat)
      }
      if (statusData.success) setMigStatus(statusData.status)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleMigrate() {
    setMigrating(true)
    try {
      const res = await fetch('/api/superadmin/migrate-global-categories', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success(`Migração concluída! ${data.report.entriesMigrated} lançamentos migrados.`)
        load()
      } else {
        toast.error(data.error)
      }
    } finally {
      setMigrating(false)
    }
  }

  async function handleCreate() {
    if (!form.code || !form.name) { toast.error('Código e nome são obrigatórios'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/superadmin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, parentId: form.parentId || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Categoria criada')
        setCreateOpen(false)
        setForm({ code: '', name: '', type: 'RECEITA', parentId: '' })
        load()
      } else { toast.error(data.error) }
    } finally { setSaving(false) }
  }

  async function handleEdit() {
    if (!editCat) return
    setSaving(true)
    try {
      const res = await fetch(`/api/superadmin/categories/${editCat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Categoria atualizada')
        setEditCat(null)
        load()
      } else { toast.error(data.error) }
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-yellow-500" />
            Plano de Contas Global
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Categorias compartilhadas por todos os studios do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova Categoria
          </Button>
        </div>
      </div>

      {/* Status de Migração */}
      {migStatus && (
        <Card className={`border ${migStatus.migrationNeeded ? 'border-orange-500/50 bg-orange-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  {migStatus.migrationNeeded
                    ? <><AlertTriangle className="h-4 w-4 text-orange-400" /> Migração pendente</>
                    : <><CheckCircle className="h-4 w-4 text-emerald-400" /> Sistema migrado</>
                  }
                </p>
                <p className="text-xs text-muted-foreground">
                  {migStatus.globalCategories} categorias globais ·{' '}
                  {migStatus.perStudioActive} categorias per-studio ainda ativas ·{' '}
                  {migStatus.totalEntries} lançamentos no sistema
                </p>
                {migStatus.migrationNeeded && (
                  <p className="text-xs text-orange-400">
                    Execute a migração para mover os lançamentos existentes para as categorias globais.
                  </p>
                )}
              </div>
              {migStatus.migrationNeeded && (
                <Button
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={handleMigrate}
                  disabled={migrating}
                >
                  {migrating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Migrando...</> : '🚀 Executar Migração'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Árvore de categorias */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{flat.length} categorias globais</span>
            <div className="flex gap-2 text-xs">
              {(['RECEITA', 'CUSTO', 'DESPESA'] as const).map(t => (
                <Badge key={t} className={`${TYPE_COLORS[t]} text-[10px]`}>{t}</Badge>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8" />)}
            </div>
          ) : tree.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <FolderTree className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma categoria global. Clique em &quot;Nova Categoria&quot; ou execute a migração.</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {tree.map(cat => (
                <CategoryNode key={cat.id} cat={cat} onEdit={c => { setEditCat(c); setEditName(c.name) }} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal criar */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Categoria Global</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Código</Label>
                <Input placeholder="R.01.07" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEITA">Receita</SelectItem>
                    <SelectItem value="CUSTO">Custo</SelectItem>
                    <SelectItem value="DESPESA">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Nome</Label>
              <Input placeholder="Nome da categoria" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Categoria pai (opcional)</Label>
              <Select value={form.parentId || 'none'} onValueChange={v => setForm(f => ({ ...f, parentId: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Raiz (sem pai)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Raiz (sem pai)</SelectItem>
                  {flat.filter(c => !c.parentId).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal editar */}
      <Dialog open={!!editCat} onOpenChange={v => !v && setEditCat(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground font-mono">{editCat?.code}</p>
            <div>
              <Label>Nome</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCat(null)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={saving}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
