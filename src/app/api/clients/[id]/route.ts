// ============================================================================
// EXPERT TRAINING - ALUNO BY ID API
// ============================================================================
// GET /api/clients/[id] - Get aluno details
// PUT /api/clients/[id] - Update aluno
// DELETE /api/clients/[id] - Soft delete aluno
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyAccessToken, hasStudioContext, getAccessTokenCookie } from '@/lib/auth'

// Validation schema for updating a client
const updateClientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
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
  trainerId: z.string().optional().nullable(),
  // Body measurements
  chest: z.number().positive().optional().nullable(),
  waist: z.number().positive().optional().nullable(),
  hip: z.number().positive().optional().nullable(),
  arm: z.number().positive().optional().nullable(),
  thigh: z.number().positive().optional().nullable(),
  calf: z.number().positive().optional().nullable(),
})

// GET - Get aluno by ID
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
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    }

    // SuperAdmin can access any client, others need studio context
    const isSuperAdmin = payload.isSuperAdmin
    if (!isSuperAdmin && !hasStudioContext(payload)) {
      return NextResponse.json(
        { success: false, error: 'Contexto de studio não encontrado' },
        { status: 401 }
      )
    }

    const whereClause: any = { id: params.id }
    if (!isSuperAdmin && hasStudioContext(payload)) {
      whereClause.studioId = payload.studioId
    }

    const client = await prisma.client.findFirst({
      where: whereClause,
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
          },
        },
        assessments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            confidence: true,
            createdAt: true,
            completedAt: true,
          },
        },
        workouts: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            name: true,
            isActive: true,
            createdAt: true,
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

    // All trainers in the studio can view any client details
    // (editing is restricted to the assigned trainer or admin)

    return NextResponse.json({
      success: true,
      data: client,
    })
  } catch (error) {
    console.error('Get client error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Update client
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
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    }

    // SuperAdmin can access any client, others need studio context
    const isSuperAdmin = payload.isSuperAdmin
    if (!isSuperAdmin && !hasStudioContext(payload)) {
      return NextResponse.json(
        { success: false, error: 'Contexto de studio não encontrado' },
        { status: 401 }
      )
    }

    // Check if client exists
    const whereClause: any = { id: params.id }
    if (!isSuperAdmin && hasStudioContext(payload)) {
      whereClause.studioId = payload.studioId
    }

    const existingClient = await prisma.client.findFirst({
      where: whereClause,
    })

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Check access for trainers - only assigned trainer or admin can edit
    // SuperAdmin can edit any client
    if (!isSuperAdmin && hasStudioContext(payload) && payload.role === 'TRAINER' && existingClient.trainerId !== payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Apenas o trainer responsável pode editar este aluno' },
        { status: 403 }
      )
    }

    // Parse and validate body
    const body = await request.json()
    const validation = updateClientSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data

    // Update client
    const client = await prisma.client.update({
      where: { id: params.id },
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
        // Body measurements
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
        studioId: hasStudioContext(payload) ? payload.studioId : null,
        action: 'UPDATE',
        entity: 'Client',
        entityId: client.id,
        oldData: existingClient as any,
        newData: client as any,
      },
    })

    return NextResponse.json({
      success: true,
      data: client,
    })
  } catch (error) {
    console.error('Update client error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete client
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
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    }

    // SuperAdmin can delete any client, others need studio context
    const isSuperAdmin = payload.isSuperAdmin
    if (!isSuperAdmin && !hasStudioContext(payload)) {
      return NextResponse.json(
        { success: false, error: 'Contexto de studio não encontrado' },
        { status: 401 }
      )
    }

    // Only studio admins and superadmins can delete clients (trainers cannot delete)
    if (!isSuperAdmin && hasStudioContext(payload) && payload.role !== 'STUDIO_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Apenas administradores do studio podem excluir alunos' },
        { status: 403 }
      )
    }

    // Check if client exists
    const whereClause: any = { id: params.id }
    if (!isSuperAdmin && hasStudioContext(payload)) {
      whereClause.studioId = payload.studioId
    }

    const existingClient = await prisma.client.findFirst({
      where: whereClause,
    })

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Soft delete
    await prisma.client.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: payload.userId,
        studioId: (payload as any).studioId,
        action: 'DELETE',
        entity: 'Client',
        entityId: params.id,
        oldData: existingClient as any,
      },
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Cliente excluído com sucesso' },
    })
  } catch (error) {
    console.error('Delete client error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
