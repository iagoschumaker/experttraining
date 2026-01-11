// ============================================================================
// EXPERT TRAINING - SUPERADMIN BLOCKS API (DADOS PROTEGIDOS DO MÉTODO)
// ============================================================================
// GET /api/superadmin/blocks - Lista blocos de exercícios
// POST /api/superadmin/blocks - Cria bloco (apenas SuperAdmin)
// ⚠️ REGRA: Blocos são CORE DATA do Método Expert Training
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'

// Validation schema atualizado com campos do método
const createBlockSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  level: z.number().min(0).max(3).default(1),
  levelName: z.string().optional(),
  primaryCapacity: z.string().min(1, 'Capacidade primária é obrigatória'),
  secondaryCapacities: z.array(z.string()).default([]),
  complexity: z.number().min(1).max(5).default(1),
  impact: z.number().min(1).max(5).default(1),
  movementPattern: z.string().optional(),
  riskLevel: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).default('LOW'),
  suggestedFrequency: z.number().optional(),
  estimatedDuration: z.number().optional(),
  blockOrder: z.number().optional(),
  blockedIf: z.array(z.string()).default([]),
  allowedIf: z.array(z.string()).default([]),
  exercises: z.any().default([]),
  isLocked: z.boolean().default(true), // Por padrão, blocos são protegidos
  isActive: z.boolean().default(true),
})

// Middleware to check superadmin
async function verifySuperAdmin() {
  const accessToken = await getAccessTokenCookie()
  
  if (!accessToken) {
    return { error: 'Não autenticado', status: 401 }
  }

  const payload = verifyAccessToken(accessToken)
  
  if (!payload || !payload.isSuperAdmin) {
    return { error: 'Acesso negado - Apenas SuperAdmin pode gerenciar blocos', status: 403 }
  }

  return { payload }
}

// GET - List blocks
export async function GET(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const level = searchParams.get('level')
    const primaryCapacity = searchParams.get('primaryCapacity')
    const onlyLocked = searchParams.get('locked') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')

    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    if (level !== null && level !== '') {
      where.level = parseInt(level)
    }

    if (primaryCapacity) {
      where.primaryCapacity = primaryCapacity
    }

    if (onlyLocked) {
      where.isLocked = true
    }

    const total = await prisma.block.count({ where })

    const blocks = await prisma.block.findMany({
      where,
      orderBy: [{ level: 'asc' }, { blockOrder: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: { exercisesList: true }
        }
      }
    })

    // Agrupar por nível para visualização
    type BlockType = typeof blocks[number]
    const groupedByLevel = {
      CONDICIONAMENTO: blocks.filter((b: BlockType) => b.level === 0),
      INICIANTE: blocks.filter((b: BlockType) => b.level === 1),
      INTERMEDIARIO: blocks.filter((b: BlockType) => b.level === 2),
      AVANCADO: blocks.filter((b: BlockType) => b.level === 3),
    }

    // Stats
    const stats = {
      total,
      locked: blocks.filter((b: BlockType) => b.isLocked).length,
      byLevel: {
        CONDICIONAMENTO: groupedByLevel.CONDICIONAMENTO.length,
        INICIANTE: groupedByLevel.INICIANTE.length,
        INTERMEDIARIO: groupedByLevel.INTERMEDIARIO.length,
        AVANCADO: groupedByLevel.AVANCADO.length,
      },
    }

    // Get distinct capacities for filter
    const capacities = await prisma.block.groupBy({
      by: ['primaryCapacity'],
      orderBy: { primaryCapacity: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: {
        items: blocks,
        groupedByLevel,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        capacities: capacities.map((c: { primaryCapacity: string }) => c.primaryCapacity),
        stats,
      },
    })
  } catch (error) {
    console.error('List blocks error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Create block (apenas SuperAdmin)
export async function POST(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const validation = createBlockSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const data = validation.data

    // Verificar se código já existe
    const existing = await prisma.block.findUnique({ where: { code: data.code } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Código de bloco já existe' },
        { status: 409 }
      )
    }

    const block = await prisma.block.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        level: data.level,
        levelName: data.levelName,
        primaryCapacity: data.primaryCapacity,
        secondaryCapacities: data.secondaryCapacities,
        complexity: data.complexity,
        impact: data.impact,
        movementPattern: data.movementPattern,
        riskLevel: data.riskLevel,
        suggestedFrequency: data.suggestedFrequency,
        estimatedDuration: data.estimatedDuration,
        blockOrder: data.blockOrder,
        blockedIf: data.blockedIf,
        allowedIf: data.allowedIf,
        exercises: data.exercises,
        isLocked: data.isLocked,
        createdBy: 'SUPERADMIN',
        isActive: data.isActive,
      },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'CREATE',
        entity: 'Block',
        entityId: block.id,
        newData: block as any,
      },
    })

    return NextResponse.json({
      success: true,
      data: block,
      message: 'Bloco criado com sucesso',
    })
  } catch (error) {
    console.error('Create block error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
