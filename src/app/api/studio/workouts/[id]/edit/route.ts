// ============================================================================
// EXPERT PRO TRAINING - WORKOUT EDIT API
// ============================================================================
// PUT /api/studio/workouts/[id]/edit - Editar treino ativo (durante 6 semanas)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { z } from 'zod'

const editWorkoutSchema = z.object({
  scheduleJson: z.any().optional(),
  notes: z.string().optional(),
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

  try {
    const body = await request.json()
    const validation = editWorkoutSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos' },
        { status: 400 }
      )
    }

    const { scheduleJson, notes } = validation.data

    // Buscar treino
    const workout = await prisma.workout.findFirst({
      where: {
        id: params.id,
        studioId,
      },
      include: {
        client: { select: { id: true, name: true, trainerId: true } },
      },
    })

    if (!workout) {
      return NextResponse.json(
        { success: false, error: 'Treino não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se treino está ativo
    if (!workout.isActive) {
      return NextResponse.json(
        { success: false, error: 'Este treino não está mais ativo. Não é possível editar.' },
        { status: 400 }
      )
    }

    // Trainer só pode editar treinos dos seus clientes
    if (role === 'TRAINER' && workout.client.trainerId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Sem permissão para editar este treino' },
        { status: 403 }
      )
    }

    // Preparar update
    const updateData: any = {}
    if (scheduleJson !== undefined) {
      updateData.scheduleJson = scheduleJson
    }
    if (notes !== undefined) {
      updateData.notes = notes
    }

    const updated = await prisma.workout.update({
      where: { id: params.id },
      data: updateData,
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: 'Workout',
        entityId: workout.id,
        newData: { editedFields: Object.keys(updateData) } as any,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('Edit workout error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao editar treino' },
      { status: 500 }
    )
  }
}
