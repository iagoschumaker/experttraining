// ============================================================================
// EXPERT TRAINING - WORKOUT DETAIL API
// ============================================================================
// GET    /api/studio/workouts/[id] - Detalhes do treino
// PUT    /api/studio/workouts/[id] - Atualizar treino
// DELETE /api/studio/workouts/[id] - Arquivar treino
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { z } from 'zod'

// ============================================================================
// GET - Workout Details
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
  const workoutId = params.id

  try {
    const where: any = { id: workoutId, studioId }

    // TRAINER só vê seus treinos
    if (role === 'TRAINER') {
      where.createdById = userId
    }

    const workout = await prisma.workout.findFirst({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            birthDate: true,
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

    // Get creator info
    const creator = await prisma.user.findUnique({
      where: { id: workout.createdById },
      select: { id: true, name: true, email: true },
    })

    // Get blocks details
    const blocks = await prisma.block.findMany({
      where: {
        code: { in: workout.blocksUsed },
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        primaryCapacity: true,
        levelName: true,
        movementPattern: true,
        suggestedFrequency: true,
        estimatedDuration: true,
        isLocked: true,
      },
    })

    // Extrair weeklyFrequency e phaseDuration do scheduleJson
    const schedule = workout.scheduleJson as any
    const weeklyFrequency = schedule?.weeklyFrequency || 0
    const phaseDuration = schedule?.phaseDuration || 0

    return NextResponse.json({
      success: true,
      data: { 
        ...workout, 
        weeklyFrequency,
        phaseDuration,
        creator, 
        blocks 
      },
    })
  } catch (error) {
    console.error('Get workout error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar treino' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PUT - Update Workout
// ============================================================================
const updateWorkoutSchema = z.object({
  weeklyFrequency: z.number().min(1).max(7).optional(),
  phaseDuration: z.number().min(1).max(52).optional(),
  notes: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
  scheduleJson: z.any().optional(),
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
  const workoutId = params.id

  try {
    const body = await request.json()
    const validation = updateWorkoutSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      )
    }

    // Verificar permissão
    const where: any = { id: workoutId, studioId }
    if (role === 'TRAINER') {
      where.createdById = userId
    }

    const existing = await prisma.workout.findFirst({ where })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Treino não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar
    const updated = await prisma.workout.update({
      where: { id: workoutId },
      data: {
        ...validation.data,
        updatedAt: new Date(),
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: 'Workout',
        entityId: workoutId,
        newData: validation.data as any,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Update workout error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar treino' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Archive Workout
// ============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth
  const workoutId = params.id

  try {
    // Verificar permissão
    const where: any = { id: workoutId, studioId }
    if (role === 'TRAINER') {
      where.createdById = userId
    }

    const existing = await prisma.workout.findFirst({ where })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Treino não encontrado' },
        { status: 404 }
      )
    }

    // Arquivar (soft delete)
    await prisma.workout.update({
      where: { id: workoutId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entity: 'Workout',
        entityId: workoutId,
        newData: { isActive: false } as any,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete workout error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao arquivar treino' },
      { status: 500 }
    )
  }
}
