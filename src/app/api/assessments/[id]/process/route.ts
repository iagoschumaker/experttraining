// ============================================================================
// EXPERT TRAINING - PROCESS ASSESSMENT API
// ============================================================================
// POST /api/assessments/[id]/process - Processa avaliação pelo motor de decisão
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken, hasStudioContext, getAccessTokenCookie } from '@/lib/auth'
import { processAssessment } from '@/lib/rules-engine'
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

    // Update assessment with results
    const updatedAssessment = await prisma.assessment.update({
      where: { id: params.id },
      data: {
        resultJson: result as any,
        confidence: result.confidence,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

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
