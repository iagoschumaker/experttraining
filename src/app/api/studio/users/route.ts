// ============================================================================
// EXPERT TRAINING - STUDIO USERS API
// ============================================================================
// GET /api/studio/users - List studio users (trainers)
// POST /api/studio/users - Create/invite trainer
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

// Validation schema
const createUserSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres').optional(),
  role: z.enum(['STUDIO_ADMIN', 'TRAINER']).default('TRAINER'),
})

// GET - List users of studio
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')

    const where: any = {
      studioId: auth.payload.studioId,
    }

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
    }

    const total = await prisma.userStudio.count({ where })

    const users = await prisma.userStudio.findMany({
      where,
      orderBy: { joinedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            isSuperAdmin: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        items: users.map((us: any) => ({
          id: us.id,
          userId: us.user.id,
          name: us.user.name,
          email: us.user.email,
          role: us.role,
          isActive: us.isActive && us.user.isActive,
          isSuperAdmin: us.user.isSuperAdmin,
          joinedAt: us.joinedAt,
        })),
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

// POST - Create/invite user to studio
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN'])
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

    const { name, email, password, role } = validation.data
    
    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase().trim()

    // Check if user with email already exists
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    let userWasCreated = false

    // If user doesn't exist, create it (password is required)
    if (!user) {
      if (!password) {
        return NextResponse.json(
          { success: false, error: 'Senha é obrigatória para novo usuário' },
          { status: 400 }
        )
      }

      const passwordHash = await bcrypt.hash(password, 10)
      
      user = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
          isSuperAdmin: false,
        },
      })

      userWasCreated = true
    } else {
      // User exists - if password provided, update it (useful for re-adding removed users)
      if (password) {
        const passwordHash = await bcrypt.hash(password, 10)
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash, name }, // Also update name if different
        })
      }
    }

    // Check if user is already linked to this studio
    const existingLink = await prisma.userStudio.findFirst({
      where: {
        userId: user.id,
        studioId: auth.payload.studioId,
      },
    })

    if (existingLink) {
      // If link exists but is inactive, reactivate it
      if (!existingLink.isActive) {
        const reactivatedLink = await prisma.userStudio.update({
          where: { id: existingLink.id },
          data: { isActive: true, role },
        })
        
        return NextResponse.json({
          success: true,
          data: {
            id: reactivatedLink.id,
            userId: user.id,
            name: user.name,
            email: user.email,
            role: reactivatedLink.role,
            wasReactivated: true,
          },
        })
      }
      
      return NextResponse.json(
        { success: false, error: 'Usuário já está vinculado a este studio' },
        { status: 400 }
      )
    }

    // Link user to studio
    const userStudio = await prisma.userStudio.create({
      data: {
        userId: user.id,
        studioId: auth.payload.studioId,
        role,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: userStudio.id,
        userId: user.id,
        name: user.name,
        email: user.email,
        role: userStudio.role,
        wasCreated: userWasCreated,
      },
    })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
