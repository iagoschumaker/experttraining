// ============================================================================
// EXPERT PRO TRAINING - CLIENTS API
// ============================================================================
// GET /api/clients - Lista clientes do studio
// POST /api/clients - Cria novo cliente
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyAccessToken, hasStudioContext, getAccessTokenCookie } from '@/lib/auth'

// Validation schema for creating a client
const createClientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().nullable(),
  phone: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  gender: z.enum(['M', 'F', 'O']).optional().nullable(),
  height: z.number().positive().optional().nullable(),
  weight: z.number().positive().optional().nullable(),
  history: z.string().optional().nullable(),
  objectives: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  goal: z.string().optional().nullable(),
  // Body measurements
  chest: z.number().positive().optional().nullable(),
  waist: z.number().positive().optional().nullable(),
  hip: z.number().positive().optional().nullable(),
  arm: z.number().positive().optional().nullable(),
  thigh: z.number().positive().optional().nullable(),
  calf: z.number().positive().optional().nullable(),
})

// GET - List clients
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
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const trainerId = searchParams.get('trainerId')

    // Build where clause
    const where: any = {
      studioId: payload.studioId,
      isActive: true,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Trainers can see all clients in the studio (but can only edit their own)
    // Filter by trainerId only if explicitly requested
    if (trainerId) {
      where.trainerId = trainerId
    }

    // Get total count
    const total = await prisma.client.count({ where })

    // Get clients with pagination
    const clients = await prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        birthDate: true,
        gender: true,
        isActive: true,
        createdAt: true,
        trainerId: true,
        trainer: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            assessments: true,
            workouts: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        items: clients,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('List clients error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Create client
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
    const validation = createClientSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data

    // Create client
    const client = await prisma.client.create({
      data: {
        studioId: payload.studioId,
        trainerId: payload.userId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        gender: data.gender,
        height: data.height,
        weight: data.weight,
        history: data.history,
        objectives: data.objectives,
        notes: data.notes,
        goal: data.goal,
        chest: data.chest,
        waist: data.waist,
        hip: data.hip,
        arm: data.arm,
        thigh: data.thigh,
        calf: data.calf,
      },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        studioId: payload.studioId,
        action: 'CREATE',
        entity: 'Client',
        entityId: client.id,
        newData: client as any,
      },
    })

    return NextResponse.json({
      success: true,
      data: client,
    })
  } catch (error) {
    console.error('Create client error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
