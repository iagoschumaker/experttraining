// ============================================================================
// API: BLOCOS DO MÉTODO (STUDIO - SOMENTE LEITURA)
// ============================================================================
// GET /api/blocks - Lista blocos disponíveis para o studio
// ⚠️ REGRA: Studios podem APENAS LER, nunca modificar blocos protegidos
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'

/**
 * GET /api/blocks
 * Lista blocos disponíveis para montagem de treino
 * Retorna apenas blocos ativos
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const accessToken = await getAccessTokenCookie()
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const payload = verifyAccessToken(accessToken)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Token inválido' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level')
    const primaryCapacity = searchParams.get('primaryCapacity')
    const movementPattern = searchParams.get('movementPattern')
    const search = searchParams.get('search')

    const where: any = {
      isActive: true,
    }

    if (level !== null && level !== '') {
      where.level = parseInt(level)
    }

    if (primaryCapacity) {
      where.primaryCapacity = primaryCapacity
    }

    if (movementPattern) {
      where.movementPattern = movementPattern
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const blocks = await prisma.block.findMany({
      where,
      orderBy: [
        { level: 'asc' },
        { blockOrder: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        level: true,
        levelName: true,
        primaryCapacity: true,
        secondaryCapacities: true,
        complexity: true,
        impact: true,
        movementPattern: true,
        riskLevel: true,
        suggestedFrequency: true,
        estimatedDuration: true,
        blockOrder: true,
        blockedIf: true,
        allowedIf: true,
        exercises: true,
        isLocked: true,
        // NÃO expor: createdBy, isActive (para studios)
      },
    })

    // Agrupar por nível
    const groupedByLevel = {
      CONDICIONAMENTO: blocks.filter((b: any) => b.level === 0),
      INICIANTE: blocks.filter((b: any) => b.level === 1),
      INTERMEDIARIO: blocks.filter((b: any) => b.level === 2),
      AVANCADO: blocks.filter((b: any) => b.level === 3),
    }

    return NextResponse.json({
      success: true,
      data: {
        blocks,
        groupedByLevel,
        total: blocks.length,
        // Informar que são dados do método
        _meta: {
          source: 'MÉTODO EXPERT TRAINING',
          readOnly: true,
          message: 'Estes blocos são parte do método e não podem ser alterados',
        },
      },
    })
  } catch (error) {
    console.error('Erro ao listar blocos:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ⚠️ POST, PUT, DELETE NÃO IMPLEMENTADOS PROPOSITALMENTE
// Studios não podem criar ou modificar blocos do método
