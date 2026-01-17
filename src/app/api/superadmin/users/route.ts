// ============================================================================
// EXPERT PRO TRAINING - SUPERADMIN USERS API
// ============================================================================
// GET /api/superadmin/users - Lista usuários
// POST /api/superadmin/users - Cria usuário
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie, hashPassword } from '@/lib/auth'

// Validation schema
const createUserSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  isSuperAdmin: z.boolean().default(false),
  studioAssignments: z.array(z.object({
    studioId: z.string(),
    role: z.enum(['STUDIO_ADMIN', 'TRAINER']),
  })).optional(),
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

// GET - List users
export async function GET(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const isSuperAdmin = searchParams.get('isSuperAdmin')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    if (isSuperAdmin !== null && isSuperAdmin !== undefined) {
      where.isSuperAdmin = isSuperAdmin === 'true'
    }

    const total = await prisma.user.count({ where })

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        createdAt: true,
        studios: {
          include: {
            studio: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        items: users,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('List users error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Create user
export async function POST(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const validation = createUserSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, email, password, isSuperAdmin, studioAssignments } = validation.data

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email já está em uso' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user with studio assignments
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        isSuperAdmin,
        studios: studioAssignments?.length
          ? {
              create: studioAssignments.map((assignment) => ({
                studioId: assignment.studioId,
                role: assignment.role,
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        createdAt: true,
        studios: {
          include: {
            studio: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'CREATE',
        entity: 'User',
        entityId: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
