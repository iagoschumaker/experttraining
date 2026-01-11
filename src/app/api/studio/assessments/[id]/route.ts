// ============================================================================
// EXPERT TRAINING - ASSESSMENT DETAIL API
// ============================================================================
// GET  /api/studio/assessments/[id] - Detalhes da avaliação
// PUT  /api/studio/assessments/[id] - Atualizar avaliação
// POST /api/studio/assessments/[id]/process - Processar com motor de decisão
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { z } from 'zod'

// ============================================================================
// GET - Assessment Details
// ============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth
  const assessmentId = params.id

  try {
    const where: any = { id: assessmentId }

    // Build filter for client's studio
    where.client = { studioId }

    // TRAINER só vê suas avaliações
    if (role === 'TRAINER') {
      where.assessorId = userId
    }

    const assessment = await prisma.assessment.findFirst({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
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

    // Get assessor info
    const assessor = await prisma.user.findUnique({
      where: { id: assessment.assessorId },
      select: { id: true, name: true, email: true },
    })

    return NextResponse.json({
      success: true,
      data: { ...assessment, assessor },
    })
  } catch (error) {
    console.error('Get assessment error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar avaliação' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PUT - Update Assessment Input
// ============================================================================
const bodyMetricsSchema = z.object({
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  bodyFat: z.number().min(0).max(100).optional(),
  measurements: z.object({
    chest: z.number().positive().optional(),
    waist: z.number().positive().optional(),
    hip: z.number().positive().optional(),
    arm: z.number().positive().optional(),
    thigh: z.number().positive().optional(),
    calf: z.number().positive().optional(),
  }).optional(),
  notes: z.string().optional(),
}).optional()

const updateInputSchema = z.object({
  inputJson: z.object({
    complaints: z.array(z.string()).optional(),
    painMap: z.record(z.number()).optional(),
    movementTests: z.record(
      z.object({
        score: z.number().min(1).max(3),
        observations: z.string().optional(),
      })
    ).optional(),
    level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  }).optional(),
  bodyMetrics: bodyMetricsSchema,
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth
  const assessmentId = params.id

  try {
    const body = await request.json()
    const validation = updateInputSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { inputJson, bodyMetrics } = validation.data

    // Verificar permissão
    const where: any = { id: assessmentId }
    where.client = { studioId }

    if (role === 'TRAINER') {
      where.assessorId = userId
    }

    const existing = await prisma.assessment.findFirst({ where })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Avaliação não encontrada' },
        { status: 404 }
      )
    }

    // Atualizar
    const updated = await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        inputJson: (inputJson || existing.inputJson) as any,
        bodyMetricsJson: (bodyMetrics ? bodyMetrics : existing.bodyMetricsJson) as any,
        updatedAt: new Date(),
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Update assessment error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar avaliação' },
      { status: 500 }
    )
  }
}
