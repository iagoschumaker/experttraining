// ============================================================================
// EXPERT TRAINING - CLIENT EVOLUTION API
// ============================================================================
// GET /api/studio/clients/[id]/evolution - Evolução completa do cliente
// Compara primeira avaliação (baseline) com a última (atual)
// Calcula diferenças absolutas e percentuais
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

// ============================================================================
// INTERFACES
// ============================================================================
interface BodyMetrics {
  weight?: number
  height?: number
  measurements?: {
    chest?: number
    waist?: number
    abdomen?: number
    hip?: number
    arm?: number
    arm_left?: number
    arm_right?: number
    forearm_left?: number
    forearm_right?: number
    thigh?: number
    thigh_left?: number
    thigh_right?: number
    calf?: number
    calf_left?: number
    calf_right?: number
  }
  skinfolds?: {
    chest?: number
    abdomen?: number
    thigh?: number
  }
  bodyFat?: number
}

interface MetricEvolution {
  baseline: number | null
  current: number | null
  absoluteDelta: number | null
  percentageDelta: number | null
  trend: 'up' | 'down' | 'stable' | null
}

interface AssessmentSummary {
  id: string
  date: Date
  level: string | null
  confidence: number | null
  hasBodyMetrics: boolean
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function calculateEvolution(baseline?: number | null, current?: number | null): MetricEvolution {
  if (baseline === undefined || baseline === null) {
    return { baseline: null, current: current ?? null, absoluteDelta: null, percentageDelta: null, trend: null }
  }
  if (current === undefined || current === null) {
    return { baseline, current: null, absoluteDelta: null, percentageDelta: null, trend: null }
  }

  const absoluteDelta = Math.round((current - baseline) * 100) / 100
  const percentageDelta = baseline !== 0
    ? Math.round(((current - baseline) / baseline) * 1000) / 10
    : 0

  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (Math.abs(percentageDelta) >= 1) {
    trend = absoluteDelta > 0 ? 'up' : 'down'
  }

  return { baseline, current, absoluteDelta, percentageDelta, trend }
}

function extractLevel(resultJson: unknown): string | null {
  if (!resultJson || typeof resultJson !== 'object') return null
  const result = resultJson as any
  return result.levelAnalysis?.clientLevel || result.level || null
}

function extractMetricsFromAssessment(assessment: any): BodyMetrics | null {
  const bodyMetrics = assessment.bodyMetricsJson as BodyMetrics | null
  if (!bodyMetrics) return null

  // Normalizar medidas bilaterais
  const measurements = bodyMetrics.measurements || {}
  return {
    weight: bodyMetrics.weight,
    height: bodyMetrics.height,
    bodyFat: bodyMetrics.bodyFat,
    skinfolds: bodyMetrics.skinfolds,
    measurements: {
      chest: measurements.chest,
      waist: measurements.waist,
      abdomen: measurements.abdomen,
      hip: measurements.hip,
      arm: measurements.arm_right || measurements.arm || measurements.arm_left,
      arm_left: measurements.arm_left,
      arm_right: measurements.arm_right,
      forearm_left: measurements.forearm_left,
      forearm_right: measurements.forearm_right,
      thigh: measurements.thigh_right || measurements.thigh || measurements.thigh_left,
      thigh_left: measurements.thigh_left,
      thigh_right: measurements.thigh_right,
      calf: measurements.calf_right || measurements.calf || measurements.calf_left,
      calf_left: measurements.calf_left,
      calf_right: measurements.calf_right,
    },
  }
}

// ============================================================================
// GET - Client Evolution (Baseline vs Current)
// ============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId, role, userId } = auth
  const clientId = params.id

