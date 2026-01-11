// ============================================================================
// EXPERT TRAINING - SUPERADMIN STUDIO ALUNOS API
// ============================================================================
// GET /api/superadmin/studios/[id]/alunos - Lista alunos do studio
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

// GET - List alunos of a studio with metrics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { id: studioId } = await params
  const { searchParams } = new URL(request.url)
  
  // Filters
  const trainerId = searchParams.get('trainerId')
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')

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

    // Build filter
    const where: any = { studioId }
    
    if (trainerId) {
      where.trainerId = trainerId
    }
    if (status) {
      where.status = status
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const total = await prisma.client.count({ where })

    // Get clients (without _count as lessonClients may not be available)
    const clients = await prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // Enrich with activity metrics and trainer info
    const clientsWithMetrics = await Promise.all(
      clients.map(async (client) => {
        // Get trainer info if assigned
        let trainer = null
        if (client.trainerId) {
          const trainerUser = await prisma.user.findUnique({
            where: { id: client.trainerId },
            select: { id: true, name: true, email: true },
          })
          trainer = trainerUser
        }

        // Get counts
        const [assessmentCount, lessonCount] = await Promise.all([
          prisma.assessment.count({ where: { clientId: client.id } }),
          prisma.lessonClient.count({ where: { clientId: client.id } }),
        ])

        // Get last assessment
        const lastAssessment = await prisma.assessment.findFirst({
          where: { clientId: client.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        })

        // Get last lesson attendance
        const lastLesson = await prisma.lessonClient.findFirst({
          where: { clientId: client.id },
          orderBy: { createdAt: 'desc' },
          include: {
            lesson: {
              select: { startedAt: true },
            },
          },
        })

        return {
          id: client.id,
          name: client.name,
          email: client.email,
          status: client.status,
          createdAt: client.createdAt,
          trainer,
          metrics: {
            totalAssessments: assessmentCount,
            totalLessons: lessonCount,
            lastAssessment: lastAssessment?.createdAt || null,
            lastLesson: lastLesson?.lesson?.startedAt || null,
          },
        }
      })
    )

    // Get trainers for filter dropdown
    const trainers = await prisma.userStudio.findMany({
      where: { studioId },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        studioId,
        studioName: studio.name,
        items: clientsWithMetrics,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        filters: {
          trainers: trainers.map((t: typeof trainers[0]) => ({
            id: t.user.id,
            name: t.user.name,
          })),
        },
      },
    })
  } catch (error) {
    console.error('Get studio alunos error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
