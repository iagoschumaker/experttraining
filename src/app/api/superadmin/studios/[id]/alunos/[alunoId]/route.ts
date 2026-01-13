// ============================================================================
// EXPERT TRAINING - SUPERADMIN ALUNO DETAILS API
// ============================================================================
// GET /api/superadmin/studios/[id]/alunos/[alunoId] - Detalhes do aluno
// Mostra apenas dados operacionais, não clínicos
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'

// Helper to extract level from resultJson
interface ResultJson {
  level?: number
  calculatedLevel?: number
}

interface BodyMetrics {
  weight?: number
  bodyFat?: number
  measurements?: Record<string, number>
}

function extractLevel(resultJson: unknown): number | null {
  if (!resultJson || typeof resultJson !== 'object') return null
  const result = resultJson as ResultJson
  return result.calculatedLevel ?? result.level ?? null
}

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

// GET - Get aluno details (operational only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; alunoId: string }> }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { id: studioId, alunoId } = await params

  try {
    // Get client with basic info (trainer is looked up separately - no relation in schema)
    const client = await prisma.client.findFirst({
      where: {
        id: alunoId,
        studioId,
      },
      include: {
        studio: {
          select: { id: true, name: true },
        },
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Aluno não encontrado neste studio' },
        { status: 404 }
      )
    }

    // Get trainer if assigned
    let currentTrainer = null
    if (client.trainerId) {
      currentTrainer = await prisma.user.findUnique({
        where: { id: client.trainerId },
        select: { id: true, name: true, email: true },
      })
    }

    // Get assessments history (only dates and basic status, no clinical data)
    // Note: calculatedLevel is extracted from resultJson, confidence is the field name
    const assessments = await prisma.assessment.findMany({
      where: { clientId: alunoId },
      orderBy: { createdAt: 'desc' },
    })

    // Lookup assessors
    const assessorIds = assessments.map((a) => a.assessorId)
    const uniqueAssessorIds = assessorIds.filter((id, index) => assessorIds.indexOf(id) === index)
    const assessorsMap = new Map<string, { id: string; name: string }>()
    if (uniqueAssessorIds.length > 0) {
      const assessors = await prisma.user.findMany({
        where: { id: { in: uniqueAssessorIds } },
        select: { id: true, name: true },
      })
      assessors.forEach((a) => assessorsMap.set(a.id, a))
    }

    // Get lessons attendance
    const lessonClients = await prisma.lessonClient.findMany({
      where: { clientId: alunoId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        lesson: {
          include: {
            trainer: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    // Get workouts history
    const workouts = await prisma.workout.findMany({
      where: { clientId: alunoId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Define lesson client type for type safety
    type LessonClientType = typeof lessonClients[number]

    // Calculate metrics
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const lessonsThisMonth = lessonClients.filter(
      (lc: LessonClientType) => new Date(lc.lesson.startedAt) >= monthStart
    ).length

    const lessonsLast3Months = lessonClients.filter(
      (lc: LessonClientType) => new Date(lc.lesson.startedAt) >= threeMonthsAgo
    ).length

    const weeklyAverage = (lessonsLast3Months / 12).toFixed(1) // ~12 weeks in 3 months

    // Build evolution data from body metrics
    const evolution = assessments
      .filter((a) => a.bodyMetricsJson)
      .map((a) => {
        const metrics = a.bodyMetricsJson as BodyMetrics | null
        return {
          date: a.createdAt,
          weight: metrics?.weight || null,
          bodyFat: metrics?.bodyFat || null,
          measurements: metrics?.measurements || null,
        }
      })
      .filter((e) => e.weight || e.bodyFat || e.measurements)

    // Get distinct trainers who worked with this client
    const trainersSet = new Map<string, { id: string; name: string }>()
    lessonClients.forEach((lc: LessonClientType) => {
      const trainer = lc.lesson.trainer
      if (!trainersSet.has(trainer.id)) {
        trainersSet.set(trainer.id, { id: trainer.id, name: trainer.name })
      }
    })
    const trainersWhoAttended = Array.from(trainersSet.values())

    return NextResponse.json({
      success: true,
      data: {
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          status: client.status,
          createdAt: client.createdAt,
          // Note: objectives and history are NOT exposed to SuperAdmin (clinical data)
        },
        studio: client.studio,
        currentTrainer,
        trainersWhoAttended,
        assessments: assessments.map((a) => ({
          id: a.id,
          status: a.status,
          createdAt: a.createdAt,
          completedAt: a.completedAt,
          level: extractLevel(a.resultJson),
          confidence: a.confidence ? Number(a.confidence) / 100 : null,
          assessor: assessorsMap.get(a.assessorId) || { id: a.assessorId, name: 'Unknown' },
          inputJson: a.inputJson, // Input data (complaints, pain, tests) for SuperAdmin audit
          resultJson: a.resultJson, // Full results for SuperAdmin audit
          bodyMetricsJson: a.bodyMetricsJson, // Body metrics for SuperAdmin audit
        })),
        lessons: lessonClients.map((lc: LessonClientType) => ({
          id: lc.lesson.id,
          type: lc.lesson.type,
          status: lc.lesson.status,
          startedAt: lc.lesson.startedAt,
          endedAt: lc.lesson.endedAt,
          duration: lc.lesson.duration,
          trainer: lc.lesson.trainer,
          attended: lc.attended,
        })),
        workouts: workouts.map((w) => ({
          id: w.id,
          name: w.name,
          blocksUsed: w.blocksUsed,
          startDate: w.startDate,
          endDate: w.endDate,
          isActive: w.isActive,
          createdAt: w.createdAt,
        })),
        evolution,
        metrics: {
          totalAssessments: assessments.length,
          completedAssessments: assessments.filter((a) => a.status === 'COMPLETED').length,
          totalLessons: lessonClients.length,
          lessonsThisMonth,
          totalWorkouts: workouts.length,
          weeklyAverage: parseFloat(weeklyAverage),
          lastAssessment: assessments[0]?.createdAt || null,
          lastLesson: lessonClients[0]?.lesson.startedAt || null,
          currentLevel: (() => {
            const completedAssessment = assessments.find((a) => a.status === 'COMPLETED')
            return completedAssessment ? extractLevel(completedAssessment.resultJson) : null
          })(),
        },
      },
    })
  } catch (error) {
    console.error('Get aluno details error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
