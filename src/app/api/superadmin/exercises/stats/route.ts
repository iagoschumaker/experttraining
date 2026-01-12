// ============================================================================
// EXPERT TRAINING - EXERCISE STATISTICS API
// ============================================================================
// GET /api/superadmin/exercises/stats - Estatísticas avançadas de exercícios
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySuperAdmin } from '@/lib/auth/protection'

export async function GET(request: NextRequest) {
  try {
    const adminPayload = await verifySuperAdmin()
    if (!adminPayload) {
      return NextResponse.json({ success: false, error: 'Acesso não autorizado' }, { status: 403 })
    }

    // Contar totais
    const total = await prisma.exercise.count({ where: { isActive: true } })
    const withVideo = await prisma.exercise.count({ 
      where: { isActive: true, NOT: { videoUrl: null } } 
    })
    const withBlock = await prisma.exercise.count({ 
      where: { isActive: true, NOT: { blockId: null } } 
    })
    const orphans = await prisma.exercise.count({ 
      where: { isActive: true, blockId: null } 
    })

    // Por dificuldade
    const byDifficulty = {
      beginner: await prisma.exercise.count({ 
        where: { isActive: true, difficulty: 'BEGINNER' } 
      }),
      intermediate: await prisma.exercise.count({ 
        where: { isActive: true, difficulty: 'INTERMEDIATE' } 
      }),
      advanced: await prisma.exercise.count({ 
        where: { isActive: true, difficulty: 'ADVANCED' } 
      }),
    }

    // Por capacidade física (novo campo - pode estar vazio)
    const exercisesWithCapacity = await prisma.exercise.groupBy({
      by: ['type'], // Temporariamente usando 'type' como proxy
      where: { isActive: true, NOT: { type: null } },
      _count: true,
    })
    
    const byCapacity: Record<string, number> = {}
    exercisesWithCapacity.forEach((item: any) => {
      byCapacity[item.type] = item._count
    })

    // Por padrão de movimento (novo campo - pode estar vazio)
    const exercisesWithPattern = await prisma.exercise.groupBy({
      by: ['muscleGroup'], // Temporariamente usando 'muscleGroup' como proxy
      where: { isActive: true, NOT: { muscleGroup: null } },
      _count: true,
    })
    
    const byPattern: Record<string, number> = {}
    exercisesWithPattern.forEach((item: any) => {
      byPattern[item.muscleGroup] = item._count
    })

    // Uso médio por exercício em blocos
    const exercisesWithBlockCount = await prisma.exercise.findMany({
      where: { isActive: true, NOT: { blockId: null } },
      select: { id: true, blockId: true },
    })
    
    const avgUsagePerExercise = exercisesWithBlockCount.length > 0 
      ? (exercisesWithBlockCount.length / withBlock) 
      : 0

    // Exercícios mais usados (por bloco)
    const exerciseBlockCounts = exercisesWithBlockCount.reduce((acc: any, ex: any) => {
      acc[ex.id] = (acc[ex.id] || 0) + 1
      return acc
    }, {})

    const topExerciseIds = Object.entries(exerciseBlockCounts)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 10)
      .map(([id]) => id)

    const mostUsedInBlocks = await prisma.exercise.findMany({
      where: { id: { in: topExerciseIds } },
      select: {
        id: true,
        name: true,
        block: {
          select: {
            id: true,
            name: true,
            code: true,
            level: true,
            primaryCapacity: true,
          },
        },
      },
    })

    const mostUsedWithCount = mostUsedInBlocks.map((ex: any) => ({
      exerciseId: ex.id,
      name: ex.name,
      blockCount: exerciseBlockCounts[ex.id] || 0,
      blocks: ex.block ? [ex.block] : [],
    }))

    return NextResponse.json({
      success: true,
      data: {
        total,
        withVideo,
        withBlock,
        orphans,
        byDifficulty,
        byCapacity,
        byPattern,
        avgUsagePerExercise: parseFloat(avgUsagePerExercise.toFixed(2)),
        mostUsedInBlocks: mostUsedWithCount,
      },
    })
  } catch (error) {
    console.error('Exercise stats error:', error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}
