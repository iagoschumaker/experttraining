// ============================================================================
// EXPERT TRAINING - CLIENT GOALS API
// ============================================================================
// PUT /api/clients/[id]/goals — Update goalType and goalWeight
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

const updateGoalsSchema = z.object({
  goalType: z.enum(['WEIGHT_LOSS', 'MUSCLE_GAIN', 'RECOMP', 'PERFORMANCE', 'HEALTH']).nullable(),
  goalWeight: z.number().positive().nullable().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId, role, userId } = auth
  const clientId = params.id

  try {
    // Fetch client
    const client = await prisma.client.findFirst({
      where: { id: clientId, studioId },
      select: { id: true, trainerId: true },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // TRAINER pode editar apenas seus alunos
    if (role === 'TRAINER' && client.trainerId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado — você não é o treinador deste aluno' },
        { status: 403 }
      )
    }

    // Validate body
    const body = await request.json()
    const validation = updateGoalsSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { goalType, goalWeight } = validation.data

    const updated = await prisma.client.update({
      where: { id: clientId },
      data: {
        goalType: goalType as any,
        goalWeight: goalWeight ?? null,
      },
      select: {
        id: true,
        goalType: true,
        goalWeight: true,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        studioId,
        action: 'UPDATE_GOALS',
        entity: 'Client',
        entityId: clientId,
        newData: { goalType, goalWeight } as any,
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Update goals error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
