'use client'

// ============================================================================
// EXPERT TRAINING - CLIENT EVOLUTION COMPONENT
// ============================================================================
// Exibe evolução completa do cliente (baseline vs atual)
// ============================================================================

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Scale,
  Ruler,
  Activity,
  Calendar,
  AlertCircle,
  Trophy,
  Target,
} from 'lucide-react'

interface MetricEvolution {
  baseline: number | null
  current: number | null
  absoluteDelta: number | null
  percentageDelta: number | null
  trend: 'up' | 'down' | 'stable' | null
}

interface EvolutionData {
  client: {
    id: string
    name: string
    currentState: {
      weight: number | null
      height: number | null
      chest: number | null
      waist: number | null
      hip: number | null
      arm: number | null
      thigh: number | null
      calf: number | null
    }
  }
  hasEvolution: boolean
  period?: {
    baselineDate: string
    currentDate: string
    daysBetween: number
    weeksBetween: number
    totalAssessments: number
  }
  baseline?: {
    assessmentId: string
    date: string
    level: string | null
  }
  current?: {
    assessmentId: string
    date: string
    level: string | null
  }
  evolution?: {
    body: {
      weight: MetricEvolution
      height: MetricEvolution
      bodyFat: MetricEvolution
      measurements: {
        chest: MetricEvolution
        waist: MetricEvolution
        hip: MetricEvolution
        arm: MetricEvolution
        thigh: MetricEvolution
        calf: MetricEvolution
      }
    }
    level: {
      baseline: string | null
      current: string | null
      improved: boolean
      regressed: boolean
    }
  }
  insights?: string[]
  message?: string
}

interface ClientEvolutionProps {
  clientId: string
}

