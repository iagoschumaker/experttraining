// ============================================================================
// EXPERT PRO TRAINING - ÁREA DO ALUNO - TREINO
// ============================================================================
// GET /api/areaaluno/treino - Buscar treino ativo do aluno
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { jwtVerify } from 'jose'

const ALUNO_JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET + '_ALUNO'
)

interface AlunoPayload {
  clientId: string
  studioId: string
  name: string
  type: string
}

async function verifyAlunoSession(request: NextRequest): Promise<AlunoPayload | null> {
  const token = request.cookies.get('aluno_session')?.value

  if (!token) {
    return null
  }

  try {
    const { payload } = await jwtVerify(token, ALUNO_JWT_SECRET)
    
    if (payload.type !== 'ALUNO_SESSION') {
      return null
    }

    return payload as unknown as AlunoPayload
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verificar sessão do aluno
    const session = await verifyAlunoSession(request)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sessão expirada. Faça login novamente.' },
        { status: 401 }
      )
    }

    // Buscar dados do cliente
    const client = await prisma.client.findUnique({
      where: { id: session.clientId },
      select: {
        id: true,
        name: true,
        phone: true,
        isActive: true,
        studio: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            settings: true,
          },
        },
      },
    })

    if (!client || !client.isActive) {
      return NextResponse.json(
        { success: false, error: 'Cadastro não encontrado ou inativo.' },
        { status: 404 }
      )
    }

    // Buscar treino ativo mais recente
    const workout = await prisma.workout.findFirst({
      where: {
        clientId: session.clientId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        blocksUsed: true,
        scheduleJson: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Buscar última avaliação para aviso de reavaliação
    const lastAssessment = await prisma.assessment.findFirst({
      where: {
        clientId: session.clientId,
        status: 'COMPLETED',
      },
      orderBy: {
        completedAt: 'desc',
      },
      select: {
        id: true,
        completedAt: true,
      },
    })

    // Calcular se precisa de reavaliação (mais de 8 semanas)
    let needsReassessment = false
    let daysSinceLastAssessment = null

    if (lastAssessment?.completedAt) {
      const daysDiff = Math.floor(
        (Date.now() - new Date(lastAssessment.completedAt).getTime()) / (1000 * 60 * 60 * 24)
      )
      daysSinceLastAssessment = daysDiff
      needsReassessment = daysDiff > 56 // 8 semanas
    }

    // Extrair contato do studio das settings
    const studioSettings = client.studio?.settings as any || {}

    return NextResponse.json({
      success: true,
      data: {
        client: {
          name: client.name,
        },
        studio: {
          name: client.studio?.name,
          logoUrl: client.studio?.logoUrl,
          phone: studioSettings.phone || null,
        },
        workout: workout ? {
          id: workout.id,
          name: workout.name,
          schedule: workout.scheduleJson,
          startDate: workout.startDate,
          endDate: workout.endDate,
          createdAt: workout.createdAt,
        } : null,
        reassessment: {
          needed: needsReassessment,
          daysSinceLastAssessment,
          lastAssessmentDate: lastAssessment?.completedAt,
        },
      },
    })
  } catch (error) {
    console.error('Erro ao buscar treino do aluno:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno. Tente novamente.' },
      { status: 500 }
    )
  }
}
