'use client'

// ============================================================================
// EXPERT TRAINING - ASSESSMENT RESULT PAGE
// ============================================================================
// Exibe o resultado da avaliação processada — Sistema de Fases
// ============================================================================

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  translateMovementPattern,
  translatePainRegion,
  translateDifficulty,
} from '@/lib/translations'
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  User,
  Target,
  Dumbbell,
  FileText,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Scale,
  Ruler,
  Layers,
  Award,
} from 'lucide-react'

// Labels para fases e objetivos
const PHASE_LABELS: Record<string, string> = {
  CONDICIONAMENTO_1: 'Fundamento Híbrido I',
  CONDICIONAMENTO_2: 'Condicionamento Híbrido',
  HIPERTROFIA: 'Hipertrofia Híbrida',
  FORCA: 'Força Híbrida',
  POTENCIA: 'Potência Híbrida',
  RESISTENCIA: 'Resistência / Fadiga',
  METABOLICO: 'Metabólico',
  HIPERTROFIA_2: 'Hipertrofia Híbrida II',
  FORCA_2: 'Força Híbrida II',
  RESISTENCIA_2: 'Resistência / Fadiga II',
  METABOLICO_2: 'Metabólico II',
}

const OBJECTIVE_LABELS: Record<string, string> = {
  EMAGRECIMENTO: 'Emagrecimento',
  HIPERTROFIA_OBJ: 'Hipertrofia',
  PERFORMANCE: 'Performance',
  REABILITACAO: 'Reabilitação / Saúde',
}

const LEVEL_LABELS: Record<string, string> = {
  INICIANTE: 'Iniciante',
  INTERMEDIARIO: 'Intermediário',
  INTERMEDIÁRIO: 'Intermediário',
  AVANCADO: 'Avançado',
  AVANÇADO: 'Avançado',
}

interface Assessment {
  id: string
  status: string
  confidence: number | null
  createdAt: string
  completedAt: string | null
  selectedPhase?: string | null
  objective?: string | null
  inputJson: any
  bodyMetricsJson?: any
  resultJson: any
  client: {
    id: string
    name: string
    history: string | null
    objectives: string | null
    level?: string
    objective?: string
    currentPhase?: string
  }
}

interface EvolutionData {
  daysBetween: number | null
  body: {
    weight: MetricDelta
    height: MetricDelta
    bodyFat: MetricDelta
    measurements: {
      chest: MetricDelta
      waist: MetricDelta
      hip: MetricDelta
      arm: MetricDelta
      thigh: MetricDelta
      calf: MetricDelta
    }
  }
  level: {
    previousLevel: number | null
    currentLevel: number | null
    changed: boolean
  }
  confidence: {
    previousConfidence: number | null
    currentConfidence: number | null
    delta: number | null
  }
  insights: string[]
}

interface MetricDelta {
  current: number | null
  previous: number | null
  delta: number | null
  percentage: number | null
  trend: 'up' | 'down' | 'stable' | null
}

