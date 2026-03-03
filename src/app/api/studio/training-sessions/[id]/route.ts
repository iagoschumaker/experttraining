// ============================================================================
// EXPERT PRO TRAINING - TRAINING SESSION BY ID API
// ============================================================================
// PATCH  /api/studio/training-sessions/[id] - Add/remove student
// POST   /api/studio/training-sessions/[id] - Finalize session (do check-ins)
// DELETE /api/studio/training-sessions/[id] - Discard session
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

// PATCH - Add or remove a student from the session
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
    if ('error' in auth) {
        return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }
    const { userId, studioId } = auth

    try {
        const session = await prisma.trainingSession.findFirst({
            where: { id: params.id, studioId, trainerId: userId, finalized: false },
        })
        if (!session) {
            return NextResponse.json({ success: false, error: 'Sessão não encontrada' }, { status: 404 })
        }

        const body = await request.json()
        const { addStudent, removeClientId } = body
        let students = (session.studentsJson as any[]) || []

        if (addStudent) {
            // Check if student is already in another active session in the studio
            const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
            const allActive = await prisma.trainingSession.findMany({
                where: { studioId, finalized: false, createdAt: { gte: todayStart } },
            })
            for (const s of allActive) {
                const sStudents = s.studentsJson as any[]
                if (sStudents.some((st: any) => st.clientId === addStudent.clientId)) {
                    return NextResponse.json({ success: false, error: 'Aluno já está em outra sessão ativa' }, { status: 409 })
                }
            }
            students = [...students, addStudent]
        }

        if (removeClientId) {
            students = students.filter((s: any) => s.clientId !== removeClientId)
        }

        const updated = await prisma.trainingSession.update({
            where: { id: params.id },
            data: { studentsJson: students },
        })

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                label: updated.label,
                students: updated.studentsJson as any[],
                createdAt: updated.createdAt.toISOString(),
                finalized: updated.finalized,
            },
        })
    } catch (error) {
        console.error('Update training session error:', error)
        return NextResponse.json({ success: false, error: 'Erro ao atualizar sessão' }, { status: 500 })
    }
}

// POST - Finalize session (do check-ins for all students)
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
    if ('error' in auth) {
        return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }
    const { userId, studioId } = auth

    try {
        const session = await prisma.trainingSession.findFirst({
            where: { id: params.id, studioId, trainerId: userId, finalized: false },
        })
        if (!session) {
            return NextResponse.json({ success: false, error: 'Sessão não encontrada' }, { status: 404 })
        }

        const students = (session.studentsJson as any[]) || []
        const results: { clientId: string; clientName: string; checkedIn: boolean }[] = []

        // Check-in each student by POSTing to next-session
        for (const student of students) {
            try {
                // Build an internal fetch to the next-session endpoint
                const baseUrl = request.nextUrl.origin
                const res = await fetch(`${baseUrl}/api/studio/workouts/${student.workoutId}/next-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': request.headers.get('cookie') || '',
                    },
                })
                const data = await res.json()
                results.push({ clientId: student.clientId, clientName: student.clientName, checkedIn: data.success })
            } catch {
                results.push({ clientId: student.clientId, clientName: student.clientName, checkedIn: false })
            }
        }

        // Mark session as finalized
        await prisma.trainingSession.update({
            where: { id: params.id },
            data: { finalized: true, finalizedAt: new Date() },
        })

        return NextResponse.json({
            success: true,
            data: {
                checkedIn: results.filter(r => r.checkedIn).length,
                total: results.length,
                results,
            },
        })
    } catch (error) {
        console.error('Finalize training session error:', error)
        return NextResponse.json({ success: false, error: 'Erro ao finalizar sessão' }, { status: 500 })
    }
}

// DELETE - Discard session without check-in
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
    if ('error' in auth) {
        return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }
    const { userId, studioId } = auth

    try {
        const session = await prisma.trainingSession.findFirst({
            where: { id: params.id, studioId, trainerId: userId },
        })
        if (!session) {
            return NextResponse.json({ success: false, error: 'Sessão não encontrada' }, { status: 404 })
        }

        await prisma.trainingSession.delete({ where: { id: params.id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Delete training session error:', error)
        return NextResponse.json({ success: false, error: 'Erro ao excluir sessão' }, { status: 500 })
    }
}
