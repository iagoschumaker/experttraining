'use client'

// ============================================================================
// EXPERT TRAINING - CLIENT EVOLUTION COMPONENT (JUBA METHOD)
// ============================================================================
// Exibe evolução completa: composição corporal, gráficos Recharts, insights,
// medidas ao longo do tempo, cards do Método Expert Training
// ============================================================================

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TrendingUp,
  Scale,
  Ruler,
  Activity,
  Calendar,
  AlertCircle,
  Target,
  Zap,
  Timer,
  Flame,
  Dumbbell,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'

// ============================================================================
// TYPES
// ============================================================================

interface JubaComputed {
  weight: number
  bodyFatPercent: number
  fatKg: number
  leanKg: number
  ratioCurrent: number | null
  ratioTarget: number
  idealLeanKg: number
  leanToGainKg: number
  monthsEstimate: {
    minMonths: number
    maxMonths: number
    avgMonths: number
  }
  sex: string
}

interface CompositionPoint {
  date: string
  weight: number | null
  bodyFat: number | null
  fatKg: number | null
  leanKg: number | null
  ratioCurrent: number | null
  ratioTarget: number | null
  leanToGainKg: number | null
}

interface MeasurePoint {
  date: string
  [key: string]: number | string | null
}

interface Summary {
  totalAssessments: number
  firstDate: string
  lastDate: string
  daysBetween: number
  deltas: {
    weight: number | null
    bodyFat: number | null
    leanKg: number | null
    fatKg: number | null
  }
  first: { weight: number | null; bodyFat: number | null; leanKg: number | null; fatKg: number | null }
  last: { weight: number | null; bodyFat: number | null; leanKg: number | null; fatKg: number | null }
}

interface EvolutionData {
  client: {
    id: string
    name: string
    gender: string | null
    goalType: string | null
    goalWeight: number | null
    currentWeight: number | null
    currentHeight: number | null
    currentBodyFat: number | null
  }
  latestComputed: JubaComputed | null
  compositionTimeline: CompositionPoint[]
  measuresTimeline: MeasurePoint[]
  summary: Summary | null
  performanceScores: Record<string, number> | null
  insights: string[]
}