export default function AssessmentResultPage() {
  const router = useRouter()
  const params = useParams()
  const assessmentId = params.id as string

  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [evolution, setEvolution] = useState<EvolutionData | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch assessment
  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const res = await fetch(`/api/assessments/${assessmentId}`)
        const data = await res.json()

        if (data.success) {
          setAssessment(data.data)
          
          // Also fetch evolution if assessment is completed
          if (data.data.status === 'COMPLETED') {
            const evoRes = await fetch(`/api/studio/assessments/${assessmentId}/evolution`)
            const evoData = await evoRes.json()
            if (evoData.success && evoData.data.previousAssessment) {
              // Merge insights into evolution object for the UI
              setEvolution({
                ...evoData.data.evolution,
                insights: evoData.data.insights || [],
              })
            }
          }
        } else {
          alert('Avaliação não encontrada')
          router.push('/assessments')
        }
      } catch (error) {
        console.error('Error fetching assessment:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAssessment()
  }, [assessmentId, router])

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Render trend icon
  const renderTrend = (delta: MetricDelta) => {
    if (delta.trend === 'up') {
      return <TrendingUp className="h-4 w-4 text-green-500" />
    } else if (delta.trend === 'down') {
      return <TrendingDown className="h-4 w-4 text-red-500" />
    }
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  // Render delta value
  const renderDelta = (delta: MetricDelta, unit: string = '') => {
    if (delta.delta === null) return null
    const sign = delta.delta > 0 ? '+' : ''
    return (
      <span className={`text-sm ${delta.trend === 'up' ? 'text-green-600' : delta.trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
        {sign}{delta.delta.toFixed(1)}{unit}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    )
  }

  if (!assessment) {
    return null
  }

  const result = assessment.resultJson
  const clientLevel = assessment.client?.level || assessment.inputJson?.level || 'INICIANTE'
  const clientObjective = assessment.objective || assessment.client?.objective || 'HIPERTROFIA_OBJ'
  const selectedPhase = assessment.selectedPhase || assessment.client?.currentPhase || 'CONDICIONAMENTO_1'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/assessments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Resultado da Avaliação
            </h1>
            <p className="text-sm text-gray-500">
              {assessment.client.name} •{' '}
              {assessment.completedAt
                ? formatDate(assessment.completedAt)
                : formatDate(assessment.createdAt)}
            </p>
          </div>
        </div>
        {assessment.status !== 'COMPLETED' && (
          <Link href={`/assessments/${assessmentId}/input`}>
            <Button>
              <RefreshCw className="mr-2 h-4 w-4" />
              Continuar Avaliação
            </Button>
          </Link>
        )}
      </div>

      {/* Status check */}
      {assessment.status !== 'COMPLETED' ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
            <h3 className="mt-4 text-lg font-medium">
              Avaliação não processada
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Esta avaliação ainda não foi processada. Complete o formulário de
              avaliação para ver os resultados.
            </p>
            <Link href={`/assessments/${assessmentId}/input`}>
              <Button className="mt-4">Ir para Avaliação</Button>
            </Link>
          </CardContent>
        </Card>
      ) : result ? (
        <>
          {/* Summary Card - Nível */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Nível Avaliado
                </CardTitle>
                <Award className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  {LEVEL_LABELS[clientLevel?.toUpperCase()] || translateDifficulty(clientLevel)}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Classificação do aluno baseada na avaliação
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-muted">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Objetivo e Fase
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Definidos na geração do treino
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  💡 Vá para <strong>Treinos {'>'} Criar Treino</strong> usando esta avaliação
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Evolution Section (if available) */}
          {evolution && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Evolução desde a Última Avaliação
                </CardTitle>
                <CardDescription>
                  {evolution.daysBetween !== null
                    ? evolution.daysBetween === 0
                      ? 'Comparação com avaliação do mesmo dia'
                      : `Comparação com avaliação de ${evolution.daysBetween} dia${evolution.daysBetween !== 1 ? 's' : ''} atrás`
                    : 'Dados de comparação'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Weight + BodyFat + Height */}
                <div>
                  <h4 className="mb-3 font-medium flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Métricas Corporais
                    {evolution.body.compMethod && (
                      <span className={`ml-auto text-xs font-normal px-2 py-0.5 rounded-full border ${
                        evolution.body.compMethod === 'inbody'
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      }`}>
                        {evolution.body.compMethod === 'inbody' ? '⚡ InBody H20' : '📐 Pollock'}
                      </span>
                    )}
                  </h4>
                  <div className="grid gap-4 md:grid-cols-3">
                    {evolution.body.weight.current !== null && (
                      <div className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Peso</span>
                          {renderTrend(evolution.body.weight)}
                        </div>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-xl font-bold">{evolution.body.weight.current} kg</span>
                          {renderDelta(evolution.body.weight, 'kg')}
                        </div>
                      </div>
                    )}
                    {evolution.body.bodyFat.current !== null && (
                      <div className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">% Gordura</span>
                          {renderTrend(evolution.body.bodyFat)}
                        </div>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-xl font-bold">{evolution.body.bodyFat.current}%</span>
                          {renderDelta(evolution.body.bodyFat, '%')}
                        </div>
                      </div>
                    )}
                    {evolution.body.height.current !== null && (
                      <div className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Altura</span>
                          {renderTrend(evolution.body.height)}
                        </div>
                        <div className="mt-1">
                          <span className="text-xl font-bold">{evolution.body.height.current} cm</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* InBody H20 Evolution */}
                {evolution.body.inbody && (
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-3">
                    <h4 className="font-medium text-sm text-blue-400 flex items-center gap-2">
                      ⚡ InBody H20 — Evolução
                    </h4>
                    <div className="grid gap-3 md:grid-cols-4">
                      {[
                        { key: 'fatPct', label: '% Gordura', unit: '%', goodDown: true },
                        { key: 'fatMassKg', label: 'Massa Gorda', unit: 'kg', goodDown: true },
                        { key: 'leanMassKg', label: 'Massa Magra', unit: 'kg', goodDown: false },
                        { key: 'muscleMassKg', label: 'Musc. Esq.', unit: 'kg', goodDown: false },
                        { key: 'totalWaterL', label: 'Água Total', unit: 'L', goodDown: false },
                        { key: 'bmr', label: 'TMB', unit: 'kcal', goodDown: false },
                        { key: 'visceralFatLevel', label: 'Gord. Visceral', unit: '', goodDown: true },
                        { key: 'bmi', label: 'IMC', unit: 'kg/m²', goodDown: false },
                      ].map(({ key, label, unit, goodDown }) => {
                        const m = (evolution.body.inbody as any)?.[key]
                        if (!m || m.current === null) return null
                        return (
                          <div key={key} className="rounded-lg border bg-background p-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">{label}</span>
                              {renderTrend(m)}
                            </div>
                            <div className="mt-1 flex items-baseline gap-2">
                              <span className="text-lg font-bold">{m.current}{unit}</span>
                              {renderDelta(m, unit)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Measurements evolution */}
                {(evolution.body.measurements.waist.current !== null ||
                  evolution.body.measurements.chest.current !== null ||
                  evolution.body.measurements.hip.current !== null) && (
                  <div>
                    <h4 className="mb-3 font-medium flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      Circunferências
                    </h4>
                    <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                      {[
                        { key: 'chest', label: 'Peitoral' },
                        { key: 'waist', label: 'Cintura' },
                        { key: 'hip', label: 'Quadril' },
                        { key: 'arm', label: 'Braço' },
                        { key: 'thigh', label: 'Coxa' },
                        { key: 'calf', label: 'Panturrilha' },
                      ].map(({ key, label }) => {
                        const m = evolution.body.measurements[key as keyof typeof evolution.body.measurements]
                        if (m.current === null) return null
                        return (
                          <div key={key} className="rounded-lg bg-card border border-border p-2 text-center">
                            <div className="text-xs text-muted-foreground">{label}</div>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <span className="font-semibold">{m.current}cm</span>
                              {renderTrend(m)}
                            </div>
                            {m.delta !== null && (
                              <div className="text-xs">
                                {m.delta > 0 ? '+' : ''}{m.delta.toFixed(1)}cm
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Insights */}
                {evolution.insights && evolution.insights.length > 0 && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                    <h4 className="font-medium text-foreground mb-2">Observações</h4>
                    <ul className="space-y-1">
                      {evolution.insights.map((insight, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Body Metrics (current - only when no evolution) */}
          {assessment.bodyMetricsJson && Object.keys(assessment.bodyMetricsJson).length > 0 && !evolution?.daysBetween && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Medidas Corporais
                  {assessment.bodyMetricsJson.compMethod && (
                    <span className={`ml-auto text-xs font-normal px-2 py-0.5 rounded-full border ${
                      assessment.bodyMetricsJson.compMethod === 'inbody'
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    }`}>
                      {assessment.bodyMetricsJson.compMethod === 'inbody' ? '⚡ InBody H20' : '📐 Pollock'}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Basic */}
                <div className="grid gap-4 md:grid-cols-4">
                  {assessment.bodyMetricsJson.weight && (
                    <div className="rounded-lg border p-3">
                      <div className="text-sm text-muted-foreground">Peso</div>
                      <div className="text-xl font-bold">{assessment.bodyMetricsJson.weight} kg</div>
                    </div>
                  )}
                  {assessment.bodyMetricsJson.height && (
                    <div className="rounded-lg border p-3">
                      <div className="text-sm text-muted-foreground">Altura</div>
                      <div className="text-xl font-bold">{assessment.bodyMetricsJson.height} cm</div>
                    </div>
                  )}
                  {assessment.bodyMetricsJson.bodyFat && (
                    <div className="rounded-lg border p-3">
                      <div className="text-sm text-muted-foreground">% Gordura</div>
                      <div className="text-xl font-bold">{assessment.bodyMetricsJson.bodyFat}%</div>
                    </div>
                  )}
                  {assessment.bodyMetricsJson.weight && assessment.bodyMetricsJson.height && (
                    <div className="rounded-lg border border-border p-3 bg-amber-500/10">
                      <div className="text-sm text-muted-foreground">IMC</div>
                      <div className="text-xl font-bold text-foreground">
                        {(assessment.bodyMetricsJson.weight / Math.pow(assessment.bodyMetricsJson.height / 100, 2)).toFixed(1)}
                      </div>
                    </div>
                  )}
                </div>

                {/* InBody H20 full display */}
                {assessment.bodyMetricsJson.inbody && Object.values(assessment.bodyMetricsJson.inbody).some(Boolean) && (
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 space-y-4">
                    <h4 className="font-semibold text-sm text-blue-400">⚡ InBody H20 — Composição Corporal</h4>

                    {/* Main composition */}
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                      {[
                        { key: 'fatPct', label: '% Gordura', unit: '%', color: 'text-red-400' },
                        { key: 'fatMassKg', label: 'Massa Gorda', unit: 'kg', color: 'text-red-300' },
                        { key: 'leanMassKg', label: 'Massa Magra', unit: 'kg', color: 'text-cyan-400' },
                        { key: 'muscleMassKg', label: 'Musc. Esq.', unit: 'kg', color: 'text-blue-400' },
                      ].map(({ key, label, unit, color }) => {
                        const val = assessment.bodyMetricsJson.inbody?.[key]
                        if (!val) return null
                        return (
                          <div key={key} className="rounded-lg border bg-background p-3 text-center">
                            <div className={`text-xl font-bold ${color}`}>{val}{unit}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Water */}
                    {(assessment.bodyMetricsJson.inbody.totalWaterL || assessment.bodyMetricsJson.inbody.intracellularWaterL) && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Água Corporal</p>
                        <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                          {[
                            { key: 'totalWaterL', label: 'Total', unit: 'L', color: 'text-sky-400' },
                            { key: 'intracellularWaterL', label: 'Intracelular', unit: 'L', color: 'text-sky-300' },
                            { key: 'extracellularWaterL', label: 'Extracelular', unit: 'L', color: 'text-sky-200' },
                            { key: 'ecwRatio', label: 'ECW/TBW', unit: '', color: 'text-sky-100' },
                          ].map(({ key, label, unit, color }) => {
                            const val = assessment.bodyMetricsJson.inbody?.[key]
                            if (!val) return null
                            return (
                              <div key={key} className="rounded-lg border bg-background p-2.5 text-center">
                                <div className={`text-lg font-bold ${color}`}>{key === 'ecwRatio' ? val.toFixed(3) : val}{unit}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Metabolism */}
                    {(assessment.bodyMetricsJson.inbody.bmr || assessment.bodyMetricsJson.inbody.visceralFatLevel || assessment.bodyMetricsJson.inbody.proteinKg) && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Metabolismo & Outros</p>
                        <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                          {[
                            { key: 'bmi', label: 'IMC (InBody)', unit: 'kg/m²', color: 'text-amber-400' },
                            { key: 'bmr', label: 'TMB', unit: 'kcal', color: 'text-orange-400' },
                            { key: 'proteinKg', label: 'Protéína', unit: 'kg', color: 'text-violet-400' },
                            { key: 'mineralsKg', label: 'Minerais', unit: 'kg', color: 'text-lime-400' },
                          ].map(({ key, label, unit, color }) => {
                            const val = assessment.bodyMetricsJson.inbody?.[key]
                            if (!val) return null
                            return (
                              <div key={key} className="rounded-lg border bg-background p-2.5 text-center">
                                <div className={`text-lg font-bold ${color}`}>{val}{unit}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                              </div>
                            )
                          })}
                          {assessment.bodyMetricsJson.inbody.visceralFatLevel && (() => {
                            const v = assessment.bodyMetricsJson.inbody.visceralFatLevel
                            return (
                              <div className="rounded-lg border bg-background p-2.5 text-center">
                                <div className={`text-lg font-bold ${
                                  v >= 13 ? 'text-red-400' : v >= 9 ? 'text-yellow-400' : 'text-green-400'
                                }`}>Nível {v}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">Gord. Visceral</div>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Circumferences */}
                {assessment.bodyMetricsJson.measurements && Object.keys(assessment.bodyMetricsJson.measurements).length > 0 && (() => {
                  const m = assessment.bodyMetricsJson.measurements
                  const items = [
                    { key: 'chest', label: 'Peitoral' },
                    { key: 'waist', label: 'Cintura' },
                    { key: 'abdomen', label: 'Abdômen' },
                    { key: 'hip', label: 'Quadril' },
                    { key: 'forearm_right', label: 'Antebraço Dir.' },
                    { key: 'forearm_left', label: 'Antebraço Esq.' },
                    { key: 'arm_right', label: 'Braço Dir.' },
                    { key: 'arm_left', label: 'Braço Esq.' },
                    { key: 'thigh_right', label: 'Coxa Dir.' },
                    { key: 'thigh_left', label: 'Coxa Esq.' },
                    { key: 'calf_right', label: 'Panturrilha Dir.' },
                    { key: 'calf_left', label: 'Panturrilha Esq.' },
                  ].filter(({ key }) => m[key] != null)
                  if (!items.length) return null
                  return (
                    <div>
                      <h4 className="mb-3 text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Ruler className="h-4 w-4" />
                        Circunferências (cm)
                      </h4>
                      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {items.map(({ key, label }) => (
                          <div key={key} className="rounded-lg border p-2 text-center">
                            <div className="text-xs text-muted-foreground">{label}</div>
                            <div className="font-semibold">{m[key]} cm</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* Skinfolds */}
                {assessment.bodyMetricsJson.skinfolds && Object.keys(assessment.bodyMetricsJson.skinfolds).length > 0 && (() => {
                  const s = assessment.bodyMetricsJson.skinfolds
                  const items = [
                    { key: 'chest', label: 'Peito' },
                    { key: 'abdomen', label: 'Abdômen' },
                    { key: 'thigh', label: 'Coxa' },
                  ].filter(({ key }) => s[key] != null)
                  if (!items.length) return null
                  const soma = items.reduce((acc: number, { key }) => acc + (s[key] ?? 0), 0)
                  return (
                    <div>
                      <h4 className="mb-3 text-sm font-medium text-muted-foreground">📏 Dobras Cutâneas (mm)</h4>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {items.map(({ key, label }) => (
                          <div key={key} className="rounded-lg border p-2 text-center">
                            <div className="text-xs text-muted-foreground">{label}</div>
                            <div className="font-semibold">{s[key]} mm</div>
                          </div>
                        ))}
                      </div>
                      {items.length === 3 && (
                        <div className="mt-2 rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 flex items-center justify-between">
                          <span className="text-sm font-medium">Soma das 3 Dobras:</span>
                          <span className="font-bold">{soma.toFixed(1)} mm</span>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Notes */}
                {assessment.bodyMetricsJson.notes && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Obs: </span>{assessment.bodyMetricsJson.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Input Data - Queixas, Dores, Testes */}
          {assessment.inputJson && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Dados da Avaliação
                </CardTitle>
                <CardDescription>
                  Queixas, mapa de dor e testes de movimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Queixas */}
                {assessment.inputJson.complaints && assessment.inputJson.complaints.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">🩹 Queixas Relatadas</h4>
                    <div className="flex flex-wrap gap-2">
                      {assessment.inputJson.complaints.map((complaint: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="bg-orange-100 text-orange-800">
                          {complaint}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mapa de Dor */}
                {assessment.inputJson.painMap && Object.keys(assessment.inputJson.painMap).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">📍 Mapa de Dor (0-10)</h4>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(assessment.inputJson.painMap).map(([location, intensity]: [string, any]) => (
                        <div key={location} className="flex items-center justify-between rounded-lg border p-2">
                          <span className="text-sm">{translatePainRegion(location)}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-border rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  intensity >= 7 ? 'bg-red-500' : 
                                  intensity >= 4 ? 'bg-yellow-500' : 
                                  'bg-green-500'
                                }`}
                                style={{ width: `${(intensity / 10) * 100}%` }}
                              />
                            </div>
                            <span className={`text-sm font-bold w-6 ${
                              intensity >= 7 ? 'text-red-600' : 
                              intensity >= 4 ? 'text-yellow-600' : 
                              'text-green-600'
                            }`}>{intensity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Testes de Movimento */}
                {assessment.inputJson.movementTests && Object.keys(assessment.inputJson.movementTests).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">🏃 Testes de Movimento</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(assessment.inputJson.movementTests).map(([test, data]: [string, any]) => (
                        <div key={test} className="rounded-lg border p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{translateMovementPattern(test)}</span>
                            <Badge className={
                              data.score >= 3 ? 'bg-green-500' : 
                              data.score === 2 ? 'bg-yellow-500' : 
                              data.score === 1 ? 'bg-orange-500' :
                              'bg-red-500'
                            }>
                              Score: {data.score}
                            </Badge>
                          </div>
                          {data.observations && (
                            <p className="text-xs text-muted-foreground mt-1">💬 {data.observations}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Recomendações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.recommendations.map((rec: string, index: number) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <Link href={`/clients/${assessment.client.id}`}>
              <Button variant="outline">
                <User className="mr-2 h-4 w-4" />
                Ver Cliente
              </Button>
            </Link>
            <Link href={`/workouts/generate?clientId=${assessment.client.id}`}>
              <Button>
                <Dumbbell className="mr-2 h-4 w-4" />
                Criar Treino
              </Button>
            </Link>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
            <h3 className="mt-4 text-lg font-medium">
              Resultado não disponível
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Houve um problema ao processar esta avaliação.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
