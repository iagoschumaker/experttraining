// ============================================================================
// EXPERT PRO TRAINING - CLIENT PROGRESS API
// ============================================================================
// GET /api/studio/clients/[id]/progress - Progresso do aluno no programa
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { calculateProgress } from '@/services/workoutTemplate'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER', 'SUPER_ADMIN'])
    if ('error' in auth) {
        return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    try {
        // Buscar treino ativo do cliente
        const client = await prisma.client.findFirst({
            where: {
                id: params.id,
                ...(auth.studioId ? { studioId: auth.studioId } : {}),
            },
            select: {
                id: true,
                name: true,
                trainingDaysPerWeek: true,
            },
        })

        if (!client) {
            return NextResponse.json(
                { success: false, error: 'Cliente não encontrado' },
                { status: 404 }
            )
        }

        const activeWorkout = await prisma.workout.findFirst({
            where: {
                clientId: params.id,
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                sessionsCompleted: true,
                sessionsPerWeek: true,
                targetWeeks: true,
                startDate: true,
                createdAt: true,
            },
        })

        if (!activeWorkout) {
            return NextResponse.json({
                success: true,
                data: {
                    hasActiveProgram: false,
                    client: { id: client.id, name: client.name },
                },
            })
        }

        // Calcular progresso
        const progress = calculateProgress(
            activeWorkout.sessionsCompleted,
            activeWorkout.sessionsPerWeek,
            activeWorkout.targetWeeks,
            activeWorkout.startDate,
        )

        // Buscar histórico de sessões por semana
        const lessons = await prisma.lesson.findMany({
            where: {
                workoutId: activeWorkout.id,
                status: 'COMPLETED',
            },
            select: {
                weekIndex: true,
                sessionIndex: true,
                date: true,
                focus: true,
            },
            orderBy: { date: 'asc' },
        })

        // Agrupar por semana
        const weeklyHistory: { week: number; attended: number; expected: number }[] = []
        for (let w = 1; w <= progress.currentWeek; w++) {
            const weekLessons = lessons.filter(l => l.weekIndex === w)
            weeklyHistory.push({
                week: w,
                attended: weekLessons.length,
                expected: activeWorkout.sessionsPerWeek,
            })
        }

        return NextResponse.json({
            success: true,
            data: {
                hasActiveProgram: true,
                client: { id: client.id, name: client.name },
                workout: {
                    id: activeWorkout.id,
                    name: activeWorkout.name,
                    startDate: activeWorkout.startDate || activeWorkout.createdAt,
                },
                progress,
                weeklyHistory,
                totalLessons: lessons.length,
            },
        })
    } catch (error) {
        console.error('Get client progress error:', error)
        return NextResponse.json(
            { success: false, error: 'Erro ao buscar progresso' },
            { status: 500 }
        )
    }
}
