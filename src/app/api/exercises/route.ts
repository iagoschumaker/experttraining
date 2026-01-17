// ============================================================================
// EXPERT PRO TRAINING - EXERCISES LIBRARY API
// ============================================================================
// API para gerenciamento de exercícios do método EXPERT PRO TRAINING
// GET - Lista exercícios (todos os usuários autenticados)
// POST - Criar exercício (apenas SuperAdmin)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth, verifySuperAdmin } from '@/lib/auth/protection'
import { z } from 'zod'

// Schema completo para exercícios
const exerciseSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  type: z.string().optional(), // Cardio, Força, Mobilidade, Potência, etc.
  muscleGroup: z.string().optional(),
  equipment: z.string().optional(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  
  // Prescrição padrão (método EXPERT PRO TRAINING)
  defaultSets: z.number().min(1).max(10).optional(),
  defaultReps: z.string().optional(), // "10-12", "30s", "AMRAP"
  defaultTime: z.string().optional(), // "30s", "1min"
  defaultRest: z.string().optional(), // "30s", "1min"
  
  // Notas técnicas e instruções
  technicalNotes: z.string().optional(),
  instructions: z.string().optional(),
  videoUrl: z.string().url().optional().nullable(),
  
  // Ordenação dentro do bloco
  orderInBlock: z.number().optional(),
  
  // Bloco relacionado
  blockId: z.string().optional().nullable(),
  
  // Status
  isActive: z.boolean().default(true),
})

// GET - List exercises
export async function GET(request: NextRequest) {
  try {
    const payload = await verifyAuth()
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const muscleGroup = searchParams.get('muscleGroup') || ''
    const blockId = searchParams.get('blockId') || ''
    const type = searchParams.get('type') || ''
    const difficulty = searchParams.get('difficulty') || ''
    const onlyOrphans = searchParams.get('orphans') === 'true' // Exercícios sem bloco

    const where: any = { isActive: true }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { technicalNotes: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (muscleGroup) where.muscleGroup = muscleGroup
    if (blockId) where.blockId = blockId
    if (type) where.type = type
    if (difficulty) where.difficulty = difficulty
    if (onlyOrphans) where.blockId = null

    const [items, total, muscleGroups, types, blocks] = await Promise.all([
      prisma.exercise.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ orderInBlock: 'asc' }, { name: 'asc' }],
        include: { 
          block: { 
            select: { 
              id: true, 
              name: true, 
              code: true,
              primaryCapacity: true, 
              level: true,
              levelName: true,
            } 
          } 
        },
      }),
      prisma.exercise.count({ where }),
      prisma.exercise.findMany({
        where: { isActive: true },
        select: { muscleGroup: true },
        distinct: ['muscleGroup'],
      }),
      prisma.exercise.findMany({
        where: { isActive: true },
        select: { type: true },
        distinct: ['type'],
      }),
      prisma.block.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true, level: true },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
      }),
    ])

    // Estatísticas
    const stats = {
      total: await prisma.exercise.count({ where: { isActive: true } }),
      withVideo: await prisma.exercise.count({ where: { isActive: true, NOT: { videoUrl: null } } }),
      withBlock: await prisma.exercise.count({ where: { isActive: true, NOT: { blockId: null } } }),
      orphans: await prisma.exercise.count({ where: { isActive: true, blockId: null } }),
      byDifficulty: {
        beginner: await prisma.exercise.count({ where: { isActive: true, difficulty: 'BEGINNER' } }),
        intermediate: await prisma.exercise.count({ where: { isActive: true, difficulty: 'INTERMEDIATE' } }),
        advanced: await prisma.exercise.count({ where: { isActive: true, difficulty: 'ADVANCED' } }),
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        muscleGroups: muscleGroups.map((m: any) => m.muscleGroup).filter(Boolean),
        types: types.map((t: any) => t.type).filter(Boolean),
        blocks,
        stats,
      },
    })
  } catch (error) {
    console.error('Exercises API error:', error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

// POST - Create exercise (SuperAdmin only)
export async function POST(request: NextRequest) {
  try {
    const adminPayload = await verifySuperAdmin()
    if (!adminPayload) {
      return NextResponse.json({ success: false, error: 'Acesso não autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const validation = exerciseSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message, details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    // Se tem blockId, verificar se bloco existe
    if (data.blockId) {
      const block = await prisma.block.findUnique({ where: { id: data.blockId } })
      if (!block) {
        return NextResponse.json({ success: false, error: 'Bloco não encontrado' }, { status: 404 })
      }
    }

    const exercise = await prisma.exercise.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        muscleGroup: data.muscleGroup,
        equipment: data.equipment,
        difficulty: data.difficulty,
        defaultSets: data.defaultSets,
        defaultReps: data.defaultReps,
        defaultTime: data.defaultTime,
        defaultRest: data.defaultRest,
        technicalNotes: data.technicalNotes,
        instructions: data.instructions,
        videoUrl: data.videoUrl,
        orderInBlock: data.orderInBlock,
        blockId: data.blockId || null,
        isActive: data.isActive,
        isLocked: true,
        createdBy: 'SUPERADMIN',
      },
      include: {
        block: { select: { id: true, name: true, code: true } },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: adminPayload.userId,
        action: 'CREATE',
        entity: 'Exercise',
        entityId: exercise.id,
      },
    })

    return NextResponse.json({ success: true, data: exercise }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Dados inválidos', details: error.errors }, { status: 400 })
    }
    console.error('Create exercise error:', error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
