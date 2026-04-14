// ============================================================================
// EXPERT PRO TRAINING - TRAINING SESSIONS API
// ============================================================================
// GET    /api/studio/training-sessions - List active sessions for current trainer
// POST   /api/studio/training-sessions - Create new session
// DELETE /api/studio/training-sessions - Clear all stuck (non-finalized) sessions
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

// GET - List active (non-finalized) sessions for current trainer
export async function GET(request: NextRequest) {
    const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
    if ('error' in auth) {
        return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const { userId, studioId } = auth

    try {
        // List ALL non-finalized sessions for this trainer+studio
        // (no date filter — sessions created near BRT midnight would be invisible otherwise)
        const sessions = await prisma.trainingSession.findMany({
            where: {
                studioId,
                trainerId: userId,
                finalized: false,
            },
            orderBy: { createdAt: 'asc' },
        })

        // Collect all unique clientIds across sessions
        const allClientIds = new Set<string>()
        for (const s of sessions) {
            const arr = (s.studentsJson as any[]) || []
            arr.forEach((st: any) => st.clientId && allClientIds.add(st.clientId))
        }

        // Fetch fresh activeWorkoutId for each client
        const freshClients = allClientIds.size > 0
            ? await prisma.client.findMany({
                where: { id: { in: Array.from(allClientIds) } },
                select: { id: true, activeWorkoutId: true },
              })
            : []
        const freshWorkoutMap = new Map(freshClients.map(c => [c.id, c.activeWorkoutId]))

        // Build response, refreshing workoutId from DB client data
        const result = sessions.map(s => {
            const updatedStudents = (s.studentsJson as any[]).map((st: any) => {
                const freshId = freshWorkoutMap.get(st.clientId)
                if (freshId && freshId !== st.workoutId) {
                    return { ...st, workoutId: freshId }
                }
                return st
            })
            return {
                id: s.id,
                label: s.label,
                students: updatedStudents,
                createdAt: s.createdAt.toISOString(),
                finalized: s.finalized,
            }
        })

        return NextResponse.json({ success: true, data: result })
    } catch (error) {
        console.error('List training sessions error:', error)
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
    }
}

// POST - Create new session
export async function POST(request: NextRequest) {
    const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
    if ('error' in auth) {
        return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const { userId, studioId } = auth

    try {
        const body = await request.json()
        const { students, label } = body
        // students: [{clientId, workoutId, clientName}]

        if (!students || !Array.isArray(students) || students.length === 0) {
            return NextResponse.json({ success: false, error: 'Selecione pelo menos um aluno' }, { status: 400 })
        }

        // Check ALL non-finalized sessions (no date limit) — catches stuck sessions from previous days
        const activeSessions = await prisma.trainingSession.findMany({
            where: { studioId, finalized: false },
        })

        const occupiedClientIds = new Set<string>()
        for (const s of activeSessions) {
            const sStudents = s.studentsJson as any[]
            for (const st of sStudents) {
                occupiedClientIds.add(st.clientId)
            }
        }

        const conflicting = students.filter((s: any) => occupiedClientIds.has(s.clientId))
        if (conflicting.length > 0) {
            return NextResponse.json({
                success: false,
                error: `Aluno(s) já em sessão ativa: ${conflicting.map((c: any) => c.clientName).join(', ')}. Limpe as sessões travadas se necessário.`,
            }, { status: 409 })
        }

        const session = await prisma.trainingSession.create({
            data: {
                studioId,
                trainerId: userId,
                label: label || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                studentsJson: students,
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                id: session.id,
                label: session.label,
                students: session.studentsJson as any[],
                createdAt: session.createdAt.toISOString(),
                finalized: false,
            },
        })
    } catch (error) {
        console.error('Create training session error:', error)
        return NextResponse.json({ success: false, error: 'Erro ao criar sessão' }, { status: 500 })
    }
}

// DELETE - Clear ALL stuck (non-finalized) sessions for this trainer
// Used when sessions get stuck due to server restarts / deploys
export async function DELETE(request: NextRequest) {
    const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
    if ('error' in auth) {
        return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const { userId, studioId } = auth

    try {
        const result = await prisma.trainingSession.deleteMany({
            where: {
                studioId,
                trainerId: userId,
                finalized: false,
            },
        })

        return NextResponse.json({
            success: true,
            data: { deleted: result.count },
            message: `${result.count} sessão(ões) travada(s) removida(s)`,
        })
    } catch (error) {
        console.error('Clear sessions error:', error)
        return NextResponse.json({ success: false, error: 'Erro ao limpar sessões' }, { status: 500 })
    }
}
