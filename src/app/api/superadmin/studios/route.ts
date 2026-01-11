// ============================================================================
// EXPERT TRAINING - SUPERADMIN STUDIOS API
// ============================================================================
// GET /api/superadmin/studios - Lista studios
// POST /api/superadmin/studios - Cria studio
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'

// Validation schema
const createStudioSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: z.string().min(1, 'Slug é obrigatório').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  planId: z.string().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).default('ACTIVE'),
  adminEmail: z.string().email('Email inválido'),
  adminPassword: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional(),
})

// Middleware to check superadmin
async function verifySuperAdmin(request: NextRequest) {
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

// GET - List studios with usage metrics
export async function GET(request: NextRequest) {
  const auth = await verifySuperAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')

    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    if (status) {
      where.status = status
    }

    const total = await prisma.studio.count({ where })

    // Get current month start for lessons count
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const studios = await prisma.studio.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        plan: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            users: true,
            clients: true,
          },
        },
      },
    })

    // Enrich with usage metrics
    const enrichedStudios = await Promise.all(
      studios.map(async (studio: typeof studios[0]) => {
        // Count lessons this month
        const lessonsThisMonth = await prisma.lesson.count({
          where: {
            studioId: studio.id,
            startedAt: { gte: monthStart },
          },
        })

        // Get last activity (last lesson or last assessment)
        const lastLesson = await prisma.lesson.findFirst({
          where: { studioId: studio.id },
          orderBy: { startedAt: 'desc' },
          select: { startedAt: true },
        })

        const lastAssessment = await prisma.assessment.findFirst({
          where: { client: { studioId: studio.id } },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        })

        const lastActivity = [lastLesson?.startedAt, lastAssessment?.createdAt]
          .filter(Boolean)
          .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] || null

        return {
          ...studio,
          lessonsThisMonth,
          lastActivity,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        items: enrichedStudios,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('List studios error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Create studio
export async function POST(request: NextRequest) {
  const auth = await verifySuperAdmin(request)
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const validation = createStudioSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, slug, planId, status, adminEmail, adminPassword } = validation.data

    // Check if slug already exists
    const existingStudio = await prisma.studio.findUnique({
      where: { slug },
    })

    if (existingStudio) {
      return NextResponse.json(
        { success: false, error: 'Slug já está em uso' },
        { status: 400 }
      )
    }

    // Check if user with email already exists
    let user = await prisma.user.findUnique({
      where: { email: adminEmail },
    })

    let userWasCreated = false

    // If user doesn't exist, create it (password is required)
    if (!user) {
      if (!adminPassword) {
        return NextResponse.json(
          { success: false, error: 'Senha é obrigatória para novo usuário' },
          { status: 400 }
        )
      }

      const passwordHash = await bcrypt.hash(adminPassword, 10)
      
      user = await prisma.user.create({
        data: {
          name: name, // Use studio name as initial user name
          email: adminEmail,
          passwordHash,
          isSuperAdmin: false,
        },
      })

      userWasCreated = true
    }

    // Create studio
    const studio = await prisma.studio.create({
      data: {
        name,
        slug,
        planId: planId || null,
        status,
      },
    })

    // Link user to studio as STUDIO_ADMIN
    await prisma.userStudio.create({
      data: {
        userId: user.id,
        studioId: studio.id,
        role: 'STUDIO_ADMIN',
      },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'CREATE',
        entity: 'Studio',
        entityId: studio.id,
        metadata: {
          adminEmail,
          userCreated: userWasCreated,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        studio,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          wasCreated: userWasCreated,
        },
      },
    })
  } catch (error) {
    console.error('Create studio error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
