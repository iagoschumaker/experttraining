// ============================================================================
// EXPERT TRAINING - SUPERADMIN TRAINER DETAILS API
// ============================================================================
// GET /api/superadmin/studios/[id]/trainers/[trainerId] - Detalhes do trainer
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'

// Middleware to check superadmin
async function verifySuperAdmin() {
  const accessToken = await getAccessTokenCookie()
  
  if (!accessToken) {
    return { error: 'Não autenticado', status: 401 }
  }

  const payload = verifyAccessToken(accessToken)
  
  if (!payload || !payload.isSuperAdmin) {
    return { error: 'Acesso negado', status: 403 }
  }

  return { payload }
}

// GET - Get trainer details with activity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; trainerId: string }> }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { id: studioId, trainerId } = await params

  try {
    // Verify studio and trainer relationship
    const userStudio = await prisma.userStudio.findFirst({
      where: {
        studioId,
        userId: trainerId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        studio: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!userStudio) {
      return NextResponse.json(
        { success: false, error: 'Trainer não encontrado neste studio' },
        { status: 404 }
      )
    }

    // Get time periods
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)

    // Get clients of this trainer
    const clients = await prisma.client.findMany({
      where: {
        studioId,
        trainerId,
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    })

    // Get lessons history
    const lessons = await prisma.lesson.findMany({
      where: {
        studioId,
        trainerId,
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        status: true,
        startedAt: true,
        endedAt: true,
        duration: true,
        clients: {
          include: {
            client: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    // Get assessments history
    const assessments = await prisma.assessment.findMany({
      where: {
        assessorId: trainerId,
        client: { studioId },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        status: true,
        createdAt: true,
        completedAt: true,
        client: {
          select: { id: true, name: true },
        },
      },
    })

    // Calculate metrics
    const lessonsThisMonth = lessons.filter(
      (l: { startedAt: Date }) => new Date(l.startedAt) >= monthStart
    ).length
    const lessonsThisWeek = lessons.filter(
      (l: { startedAt: Date }) => new Date(l.startedAt) >= weekStart
    ).length
    const assessmentsThisMonth = assessments.filter(
      (a) => new Date(a.createdAt) >= monthStart
    ).length

    // Calculate weekly average (last 4 weeks)
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
    const lessonsLast4Weeks = lessons.filter(
      (l: { startedAt: Date }) => new Date(l.startedAt) >= fourWeeksAgo
    ).length
    const weeklyAverage = (lessonsLast4Weeks / 4).toFixed(1)

    return NextResponse.json({
      success: true,
      data: {
        trainer: {
          id: userStudio.user.id,
          name: userStudio.user.name,
          email: userStudio.user.email,
          role: userStudio.role,
          isActive: userStudio.isActive,
          joinedAt: userStudio.joinedAt,
        },
        studio: userStudio.studio,
        clients,
        lessons,
        assessments,
        metrics: {
          totalClients: clients.length,
          activeClients: clients.filter((c) => c.status === 'ACTIVE').length,
          totalLessons: lessons.length,
          lessonsThisMonth,
          lessonsThisWeek,
          weeklyAverage: parseFloat(weeklyAverage),
          totalAssessments: assessments.length,
          assessmentsThisMonth,
          lastActivity: lessons[0]?.startedAt || assessments[0]?.createdAt || null,
        },
      },
    })
  } catch (error) {
    console.error('Get trainer details error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
