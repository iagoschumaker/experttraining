// ============================================================================
// EXPERT TRAINING - LESSON DETAIL API [DEPRECATED]
// ============================================================================
// ⚠️ FUNCIONALIDADE DESCONTINUADA
// 
// O controle por aulas foi removido do Método Expert Training.
// O sistema agora é gerenciado por Avaliações e Cronogramas.
//
// GET    /api/studio/lessons/[id] - Ver detalhes (APENAS HISTÓRICO - READ-ONLY)
// PUT    /api/studio/lessons/[id] - DESATIVADO
// DELETE /api/studio/lessons/[id] - DESATIVADO
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { z } from 'zod'

// Flag para desativar modificações em aulas (REATIVADO para CRUD do calendário)
const LESSONS_DEPRECATED = false

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

    // All trainers can view any lesson history in the studio

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
// PATCH — Editar focus/data/horário de um check-in manual
// ============================================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  const { userId, studioId } = auth
  const lessonId = params.id

  try {
    const body = await request.json()
    const { focus, date, time } = body

    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, studioId },
      select: { id: true, date: true, startedAt: true },
    })
    if (!lesson) {
      return NextResponse.json({ success: false, error: 'Check-in não encontrado' }, { status: 404 })
    }

    let newDate = lesson.date
    let newStartedAt = lesson.startedAt
    if (date) {
      const [year, month, day] = date.split('-').map(Number)
      newDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
      const [hours, minutes] = (time || '08:00').split(':').map(Number)
      newStartedAt = new Date(Date.UTC(year, month - 1, day, hours + 3, minutes, 0))
    }

    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        focus: focus !== undefined ? (focus?.trim() || null) : undefined,
        date: newDate,
        startedAt: newStartedAt,
        endedAt: newStartedAt,
      },
      select: { id: true, date: true, startedAt: true, focus: true, workoutId: true },
    })

    await prisma.auditLog.create({
      data: { userId, studioId, action: 'UPDATE', entity: 'Lesson', entityId: lessonId, newData: { focus, date, time } },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Patch lesson error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao editar check-in' }, { status: 500 })
  }
}

/* CÓDIGO LEGADO - MANTIDO PARA REFERÊNCIA
const updateLessonSchema = z.object({
  status: z.enum(['STARTED', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional(),
  photoUrl: z.string().url().optional(),
  photoKey: z.string().optional(),
  attendance: z.array(z.object({
    clientId: z.string().cuid(),
    attended: z.boolean(),
  })).optional(),
})

async function PUT_LEGACY(
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

    const where: any = {
      id: params.id,
      studioId,
    }

    if (role === 'TRAINER') {
      where.trainerId = userId
    }

    const existingLesson = await prisma.lesson.findFirst({ 
      where,
      include: {
        clients: {
          include: {
            client: { select: { id: true, name: true } },
          },
        },
        trainer: { select: { id: true, name: true } },
      },
    })

    if (!existingLesson) {
      return NextResponse.json(
        { success: false, error: 'Aula não encontrada' },
        { status: 404 }
      )
    }

    // ========================================================================
    // VALIDAÇÃO: Não permitir finalizar aula que não foi iniciada
    // ========================================================================
    if (data.status === 'COMPLETED' && existingLesson.status !== 'STARTED') {
      return NextResponse.json(
        { success: false, error: 'Só é possível finalizar aulas que estão em andamento' },
        { status: 400 }
      )
    }

    // ========================================================================
    // VALIDAÇÃO: Não permitir editar aula já finalizada
    // ========================================================================
    if (existingLesson.status === 'COMPLETED' && data.status !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Não é possível editar uma aula já finalizada' },
        { status: 400 }
      )
    }

    // Preparar dados de atualização
    const updateData: any = {}
    const now = new Date()

    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.photoUrl) updateData.photoUrl = data.photoUrl
    if (data.photoKey) updateData.photoKey = data.photoKey

    // Se estiver finalizando a aula
    if (data.status === 'COMPLETED' && existingLesson.status === 'STARTED') {
      updateData.status = 'COMPLETED'
      updateData.endedAt = now
      
      // Calcular duração em minutos automaticamente
      const startTime = new Date(existingLesson.startedAt).getTime()
      const endTime = now.getTime()
      const durationMinutes = Math.round((endTime - startTime) / 60000)
      
      // Validar duração mínima (pelo menos 5 minutos)
      if (durationMinutes < 5) {
        return NextResponse.json(
          { success: false, error: 'A aula deve ter no mínimo 5 minutos de duração' },
          { status: 400 }
        )
      }
      
      updateData.duration = durationMinutes
    } else if (data.status === 'CANCELLED') {
      updateData.status = 'CANCELLED'
      updateData.endedAt = now
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

    // Audit log com informações completas
    await prisma.auditLog.create({
      data: {
        userId,
        studioId,
        action: 'UPDATE',
        entity: 'Lesson',
        entityId: lesson.id,
        oldData: {
          status: existingLesson.status,
          endedAt: existingLesson.endedAt,
          duration: existingLesson.duration,
        },
        newData: {
          ...updateData,
          endedAt: updateData.endedAt?.toISOString(),
        },
      },
    })

    // Preparar resposta com dados completos
    const responseData = {
      id: lesson.id,
      type: lesson.type,
      status: lesson.status,
      startedAt: existingLesson.startedAt,
      endedAt: updateData.endedAt || lesson.endedAt,
      duration: updateData.duration || lesson.duration,
      photoUrl: lesson.photoUrl,
      notes: lesson.notes,
      trainer: existingLesson.trainer,
      clients: existingLesson.clients.map((lc: any) => ({
        ...lc.client,
        attended: lc.attended,
      })),
    }

    return NextResponse.json({
      success: true,
      data: responseData,
      message: data.status === 'COMPLETED' 
        ? `Aula finalizada com sucesso! Duração: ${updateData.duration} minutos` 
        : 'Aula atualizada',
    })
  } catch (error) {
    console.error('Update lesson error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar aula' },
      { status: 500 }
    )
  }
}
PUT_LEGACY END */

// ============================================================================
// DELETE — Excluir check-in e decrementar sessionsCompleted do treino
// ============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }
  const { userId, studioId } = auth
  const lessonId = params.id

  try {
    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, studioId },
      select: { id: true, workoutId: true },
    })
    if (!lesson) {
      return NextResponse.json({ success: false, error: 'Check-in não encontrado' }, { status: 404 })
    }

    await prisma.lessonClient.deleteMany({ where: { lessonId } })
    await prisma.lesson.delete({ where: { id: lessonId } })

    if (lesson.workoutId) {
      const wo = await prisma.workout.findUnique({
        where: { id: lesson.workoutId },
        select: { sessionsCompleted: true },
      })
      if (wo && wo.sessionsCompleted > 0) {
        await prisma.workout.update({
          where: { id: lesson.workoutId },
          data: { sessionsCompleted: { decrement: 1 } },
        })
      }
    }

    await prisma.auditLog.create({
      data: { userId, studioId, action: 'DELETE', entity: 'Lesson', entityId: lessonId,
        oldData: { lessonId, workoutId: lesson.workoutId } },
    })

    return NextResponse.json({ success: true, message: 'Check-in excluído com sucesso' })
  } catch (error) {
    console.error('Delete lesson error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao excluir check-in' }, { status: 500 })
  }
}
