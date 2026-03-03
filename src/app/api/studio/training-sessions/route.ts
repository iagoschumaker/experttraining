// ============================================================================
// EXPERT PRO TRAINING - TRAINING SESSIONS API
// ============================================================================
// GET  /api/studio/training-sessions - List active sessions for current trainer
// POST /api/studio/training-sessions - Create new session
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
        // Get today's start (UTC) for filtering
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        const sessions = await prisma.trainingSession.findMany({
            where: {
                studioId,
                trainerId: userId,
                finalized: false,
                createdAt: { gte: todayStart },
            },
            orderBy: { createdAt: 'asc' },
        })

        return NextResponse.json({
            success: true,
            data: sessions.map(s => ({
                id: s.id,
                label: s.label,
                students: s.studentsJson as any[],
                createdAt: s.createdAt.toISOString(),
                finalized: s.finalized,
            })),
        })
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

        // Verify no student is already in an active session in this studio
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        const activeSessions = await prisma.trainingSession.findMany({
            where: { studioId, finalized: false, createdAt: { gte: todayStart } },
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
                error: `Aluno(s) já em sessão ativa: ${conflicting.map((c: any) => c.clientName).join(', ')}`,
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
