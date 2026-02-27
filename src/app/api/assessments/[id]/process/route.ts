// ============================================================================
// EXPERT TRAINING - PROCESS ASSESSMENT API
// ============================================================================
// POST /api/assessments/[id]/process - Processa avaliação pelo motor de decisão
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken, hasStudioContext, getAccessTokenCookie } from '@/lib/auth'
import { processAssessment } from '@/lib/rules-engine'
import { computeFromAssessment } from '@/services/jubaMethod'
import { computePollock, ageFromBirthDate } from '@/services/pollock'
import type { AssessmentInput } from '@/types'

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