  try {
    // ========================================================================
    // 1. BUSCAR CLIENTE E VERIFICAR PERMISSÕES
    // ========================================================================
    const client = await prisma.client.findFirst({
      where: { id: clientId, studioId },
      select: {
        id: true,
        name: true,
        trainerId: true,
        createdAt: true,
        weight: true,
        height: true,
        arm: true,
        calf: true,
        chest: true,
        hip: true,
        thigh: true,
        waist: true,
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // All trainers can view any client's evolution in the studio

    // ========================================================================
    // 2. BUSCAR TODAS AS AVALIAÇÕES COMPLETADAS (ordenadas por data)
    // ========================================================================
    const assessments = await prisma.assessment.findMany({
      where: {
        clientId,
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'asc' }, // Primeira = baseline
      select: {
        id: true,
        createdAt: true,
        resultJson: true,
        bodyMetricsJson: true,
        confidence: true,
      },
    })

    if (assessments.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          client: { id: client.id, name: client.name },
          hasEvolution: false,
          message: 'Nenhuma avaliação completada para este cliente',
          totalAssessments: 0,
        },
      })
    }

    // ========================================================================
    // 3. IDENTIFICAR BASELINE E ATUAL
    // ========================================================================
    const baselineAssessment = assessments[0]
    const currentAssessment = assessments[assessments.length - 1]
    const isFirstAssessment = assessments.length === 1

    const baselineMetrics = extractMetricsFromAssessment(baselineAssessment)
    const currentMetrics = extractMetricsFromAssessment(currentAssessment)

    // ========================================================================
    // 4. CALCULAR EVOLUÇÃO DE MÉTRICAS CORPORAIS
    // ========================================================================
    const bodyEvolution = {
      weight: calculateEvolution(baselineMetrics?.weight, currentMetrics?.weight),
      height: calculateEvolution(baselineMetrics?.height, currentMetrics?.height),
      bodyFat: calculateEvolution(baselineMetrics?.bodyFat, currentMetrics?.bodyFat),
      measurements: {
        chest: calculateEvolution(
          baselineMetrics?.measurements?.chest,
          currentMetrics?.measurements?.chest
        ),
        waist: calculateEvolution(
          baselineMetrics?.measurements?.waist,
          currentMetrics?.measurements?.waist
        ),
        hip: calculateEvolution(
          baselineMetrics?.measurements?.hip,
          currentMetrics?.measurements?.hip
        ),
        arm: calculateEvolution(
          baselineMetrics?.measurements?.arm,
          currentMetrics?.measurements?.arm
        ),
        thigh: calculateEvolution(
          baselineMetrics?.measurements?.thigh,
          currentMetrics?.measurements?.thigh
        ),
        calf: calculateEvolution(
          baselineMetrics?.measurements?.calf,
          currentMetrics?.measurements?.calf
        ),
      },
    }

    // ========================================================================
    // 5. EVOLUÇÃO DE NÍVEL
    // ========================================================================
    const baselineLevel = extractLevel(baselineAssessment.resultJson)
    const currentLevel = extractLevel(currentAssessment.resultJson)

    const levelMap: Record<string, number> = {
      'BEGINNER': 1,
      'INTERMEDIATE': 2,
      'ADVANCED': 3,
    }

    const levelEvolution = {
      baseline: baselineLevel,
      current: currentLevel,
      baselineNumeric: baselineLevel ? levelMap[baselineLevel] || 0 : null,
      currentNumeric: currentLevel ? levelMap[currentLevel] || 0 : null,
      improved: baselineLevel && currentLevel
        ? (levelMap[currentLevel] || 0) > (levelMap[baselineLevel] || 0)
        : false,
      regressed: baselineLevel && currentLevel
        ? (levelMap[currentLevel] || 0) < (levelMap[baselineLevel] || 0)
        : false,
    }

    // ========================================================================
    // 6. CALCULAR PERÍODO
    // ========================================================================
    const baselineDate = new Date(baselineAssessment.createdAt)
    const currentDate = new Date(currentAssessment.createdAt)
    const daysBetween = Math.max(0, Math.round(
      (currentDate.getTime() - baselineDate.getTime()) / (1000 * 60 * 60 * 24)
    ))
    const weeksBetween = Math.floor(daysBetween / 7)

    // ========================================================================
    // 7. GERAR INSIGHTS AUTOMÁTICOS
    // ========================================================================
    const insights: string[] = []

    // Insights de peso
    if (bodyEvolution.weight.trend === 'down' && bodyEvolution.weight.percentageDelta !== null) {
      if (bodyEvolution.weight.percentageDelta <= -5) {
        insights.push(`🎯 Perda significativa de peso: ${Math.abs(bodyEvolution.weight.absoluteDelta!).toFixed(1)}kg (${Math.abs(bodyEvolution.weight.percentageDelta).toFixed(1)}%)`)
      } else if (bodyEvolution.weight.percentageDelta <= -2) {
        insights.push(`📉 Redução de peso: ${Math.abs(bodyEvolution.weight.absoluteDelta!).toFixed(1)}kg`)
      }
    } else if (bodyEvolution.weight.trend === 'up' && bodyEvolution.weight.percentageDelta !== null) {
      if (bodyEvolution.weight.percentageDelta >= 5) {
        insights.push(`📈 Ganho significativo de peso: ${bodyEvolution.weight.absoluteDelta!.toFixed(1)}kg`)
      }
    }

    // Insights de circunferências
    if (bodyEvolution.measurements.waist.trend === 'down') {
      insights.push(`✅ Redução na cintura: ${Math.abs(bodyEvolution.measurements.waist.absoluteDelta!).toFixed(1)}cm - Indicador positivo de saúde!`)
    }
    if (bodyEvolution.measurements.arm.trend === 'up') {
      insights.push(`💪 Aumento na circunferência do braço: ${bodyEvolution.measurements.arm.absoluteDelta!.toFixed(1)}cm`)
    }
    if (bodyEvolution.measurements.thigh.trend === 'up') {
      insights.push(`🦵 Aumento na circunferência da coxa: ${bodyEvolution.measurements.thigh.absoluteDelta!.toFixed(1)}cm`)
    }

    // Insights de nível
    if (levelEvolution.improved) {
      insights.push(`🏆 Progresso de nível: ${baselineLevel} → ${currentLevel}`)
    } else if (levelEvolution.regressed) {
      insights.push(`⚠️ Regressão de nível detectada - Verificar condições de saúde`)
    }

    // Insight de período
    if (weeksBetween >= 4) {
      insights.push(`📅 Período de acompanhamento: ${weeksBetween} semanas (${assessments.length} avaliações)`)
    }

    // ========================================================================
    // 8. HISTÓRICO DE AVALIAÇÕES (resumo)
    // ========================================================================
    const assessmentHistory: AssessmentSummary[] = assessments.map(a => ({
      id: a.id,
      date: a.createdAt,
      level: extractLevel(a.resultJson),
      confidence: a.confidence ? Number(a.confidence) : null,
      hasBodyMetrics: !!a.bodyMetricsJson,
    }))

    // ========================================================================
    // 9. RESPOSTA
    // ========================================================================
    return NextResponse.json({
      success: true,
      data: {
        client: {
          id: client.id,
          name: client.name,
          currentState: {
            weight: client.weight ? Number(client.weight) : null,
            height: client.height ? Number(client.height) : null,
            chest: client.chest ? Number(client.chest) : null,
            waist: client.waist ? Number(client.waist) : null,
            hip: client.hip ? Number(client.hip) : null,
            arm: client.arm ? Number(client.arm) : null,
            thigh: client.thigh ? Number(client.thigh) : null,
            calf: client.calf ? Number(client.calf) : null,
          },
        },
        hasEvolution: !isFirstAssessment,
        period: {
          baselineDate,
          currentDate,
          daysBetween,
          weeksBetween,
          totalAssessments: assessments.length,
        },
        baseline: {
          assessmentId: baselineAssessment.id,
          date: baselineAssessment.createdAt,
          metrics: baselineMetrics,
          level: baselineLevel,
        },
        current: {
          assessmentId: currentAssessment.id,
          date: currentAssessment.createdAt,
          metrics: currentMetrics,
          level: currentLevel,
        },
        evolution: {
          body: bodyEvolution,
          level: levelEvolution,
        },
        insights,
        history: assessmentHistory,
      },
    })
  } catch (error) {
    console.error('Get client evolution error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar evolução do cliente' },
      { status: 500 }
    )
  }
}
