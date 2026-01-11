// ============================================================================
// EXPERT TRAINING - SUPERADMIN STUDIO TRAINERS API
// ============================================================================
// GET /api/superadmin/studios/[id]/trainers - Lista trainers do studio
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

// GET - List trainers of a studio with metrics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { id: studioId } = await params

  try {
    // Verify studio exists
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
    })

    if (!studio) {
      return NextResponse.json(
        { success: false, error: 'Studio não encontrado' },
        { status: 404 }
      )
    }

    // Get current month start
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    // Get all trainers of this studio
    const userStudios = await prisma.userStudio.findMany({
      where: { studioId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Enrich with metrics
    const trainersWithMetrics = await Promise.all(
      userStudios.map(async (us: typeof userStudios[0]) => {
        const trainerId = us.user.id

        const [
          clientCount,
          lessonsTotal,
          lessonsThisMonth,
          assessmentsTotal,
          assessmentsThisMonth,
          lastLesson,
        ] = await Promise.all([
          // Clients assigned to this trainer
          prisma.client.count({
            where: {
              studioId,
              trainerId,
            },
          }),
          // Total lessons by this trainer
          prisma.lesson.count({
            where: {
              studioId,
              trainerId,
            },
          }),
          // Lessons this month
          prisma.lesson.count({
            where: {
              studioId,
              trainerId,
              startedAt: { gte: monthStart },
            },
          }),
          // Total assessments
          prisma.assessment.count({
            where: {
              assessorId: trainerId,
              client: { studioId },
            },
          }),
          // Assessments this month
          prisma.assessment.count({
            where: {
              assessorId: trainerId,
              client: { studioId },
              createdAt: { gte: monthStart },
            },
          }),
          // Last lesson
          prisma.lesson.findFirst({
            where: {
              studioId,
              trainerId,
            },
            orderBy: { startedAt: 'desc' },
            select: { startedAt: true },
          }),
        ])

        return {
          id: us.id,
          oddsId: us.user.id,
          name: us.user.name,
          email: us.user.email,
          role: us.role,
          isActive: us.isActive,
          joinedAt: us.joinedAt,
          metrics: {
            clients: clientCount,
            lessonsTotal,
            lessonsThisMonth,
            assessmentsTotal,
            assessmentsThisMonth,
            lastActivity: lastLesson?.startedAt || null,
          },
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        studioId,
        studioName: studio.name,
        items: trainersWithMetrics,
        total: trainersWithMetrics.length,
      },
    })
  } catch (error) {
    console.error('Get studio trainers error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
