// ============================================================================
// EXPERT TRAINING - ASSESSMENTS API
// ============================================================================
// GET  /api/studio/assessments - Lista avaliações
// POST /api/studio/assessments - Cria nova avaliação
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { z } from 'zod'

// ============================================================================
// GET - List Assessments
// ============================================================================
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth

  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')

    // Build where clause
    const where: any = {}

    // Filter by client's studio
    where.client = { studioId }

    // TRAINER só vê avaliações de seus clientes
    if (role === 'TRAINER') {
      where.assessorId = userId
    }

    // Client filter
    if (clientId) {
      where.clientId = clientId
    }

    // Status filter
    if (status && status !== 'all') {
      where.status = status
    }

    // Fetch assessments
    const [assessments, total] = await Promise.all([
      prisma.assessment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
      }),
      prisma.assessment.count({ where }),
    ])

    // Get assessor names
    const assessmentsWithAssessor = await Promise.all(
      assessments.map(async (assessment: any) => {
        const assessor = await prisma.user.findUnique({
          where: { id: assessment.assessorId },
          select: { name: true },
        })

        return { ...assessment, assessor }
      })
    )

    return NextResponse.json({
      success: true,
      data: assessmentsWithAssessor,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('List assessments error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao listar avaliações' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Create Assessment
// ============================================================================
const movementTestSchema = z.object({
  score: z.number().min(1).max(3),
  observations: z.string().optional(),
})

// 📊 DADOS CORPORAIS (OPCIONAIS) - Para controle de evolução
const bodyMetricsSchema = z.object({
  weight: z.number().min(20).max(300).optional(), // Peso em kg
  height: z.number().min(100).max(250).optional(), // Altura em cm
  measurements: z.object({
    waist: z.number().min(40).max(200).optional(),      // Cintura em cm
    hip: z.number().min(50).max(200).optional(),        // Quadril em cm
    thigh_left: z.number().min(20).max(100).optional(), // Coxa esquerda em cm
    thigh_right: z.number().min(20).max(100).optional(),// Coxa direita em cm
    arm_left: z.number().min(15).max(60).optional(),    // Braço esquerdo em cm
    arm_right: z.number().min(15).max(60).optional(),   // Braço direito em cm
    chest: z.number().min(50).max(200).optional(),      // Peitoral em cm
  }).optional(),
}).optional()

const createAssessmentSchema = z.object({
  clientId: z.string().cuid(),
  
  // Input data (OBRIGATÓRIOS)
  complaints: z.array(z.string()).optional().default([]),
  painMap: z.record(z.number().min(0).max(10)).optional().default({}),
  movementTests: z.object({
    squat: movementTestSchema.optional(),
    hinge: movementTestSchema.optional(),
    push: movementTestSchema.optional(),
    pull: movementTestSchema.optional(),
    rotation: movementTestSchema.optional(),
    gait: movementTestSchema.optional(),
  }),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  
  // Dados corporais (OPCIONAIS)
  bodyMetrics: bodyMetricsSchema,
})

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth

  try {
    const body = await request.json()
    const validation = createAssessmentSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verify client exists and belongs to studio
    const clientWhere: any = { id: data.clientId, studioId }
    
    // TRAINER só pode avaliar seus clientes
    if (role === 'TRAINER') {
      clientWhere.trainerId = userId
    }

    const client = await prisma.client.findFirst({
      where: clientWhere,
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado ou sem permissão' },
        { status: 404 }
      )
    }

    // Build input JSON (dados funcionais)
    const inputJson = {
      complaints: data.complaints,
      painMap: data.painMap,
      movementTests: data.movementTests,
      level: data.level,
    }

    // Build body metrics JSON (dados corporais - opcionais)
    const bodyMetricsJson = data.bodyMetrics || null

    // Create assessment
    const assessment = await prisma.assessment.create({
      data: {
        clientId: data.clientId,
        assessorId: userId,
        status: 'PENDING',
        inputJson,
        bodyMetricsJson: bodyMetricsJson as any,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        studioId,
        action: 'CREATE',
        entity: 'Assessment',
        entityId: assessment.id,
        newData: { clientId: data.clientId, status: 'PENDING' },
      },
    })

    return NextResponse.json({
      success: true,
      data: assessment,
      message: 'Avaliação criada com sucesso. Processando análise...',
    })
  } catch (error) {
    console.error('Create assessment error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar avaliação' },
      { status: 500 }
    )
  }
}