// Componente para exibir uma métrica individual
function MetricCard({ 
  label, 
  metric, 
  unit,
  inversePositive = false,
  neutral = false,
}: { 
  label: string
  metric: MetricEvolution
  unit: string
  inversePositive?: boolean // Para métricas onde redução é positivo (ex: cintura)
  neutral?: boolean // Para métricas ambíguas (ex: peitoral, braço, coxa)
}) {
  if (metric.baseline === null && metric.current === null) {
    return null
  }

  const getTrendIcon = () => {
    if (neutral) {
      if (metric.trend === 'up') return <TrendingUp className="w-4 h-4 text-cyan-500" />
      if (metric.trend === 'down') return <TrendingDown className="w-4 h-4 text-cyan-500" />
      return <Minus className="w-4 h-4 text-muted-foreground" />
    }
    if (metric.trend === 'up') {
      return <TrendingUp className={`w-4 h-4 ${inversePositive ? 'text-red-500' : 'text-green-500'}`} />
    }
    if (metric.trend === 'down') {
      return <TrendingDown className={`w-4 h-4 ${inversePositive ? 'text-green-500' : 'text-red-500'}`} />
    }
    return <Minus className="w-4 h-4 text-muted-foreground" />
  }

  const getDeltaColor = () => {
    if (neutral) return 'text-cyan-500'
    if (metric.trend === 'stable') return 'text-muted-foreground'
    if (metric.trend === 'up') return inversePositive ? 'text-red-500' : 'text-green-500'
    if (metric.trend === 'down') return inversePositive ? 'text-green-500' : 'text-red-500'
    return 'text-muted-foreground'
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <span className="font-semibold">
            {metric.baseline !== null ? `${metric.baseline}${unit}` : '-'}
          </span>
          {metric.baseline !== null && metric.current !== null && (
            <span className="text-xs text-muted-foreground">
              (agora {metric.current}{unit})
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {metric.absoluteDelta !== null && (
          <div className={`text-right ${getDeltaColor()}`}>
            <p className="text-sm font-medium">
              {metric.absoluteDelta > 0 ? '+' : ''}{metric.absoluteDelta}{unit}
            </p>
            <p className="text-xs">
              {metric.percentageDelta !== null && (
                <span>{metric.percentageDelta > 0 ? '+' : ''}{metric.percentageDelta}%</span>
              )}
            </p>
          </div>
        )}
        {getTrendIcon()}
      </div>
    </div>
  )
}

export function ClientEvolution({ clientId }: ClientEvolutionProps) {
  const [data, setData] = useState<EvolutionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEvolution = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/studio/clients/${clientId}/evolution`)
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Evolução
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Evolução
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  // Se não tem evolução (primeira avaliação ou nenhuma)
  if (!data.hasEvolution) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Evolução
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {data.message || 'Realize pelo menos 2 avaliações para ver a evolução do aluno.'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { period, baseline, current, evolution, insights } = data

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-amber-500" />
          Evolução do Aluno
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Período */}
        {period && (
          <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <span className="text-sm">
                {period.weeksBetween > 0 ? (
                  <><strong>{period.weeksBetween}</strong> {period.weeksBetween === 1 ? 'semana' : 'semanas'} de acompanhamento</>
                ) : (
                  <><strong>{period.daysBetween}</strong> {period.daysBetween === 1 ? 'dia' : 'dias'} de acompanhamento</>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-sm">
                <strong>{period.totalAssessments}</strong> {period.totalAssessments === 1 ? 'avaliação realizada' : 'avaliações realizadas'}
              </span>
            </div>
          </div>
        )}

        {/* Evolução de Nível */}
        {evolution?.level && (
          <div className="p-4 rounded-lg border">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Nível de Condicionamento
            </h4>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <Badge variant="outline" className="mb-1">Inicial</Badge>
                <p className="font-medium">
                  {evolution.level.baseline === 'BEGINNER' && 'Iniciante'}
                  {evolution.level.baseline === 'INTERMEDIATE' && 'Intermediário'}
                  {evolution.level.baseline === 'ADVANCED' && 'Avançado'}
                  {!evolution.level.baseline && '-'}
                </p>
              </div>
              <div className="flex-1 flex items-center justify-center">
                {evolution.level.improved ? (
                  <TrendingUp className="w-6 h-6 text-green-500" />
                ) : evolution.level.regressed ? (
                  <TrendingDown className="w-6 h-6 text-red-500" />
                ) : (
                  <Minus className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                <Badge className="mb-1 bg-amber-500">Atual</Badge>
                <p className="font-medium">
                  {evolution.level.current === 'BEGINNER' && 'Iniciante'}
                  {evolution.level.current === 'INTERMEDIATE' && 'Intermediário'}
                  {evolution.level.current === 'ADVANCED' && 'Avançado'}
                  {!evolution.level.current && '-'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Métricas Corporais */}
        {evolution?.body && (
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Composição Corporal
            </h4>
            
            <div className="grid gap-2">
              <MetricCard label="Peso" metric={evolution.body.weight} unit="kg" />
              <MetricCard label="Altura" metric={evolution.body.height} unit="cm" />
              {evolution.body.bodyFat.current !== null && (
                <MetricCard label="Gordura Corporal" metric={evolution.body.bodyFat} unit="%" inversePositive />
              )}
            </div>

            <h4 className="font-medium flex items-center gap-2 mt-6">
              <Ruler className="w-4 h-4" />
              Circunferências
            </h4>
            
            <div className="grid gap-2">
              <MetricCard label="Cintura" metric={evolution.body.measurements.waist} unit="cm" inversePositive />
              <MetricCard label="Quadril" metric={evolution.body.measurements.hip} unit="cm" neutral />
              <MetricCard label="Peitoral" metric={evolution.body.measurements.chest} unit="cm" neutral />
              <MetricCard label="Braço" metric={evolution.body.measurements.arm} unit="cm" neutral />
              <MetricCard label="Coxa" metric={evolution.body.measurements.thigh} unit="cm" neutral />
              <MetricCard label="Panturrilha" metric={evolution.body.measurements.calf} unit="cm" neutral />
            </div>
          </div>
        )}

        {/* Insights */}
        {insights && insights.length > 0 && (
          <div className="p-4 rounded-lg bg-muted">
            <h4 className="font-medium mb-3">📊 Análise Automática</h4>
            <ul className="space-y-2">
              {insights.map((insight, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Datas */}
        {baseline && current && (
          <div className="text-xs text-muted-foreground text-center pt-4 border-t">
            Comparando: {new Date(baseline.date).toLocaleDateString('pt-BR')} → {new Date(current.date).toLocaleDateString('pt-BR')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
