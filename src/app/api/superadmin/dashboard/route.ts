// ============================================================================
// EXPERT TRAINING - SUPERADMIN DASHBOARD API
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
      totalBlocks,
      activeBlocks,
      totalRules,
      activeRules,
      totalPlans,
      totalClients,
      recentStudios,
      recentUsers,
    ] = await Promise.all([
      prisma.studio.count(),
      prisma.studio.count({ where: { status: 'ACTIVE' } }),
      prisma.studio.count({ where: { status: 'SUSPENDED' } }),
      prisma.user.count(),
      prisma.user.count({ where: { isSuperAdmin: true } }),
      prisma.block.count(),
      prisma.block.count({ where: { isActive: true } }),
      prisma.rule.count(),
      prisma.rule.count({ where: { isActive: true } }),
      prisma.plan.count(),
      prisma.client.count(),
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

    // Calculate monthly revenue - simplified for now
    // TODO: Implement proper usage-based revenue calculation
    const monthlyRevenue = 0 // Will be calculated from actual usage records

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
          totalBlocks,
          activeBlocks,
          totalRules,
          activeRules,
          totalPlans,
          totalClients,
          monthlyRevenue,
        },
        suspendedStudiosList,
        recentStudios,
        recentUsers,
        systemStatus: {
          decisionEngine: activeRules > 0 ? 'operational' : 'no_rules',
          blocks: activeBlocks > 0 ? 'operational' : 'no_blocks',
        },
      },
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json({ success: false, error: 'Erro interno do servidor' }, { status: 500 })
  }
}
