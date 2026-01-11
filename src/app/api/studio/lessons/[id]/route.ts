// ============================================================================
// EXPERT TRAINING - LESSON DETAIL API
// ============================================================================
// GET    /api/studio/lessons/[id] - Ver detalhes da aula
// PUT    /api/studio/lessons/[id] - Atualizar/finalizar aula
// DELETE /api/studio/lessons/[id] - Cancelar aula
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { z } from 'zod'

// ============================================================================
// GET - Lesson Details
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

  try {
    const where: any = {
      id: params.id,
      studioId,
    }

    // TRAINER só vê suas próprias aulas
    if (role === 'TRAINER') {
      where.trainerId = userId
    }

    const lesson = await prisma.lesson.findFirst({
      where,
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        clients: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        studio: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Aula não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: lesson.id,
        type: lesson.type,
        status: lesson.status,
        startedAt: lesson.startedAt,
        endedAt: lesson.endedAt,
        duration: lesson.duration,
        photoUrl: lesson.photoUrl,
        notes: lesson.notes,
        trainer: lesson.trainer,
        studio: lesson.studio,
        clients: lesson.clients.map((lc: any) => ({
          ...lc.client,
          attended: lc.attended,
        })),
      },
    })
  } catch (error) {
    console.error('Get lesson error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar aula' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PUT - Update/Complete Lesson
// ============================================================================
const updateLessonSchema = z.object({
  status: z.enum(['STARTED', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
  photoUrl: z.string().url().optional(),
  photoKey: z.string().optional(),
  // Marcar presença individual de cada aluno
  attendance: z.array(z.object({
    clientId: z.string().cuid(),
    attended: z.boolean(),
  })).optional(),
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
    const validation = updateLessonSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verificar se aula existe
    const where: any = {
      id: params.id,
      studioId,
    }

    // TRAINER só pode editar suas próprias aulas
    if (role === 'TRAINER') {
      where.trainerId = userId
    }

    const existingLesson = await prisma.lesson.findFirst({ where })

    if (!existingLesson) {
      return NextResponse.json(
        { success: false, error: 'Aula não encontrada' },
        { status: 404 }
      )
    }

    // Preparar dados de atualização
    const updateData: any = {}

    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.photoUrl) updateData.photoUrl = data.photoUrl
    if (data.photoKey) updateData.photoKey = data.photoKey

    // Se estiver finalizando a aula
    if (data.status === 'COMPLETED' && existingLesson.status === 'STARTED') {
      updateData.status = 'COMPLETED'
      updateData.endedAt = new Date()
      
      // Calcular duração em minutos
      const startTime = new Date(existingLesson.startedAt).getTime()
      const endTime = Date.now()
      updateData.duration = Math.round((endTime - startTime) / 60000)
    } else if (data.status === 'CANCELLED') {
      updateData.status = 'CANCELLED'
      updateData.endedAt = new Date()
    }

    // Atualizar aula
    const lesson = await prisma.lesson.update({
      where: { id: params.id },
      data: updateData,
    })

    // Atualizar presença dos alunos
    if (data.attendance && data.attendance.length > 0) {
      for (const att of data.attendance) {
        await prisma.lessonClient.updateMany({
          where: {
            lessonId: params.id,
            clientId: att.clientId,
          },
          data: { attended: att.attended },
        })
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        studioId,
        action: 'UPDATE',
        entity: 'Lesson',
        entityId: lesson.id,
        newData: updateData,
      },
    })

    return NextResponse.json({
      success: true,
      data: lesson,
      message: data.status === 'COMPLETED' ? 'Aula finalizada com sucesso!' : 'Aula atualizada',
    })
  } catch (error) {
    console.error('Update lesson error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar aula' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Cancel Lesson
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

  try {
    const where: any = {
      id: params.id,
      studioId,
    }

    // TRAINER só pode cancelar suas próprias aulas
    if (role === 'TRAINER') {
      where.trainerId = userId
    }

    const existingLesson = await prisma.lesson.findFirst({ where })

    if (!existingLesson) {
      return NextResponse.json(
        { success: false, error: 'Aula não encontrada' },
        { status: 404 }
      )
    }

    // Cancelar ao invés de deletar (para histórico)
    const lesson = await prisma.lesson.update({
      where: { id: params.id },
      data: {
        status: 'CANCELLED',
        endedAt: new Date(),
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        studioId,
        action: 'DELETE',
        entity: 'Lesson',
        entityId: lesson.id,
        oldData: { status: existingLesson.status },
        newData: { status: 'CANCELLED' },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Aula cancelada',
    })
  } catch (error) {
    console.error('Delete lesson error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao cancelar aula' },
      { status: 500 }
    )
  }
}
