// ============================================================================
// EXPERT PRO TRAINING - ACTIVE CLIENTS IN SESSIONS
// ============================================================================
// GET /api/studio/training-sessions/active-clients
// Returns all client IDs currently in any active session in the studio
// (cross-trainer visibility — so trainers can see who is already in a session)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

export async function GET(request: NextRequest) {
    const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
    if ('error' in auth) {
        return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const { studioId } = auth

    try {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        const activeSessions = await prisma.trainingSession.findMany({
            where: { studioId, finalized: false, createdAt: { gte: todayStart } },
            select: { studentsJson: true, trainerId: true },
        })

        // Collect all active client IDs with which trainer owns them
        const activeClients: { clientId: string; trainerId: string }[] = []
        for (const s of activeSessions) {
            const students = s.studentsJson as any[]
            for (const st of students) {
                activeClients.push({ clientId: st.clientId, trainerId: s.trainerId })
            }
        }

        return NextResponse.json({
            success: true,
            data: activeClients,
        })
    } catch (error) {
        console.error('Active clients error:', error)
        return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
    }
}
