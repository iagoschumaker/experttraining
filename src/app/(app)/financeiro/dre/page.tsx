'use client'

// ============================================================================
// EXPERT PRO TRAINING — DRE (Demonstração do Resultado do Exercício)
// ============================================================================

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart2,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from 'lucide-react'
import { toast } from 'sonner'

interface DRENode {
  id: string
  code: string
  name: string
  type: string
  totalPaid: number
  totalPending: number
  total: number
  children: DRENode[]
}

interface DREData {
  period: { startDate: string; endDate: string; type: string; month: number; year: number }
  summary: {
    totalReceita: number
    totalCusto: number
    totalDespesa: number
    lucroBruto: number
    lucroLiquido: number
    margem: string
  }
  dre: DRENode[]
}

export default function DREPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DREData | null>(null)
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [period, setPeriod] = useState('month')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => { loadDRE() }, [month, year, period])

  const loadDRE = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ month: String(month), year: String(year), period })
      const res = await fetch(`/api/studio/financeiro/dre?${params}`)
      const result = await res.json()
      if (result.success) {
        setData(result.data)
        // Auto-expand root categories
        const rootIds = new Set<string>(result.data.dre.map((n: DRENode) => n.id))
        setExpanded(rootIds)
      }
    } catch { toast.error('Erro ao carregar DRE') }
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

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

  const renderNode = (node: DRENode, depth: number = 0): React.ReactNode => {
    const hasChildren = node.children.length > 0
    const isExpanded = expanded.has(node.id)
    const isRoot = depth === 0
    const hasValue = node.total > 0

    return (
      <div key={node.id}>
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer hover:bg-muted/50 ${
            isRoot ? 'font-semibold text-foreground' : ''
          } ${!hasValue && depth > 0 ? 'opacity-40' : ''}`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => hasChildren && toggleExpand(node.id)}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {hasChildren ? (
              isExpanded ? <ChevronDown className="h-3 w-3 flex-shrink-0" /> :
              <ChevronRight className="h-3 w-3 flex-shrink-0" />
            ) : <div className="w-3" />}
            <span className="text-xs text-muted-foreground font-mono w-12 flex-shrink-0">
              {node.code}
            </span>
            <span className={`text-sm truncate ${isRoot ? 'font-semibold' : ''}`}>
              {node.name}
            </span>
          </div>
          <div className="flex items-center gap-4 ml-2">
            {node.totalPending > 0 && (
              <span className="text-xs text-amber-500 whitespace-nowrap">
                {fmt(node.totalPending)} pend.
              </span>
            )}
            <span className={`text-sm font-medium whitespace-nowrap min-w-[100px] text-right ${
              node.type === 'RECEITA' ? 'text-emerald-400' :
              node.total > 0 ? 'text-red-400' : 'text-muted-foreground'
            }`}>
              {hasValue ? fmt(node.total) : '-'}
            </span>
          </div>
        </div>
        {isExpanded && node.children.map(child => renderNode(child, depth + 1))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-emerald-500" /> DRE
        </h1>
        <Skeleton className="h-20" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-emerald-500" />
            DRE — Demonstração do Resultado
          </h1>
          <p className="text-sm text-muted-foreground">
            {period === 'month' ? monthNames[month - 1] : period === 'quarter' ? `${Math.ceil(month / 3)}º Trimestre` : 'Anual'} de {year}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-28 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mensal</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Anual</SelectItem>
            </SelectContent>
          </Select>
          {period === 'month' && (
            <Select value={String(month)} onValueChange={v => setMonth(parseInt(v))}>
              <SelectTrigger className="w-32 bg-card"><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthNames.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
            <SelectTrigger className="w-24 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Resumo */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-emerald-400">Receita</p>
              <p className="text-lg font-bold text-emerald-400">{fmt(data.summary.totalReceita)}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/5 border-red-500/20">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-red-400">Custos</p>
              <p className="text-lg font-bold text-red-400">{fmt(data.summary.totalCusto)}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/5 border-red-500/20">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-red-400">Despesas</p>
              <p className="text-lg font-bold text-red-400">{fmt(data.summary.totalDespesa)}</p>
            </CardContent>
          </Card>
          <Card className={`${data.summary.lucroBruto >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Lucro Bruto</p>
              <p className={`text-lg font-bold ${data.summary.lucroBruto >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmt(data.summary.lucroBruto)}
              </p>
            </CardContent>
          </Card>
          <Card className={`${data.summary.lucroLiquido >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Lucro Líquido</p>
              <p className={`text-lg font-bold ${data.summary.lucroLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {fmt(data.summary.lucroLiquido)}
              </p>
              <p className="text-xs text-muted-foreground">Margem: {data.summary.margem}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* DRE Detalhado */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground text-base">Detalhamento por Conta</CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.dre.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">
              Nenhum dados para o período selecionado
            </p>
          ) : (
            <div className="space-y-0.5">
              {/* Receitas */}
              {data?.dre.filter(n => n.type === 'RECEITA').map(node => renderNode(node))}
              
              {/* Separador visual */}
              <div className="border-t border-border my-3" />
              
              {/* Custos */}
              {data?.dre.filter(n => n.type === 'CUSTO').map(node => renderNode(node))}
              
              {/* Separador  */}
              <div className="border-t border-border my-3" />
              
              {/* Despesas */}
              {data?.dre.filter(n => n.type === 'DESPESA').map(node => renderNode(node))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
