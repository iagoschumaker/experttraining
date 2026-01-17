// ============================================================================
// EXPERT PRO TRAINING - SUPERADMIN HIERARCHY API
// ============================================================================
// GET /api/superadmin/hierarchy - Lista hierarquia (níveis, capacidades, padrões)
// POST /api/superadmin/hierarchy - Cria item de hierarquia
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'

// Middleware to check superadmin
async function verifySuperAdmin() {
  const accessToken = await getAccessTokenCookie()
  
  if (!accessToken) {
    return { error: 'Não autenticado', status: 401 }
  }

  const payload = verifyAccessToken(accessToken)
  
  if (!payload || !payload.isSuperAdmin) {
    return { error: 'Acesso negado - Apenas SuperAdmin', status: 403 }
  }

  return { payload }
}

// GET - List hierarchy data
export async function GET(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    // Buscar níveis (usando blocks como base)
    const levels = await prisma.block.groupBy({
      by: ['level'],
      _count: {
        id: true,
      },
      orderBy: {
        level: 'asc',
      },
    })

    const hierarchyLevels = levels.map((l) => ({
      id: `level-${l.level}`,
      level: l.level,
      name: l.level === 0 ? 'Condicionamento' : l.level === 1 ? 'Iniciante' : l.level === 2 ? 'Intermediário' : 'Avançado',
      description: `Nível ${l.level} do Método EXPERT PRO TRAINING`,
      requirements: [],
      blockedCapacities: [],
      allowedCapacities: [],
      minScore: 70,
      isActive: true,
      isLocked: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    // Buscar capacidades únicas dos blocos
    const blocks = await prisma.block.findMany({
      select: {
        primaryCapacity: true,
        secondaryCapacities: true,
      },
    })

    const capacitiesSet = new Set<string>()
    blocks.forEach((block) => {
      capacitiesSet.add(block.primaryCapacity)
      block.secondaryCapacities.forEach((cap) => capacitiesSet.add(cap))
    })

    const capacities = Array.from(capacitiesSet).map((cap, index) => ({
      id: `capacity-${index}`,
      name: cap,
      code: cap.toUpperCase().replace(/\s+/g, '_'),
      description: `Capacidade física: ${cap}`,
      category: cap.includes('FORÇA') ? 'FORÇA' : cap.includes('POTÊNCIA') ? 'POTÊNCIA' : 'CONDICIONAMENTO',
      prerequisites: [],
      blockedBy: [],
      isActive: true,
      isLocked: true,
      _count: {
        exercises: 0,
        blocks: blocks.filter(b => b.primaryCapacity === cap || b.secondaryCapacities.includes(cap)).length,
      },
    }))

    // Buscar padrões de movimento
    const movementPatterns = await prisma.block.groupBy({
      by: ['movementPattern'],
      where: {
        movementPattern: {
          not: null,
        },
      },
      _count: {
        id: true,
      },
    })

    const patterns = movementPatterns
      .filter((p) => p.movementPattern !== null)
      .map((p, index) => ({
        id: `pattern-${index}`,
        name: p.movementPattern || '',
        code: (p.movementPattern || '').toUpperCase(),
        description: `Padrão de movimento: ${p.movementPattern}`,
        primaryCapacities: [],
        secondaryCapacities: [],
        progression: [],
        isActive: true,
        isLocked: true,
        _count: {
          blocks: p._count.id,
        },
      }))

    // Stats
    const stats = {
      totalLevels: hierarchyLevels.length,
      totalCapacities: capacities.length,
      totalPatterns: patterns.length,
      activeLevels: hierarchyLevels.filter((l) => l.isActive).length,
      lockedItems: hierarchyLevels.length + capacities.length + patterns.length,
    }

    return NextResponse.json({
      success: true,
      data: {
        levels: hierarchyLevels,
        capacities,
        patterns,
        stats,
      },
    })
  } catch (error) {
    console.error('Error fetching hierarchy:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar hierarquia' },
      { status: 500 }
    )
  }
}

// POST - Create hierarchy item (placeholder for future implementation)
export async function POST(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()

    // TODO: Implementar criação de itens de hierarquia
    // Por enquanto, retorna erro informando que está em desenvolvimento

    return NextResponse.json(
      { success: false, error: 'Criação de hierarquia em desenvolvimento' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error creating hierarchy item:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar item de hierarquia' },
      { status: 500 }
    )
  }
}
