// ============================================================================
// EXPERT TRAINING - ASSESSMENT BY ID API
// ============================================================================
// GET /api/assessments/[id] - Get assessment details
// PUT /api/assessments/[id] - Update assessment
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

// Validation schema for updating assessment input
const updateAssessmentSchema = z.object({
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
  }).optional(),
  bodyMetrics: z.object({
    weight: z.number().optional(),
    height: z.number().optional(),
    bodyFat: z.number().optional(),
    measurements: z.object({
      chest: z.number().optional(),
      waist: z.number().optional(),
      hip: z.number().optional(),
      arm: z.number().optional(),
      thigh: z.number().optional(),
      calf: z.number().optional(),
    }).optional(),
    notes: z.string().optional(),
  }).optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']).optional(),
})

// GET - Get assessment by ID
export async function GET(
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
            id: true,
            name: true,
            trainerId: true,
            history: true,
            objectives: true,
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

    return NextResponse.json({
      success: true,
      data: assessment,
    })
  } catch (error) {
    console.error('Get assessment error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Update assessment
export async function PUT(
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

    // Get existing assessment
    const existingAssessment = await prisma.assessment.findFirst({
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

    if (!existingAssessment) {
      return NextResponse.json(
        { success: false, error: 'Avaliação não encontrada' },
        { status: 404 }
      )
    }

    // Check access for trainers
    if (payload.role === 'TRAINER' && existingAssessment.client.trainerId !== payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Parse and validate body
    const body = await request.json()
    const validation = updateAssessmentSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { inputJson, bodyMetrics, status } = validation.data

    // Build update data
    const updateData: any = {}
    if (inputJson !== undefined) {
      updateData.inputJson = inputJson
    }
    if (bodyMetrics !== undefined) {
      updateData.bodyMetricsJson = bodyMetrics
    }
    if (status !== undefined) {
      updateData.status = status
    }

    // Update assessment
    const assessment = await prisma.assessment.update({
      where: { id: params.id },
      data: updateData,
    })

    // Auto-update client data if bodyMetrics are provided
    if (bodyMetrics) {
      const clientUpdateData: any = {}
      
      if (bodyMetrics.weight) {
        clientUpdateData.weight = bodyMetrics.weight
      }
      if (bodyMetrics.height) {
        clientUpdateData.height = bodyMetrics.height
      }
      if (bodyMetrics.measurements) {
        if (bodyMetrics.measurements.chest) clientUpdateData.chest = bodyMetrics.measurements.chest
        if (bodyMetrics.measurements.waist) clientUpdateData.waist = bodyMetrics.measurements.waist
        if (bodyMetrics.measurements.hip) clientUpdateData.hip = bodyMetrics.measurements.hip
        if (bodyMetrics.measurements.arm) clientUpdateData.arm = bodyMetrics.measurements.arm
        if (bodyMetrics.measurements.thigh) clientUpdateData.thigh = bodyMetrics.measurements.thigh
        if (bodyMetrics.measurements.calf) clientUpdateData.calf = bodyMetrics.measurements.calf
      }

      // Update client if there's data to update
      if (Object.keys(clientUpdateData).length > 0) {
        await prisma.client.update({
          where: { id: existingAssessment.clientId },
          data: clientUpdateData,
        })
      }
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        studioId: payload.studioId,
        action: 'UPDATE',
        entity: 'Assessment',
        entityId: assessment.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: assessment,
    })
  } catch (error) {
    console.error('Update assessment error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
