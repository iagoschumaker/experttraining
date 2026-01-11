// ============================================================================
// EXPERT TRAINING - ASSESSMENTS API
// ============================================================================
// GET /api/assessments - Lista avaliações
// POST /api/assessments - Cria nova avaliação
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyAccessToken, hasStudioContext, getAccessTokenCookie } from '@/lib/auth'

// Validation schema for movement test
const movementTestSchema = z.object({
  score: z.number().min(0).max(3),
  observations: z.string().default(''),
})

// Validation schema for creating an assessment
const createAssessmentSchema = z.object({
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  inputJson: z.object({
    complaints: z.array(z.string()).default([]),
    painMap: z.record(z.string(), z.number().min(0).max(10)).default({}),
    movementTests: z.object({
      squat: movementTestSchema,
      hinge: movementTestSchema,
      lunge: movementTestSchema,
      push: movementTestSchema,
      pull: movementTestSchema,
      rotation: movementTestSchema,
      gait: movementTestSchema,
    }),
    level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  }),
})

// GET - List assessments
export async function GET(request: NextRequest) {
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

    // Get query params
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    // Build where clause - get assessments for clients in this studio
    const where: any = {
      client: {
        studioId: payload.studioId,
      },
    }

    if (clientId) {
      where.clientId = clientId
    }

    if (status) {
      where.status = status
    }

    // All trainers can see all assessments in the studio
    // (editing/processing is restricted to assigned trainer or admin)

    // Get total count
    const total = await prisma.assessment.count({ where })

    // Get assessments with pagination
    const assessments = await prisma.assessment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        status: true,
        confidence: true,
        createdAt: true,
        completedAt: true,
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        items: assessments,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('List assessments error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Create assessment
export async function POST(request: NextRequest) {
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

    // Parse and validate body
    const body = await request.json()
    const validation = createAssessmentSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { clientId, inputJson } = validation.data

    // Verify client belongs to studio and user has access
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        studioId: payload.studioId,
        isActive: true,
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Check access for trainers
    if (payload.role === 'TRAINER' && client.trainerId !== payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado a este cliente' },
        { status: 403 }
      )
    }

    // Create assessment (without processing yet)
    const assessment = await prisma.assessment.create({
      data: {
        clientId,
        assessorId: payload.userId,
        status: 'PENDING',
        inputJson: inputJson as any,
      },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        studioId: payload.studioId,
        action: 'CREATE',
        entity: 'Assessment',
        entityId: assessment.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: assessment,
    })
  } catch (error) {
    console.error('Create assessment error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
