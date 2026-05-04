// ============================================================================
// EXPERT PRO TRAINING - STUDIO DASHBOARD API
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

// GET - Dashboard Stats
export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth()
    if ('error' in payload) {
      return NextResponse.json({ success: false, error: payload.error }, { status: payload.status })
    }

    const studioId = payload.studioId

    // Fetch all stats in parallel
    const [
      totalClients,
      activeClients,
      totalAssessments,
      totalWorkouts,
      recentClients,
      recentAssessments,
      clientsByGoal,
    ] = await Promise.all([
      prisma.client.count({ where: { studioId, status: 'ACTIVE' } }),
      prisma.client.count({ where: { studioId, status: 'ACTIVE' } }),
      prisma.assessment.count({ where: { client: { studioId, status: 'ACTIVE' } } }),
      prisma.workout.count({ where: { client: { studioId, status: 'ACTIVE' } } }),
      prisma.client.findMany({
        where: { studioId, status: 'ACTIVE' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, status: true, createdAt: true },
      }),
      prisma.assessment.findMany({
        where: { client: { studioId } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { client: { select: { name: true } } },
      }),
      prisma.client.groupBy({
        by: ['goal'],
        where: { studioId, status: 'ACTIVE' },
        _count: { goal: true },
      }),
    ])

    // Get pending workouts (no end date or end date in the future)
    const activeWorkouts = await prisma.workout.count({
      where: {
        client: { studioId, status: 'ACTIVE' },
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
    })

    // ========================================================================
    // ALERTAS DE REAVALIAÇÃO — REGRA DE 61 DIAS
    // ========================================================================
    const clientsWithAssessments = await prisma.client.findMany({
      where: { studioId, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        assessments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    })

    const now = new Date()
    const reassessmentAlerts = clientsWithAssessments
      .filter(client => {
        if (client.assessments.length === 0) return false // no assessments, no alert
        const lastDate = new Date(client.assessments[0].createdAt)
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays >= 61
      })
      .map(client => ({
        clientId: client.id,
        clientName: client.name,
        lastAssessmentDate: client.assessments[0]?.createdAt || null,
        daysSinceLastAssessment: Math.floor((now.getTime() - new Date(client.assessments[0].createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      }))

    // ========================================================================
    // ANIVERSARIANTES DO DIA E DO MÊS
    // ========================================================================
    const allClientsForBirthday = await prisma.client.findMany({
      where: { studioId, status: 'ACTIVE', birthDate: { not: null } },
      select: { id: true, name: true, birthDate: true },
    })

    // Obter dia/mês/ano atual no fuso do Brasil (independente do fuso do VPS)
    const spFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    })
    const [spMonthStr, spDayStr, spYearStr] = spFormatter.format(new Date()).split('/')
    const todayDay = parseInt(spDayStr, 10)
    const todayMonth = parseInt(spMonthStr, 10) - 1
    const currentYear = parseInt(spYearStr, 10)
    
    // Data "zerada" para os cálculos de diffDays (em tempo local do servidor, mas com os valores do Brasil)
    const today = new Date(currentYear, todayMonth, todayDay)

    const birthdaysToday = allClientsForBirthday.filter(c => {
      if (!c.birthDate) return false
      const bd = new Date(c.birthDate)
      return bd.getUTCDate() === todayDay && bd.getUTCMonth() === todayMonth
    }).map(c => ({
      id: c.id,
      name: c.name,
      birthDate: c.birthDate,
    }))

    // Upcoming birthdays (next 30 days)
    const upcomingBirthdays = allClientsForBirthday.filter(c => {
      if (!c.birthDate) return false
      const bd = new Date(c.birthDate)
      const thisYearBd = new Date(currentYear, bd.getUTCMonth(), bd.getUTCDate())
      if (thisYearBd < today) thisYearBd.setFullYear(currentYear + 1)
      const diffDays = Math.round((thisYearBd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 30
    }).map(c => {
      const bd = new Date(c.birthDate!)
      const thisYearBd = new Date(currentYear, bd.getUTCMonth(), bd.getUTCDate())
      if (thisYearBd < today) thisYearBd.setFullYear(currentYear + 1)
      const daysUntil = Math.round((thisYearBd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const age = currentYear - bd.getUTCFullYear() + (daysUntil === 0 ? 0 : (thisYearBd.getFullYear() > currentYear ? 0 : -1))
      return { id: c.id, name: c.name, birthDate: c.birthDate, daysUntil, age: age + 1 }
    }).sort((a, b) => a.daysUntil - b.daysUntil)

    // Format goals distribution
    const goalsDistribution = clientsByGoal.map((g: any) => ({
      goal: g.goal || 'Não definido',
      count: g._count.goal,
    }))

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalClients,
          activeClients,
          inactiveClients: totalClients - activeClients,
          totalAssessments,
          totalWorkouts,
          activeWorkouts,
          pendingReassessments: reassessmentAlerts.length,
        },
        recentClients,
        recentAssessments: recentAssessments.map((a: any) => ({
          id: a.id,
          clientName: a.client.name,
          createdAt: a.createdAt,
          type: a.type,
        })),
        goalsDistribution,
        reassessmentAlerts,
        birthdaysToday,
        upcomingBirthdays,
      },
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
