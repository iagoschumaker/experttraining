// ============================================================================
// EXPERT PRO TRAINING - CLIENTS API
// ============================================================================
// GET  /api/studio/clients - Lista clientes (com RBAC)
// POST /api/studio/clients - Cria novo cliente
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { z } from 'zod'

function normalizeGender(value: string): 'M' | 'F' | 'O' {
  switch (value) {
    case 'M':
    case 'MALE':
    case 'male':
      return 'M'
    case 'F':
    case 'FEMALE':
    case 'female':
      return 'F'
    case 'O':
    case 'OTHER':
    case 'other':
      return 'O'
    default:
      return 'O'
  }
}

function parseBirthDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') return null

  const input = value.trim()
  if (!input) return null

  // YYYY-MM-DD
  const isoDateOnly = /^\d{4}-\d{2}-\d{2}$/
  if (isoDateOnly.test(input)) {
    const [y, m, d] = input.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d))
    return Number.isNaN(dt.getTime()) ? null : dt
  }

  // DD/MM/YYYY
  const brDate = /^\d{2}\/\d{2}\/\d{4}$/
  if (brDate.test(input)) {
    const [d, m, y] = input.split('/').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d))
    return Number.isNaN(dt.getTime()) ? null : dt
  }

  // ISO datetime or other Date-parseable strings (defensive)
  const dt = new Date(input)
  return Number.isNaN(dt.getTime()) ? null : dt
}

// ============================================================================
// GET - List Clients
// ============================================================================
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')

    // Build where clause
    const where: any = { studioId }

    // TRAINER só vê seus clientes
    if (role === 'TRAINER') {
      where.trainerId = userId
    }

    // Status filter
    if (status !== 'all') {
      where.status = status
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ]
    }

    // Fetch clients with counts
    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              assessments: true,
              workouts: true,
            },
          },
        },
      }),
      prisma.client.count({ where }),
    ])

    // Get trainer names
    const clientsWithTrainer = await Promise.all(
      clients.map(async (client: any) => {
        if (!client.trainerId) {
          return { ...client, trainer: null }
        }

        const trainer = await prisma.user.findUnique({
          where: { id: client.trainerId },
          select: { name: true },
        })

        return { ...client, trainer }
      })
    )

    return NextResponse.json({
      success: true,
      data: clientsWithTrainer,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('List clients error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao listar alunos' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Create Client
// ============================================================================
const createClientSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  email: z.union([
    z.string().email('Email inválido'),
    z.literal(''),
    z.null(),
    z.undefined()
  ]).optional().nullable().transform(val => val === '' ? null : val),
  phone: z.string().optional().nullable(),
  birthDate: z.union([z.string(), z.literal(''), z.null(), z.undefined()])
    .optional()
    .nullable()
    .transform((val, ctx) => {
      const parsed = parseBirthDate(val)
      if (val && val !== '' && parsed === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Data de nascimento inválida' })
      }
      return parsed
    }),
  gender: z.union([
    z.enum(['M', 'F', 'O', 'MALE', 'FEMALE', 'OTHER', 'male', 'female', 'other']),
    z.literal(''),
    z.null(),
    z.undefined()
  ])
    .optional()
    .nullable()
    .transform((val) => {
      if (val === '' || val === null || val === undefined) return null
      return normalizeGender(val)
    }),
  height: z.number().positive().optional().nullable(),
  weight: z.number().positive().optional().nullable(),
  history: z.string().optional().nullable(),
  objectives: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  goal: z.string().optional().nullable(),
  trainerId: z.string().optional().nullable(),
  chest: z.number().positive().optional().nullable(),
  waist: z.number().positive().optional().nullable(),
  hip: z.number().positive().optional().nullable(),
  arm: z.number().positive().optional().nullable(),
  thigh: z.number().positive().optional().nullable(),
  calf: z.number().positive().optional().nullable(),
})

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth

  try {
    const body = await request.json()
    const validation = createClientSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'input inválido',
          issues: validation.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const data = validation.data

    // Se é TRAINER, automaticamente atribui a si mesmo
    if (role === 'TRAINER') {
      data.trainerId = userId
    }

    // Verificar se email já existe neste studio
    if (data.email) {
      const existingClient = await prisma.client.findFirst({
        where: {
          studioId,
          email: data.email,
          isActive: true,
        },
      })

      if (existingClient) {
        return NextResponse.json(
          { success: false, error: 'Email já cadastrado neste studio' },
          { status: 400 }
        )
      }
    }

    // Create client
    const client = await prisma.client.create({
      data: {
        studioId,
        trainerId: data.trainerId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        birthDate: data.birthDate,
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
        status: 'ACTIVE',
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        studioId,
        action: 'CREATE',
        entity: 'Client',
        entityId: client.id,
        newData: { name: client.name, status: client.status },
      },
    })

    return NextResponse.json({
      success: true,
      data: client,
      message: 'Aluno cadastrado com sucesso',
    })
  } catch (error) {
    console.error('Create client error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao cadastrar aluno' },
      { status: 500 }
    )
  }
}
