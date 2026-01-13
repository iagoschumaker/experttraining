// ============================================================================
// EXPERT TRAINING - SUPERADMIN STUDIO BY ID API
// ============================================================================
// GET /api/superadmin/studios/[id] - Get studio details
// PUT /api/superadmin/studios/[id] - Update studio
// DELETE /api/superadmin/studios/[id] - Delete studio
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'

// Validation schema
const updateStudioSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  planId: z.string().min(1, 'Plano é obrigatório').optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  resetPassword: z.boolean().optional(),
  adminUserId: z.string().optional(),
  newPassword: z.string().min(6).optional(),
})

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

// GET - Get studio by ID with full metrics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const studio = await prisma.studio.findUnique({
      where: { id: params.id },
      include: {
        plan: true,
        users: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: {
            clients: true,
            users: true,
          },
        },
      },
    })

    if (!studio) {
      return NextResponse.json(
        { success: false, error: 'Studio não encontrado' },
        { status: 404 }
      )
    }

    // Calculate usage metrics
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [
      totalLessons,
      lessonsThisMonth,
      completedLessons,
      totalAssessments,
      assessmentsThisMonth,
      activeClients,
      activeTrainers,
      totalTrainersOnly,
    ] = await Promise.all([
      // Total lessons ever
      prisma.lesson.count({ where: { studioId: studio.id } }),
      // Lessons this month
      prisma.lesson.count({
        where: {
          studioId: studio.id,
          startedAt: { gte: monthStart },
        },
      }),
      // Completed lessons
      prisma.lesson.count({
        where: {
          studioId: studio.id,
          status: 'COMPLETED',
        },
      }),
      // Total assessments
      prisma.assessment.count({
        where: { client: { studioId: studio.id } },
      }),
      // Assessments this month
      prisma.assessment.count({
        where: {
          client: { studioId: studio.id },
          createdAt: { gte: monthStart },
        },
      }),
      // Active clients
      prisma.client.count({
        where: {
          studioId: studio.id,
          status: 'ACTIVE',
        },
      }),
      // Active trainers (apenas TRAINER, não STUDIO_ADMIN)
      prisma.userStudio.count({
        where: {
          studioId: studio.id,
          isActive: true,
          role: 'TRAINER',
        },
      }),
      // Total trainers cadastrados (apenas TRAINER, não STUDIO_ADMIN)
      prisma.userStudio.count({
        where: {
          studioId: studio.id,
          role: 'TRAINER',
        },
      }),
    ])

    // Calculate average usage frequency (lessons per week this month)
    const weeksInMonth = Math.ceil((new Date().getDate()) / 7)
    const avgLessonsPerWeek = weeksInMonth > 0 ? (lessonsThisMonth / weeksInMonth).toFixed(1) : 0

    // Get last activity
    const lastLesson = await prisma.lesson.findFirst({
      where: { studioId: studio.id },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true },
    })

    // Generate alerts
    const alerts: string[] = []
    
    // Alert: many clients but few lessons
    if (studio._count.clients > 20 && lessonsThisMonth < 10) {
      alerts.push(`Studio com ${studio._count.clients} alunos e apenas ${lessonsThisMonth} aulas no mês`)
    }
    
    // Alert: no assessments this month
    if (assessmentsThisMonth === 0 && studio._count.clients > 0) {
      alerts.push('Nenhuma avaliação realizada este mês')
    }
    
    // Alert: studio inactive
    if (lessonsThisMonth === 0 && studio._count.clients > 0) {
      alerts.push('Studio sem aulas registradas no mês')
    }

    return NextResponse.json({
      success: true,
      data: {
        ...studio,
        plan: studio.plan ? {
          ...studio.plan,
          pricePerTrainer: Number(studio.plan.pricePerTrainer)
        } : null,
        metrics: {
          totalLessons,
          lessonsThisMonth,
          completedLessons,
          totalAssessments,
          assessmentsThisMonth,
          totalClients: studio._count.clients,
          activeClients,
          totalTrainers: totalTrainersOnly,
          activeTrainers,
          avgLessonsPerWeek: parseFloat(avgLessonsPerWeek as string),
          lastActivity: lastLesson?.startedAt || null,
        },
        alerts,
      },
    })
  } catch (error) {
    console.error('Get studio error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Update studio
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const existingStudio = await prisma.studio.findUnique({
      where: { id: params.id },
    })

    if (!existingStudio) {
      return NextResponse.json(
        { success: false, error: 'Studio não encontrado' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validation = updateStudioSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, slug, planId, status, resetPassword, adminUserId, newPassword } = validation.data

    // Check slug uniqueness if changing
    if (slug && slug !== existingStudio.slug) {
      const slugExists = await prisma.studio.findUnique({
        where: { slug },
      })
      if (slugExists) {
        return NextResponse.json(
          { success: false, error: 'Slug já está em uso' },
          { status: 400 }
        )
      }
    }

    // Update studio data
    const studio = await prisma.studio.update({
      where: { id: params.id },
      data: {
        name,
        slug,
        planId,
        status,
      },
    })

    // Reset password if requested
    let passwordReset = false
    if (resetPassword && adminUserId && newPassword) {
      // Verify that the user is actually an admin of this studio
      const userStudio = await prisma.userStudio.findFirst({
        where: {
          userId: adminUserId,
          studioId: params.id,
          role: 'STUDIO_ADMIN',
        },
      })

      if (!userStudio) {
        return NextResponse.json(
          { success: false, error: 'Usuário não é administrador deste studio' },
          { status: 400 }
        )
      }

      // Update user password
      const passwordHash = await bcrypt.hash(newPassword, 10)
      await prisma.user.update({
        where: { id: adminUserId },
        data: { passwordHash },
      })

      passwordReset = true
    }

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'UPDATE',
        entity: 'Studio',
        entityId: studio.id,
        metadata: {
          passwordReset,
          adminUserId: passwordReset ? adminUserId : undefined,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        studio,
        passwordReset,
      },
    })
  } catch (error) {
    console.error('Update studio error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Delete studio
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const studio = await prisma.studio.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { clients: true, users: true },
        },
      },
    })

    if (!studio) {
      return NextResponse.json(
        { success: false, error: 'Studio não encontrado' },
        { status: 404 }
      )
    }

    // Check if studio has data
    if (studio._count.clients > 0 || studio._count.users > 0) {
      return NextResponse.json(
        { success: false, error: 'Studio possui dados associados. Desative-o em vez de excluir.' },
        { status: 400 }
      )
    }

    await prisma.studio.delete({
      where: { id: params.id },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'DELETE',
        entity: 'Studio',
        entityId: params.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Studio excluído com sucesso',
    })
  } catch (error) {
    console.error('Delete studio error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
