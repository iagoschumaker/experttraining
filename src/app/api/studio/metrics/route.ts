// ============================================================================
// EXPERT PRO TRAINING - STUDIO METRICS API
// ============================================================================
// GET /api/studio/metrics - Métricas do studio para dashboard
// Retorna estatísticas de equipe, aulas, avaliações, etc.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId } = auth
  const { searchParams } = new URL(request.url)
  
  // Período de análise (padrão: últimos 30 dias)
  const days = parseInt(searchParams.get('days') || '30')
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  try {
    // =========================================================================
    // MÉTRICAS GERAIS DO STUDIO
    // =========================================================================
    
    const [
      totalClients,
      activeClients,
      totalAssessments,
      completedAssessments,
      totalWorkouts,
      totalLessons,
      completedLessons,
    ] = await Promise.all([
      // Total de clientes
      prisma.client.count({ where: { studioId } }),
      
      // Clientes ativos
      prisma.client.count({ where: { studioId, status: 'ACTIVE' } }),
      
      // Total de avaliações
      prisma.assessment.count({
        where: {
          client: { studioId },
          createdAt: { gte: startDate },
        },
      }),
      
      // Avaliações processadas
      prisma.assessment.count({
        where: {
          client: { studioId },
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
      }),
      
      // Total de treinos
      prisma.workout.count({
        where: {
          studioId,
          createdAt: { gte: startDate },
        },
      }),
      
      // Total de aulas
      prisma.lesson.count({
        where: {
          studioId,
          startedAt: { gte: startDate },
        },
      }),
      
      // Aulas finalizadas
      prisma.lesson.count({
        where: {
          studioId,
          status: 'COMPLETED',
          startedAt: { gte: startDate },
        },
      }),
    ])

    // =========================================================================
    // MÉTRICAS POR TRAINER
    // =========================================================================
    
    // Buscar todos os trainers do studio
    const trainers = await prisma.userStudio.findMany({
      where: {
        studioId,
        isActive: true,
      },
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

    // Para cada trainer, buscar métricas
    const trainerMetrics = await Promise.all(
      trainers.map(async (ts: any) => {
        const trainerId = ts.user.id

        const [
          clientCount,
          lessonCount,
          assessmentCount,
          lastActivity,
        ] = await Promise.all([
          // Alunos atendidos
          prisma.client.count({
            where: {
              studioId,
              trainerId,
            },
          }),
          
          // Aulas realizadas no período
          prisma.lesson.count({
            where: {
              studioId,
              trainerId,
              status: 'COMPLETED',
              startedAt: { gte: startDate },
            },
          }),
          
          // Avaliações realizadas no período
          prisma.assessment.count({
            where: {
              assessorId: trainerId,
              client: { studioId },
              createdAt: { gte: startDate },
            },
          }),
          
          // Última atividade (última aula)
          prisma.lesson.findFirst({
            where: {
              studioId,
              trainerId,
            },
            orderBy: { startedAt: 'desc' },
            select: { startedAt: true },
          }),
        ])

        // Calcular frequência semanal média
        const weeksInPeriod = days / 7
        const weeklyFrequency = weeksInPeriod > 0 ? (lessonCount / weeksInPeriod).toFixed(1) : 0

        return {
          id: ts.id,
          userId: trainerId,
          name: ts.user.name,
          email: ts.user.email,
          role: ts.role,
          metrics: {
            clients: clientCount,
            lessons: lessonCount,
            assessments: assessmentCount,
            weeklyFrequency: parseFloat(weeklyFrequency as string),
            lastActivity: lastActivity?.startedAt || null,
          },
        }
      })
    )

    // =========================================================================
    // ALERTAS E INDICADORES
    // =========================================================================
    
    const alerts: string[] = []

    // Trainer sem atividade
    const inactiveTrainers = trainerMetrics.filter(
      (t) => t.metrics.lessons === 0 && t.role === 'TRAINER'
    )
    if (inactiveTrainers.length > 0) {
      alerts.push(`${inactiveTrainers.length} trainer(s) sem aulas no período`)
    }

    // Clientes sem avaliação recente
    const clientsWithoutRecentAssessment = await prisma.client.count({
      where: {
        studioId,
        status: 'ACTIVE',
        assessments: {
          none: {
            createdAt: { gte: startDate },
          },
        },
      },
    })
    if (clientsWithoutRecentAssessment > 0) {
      alerts.push(`${clientsWithoutRecentAssessment} cliente(s) sem avaliação recente`)
    }

    // =========================================================================
    // RESPOSTA
    // =========================================================================
    
    return NextResponse.json({
      success: true,
      data: {
        period: {
          days,
          startDate,
          endDate: new Date(),
        },
        summary: {
          clients: {
            total: totalClients,
            active: activeClients,
          },
          assessments: {
            total: totalAssessments,
            completed: completedAssessments,
          },
          workouts: {
            total: totalWorkouts,
          },
          lessons: {
            total: totalLessons,
            completed: completedLessons,
          },
        },
        trainers: trainerMetrics,
        alerts,
      },
    })
  } catch (error) {
    console.error('Get metrics error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar métricas' },
      { status: 500 }
    )
  }
}
