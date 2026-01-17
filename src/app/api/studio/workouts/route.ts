// ============================================================================
// EXPERT PRO TRAINING - WORKOUTS API
// ============================================================================
// GET  /api/studio/workouts - Listar treinos
// POST /api/studio/workouts - Criar treino manual
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { z } from 'zod'

// ============================================================================
// GET - List Workouts
// ============================================================================
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth
  const { searchParams } = new URL(request.url)

  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const clientId = searchParams.get('clientId')
  const status = searchParams.get('status')

  try {
    const where: any = { studioId }

    // All trainers can see all workouts in the studio
    // (editing is restricted to the creator or admin)

    if (clientId) {
      where.clientId = clientId
    }

    if (status) {
      where.status = status
    }

    const [total, workouts] = await Promise.all([
      prisma.workout.count({ where }),
      prisma.workout.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    // Get creator info
    const workoutsWithCreator = await Promise.all(
      workouts.map(async (workout: any) => {
        const creator = await prisma.user.findUnique({
          where: { id: workout.createdById },
          select: { id: true, name: true },
        })
        return { ...workout, creator }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        items: workoutsWithCreator,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    })
  } catch (error) {
    console.error('List workouts error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao listar treinos' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Create Workout (Manual)
// ============================================================================
const createWorkoutSchema = z.object({
  clientId: z.string().uuid(),
  assessmentId: z.string().uuid().optional(),
  weeklyFrequency: z.number().min(1).max(7),
  phaseDuration: z.number().min(1).max(52),
  notes: z.string().optional(),
  blocksUsed: z.array(z.string()),
  scheduleJson: z.any(),
})

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth

  try {
    const body = await request.json()
    const validation = createWorkoutSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verificar se cliente pertence ao studio
    const client = await prisma.client.findFirst({
      where: {
        id: data.clientId,
        studioId,
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // TRAINER só pode criar treino para seus clientes
    if (role === 'TRAINER' && client.trainerId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Sem permissão para este cliente' },
        { status: 403 }
      )
    }

    // Criar treino
    const workout = await prisma.workout.create({
      data: {
        clientId: data.clientId,
        studioId,
        createdById: userId,
        name: data.notes || 'Treino Manual',
        blocksUsed: data.blocksUsed,
        scheduleJson: data.scheduleJson,
        isActive: true,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entity: 'Workout',
        entityId: workout.id,
        newData: { clientId: data.clientId } as any,
      },
    })

    return NextResponse.json({ success: true, data: workout })
  } catch (error) {
    console.error('Create workout error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar treino' },
      { status: 500 }
    )
  }
}