interface ClientEvolutionProps {
  clientId: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MEASURE_OPTIONS = [
  { key: 'chest', label: 'Peitoral' },
  { key: 'waist', label: 'Cintura' },
  { key: 'abdomen', label: 'Abdômen' },
  { key: 'hip', label: 'Quadril' },
  { key: 'arm_right', label: 'Braço Dir.' },
  { key: 'arm_left', label: 'Braço Esq.' },
  { key: 'thigh_right', label: 'Coxa Dir.' },
  { key: 'thigh_left', label: 'Coxa Esq.' },
  { key: 'calf_right', label: 'Panturrilha Dir.' },
  { key: 'calf_left', label: 'Panturrilha Esq.' },
  { key: 'forearm_right', label: 'Antebraço Dir.' },
  { key: 'forearm_left', label: 'Antebraço Esq.' },
] as const

const GOAL_LABELS: Record<string, string> = {
  WEIGHT_LOSS: 'Emagrecimento',
  MUSCLE_GAIN: 'Ganho de Massa',
  RECOMP: 'Recomposição',
  PERFORMANCE: 'Performance',
  HEALTH: 'Saúde',
}

const CHART_COLORS = {
  cyan: '#06b6d4',
  amber: '#f59e0b',
  green: '#10b981',
  red: '#ef4444',
  purple: '#8b5cf6',
}

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color = 'text-amber-500',
}: {
  label: string
  value: string
  subtitle?: string
  icon: React.ElementType
  color?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`rounded-lg bg-muted p-2 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// DELTA BADGE
// ============================================================================

function DeltaBadge({ value, unit, inverse = false }: { value: number | null; unit: string; inverse?: boolean }) {
  if (value == null) return null
  const positive = inverse ? value < 0 : value > 0
  const negative = inverse ? value > 0 : value < 0
  const sign = value > 0 ? '+' : ''
  return (
    <Badge
      variant="outline"
      className={`text-xs font-mono ${positive ? 'border-green-500 text-green-600' : negative ? 'border-red-500 text-red-600' : 'border-muted text-muted-foreground'}`}
    >
      {sign}{value.toFixed(1)}{unit}
    </Badge>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ClientEvolution({ clientId }: ClientEvolutionProps) {
  const [data, setData] = useState<EvolutionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMeasure, setSelectedMeasure] = useState<string>('waist')

  useEffect(() => {
    const fetchEvolution = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/clients/${clientId}/evolution`)
        const result = await res.json()
        if (result.success) {
          setData(result.data)
        } else {
          setError(result.error || 'Erro ao carregar evolução')
        }
      } catch (err) {
        console.error('Error fetching evolution:', err)
        setError('Erro de conexão')
      } finally {
        setLoading(false)
      }
    }
    fetchEvolution()
  }, [clientId])

  // ========================================================================
  // Loading / Error / Empty states
  // ========================================================================

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const { latestComputed, compositionTimeline, measuresTimeline, summary, performanceScores, insights, client } = data
  const hasTimeline = compositionTimeline.length > 0
  const hasMeasures = measuresTimeline.length > 0

  // Format chart date
  const fmtDate = (d: string) => {
    const parts = d.split('-')
    return `${parts[2]}/${parts[1]}`
  }

  // Bar chart data: actual vs ideal
  const barData = latestComputed
    ? [
        {
          name: 'Massa Magra (kg)',
          Atual: latestComputed.leanKg,
          Ideal: latestComputed.idealLeanKg,
        },
        {
          name: 'Proporção',
          Atual: latestComputed.ratioCurrent ?? 0,
          Ideal: latestComputed.ratioTarget,
        },
      ]
    : []

  // Radar data from performance scores
  const radarData = performanceScores
    ? Object.entries(performanceScores).map(([key, val]) => ({
        subject: key,
        value: val as number,
      }))
    : []

  // Measures chart data for selected measure
  const measureChartData = measuresTimeline
    .filter((m) => m[selectedMeasure] != null)
    .map((m) => ({
      date: fmtDate(m.date as string),
      value: m[selectedMeasure] as number,
    }))

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6">
      {/* ================================================================
          HEADER
      ================================================================ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-amber-500" />
          <div>
            <h2 className="text-xl font-bold">Evolução & Método Expert Training</h2>
            <p className="text-sm text-muted-foreground">
              {client.goalType ? GOAL_LABELS[client.goalType] : 'Meta não definida'}
              {client.goalWeight ? ` • Meta: ${client.goalWeight} kg` : ''}
            </p>
          </div>
        </div>
        {summary && (
          <Badge variant="outline" className="gap-1">
            <Calendar className="h-3 w-3" />
            {summary.totalAssessments} avaliação(ões)
          </Badge>
        )}
      </div>

      {/* ================================================================
          STAT CARDS (JUBA)
      ================================================================ */}
      {latestComputed ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Proporção Atual"
            value={latestComputed.ratioCurrent?.toFixed(1) ?? '—'}
            subtitle={`Alvo: ${latestComputed.ratioTarget}:1`}
            icon={Target}
            color="text-cyan-500"
          />
          <StatCard
            label="Massa Magra"
            value={`${latestComputed.leanKg.toFixed(1)} kg`}
            subtitle={`Ideal: ${latestComputed.idealLeanKg.toFixed(1)} kg`}
            icon={Dumbbell}
            color="text-green-500"
          />
          <StatCard
            label="Gordura"
            value={`${latestComputed.fatKg.toFixed(1)} kg`}
            subtitle={`${latestComputed.bodyFatPercent.toFixed(1)}% corporal`}
            icon={Flame}
            color="text-red-500"
          />
          {latestComputed.leanToGainKg > 0 ? (
            <StatCard
              label="Ganhar Massa Magra"
              value={`${latestComputed.leanToGainKg.toFixed(1)} kg`}
              subtitle={`${latestComputed.monthsEstimate.minMonths}–${latestComputed.monthsEstimate.maxMonths} meses`}
              icon={Timer}
              color="text-amber-500"
            />
          ) : (
            <StatCard
              label="Status"
              value="Estrutura OK"
              subtitle="Foco em manutenção"
              icon={Zap}
              color="text-amber-500"
            />
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-6 text-center">
            <Scale className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Preencha <strong>peso</strong> e <strong>% gordura corporal</strong> em uma avaliação para ver os cálculos de composição.
            </p>
            {client.gender === null && (
              <p className="text-xs text-amber-500 mt-2">
                ⚠️ Defina o gênero do aluno no cadastro para calcular o ratio alvo (6:1 homem / 4:1 mulher)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================
          DELTAS (Início vs Atual)
      ================================================================ */}
      {summary && summary.totalAssessments >= 2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Início vs Atual ({Math.floor(summary.daysBetween / 7)} semanas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Peso</p>
                <p className="font-semibold">{summary.last.weight?.toFixed(1) ?? '—'} kg</p>
                <DeltaBadge value={summary.deltas.weight} unit=" kg" inverse />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">% Gordura</p>
                <p className="font-semibold">{summary.last.bodyFat?.toFixed(1) ?? '—'}%</p>
                <DeltaBadge value={summary.deltas.bodyFat} unit="%" inverse />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Massa Magra</p>
                <p className="font-semibold">{summary.last.leanKg?.toFixed(1) ?? '—'} kg</p>
                <DeltaBadge value={summary.deltas.leanKg} unit=" kg" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Gordura</p>
                <p className="font-semibold">{summary.last.fatKg?.toFixed(1) ?? '—'} kg</p>
                <DeltaBadge value={summary.deltas.fatKg} unit=" kg" inverse />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================
          CHART: Composição ao longo do tempo (Line)
      ================================================================ */}
      {hasTimeline && compositionTimeline.some(p => p.weight != null) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Composição Corporal ao Longo do Tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={compositionTimeline.map(p => ({ ...p, date: fmtDate(p.date) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--card-foreground))',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="weight" name="Peso (kg)" stroke={CHART_COLORS.cyan} strokeWidth={2} dot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="leanKg" name="Massa Magra (kg)" stroke={CHART_COLORS.green} strokeWidth={2} dot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="fatKg" name="Gordura (kg)" stroke={CHART_COLORS.red} strokeWidth={2} dot={{ r: 4 }} connectNulls />
                <Line type="monotone" dataKey="bodyFat" name="% Gordura" stroke={CHART_COLORS.amber} strokeWidth={2} dot={{ r: 4 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ================================================================
          CHART: Atual vs Ideal (Bar)
      ================================================================ */}
      {latestComputed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Atual vs Ideal
            </CardTitle>
            <CardDescription>
              Proporção lean:fat e massa magra — comparação com alvo do método
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--card-foreground))',
                  }}
                />
                <Legend />
                <Bar dataKey="Atual" fill={CHART_COLORS.cyan} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Ideal" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ================================================================
          CHART: Medidas ao longo do tempo (Line, com seletor)
      ================================================================ */}
      {hasMeasures && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5" />
                Evolução de Medidas
              </CardTitle>
              <Select value={selectedMeasure} onValueChange={setSelectedMeasure}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEASURE_OPTIONS.map(opt => (
                    <SelectItem key={opt.key} value={opt.key}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {measureChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={measureChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" domain={['dataMin - 2', 'dataMax + 2']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--card-foreground))',
                    }}
                    formatter={(value: unknown) => [`${value} cm`, MEASURE_OPTIONS.find(m => m.key === selectedMeasure)?.label ?? selectedMeasure]}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={MEASURE_OPTIONS.find(m => m.key === selectedMeasure)?.label ?? selectedMeasure}
                    stroke={CHART_COLORS.purple}
                    strokeWidth={2}
                    dot={{ r: 5, fill: CHART_COLORS.purple }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">
                Sem dados para &quot;{MEASURE_OPTIONS.find(m => m.key === selectedMeasure)?.label}&quot;
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================
          CHART: Radar — Performance (se existir)
      ================================================================ */}
      {radarData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Capacidades Físicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10 }} />
                <Radar name="Score" dataKey="value" stroke={CHART_COLORS.cyan} fill={CHART_COLORS.cyan} fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ================================================================
          INSIGHTS
      ================================================================ */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📊 Insights Automáticos</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                  {insight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ================================================================
          EMPTY STATE
      ================================================================ */}
      {!hasTimeline && !latestComputed && (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-1">Nenhuma avaliação com medidas corporais</h3>
            <p className="text-sm text-muted-foreground">
              Realize avaliações com peso e % gordura para gerar o painel de evolução.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
