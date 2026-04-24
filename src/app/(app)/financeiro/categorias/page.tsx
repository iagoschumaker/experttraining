'use client'

// ============================================================================
// EXPERT PRO TRAINING — PLANO DE CONTAS (CATEGORIAS)
// ============================================================================

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FolderTree,
  Plus,
  ChevronDown,
  ChevronRight,
  Folder,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'

interface Category {
  id: string
  code: string
  name: string
  type: string
  isSystem: boolean
  parentId: string | null
  children: Category[]
}

export default function CategoriasPage() {
  const [loading, setLoading] = useState(true)
  const [tree, setTree] = useState<Category[]>([])
  const [flat, setFlat] = useState<Category[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'DESPESA' as string,
    parentId: '',
  })

  useEffect(() => { loadCategories() }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/studio/financeiro/categories')
      const result = await res.json()
      if (result.success) {
        setTree(result.data.categories)
        setFlat(result.data.flat)
        // Auto-expand all roots
        setExpanded(new Set(result.data.categories.map((c: Category) => c.id)))
      }
    } catch { toast.error('Erro') }
    finally { setLoading(false) }
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCreate = async () => {
    if (!form.code || !form.name || !form.type) {
      toast.error('Preencha todos os campos')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/studio/financeiro/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          type: form.type,
          parentId: form.parentId || null,
        }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success('Categoria criada!')
        setDialogOpen(false)
        setForm({ code: '', name: '', type: 'DESPESA', parentId: '' })
        loadCategories()
      } else {
        toast.error(result.error)
      }
    } catch { toast.error('Erro') }
    finally { setSaving(false) }
  }

  const typeBadge = (type: string) => {
    const config: Record<string, string> = {
      RECEITA: 'bg-emerald-500/20 text-emerald-400',
      CUSTO: 'bg-amber-500/20 text-amber-400',
      DESPESA: 'bg-red-500/20 text-red-400',
    }
    return <Badge className={`${config[type] || ''} text-xs`}>{type}</Badge>
  }

  const renderCategory = (cat: Category, depth: number = 0): React.ReactNode => {
    const hasChildren = cat.children && cat.children.length > 0
    const isExpanded = expanded.has(cat.id)

    return (
      <div key={cat.id}>
        <div
          className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer"
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => hasChildren && toggleExpand(cat.id)}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasChildren ? (
              isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" /> :
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            ) : <div className="w-3.5" />}
            {hasChildren
              ? <Folder className="h-4 w-4 text-amber-500 flex-shrink-0" />
              : <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            }
            <span className="text-xs font-mono text-muted-foreground w-16 flex-shrink-0">
              {cat.code}
            </span>
            <span className={`text-sm truncate ${depth === 0 ? 'font-semibold' : ''}`}>
              {cat.name}
            </span>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {typeBadge(cat.type)}
            {cat.isSystem && (
              <Badge className="bg-muted text-muted-foreground text-xs">Sistema</Badge>
            )}
          </div>
        </div>
        {isExpanded && hasChildren && cat.children.map(child => renderCategory(child, depth + 1))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderTree className="h-6 w-6 text-emerald-500" /> Plano de Contas
        </h1>
        <Skeleton className="h-96" />
      </div>
    )
  }

  // Separar por tipo
  const receitas = tree.filter(c => c.type === 'RECEITA')
  const custos = tree.filter(c => c.type === 'CUSTO')
  const despesas = tree.filter(c => c.type === 'DESPESA')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderTree className="h-6 w-6 text-emerald-500" />
            Plano de Contas
          </h1>
          <p className="text-sm text-muted-foreground">{flat.length} categorias</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {/* Receitas */}
      <Card className="bg-card border-emerald-500/20">
        <CardHeader>
          <CardTitle className="text-emerald-400 text-base">
            📈 Receitas ({receitas.length} raízes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0.5">
            {receitas.map(c => renderCategory(c))}
          </div>
        </CardContent>
      </Card>

      {/* Custos */}
      <Card className="bg-card border-amber-500/20">
        <CardHeader>
          <CardTitle className="text-amber-400 text-base">
            💰 Custos Diretos ({custos.length} raízes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0.5">
            {custos.map(c => renderCategory(c))}
          </div>
        </CardContent>
      </Card>

      {/* Despesas */}
      <Card className="bg-card border-red-500/20">
        <CardHeader>
          <CardTitle className="text-red-400 text-base">
            📉 Despesas ({despesas.length} raízes)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0.5">
            {despesas.map(c => renderCategory(c))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog Nova Categoria */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECEITA">Receita</SelectItem>
                  <SelectItem value="CUSTO">Custo</SelectItem>
                  <SelectItem value="DESPESA">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria Pai (opcional)</Label>
              <Select value={form.parentId || 'NONE'} onValueChange={v => setForm(f => ({ ...f, parentId: v === 'NONE' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhuma (raiz)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Nenhuma (raiz)</SelectItem>
                  {flat
                    .filter(c => c.type === form.type || c.type === form.type)
                    .map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Código *</Label>
              <Input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                placeholder="Ex: 04.03.04"
              />
            </div>
            <div>
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Materiais Desportivos"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              {saving ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
