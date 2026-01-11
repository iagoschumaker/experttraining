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
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
  height: z.number().positive().optional().nullable(),
  weight: z.number().positive().optional().nullable(),
  history: z.string().optional().nullable(),
  objectives: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  goal: z.string().optional().nullable(),
  trainerId: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
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
        { success: false, error: validation.error.errors[0].message },
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
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        gender: data.gender,
        height: data.height,
        weight: data.weight,
        history: data.history,
        objectives: data.objectives,
        notes: data.notes,
        goal: data.goal,
        trainerId: data.trainerId,
        status: data.status,
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
