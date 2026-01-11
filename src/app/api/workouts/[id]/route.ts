// ============================================================================
// EXPERT TRAINING - WORKOUT BY ID API
// ============================================================================
// GET /api/workouts/[id] - Get workout details
// PUT /api/workouts/[id] - Update workout
// DELETE /api/workouts/[id] - Delete workout
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyAccessToken, hasStudioContext, getAccessTokenCookie } from '@/lib/auth'

// Validation schema for updating workout
const updateWorkoutSchema = z.object({
  name: z.string().min(1).optional(),
  scheduleJson: z.object({
    blocks: z.array(z.object({
      blockId: z.string(),
      name: z.string(),
      exercises: z.array(z.object({
        name: z.string(),
        sets: z.number().optional(),
        reps: z.string().optional(),
        rest: z.string().optional(),
        notes: z.string().optional(),
      })),
    })),
    warmup: z.array(z.string()).optional(),
    cooldown: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }).optional(),
})

// GET - Get workout by ID
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

    const workout = await prisma.workout.findFirst({
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
          },
        },
      },
    })

    if (!workout) {
      return NextResponse.json(
        { success: false, error: 'Treino não encontrado' },
        { status: 404 }
      )
    }

    // Check access for trainers
    if (payload.role === 'TRAINER' && workout.client.trainerId !== payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: workout,
    })
  } catch (error) {
    console.error('Get workout error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Update workout
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

    // Get existing workout
    const existingWorkout = await prisma.workout.findFirst({
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

    if (!existingWorkout) {
      return NextResponse.json(
        { success: false, error: 'Treino não encontrado' },
        { status: 404 }
      )
    }

    // Check access for trainers
    if (payload.role === 'TRAINER' && existingWorkout.client.trainerId !== payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // Parse and validate body
    const body = await request.json()
    const validation = updateWorkoutSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, scheduleJson } = validation.data

    // Update workout
    const workout = await prisma.workout.update({
      where: { id: params.id },
      data: {
        name,
        scheduleJson: scheduleJson as any,
      },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        studioId: payload.studioId,
        action: 'UPDATE',
        entity: 'Workout',
        entityId: workout.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: workout,
    })
  } catch (error) {
    console.error('Update workout error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Delete workout
export async function DELETE(
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

    // Get existing workout
    const existingWorkout = await prisma.workout.findFirst({
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

    if (!existingWorkout) {
      return NextResponse.json(
        { success: false, error: 'Treino não encontrado' },
        { status: 404 }
      )
    }

    // Only admin can delete
    if (payload.role !== 'STUDIO_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Apenas administradores podem excluir treinos' },
        { status: 403 }
      )
    }

    // Delete workout
    await prisma.workout.delete({
      where: { id: params.id },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        studioId: payload.studioId,
        action: 'DELETE',
        entity: 'Workout',
        entityId: params.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Treino excluído com sucesso',
    })
  } catch (error) {
    console.error('Delete workout error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
