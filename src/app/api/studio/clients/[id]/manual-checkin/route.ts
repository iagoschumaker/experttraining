// ============================================================================
// EXPERT TRAINING - MANUAL CHECK-IN API
// ============================================================================
// POST /api/studio/clients/[id]/manual-checkin
// Creates a retroactive Lesson for a client on a specific date/time
// Increments the active workout's sessionsCompleted
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId } = auth
  const clientId = params.id

  try {
    const body = await request.json()
    const { date, time, focus } = body
    // date: "2026-03-10" | time: "09:30" | focus: string (optional)

    if (!date) {
      return NextResponse.json({ success: false, error: 'Data é obrigatória' }, { status: 400 })
    }

    // Verify client belongs to this studio
    const client = await prisma.client.findFirst({
      where: { id: clientId, studioId },
    })
    if (!client) {
      return NextResponse.json({ success: false, error: 'Aluno não encontrado' }, { status: 404 })
    }

    // Find active workout for this client
    const activeWorkout = await prisma.workout.findFirst({
      where: { clientId, studioId, isActive: true },
      select: { id: true, scheduleJson: true, sessionsCompleted: true },
    })

    // Build the lesson date and startedAt datetime
    // date format: "YYYY-MM-DD"  | time format: "HH:MM"
    const [year, month, day] = date.split('-').map(Number)
    const lessonDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)) // noon UTC for date-only field

    let startedAt = lessonDate
    if (time) {
      const [hours, minutes] = time.split(':').map(Number)
      // Convert local BRT (UTC-3) to UTC
      startedAt = new Date(Date.UTC(year, month - 1, day, hours + 3, minutes, 0))
    }

    // Create lesson with LessonClient relation
    const lesson = await prisma.lesson.create({
      data: {
        studioId,
        trainerId: userId,
        type: 'INDIVIDUAL',
        status: 'COMPLETED',
        date: lessonDate,
        startedAt,
        endedAt: startedAt,
        workoutId: activeWorkout?.id ?? null,
        focus: focus ?? null,
        clients: {
          create: { clientId },
        },
      },
    })

    // Increment sessionsCompleted on the active workout
    if (activeWorkout) {
      await prisma.workout.update({
        where: { id: activeWorkout.id },
        data: { sessionsCompleted: { increment: 1 } },
      })
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        studioId,
        action: 'CREATE',
        entity: 'ManualCheckin',
        entityId: lesson.id,
        newData: { clientId, date, time, focus, workoutId: activeWorkout?.id },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        lessonId: lesson.id,
        date: lessonDate.toISOString(),
        startedAt: startedAt.toISOString(),
        focus,
        workoutId: activeWorkout?.id ?? null,
      },
      message: 'Check-in registrado com sucesso!',
    })
  } catch (error) {
    console.error('Manual check-in error:', error)
    return NextResponse.json({ success: false, error: 'Erro ao registrar check-in' }, { status: 500 })
  }
}
