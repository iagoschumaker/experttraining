// ============================================================================
// EXPERT TRAINING - WORKOUTS API
// ============================================================================
// GET /api/workouts - Lista treinos
// POST /api/workouts - Cria novo treino
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyAccessToken, hasStudioContext, getAccessTokenCookie } from '@/lib/auth'

// Validation schema for creating a workout
const createWorkoutSchema = z.object({
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
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
  }),
})

// GET - List workouts
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
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    // Build where clause
    const where: any = {
      client: {
        studioId: payload.studioId,
      },
    }

    if (clientId) {
      where.clientId = clientId
    }

    // If trainer role, only show their clients' workouts
    if (payload.role === 'TRAINER') {
      where.client.trainerId = payload.userId
    }

    // Get total count
    const total = await prisma.workout.count({ where })

    // Get workouts with pagination
    const workouts = await prisma.workout.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        createdAt: true,
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
        items: workouts,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('List workouts error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Create workout
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
    const validation = createWorkoutSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { clientId, name, scheduleJson } = validation.data

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

    // Create workout
    const workout = await prisma.workout.create({
      data: {
        clientId,
        studioId: payload.studioId,
        createdById: payload.userId,
        name,
        scheduleJson: scheduleJson as any,
      },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        studioId: payload.studioId,
        action: 'CREATE',
        entity: 'Workout',
        entityId: workout.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: workout,
    })
  } catch (error) {
    console.error('Create workout error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
