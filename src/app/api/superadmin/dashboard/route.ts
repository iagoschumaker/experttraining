// ============================================================================
// EXPERT PRO TRAINING - SUPERADMIN DASHBOARD API
// ============================================================================

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySuperAdmin } from '@/lib/auth'

// GET - Dashboard Stats
export async function GET() {
  try {
    const adminPayload = await verifySuperAdmin()
    if (!adminPayload) {
      return NextResponse.json({ success: false, error: 'Acesso não autorizado' }, { status: 403 })
    }

    // Fetch all stats in parallel
    const [
      totalStudios,
      activeStudios,
      suspendedStudios,
      totalUsers,
      superAdminUsers,
      totalPlans,
      totalClients,
      totalWorkouts,
      activeWorkouts,
      totalAssessments,
      recentStudios,
      recentUsers,
    ] = await Promise.all([
      prisma.studio.count(),
      prisma.studio.count({ where: { status: 'ACTIVE' } }),
      prisma.studio.count({ where: { status: 'SUSPENDED' } }),
      prisma.user.count(),
      prisma.user.count({ where: { isSuperAdmin: true } }),
      prisma.plan.count(),
      prisma.client.count(),
      prisma.workout.count(),
      prisma.workout.count({ where: { isActive: true } }),
      prisma.assessment.count(),
      prisma.studio.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, status: true, createdAt: true },
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, createdAt: true },
      }),
    ])

    // Get suspended studios list
    const suspendedStudiosList = await prisma.studio.findMany({
      where: { status: 'SUSPENDED' },
      select: { id: true, name: true, slug: true, createdAt: true },
      take: 10,
    })

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalStudios,
          activeStudios,
          suspendedStudios,
          totalUsers,
          superAdminUsers,
          regularUsers: totalUsers - superAdminUsers,
          totalPlans,
          totalClients,
          totalWorkouts,
          activeWorkouts,
          totalAssessments,
        },
        suspendedStudiosList,
        recentStudios,
        recentUsers,
        systemStatus: {
          phaseEngine: 'operational',
          totalPhases: 19,
        },
      },
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
