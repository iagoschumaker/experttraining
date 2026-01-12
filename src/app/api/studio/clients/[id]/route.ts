// ============================================================================
// EXPERT TRAINING - CLIENT DETAIL API
// ============================================================================
// GET    /api/studio/clients/[id] - Detalhes do cliente
// PUT    /api/studio/clients/[id] - Atualizar cliente
// DELETE /api/studio/clients/[id] - Inativar cliente
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
// GET - Client Details
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
  const clientId = params.id

  try {
    // Build where clause
    const where: any = { id: clientId, studioId }

    // TRAINER só vê seus clientes
    if (role === 'TRAINER') {
      where.trainerId = userId
    }

    const client = await prisma.client.findFirst({
      where,
      include: {
        assessments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            createdAt: true,
            completedAt: true,
          },
        },
        workouts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            name: true,
            isActive: true,
            createdAt: true,
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

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Get trainer info
    let trainer = null
    if (client.trainerId) {
      trainer = await prisma.user.findUnique({
        where: { id: client.trainerId },
        select: { id: true, name: true, email: true },
      })
    }

    return NextResponse.json({
      success: true,
      data: { ...client, trainer },
    })
  } catch (error) {
    console.error('Get client error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar cliente' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PUT - Update Client
// ============================================================================
const updateClientSchema = z.object({
  name: z.string().min(3).optional(),
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
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  chest: z.number().positive().optional().nullable(),
  waist: z.number().positive().optional().nullable(),
  hip: z.number().positive().optional().nullable(),
  arm: z.number().positive().optional().nullable(),
  thigh: z.number().positive().optional().nullable(),
  calf: z.number().positive().optional().nullable(),
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
  const clientId = params.id

  try {
    // Verify client exists and belongs to studio
    const where: any = { id: clientId, studioId }
    if (role === 'TRAINER') {
      where.trainerId = userId
    }

    const existingClient = await prisma.client.findFirst({ where })

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Validate body
    const body = await request.json()
    const validation = updateClientSchema.safeParse(body)

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

    // TRAINER não pode mudar o treinador responsável
    if (role === 'TRAINER' && data.trainerId && data.trainerId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Você não pode atribuir o cliente a outro treinador' },
        { status: 403 }
      )
    }

    // Check email uniqueness
    if (data.email && data.email !== existingClient.email) {
      const emailExists = await prisma.client.findFirst({
        where: {
          studioId,
          email: data.email,
          id: { not: clientId },
          isActive: true,
        },
      })

      if (emailExists) {
        return NextResponse.json(
          { success: false, error: 'Email já cadastrado neste studio' },
          { status: 400 }
        )
      }
    }

    // Update client
    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        birthDate: data.birthDate ?? undefined,
        gender: data.gender,
        height: data.height,
        weight: data.weight,
        history: data.history,
        objectives: data.objectives,
        notes: data.notes,
        goal: data.goal,
        trainerId: data.trainerId,
        status: data.status,
        chest: data.chest,
        waist: data.waist,
        hip: data.hip,
        arm: data.arm,
        thigh: data.thigh,
        calf: data.calf,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        studioId,
        action: 'UPDATE',
        entity: 'Client',
        entityId: clientId,
        oldData: { name: existingClient.name, status: existingClient.status },
        newData: { name: updatedClient.name, status: updatedClient.status },
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedClient,
      message: 'Cliente atualizado com sucesso',
    })
  } catch (error) {
    console.error('Update client error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar cliente' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Inactivate Client
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
  const clientId = params.id

  try {
    // Verify client exists and belongs to studio
    const where: any = { id: clientId, studioId }
    if (role === 'TRAINER') {
      where.trainerId = userId
    }

    const client = await prisma.client.findFirst({ where })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Soft delete - set as inactive
    await prisma.client.update({
      where: { id: clientId },
      data: {
        status: 'INACTIVE',
        isActive: false,
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        studioId,
        action: 'DELETE',
        entity: 'Client',
        entityId: clientId,
        oldData: { name: client.name, status: client.status },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Cliente inativado com sucesso',
    })
  } catch (error) {
    console.error('Delete client error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao inativar cliente' },
      { status: 500 }
    )
  }
}
