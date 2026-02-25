'use client'

// ============================================================================
// EXPERT TRAINING - ASSESSMENT RESULT PAGE
// ============================================================================
// Exibe o resultado da avaliação processada pelo Motor de Decisão
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
  XCircle,
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
} from 'lucide-react'
import type { AssessmentResult, Block } from '@/types'

interface Assessment {
  id: string
  status: string
  confidence: number | null
  createdAt: string
  completedAt: string | null
  inputJson: any
  bodyMetricsJson?: any
  resultJson: AssessmentResult | null
  client: {
    id: string
    name: string
    history: string | null
    objectives: string | null
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
            if (evoData.success) {
              setEvolution(evoData.data.evolution)
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
          {/* Summary */}
          <div className="grid gap-4 md:grid-cols-2">

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Padrão Funcional
                </CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {result.functionalPattern
                    ?.replace(/_/g, ' ')
                    .replace(/DOMINANT|FOCUS/g, '')}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Perfil de movimento identificado
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Blocos
                </CardTitle>
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-green-600">
                    {result.allowedBlocks?.length || 0}
                  </span>
                  <span className="text-lg text-red-600">
                    / {result.blockedBlocks?.length || 0}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Liberados / Bloqueados
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Focus Areas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Áreas de Foco
              </CardTitle>
              <CardDescription>
                Prioridades identificadas para o treino
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="mb-2 font-medium text-green-600">
                    Foco Principal
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(result.focus?.primary || (result.primaryFocus ? [result.primaryFocus] : []))?.map((focus: string) => (
                      <Badge key={focus} variant="default">
                        {focus}
                      </Badge>
                    ))}
                    {(!result.focus?.primary && !result.primaryFocus) && (
                      <span className="text-sm text-muted-foreground">
                        Nenhum foco identificado
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 font-medium text-amber-500">
                    Foco Secundário
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(result.focus?.secondary || result.secondaryFocus || [])?.map((focus: string) => (
                      <Badge key={focus} variant="secondary">
                        {focus}
                      </Badge>
                    ))}
                    {(!result.focus?.secondary && (!result.secondaryFocus || result.secondaryFocus.length === 0)) && (
                      <span className="text-sm text-muted-foreground">
                        Nenhum foco secundário
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Evolution Section (if available) */}
          {evolution && evolution.daysBetween !== null && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Evolução desde a Última Avaliação
                </CardTitle>
                <CardDescription>
                  Comparação com avaliação de {evolution.daysBetween} dias atrás
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Body metrics evolution */}
                <div>
                  <h4 className="mb-3 font-medium flex items-center gap-2">
                    <Scale className="h-4 w-4" />
                    Métricas Corporais
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

          {/* Body Metrics (current) */}
          {assessment.bodyMetricsJson && Object.keys(assessment.bodyMetricsJson).length > 0 && !evolution?.daysBetween && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Medidas Corporais
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
                  const soma = items.reduce((acc, { key }) => acc + (s[key] ?? 0), 0)
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

                {/* Nível Avaliado */}
                {assessment.inputJson.level && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">🎯 Nível Avaliado</h4>
                    <Badge className="bg-amber-500">
                      {translateDifficulty(assessment.inputJson.level)}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Allowed Blocks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Blocos Liberados
              </CardTitle>
              <CardDescription>
                Exercícios e padrões de movimento recomendados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result.allowedBlocks && result.allowedBlocks.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {result.allowedBlocks.map((block: Block | string, index: number) => {
                    const blockData = typeof block === 'string' 
                      ? { name: block } 
                      : block as Block & { levelName?: string }
                    return (
                      <div
                        key={typeof block !== 'string' && 'id' in block ? block.id : `block-${index}`}
                        className="flex items-start gap-3 rounded-lg border border-green-500/20 bg-green-500/10 p-3"
                      >
                        <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                        <div>
                          <div className="font-medium">{blockData.name}</div>
                          {typeof block !== 'string' && 'levelName' in blockData && blockData.levelName && (
                            <div className="text-sm text-muted-foreground">
                              {blockData.levelName}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Nenhum bloco liberado identificado
                </p>
              )}
            </CardContent>
          </Card>

          {/* Blocked Blocks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Blocos Bloqueados
              </CardTitle>
              <CardDescription>
                Exercícios e padrões de movimento a evitar
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result.blockedBlocks && result.blockedBlocks.length > 0 ? (
                <div className="space-y-3">
                  {result.blockedBlocks.map(
                    (item: string, index: number) => {
                      return (
                        <div
                          key={`blocked-${index}`}
                          className="rounded-lg border border-red-500/20 bg-red-500/10 p-3"
                        >
                          <div className="flex items-start gap-3">
                            <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                            <div>
                              <div className="font-medium">{item}</div>
                            </div>
                          </div>
                        </div>
                      )
                    }
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Nenhum bloco bloqueado
                </p>
              )}
            </CardContent>
          </Card>

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
                  {result.recommendations.map((rec, index) => (
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
            <Link href={`/workouts/generate?assessmentId=${assessmentId}`}>
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
