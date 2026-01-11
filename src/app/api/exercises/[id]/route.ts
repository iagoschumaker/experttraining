// ============================================================================
// EXPERT TRAINING - SINGLE EXERCISE API
// ============================================================================
// GET - Detalhes do exercício
// PUT - Atualizar exercício (SuperAdmin)
// DELETE - Excluir exercício (SuperAdmin)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth, verifySuperAdmin } from '@/lib/auth/protection'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  type: z.string().optional(),
  muscleGroup: z.string().optional(),
  equipment: z.string().optional(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  defaultSets: z.number().min(1).max(10).optional().nullable(),
  defaultReps: z.string().optional().nullable(),
  defaultTime: z.string().optional().nullable(),
  defaultRest: z.string().optional().nullable(),
  technicalNotes: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  orderInBlock: z.number().optional().nullable(),
  blockId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

// GET - Single exercise with full details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payload = await verifyAuth()
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }

    const exercise = await prisma.exercise.findUnique({
      where: { id: params.id },
      include: { 
        block: { 
          select: { 
            id: true, 
            name: true, 
            code: true,
            primaryCapacity: true, 
            level: true,
            levelName: true,
            movementPattern: true,
            riskLevel: true,
          } 
        } 
      },
    })

    if (!exercise) {
      return NextResponse.json({ success: false, error: 'Exercício não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: exercise })
  } catch (error) {
    console.error('Get exercise error:', error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

// PUT - Update exercise (SuperAdmin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminPayload = await verifySuperAdmin()
    if (!adminPayload) {
      return NextResponse.json({ success: false, error: 'Acesso não autorizado' }, { status: 403 })
    }

    const existing = await prisma.exercise.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Exercício não encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const validation = updateSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message, details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    // Se tem blockId, verificar se bloco existe
    if (data.blockId) {
      const block = await prisma.block.findUnique({ where: { id: data.blockId } })
      if (!block) {
        return NextResponse.json({ success: false, error: 'Bloco não encontrado' }, { status: 404 })
      }
    }

    const exercise = await prisma.exercise.update({
      where: { id: params.id },
      data,
      include: {
        block: { select: { id: true, name: true, code: true } },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: adminPayload.userId,
        action: 'UPDATE',
        entity: 'Exercise',
        entityId: exercise.id,
        oldData: existing as any,
        newData: exercise as any,
      },
    })

    return NextResponse.json({ success: true, data: exercise })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    console.error('Update exercise error:', error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE - Delete exercise (SuperAdmin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminPayload = await verifySuperAdmin()
    if (!adminPayload) {
      return NextResponse.json({ success: false, error: 'Acesso não autorizado' }, { status: 403 })
    }

    const existing = await prisma.exercise.findUnique({ where: { id: params.id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Exercício não encontrado' }, { status: 404 })
    }

    // Soft delete
    await prisma.exercise.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: adminPayload.userId,
        action: 'DELETE',
        entity: 'Exercise',
        entityId: params.id,
      },
    })

    return NextResponse.json({ success: true, message: 'Exercício excluído' })
  } catch (error) {
    console.error('Delete exercise error:', error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
