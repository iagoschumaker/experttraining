// ============================================================================
// EXPERT TRAINING - PROCESS ASSESSMENT API
// ============================================================================
// POST /api/assessments/[id]/process - Processa avaliação pelo motor de decisão
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken, hasStudioContext, getAccessTokenCookie } from '@/lib/auth'
import { computeFromAssessment } from '@/services/jubaMethod'
import { computePollock, ageFromBirthDate } from '@/services/pollock'
import type { AssessmentInput } from '@/types'

/**
 * Process assessment inline — calculates level from movement scores.
 * Replaces the old rules-engine.
 */
async function processAssessment(input: AssessmentInput) {
  // Calculate average movement score
  const tests = (input.movementTests || {}) as Record<string, any>
  const scoreValues: number[] = []
  for (const key of Object.keys(tests)) {
    const test = tests[key]
    if (test && typeof test === 'object' && typeof test.score === 'number') {
      scoreValues.push(test.score)
    } else if (typeof test === 'number') {
      scoreValues.push(test)
    }
  }
  const avgScore = scoreValues.length > 0
    ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
    : 2

  // Determine level based on average
  let calculatedLevel: number
  let levelLabel: string
  if (avgScore >= 4) {
    calculatedLevel = 3
    levelLabel = 'AVANCADO'
  } else if (avgScore >= 2.5) {
    calculatedLevel = 2
    levelLabel = 'INTERMEDIARIO'
  } else {
    calculatedLevel = 1
    levelLabel = 'INICIANTE'
  }

  // Check for pain/complaints → lower confidence
  const hasPain = (input.painMap && input.painMap.length > 0) || (input.complaints && input.complaints.length > 0)
  const confidence = hasPain ? Math.min(70, Math.round(avgScore * 20)) : Math.round(avgScore * 20)

  return {
    calculatedLevel,
    level: calculatedLevel,
    levelLabel,
    confidence,
    averageScore: Math.round(avgScore * 100) / 100,
    totalScores: scoreValues.length,
    hasPainFlags: !!hasPain,
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accessToken = await getAccessTokenCookie()
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const payload = verifyAccessToken(accessToken)
    
    if (!payload || !hasStudioContext(payload)) {
      return NextResponse.json(
        { success: false, error: 'Contexto de studio não encontrado' },
        { status: 401 }
      )
    }

    // Get assessment
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: params.id,
        client: {
          studioId: payload.studioId,
        },
      },
      include: {
        client: {
          select: {
            trainerId: true,
            gender: true,
            birthDate: true,
            weight: true,
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

    // Check access for trainers
    if (payload.role === 'TRAINER' && assessment.client.trainerId !== payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Validate input data exists
    if (!assessment.inputJson) {
      return NextResponse.json(
        { success: false, error: 'Dados de entrada não preenchidos' },
        { status: 400 }
      )
    }

    // Process through rules engine
    const inputData = assessment.inputJson as unknown as AssessmentInput
    const result = await processAssessment(inputData)

    // Calculate Juba Method composição corporal (if bodyMetrics has weight + bodyFat)
    const bodyMetrics = assessment.bodyMetricsJson as any
    let computedJson = computeFromAssessment(bodyMetrics, assessment.client.gender)

    // Calculate Pollock body fat from skinfolds (if available)
    let pollockResult = null
    if (bodyMetrics?.skinfolds && assessment.client.gender && assessment.client.birthDate) {
      const weight = bodyMetrics.weight ?? Number(assessment.client.weight) ?? null
      const age = ageFromBirthDate(assessment.client.birthDate)
      const sex = (assessment.client.gender === 'M' || assessment.client.gender === 'F')
        ? assessment.client.gender as 'M' | 'F'
        : null
      if (weight && age > 0 && sex) {
        pollockResult = computePollock(bodyMetrics.skinfolds, age, weight, sex)
        if (pollockResult) {
          // Merge pollock into computedJson
          computedJson = {
            ...(computedJson ?? {}),
            pollock: pollockResult,
          } as any
        }
      }
    }

    // Update assessment with results
    const updatedAssessment = await prisma.assessment.update({
      where: { id: params.id },
      data: {
        resultJson: result as any,
        confidence: result.confidence,
        status: 'COMPLETED',
        completedAt: new Date(),
        ...(computedJson ? { computedJson: computedJson as any } : {}),
      },
    })

    // Auto-update client bodyFat
    // Priority: Pollock calculation > manually entered bodyFat
    const autoBodyFat = pollockResult?.bodyFatPercent ?? bodyMetrics?.bodyFat ?? null
    if (autoBodyFat) {
      await prisma.client.update({
        where: { id: assessment.clientId },
        data: { bodyFat: autoBodyFat },
      })
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        studioId: payload.studioId,
        action: 'PROCESS',
        entity: 'Assessment',
        entityId: assessment.id,
        newData: { result } as any,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        assessment: updatedAssessment,
        result,
      },
    })
  } catch (error) {
    console.error('Process assessment error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
