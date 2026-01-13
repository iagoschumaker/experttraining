// ============================================================================
// EXPERT TRAINING - ASSESSMENT EVOLUTION API
// ============================================================================
// GET /api/studio/assessments/[id]/evolution - Comparação com avaliação anterior
// Mostra evolução de peso, medidas e respostas entre avaliações
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

interface BodyMetrics {
  weight?: number
  height?: number
  measurements?: {
    chest?: number
    waist?: number
    hip?: number
    arm?: number
    thigh?: number
    calf?: number
  }
  bodyFat?: number
  notes?: string
}

interface ResultJson {
  level?: number
  calculatedLevel?: number
}

// Helper to extract level from resultJson
function extractLevel(resultJson: unknown): number | null {
  if (!resultJson || typeof resultJson !== 'object') return null
  const result = resultJson as ResultJson
  return result.calculatedLevel ?? result.level ?? null
}

interface MetricDelta {
  current: number | null
  previous: number | null
  delta: number | null
  percentage: number | null
  trend: 'up' | 'down' | 'stable' | null
}

function calculateDelta(current?: number | null, previous?: number | null): MetricDelta {
  if (current === undefined || current === null) {
    return { current: null, previous: previous ?? null, delta: null, percentage: null, trend: null }
  }
  if (previous === undefined || previous === null) {
    return { current, previous: null, delta: null, percentage: null, trend: null }
  }
  
  const delta = current - previous
  const percentage = previous !== 0 ? (delta / previous) * 100 : 0
  
  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (Math.abs(percentage) >= 1) {
    trend = delta > 0 ? 'up' : 'down'
  }
  
  return {
    current,
    previous,
    delta: Math.round(delta * 100) / 100,
    percentage: Math.round(percentage * 10) / 10,
    trend,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId, role, userId } = auth
  const { id } = await params

  try {
    // Buscar avaliação atual
    const assessment = await prisma.assessment.findFirst({
      where: { id },
      include: {
        client: {
          include: {
            assessments: {
              where: {
                id: { not: id },
                status: 'COMPLETED',
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    })

    if (!assessment) {
      return NextResponse.json(
        { success: false, error: 'Avaliação não encontrada' },
        { status: 404 }
      )
    }

    // Verificar permissão
    if (assessment.client.studioId !== studioId) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // TRAINER só vê avaliações dos seus clientes
    if (role === 'TRAINER' && assessment.client.trainerId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Buscar assessor separadamente (não há relation no schema)
    const assessor = await prisma.user.findUnique({
      where: { id: assessment.assessorId },
      select: { id: true, name: true },
    })

    // Avaliação anterior (se existir)
    const previousAssessment = assessment.client.assessments[0] || null

    // =========================================================================
    // COMPARAÇÃO DE RESPOSTAS (inputJson - respostas da avaliação)
    // =========================================================================
    
    const currentAnswers = assessment.inputJson as Record<string, unknown> || {}
    const previousAnswers = previousAssessment
      ? (previousAssessment.inputJson as Record<string, unknown> || {})
      : null

    // Identificar mudanças nas respostas
    const responseChanges: Array<{
      questionId: string
      previousValue: unknown
      currentValue: unknown
      changed: boolean
    }> = []

    if (previousAnswers) {
      const allQuestionIds = new Set([
        ...Object.keys(currentAnswers),
        ...Object.keys(previousAnswers),
      ])

      allQuestionIds.forEach((qid) => {
        const prev = previousAnswers[qid]
        const curr = currentAnswers[qid]
        const changed = JSON.stringify(prev) !== JSON.stringify(curr)
        
        if (changed) {
          responseChanges.push({
            questionId: qid,
            previousValue: prev,
            currentValue: curr,
            changed: true,
          })
        }
      })
    }

    // =========================================================================
    // COMPARAÇÃO DE MÉTRICAS CORPORAIS
    // =========================================================================
    
    const currentMetrics = assessment.bodyMetricsJson as BodyMetrics | null
    const previousMetrics = previousAssessment
      ? (previousAssessment.bodyMetricsJson as BodyMetrics | null)
      : null

    const bodyEvolution = {
      weight: calculateDelta(currentMetrics?.weight, previousMetrics?.weight),
      height: calculateDelta(currentMetrics?.height, previousMetrics?.height),
      bodyFat: calculateDelta(currentMetrics?.bodyFat, previousMetrics?.bodyFat),
      measurements: {
        chest: calculateDelta(
          currentMetrics?.measurements?.chest,
          previousMetrics?.measurements?.chest
        ),
        waist: calculateDelta(
          currentMetrics?.measurements?.waist,
          previousMetrics?.measurements?.waist
        ),
        hip: calculateDelta(
          currentMetrics?.measurements?.hip,
          previousMetrics?.measurements?.hip
        ),
        arm: calculateDelta(
          currentMetrics?.measurements?.arm,
          previousMetrics?.measurements?.arm
        ),
        thigh: calculateDelta(
          currentMetrics?.measurements?.thigh,
          previousMetrics?.measurements?.thigh
        ),
        calf: calculateDelta(
          currentMetrics?.measurements?.calf,
          previousMetrics?.measurements?.calf
        ),
      },
    }

    // =========================================================================
    // COMPARAÇÃO DE NÍVEL E CONFIANÇA
    // =========================================================================
    
    const currentLevel = extractLevel(assessment.resultJson)
    const previousLevel = previousAssessment ? extractLevel(previousAssessment.resultJson) : null
    
    const levelEvolution = {
      previousLevel,
      currentLevel,
      changed: previousAssessment
        ? previousLevel !== currentLevel
        : false,
    }

    const currentConfidence = assessment.confidence ? Number(assessment.confidence) / 100 : null
    const previousConfidence = previousAssessment?.confidence ? Number(previousAssessment.confidence) / 100 : null

    const confidenceEvolution = {
      previousConfidence,
      currentConfidence,
      delta: previousConfidence && currentConfidence
        ? Math.round((currentConfidence - previousConfidence) * 100) / 100
        : null,
    }

    // =========================================================================
    // RESUMO DA EVOLUÇÃO
    // =========================================================================
    
    const daysBetween = previousAssessment
      ? Math.round(
          (new Date(assessment.createdAt).getTime() -
            new Date(previousAssessment.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null

    // Gerar insights
    const insights: string[] = []

    if (bodyEvolution.weight.trend === 'down' && bodyEvolution.weight.percentage && bodyEvolution.weight.percentage < -5) {
      insights.push('Perda significativa de peso no período')
    }
    if (bodyEvolution.weight.trend === 'up' && bodyEvolution.weight.percentage && bodyEvolution.weight.percentage > 5) {
      insights.push('Ganho significativo de peso no período')
    }
    if (bodyEvolution.measurements.waist.trend === 'down') {
      insights.push('Redução na circunferência da cintura (positivo para saúde)')
    }
    if (levelEvolution.changed && currentLevel && previousLevel) {
      if (currentLevel > previousLevel) {
        insights.push('Progresso de nível detectado!')
      } else if (currentLevel < previousLevel) {
        insights.push('Regressão de nível - verificar condições de saúde')
      }
    }
    if (responseChanges.length > 0) {
      insights.push(`${responseChanges.length} resposta(s) alterada(s) desde a última avaliação`)
    }

    // =========================================================================
    // RESPOSTA
    // =========================================================================
    
    return NextResponse.json({
      success: true,
      data: {
        assessment: {
          id: assessment.id,
          createdAt: assessment.createdAt,
          level: currentLevel,
          confidence: currentConfidence,
          assessor,
        },
        previousAssessment: previousAssessment
          ? {
              id: previousAssessment.id,
              createdAt: previousAssessment.createdAt,
              level: previousLevel,
              confidence: previousConfidence,
            }
          : null,
        evolution: {
          daysBetween,
          body: bodyEvolution,
          level: levelEvolution,
          confidence: confidenceEvolution,
          responseChanges,
        },
        insights,
        client: {
          id: assessment.client.id,
          name: assessment.client.name,
          totalAssessments: assessment.client.assessments.length + 1,
        },
      },
    })
  } catch (error) {
    console.error('Get evolution error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar evolução' },
      { status: 500 }
    )
  }
}
