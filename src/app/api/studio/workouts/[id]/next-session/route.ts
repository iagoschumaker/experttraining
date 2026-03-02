// ============================================================================
// EXPERT PRO TRAINING - NEXT SESSION API
// ============================================================================
// GET  /api/studio/workouts/[id]/next-session - Próxima sessão do aluno
// POST /api/studio/workouts/[id]/next-session - Registrar sessão completada
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import {
    getNextSessionWithPeriodization,
    calculateProgress,
    WorkoutTemplate,
} from '@/services/workoutTemplate'

// ============================================================================
// GET - Retorna próxima sessão com periodização
// ============================================================================
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
    if ('error' in auth) {
        return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    try {
        const workout = await prisma.workout.findFirst({
            where: {
                id: params.id,
                studioId: auth.studioId,
            },
            include: {
                client: { select: { id: true, name: true } },
            },
        })

        if (!workout) {
            return NextResponse.json(
                { success: false, error: 'Treino não encontrado' },
                { status: 404 }
            )
        }

        if (!workout.isActive) {
            return NextResponse.json(
                { success: false, error: 'Este treino não está ativo' },
                { status: 400 }
            )
        }

        const template = workout.templateJson as unknown as WorkoutTemplate | null

        if (!template || !template.sessions) {
            // Fallback: treino antigo sem template
            return NextResponse.json(
                {
                    success: false,
                    error: 'Este treino não possui template. Foi gerado no formato antigo.',
                    legacyWorkout: true,
                },
                { status: 400 }
            )
        }

        const { session, progress } = getNextSessionWithPeriodization(
            template,
            workout.sessionsCompleted,
            workout.startDate,
        )

        return NextResponse.json({
            success: true,
            data: {
                session,
                progress,
                client: workout.client,
                workoutName: workout.name,
            },
        })
    } catch (error) {
        console.error('Get next session error:', error)
        return NextResponse.json(
            { success: false, error: 'Erro ao buscar próxima sessão' },
            { status: 500 }
        )
    }
}

// ============================================================================
// POST - Registrar sessão completada
// ============================================================================
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
    if ('error' in auth) {
        return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    try {
        const workout = await prisma.workout.findFirst({
            where: {
                id: params.id,
                studioId: auth.studioId,
                isActive: true,
            },
            include: {
                client: { select: { id: true, name: true } },
            },
        })

        if (!workout) {
            return NextResponse.json(
                { success: false, error: 'Treino ativo não encontrado' },
                { status: 404 }
            )
        }

        const template = workout.templateJson as unknown as WorkoutTemplate | null

        if (!template || !template.sessions) {
            return NextResponse.json(
                { success: false, error: 'Treino sem template' },
                { status: 400 }
            )
        }

        // Calcular qual sessão está sendo completada
        const sessionIndex = workout.sessionsCompleted % workout.sessionsPerWeek
        const currentWeek = Math.floor(workout.sessionsCompleted / workout.sessionsPerWeek) + 1
        const session = template.sessions[sessionIndex]

        // Opcional: dados extras do body
        let bodyData: any = {}
        try {
            bodyData = await request.json()
        } catch {
            // Body vazio é ok
        }

        // Incrementar sessões + criar Lesson em transação
        const [updatedWorkout, lesson] = await prisma.$transaction([
            prisma.workout.update({
                where: { id: workout.id },
                data: {
                    sessionsCompleted: { increment: 1 },
                },
            }),
            prisma.lesson.create({
                data: {
                    studioId: auth.studioId,
                    trainerId: auth.userId,
                    type: 'INDIVIDUAL',
                    date: new Date(),
                    startedAt: new Date(),
                    workoutId: workout.id,
                    weekIndex: currentWeek,
                    dayIndex: sessionIndex + 1,
                    sessionIndex,
                    focus: session?.pillarLabel || null,
                    notes: bodyData.notes || null,
                    status: 'COMPLETED',
                    endedAt: new Date(),
                    duration: bodyData.duration || 60,
                    clients: {
                        create: {
                            clientId: workout.clientId,
                            attended: true,
                        },
                    },
                },
            }),
        ])

        // Calcular progresso atualizado
        const progress = calculateProgress(
            updatedWorkout.sessionsCompleted,
            updatedWorkout.sessionsPerWeek,
            updatedWorkout.targetWeeks,
            updatedWorkout.startDate,
        )

        console.log(`✅ Sessão registrada: ${workout.client.name}`)
        console.log(`   - Sessão ${updatedWorkout.sessionsCompleted}/${updatedWorkout.targetWeeks * updatedWorkout.sessionsPerWeek}`)
        console.log(`   - Semana ${progress.currentWeek}/${progress.targetWeeks}`)
        console.log(`   - Frequência: ${progress.attendanceRateLabel}`)
        console.log(`   - Fase: ${progress.currentPhaseLabel}`)
        console.log(`   - Apto reavaliação: ${progress.canReassess}`)

        // Audit log
        await prisma.auditLog.create({
            data: {
                userId: auth.userId,
                studioId: auth.studioId,
                action: 'COMPLETE_SESSION',
                entity: 'Workout',
                entityId: workout.id,
                newData: {
                    sessionIndex,
                    weekIndex: currentWeek,
                    sessionsCompleted: updatedWorkout.sessionsCompleted,
                    phase: progress.currentPhase,
                    attendanceRate: progress.attendanceRate,
                    lessonId: lesson.id,
                } as any,
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                lessonId: lesson.id,
                progress,
                client: workout.client,
            },
        })
    } catch (error) {
        console.error('Complete session error:', error)
        return NextResponse.json(
            { success: false, error: 'Erro ao registrar sessão' },
            { status: 500 }
        )
    }
}
