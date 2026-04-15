// ============================================================================
// EXPERT TRAINING - EXERCISE WEIGHT API
// ============================================================================
// PATCH /api/studio/workouts/[id]/exercise-weight
// Salvar carga de peso individual por exercício no scheduleJson
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
    if ('error' in auth) {
        return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const { studioId } = auth
    const workoutId = params.id

    try {
        const body = await request.json()
        const { weekIdx, sessionIdx, blockIdx, exerciseIdx, weight } = body

        if (weekIdx == null || sessionIdx == null || blockIdx == null || exerciseIdx == null) {
            return NextResponse.json(
                { success: false, error: 'Índices de exercício são obrigatórios' },
                { status: 400 }
            )
        }

        // Buscar o treino
        const workout = await prisma.workout.findFirst({
            where: { id: workoutId, studioId },
            select: { id: true, scheduleJson: true },
        })

        if (!workout) {
            return NextResponse.json(
                { success: false, error: 'Treino não encontrado' },
                { status: 404 }
            )
        }

        // Clonar o scheduleJson e atualizar o peso
        const schedule = JSON.parse(JSON.stringify(workout.scheduleJson)) as any

        // Validar índices
        const week = schedule?.weeks?.[weekIdx]
        if (!week) {
            return NextResponse.json(
                { success: false, error: 'Semana não encontrada' },
                { status: 400 }
            )
        }

        const session = week.sessions?.[sessionIdx]
        if (!session) {
            return NextResponse.json(
                { success: false, error: 'Sessão não encontrada' },
                { status: 400 }
            )
        }

        // Suportar novo formato (session.treino.blocos) e legado (session.blocks)
        const isNewFormat = !!session.treino
        const blocos = isNewFormat ? session.treino?.blocos : session.blocks

        const block = blocos?.[blockIdx]
        if (!block) {
            return NextResponse.json(
                { success: false, error: 'Bloco não encontrado' },
                { status: 400 }
            )
        }

        const exercise = block.exercises?.[exerciseIdx]
        if (!exercise) {
            return NextResponse.json(
                { success: false, error: 'Exercício não encontrado' },
                { status: 400 }
            )
        }

        // Atualizar o peso no lugar certo
        exercise.weight = weight ? String(weight) : null

        // Salvar o scheduleJson atualizado
        await prisma.workout.update({
            where: { id: workoutId },
            data: { scheduleJson: schedule },
        })

        return NextResponse.json({
            success: true,
            data: { weight: exercise.weight },
            message: 'Carga salva com sucesso',
        })
    } catch (error) {
        console.error('Save exercise weight error:', error)
        return NextResponse.json(
            { success: false, error: 'Erro ao salvar carga' },
            { status: 500 }
        )
    }
}
