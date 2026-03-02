// ============================================================================
// EXPERT PRO TRAINING - CLIENT WORKOUTS API
// ============================================================================
// GET /api/studio/clients/[id]/workouts - Listar treinos do cliente
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
    if ('error' in auth) {
        return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    try {
        const workouts = await prisma.workout.findMany({
            where: {
                clientId: params.id,
                studioId: auth.studioId,
                isActive: true,
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                isActive: true,
                startDate: true,
                endDate: true,
                createdAt: true,
                sessionsCompleted: true,
                sessionsPerWeek: true,
                targetWeeks: true,
            },
        })

        return NextResponse.json({
            success: true,
            data: workouts,
        })
    } catch (error) {
        console.error('Get client workouts error:', error)
        return NextResponse.json(
            { success: false, error: 'Erro ao buscar treinos' },
            { status: 500 }
        )
    }
}
