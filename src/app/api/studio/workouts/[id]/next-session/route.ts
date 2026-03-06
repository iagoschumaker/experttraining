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

// Helpers para calcular início/fim do dia em horário de Brasília (UTC-3)
function getTodayRange() {
    // Obter data atual no fuso de Brasília
    const nowBRT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const year = nowBRT.getFullYear()
    const month = nowBRT.getMonth()
    const day = nowBRT.getDate()

    // Início e fim do dia em Brasília, convertido para UTC
    // Brasília = UTC-3, então 00:00 BRT = 03:00 UTC
    const start = new Date(Date.UTC(year, month, day, 3, 0, 0, 0))
    const end = new Date(Date.UTC(year, month, day + 1, 2, 59, 59, 999))
    return { start, end }
}

// ============================================================================
// GET - Retorna próxima sessão com periodização + check-in status do dia
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
            return NextResponse.json(
                {
                    success: false,
                    error: 'Este treino não possui template. Foi gerado no formato antigo.',
                    legacyWorkout: true,
                },
                { status: 400 }
            )
        }

        // Verificar se já fez check-in hoje
        const { start, end } = getTodayRange()
        const todayLesson = await prisma.lesson.findFirst({
            where: {
                workoutId: workout.id,
                date: { gte: start, lte: end },
                status: 'COMPLETED',
            },
            orderBy: { date: 'desc' },
            select: {
                id: true,
                date: true,
                startedAt: true,
                endedAt: true,
                focus: true,
                sessionIndex: true,
                weekIndex: true,
            },
        })

        const checkedInToday = !!todayLesson

        const { session, progress } = getNextSessionWithPeriodization(
            template,
            workout.sessionsCompleted,
            workout.startDate,
        )

        // Check if a specific session index was requested (pillar selector)
        const url = new URL(request.url)
        const requestedIndex = url.searchParams.get('sessionIndex')

        // Se já fez check-in hoje, mostrar a sessão que completou (não a próxima)
        let displaySession = session
        if (requestedIndex !== null) {
            // Trainer manually selected a pillar/session
            const idx = parseInt(requestedIndex, 10)
            if (idx >= 0 && idx < template.sessions.length) {
                displaySession = JSON.parse(JSON.stringify(template.sessions[idx]))
            }
        } else if (checkedInToday) {
            // sessionsCompleted já foi incrementado, então a sessão de hoje é a anterior
            const completedIdx = (workout.sessionsCompleted - 1) % template.sessions.length
            if (completedIdx >= 0 && completedIdx < template.sessions.length) {
                displaySession = template.sessions[completedIdx]
            }
        }

        // Build available sessions list for pillar selector
        const availableSessions = template.sessions.map((s, i) => ({
            index: i,
            pillarLabel: s.pillarLabel,
            pillar: s.pillar,
        }))

        return NextResponse.json({
            success: true,
            data: {
                session: displaySession,
                progress,
                client: workout.client,
                workoutName: workout.name,
                checkedInToday,
                availableSessions,
                todayLesson: todayLesson ? {
                    id: todayLesson.id,
                    date: todayLesson.date,
                    startedAt: todayLesson.startedAt,
                    endedAt: todayLesson.endedAt,
                    focus: todayLesson.focus,
                    sessionIndex: todayLesson.sessionIndex,
                    weekIndex: todayLesson.weekIndex,
                } : null,
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
// POST - Registrar sessão completada (1x por dia)
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

        // ====================================================================
        // GUARD: Verificar se já fez check-in HOJE
        // ====================================================================
        const { start, end } = getTodayRange()
        const alreadyCheckedIn = await prisma.lesson.findFirst({
            where: {
                workoutId: workout.id,
                date: { gte: start, lte: end },
                status: 'COMPLETED',
            },
        })

        if (alreadyCheckedIn) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Presença já registrada hoje para este aluno.',
                    alreadyCheckedIn: true,
                },
                { status: 400 }
            )
        }

        // Calcular qual sessão está sendo completada (contínua, não reseta por semana)
        const sessionIndex = workout.sessionsCompleted % template.sessions.length
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
                    date: (() => {
                        // Usar data no horário de Brasília (UTC-3) para evitar offset de dia
                        const nowBRT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
                        return new Date(nowBRT.getFullYear(), nowBRT.getMonth(), nowBRT.getDate(), 12, 0, 0)
                    })(),
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
                session: {
                    pillarLabel: session?.pillarLabel,
                    sessionIndex,
                    weekIndex: currentWeek,
                },
                checkedInAt: new Date().toISOString(),
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
