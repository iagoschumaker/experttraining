import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const token = await getAccessTokenCookie()
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyAccessToken(token)
    if (!payload || !payload.isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const studios = await prisma.studio.findMany({
      include: {
        plan: true,
        users: {
          where: {
            role: 'TRAINER',
            isActive: true,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
        },
      },
    })

    const studioStats = {
      ACTIVE: 0,
      SUSPENDED: 0,
      GRACE_PERIOD: 0,
      CANCELED: 0,
    }

    const studiosForBilling = studios.map((studio) => {
      // Update stats
      if (studio.status in studioStats) {
        studioStats[studio.status as keyof typeof studioStats]++
      }

      // Count active trainers (filter by user isActive as well)
      const activeTrainers = studio.users.filter(
        (us) => us.user.isActive
      ).length
      const pricePerTrainer = studio.plan?.pricePerTrainer ? Number(studio.plan.pricePerTrainer) : 0
      const estimatedBilling = activeTrainers * pricePerTrainer

      return {
        id: studio.id,
        name: studio.name,
        status: studio.status,
        plan: studio.plan
          ? {
              name: studio.plan.name,
              pricePerTrainer: Number(studio.plan.pricePerTrainer),
            }
          : null,
        activeTrainers,
        estimatedBilling,
      }
    })

    // Sort studios by estimated billing, descending
    studiosForBilling.sort((a, b) => b.estimatedBilling - a.estimatedBilling)

    const responseData = {
      stats: studioStats,
      studios: studiosForBilling,
    }

    return NextResponse.json({ success: true, data: responseData })
  } catch (error) {
    console.error('Error fetching billing data:', error)
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 },
    )
  }
}
