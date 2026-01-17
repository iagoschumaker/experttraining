// ============================================================================
// EXPERT PRO TRAINING - SUPERADMIN DECISIONS API
// ============================================================================
// GET /api/superadmin/decisions - Lista motores de decisão e logs
// POST /api/superadmin/decisions - Cria motor de decisão
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

// GET - List decision engines and logs
export async function GET(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    // Buscar regras ativas (representam o motor de decisão)
    const rules = await prisma.rule.findMany({
      orderBy: { priority: 'asc' },
      take: 10,
    })

    // Criar motor de decisão baseado nas regras existentes
    const engines = [
      {
        id: 'engine-1',
        name: 'Motor EXPERT PRO TRAINING v1',
        version: '1.0.0',
        status: rules.length > 0 ? 'ACTIVE' : 'INACTIVE',
        config: {
          baseConfidence: 60,
          levelModifiers: {
            BEGINNER: 0.8,
            INTERMEDIATE: 1.0,
            ADVANCED: 1.2,
          },
          painThresholds: {
            low: 3,
            moderate: 5,
            high: 7,
          },
          weights: {
            movementPattern: 40,
            painMap: 30,
            level: 20,
            complaints: 10,
          },
        },
        algorithms: [
          {
            id: 'algo-1',
            name: 'Análise de Padrão de Movimento',
            type: 'PATTERN_ANALYSIS',
            description: 'Analisa scores dos padrões de movimento',
            config: {},
            priority: 1,
            isActive: true,
            isLocked: true,
          },
          {
            id: 'algo-2',
            name: 'Análise de Mapa de Dor',
            type: 'PAIN_ANALYSIS',
            description: 'Analisa regiões com dor e intensidade',
            config: {},
            priority: 2,
            isActive: true,
            isLocked: true,
          },
          {
            id: 'algo-3',
            name: 'Avaliação de Nível',
            type: 'LEVEL_ASSESSMENT',
            description: 'Determina nível apropriado do aluno',
            config: {},
            priority: 3,
            isActive: true,
            isLocked: true,
          },
          {
            id: 'algo-4',
            name: 'Cálculo de Confiança',
            type: 'CONFIDENCE_CALCULATION',
            description: 'Calcula confiança da recomendação',
            config: {},
            priority: 4,
            isActive: true,
            isLocked: true,
          },
        ],
        isActive: rules.length > 0,
        isLocked: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    // Buscar assessments recentes para logs
    const recentAssessments = await prisma.assessment.findMany({
      where: {
        completedAt: {
          not: null,
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
      take: 20,
      select: {
        id: true,
        confidence: true,
        completedAt: true,
        resultJson: true,
        client: {
          select: {
            name: true,
          },
        },
      },
    })

    const logs = recentAssessments.map((assessment) => {
      const result = assessment.resultJson as any
      return {
        id: assessment.id,
        assessmentId: assessment.id,
        input: {
          clientName: assessment.client.name,
        },
        output: {
          functionalPattern: result?.functionalPattern || 'N/A',
        },
        processingTime: Math.floor(Math.random() * 500) + 100, // Simulado
        confidence: assessment.confidence ? Number(assessment.confidence) / 100 : 0.75,
        algorithm: 'Motor EXPERT PRO TRAINING v1',
        timestamp: assessment.completedAt?.toISOString() || new Date().toISOString(),
        success: true,
      }
    })

    // Stats
    const totalRules = await prisma.rule.count()
    const activeRules = await prisma.rule.count({ where: { isActive: true } })
    const totalAssessments = await prisma.assessment.count()
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const dailyDecisions = await prisma.assessment.count({
      where: {
        completedAt: {
          gte: today,
        },
      },
    })

    const avgConfidence = recentAssessments.length > 0
      ? recentAssessments.reduce((sum, a) => sum + (a.confidence ? Number(a.confidence) / 100 : 0), 0) / recentAssessments.length
      : 0

    const stats = {
      totalEngines: engines.length,
      activeEngines: engines.filter((e) => e.isActive).length,
      totalAlgorithms: engines.reduce((sum, e) => sum + e.algorithms.length, 0),
      dailyDecisions,
      avgConfidence,
      avgProcessingTime: 250, // Simulado
      successRate: 0.95, // Simulado
    }

    return NextResponse.json({
      success: true,
      data: {
        engines,
        logs,
        stats,
      },
    })
  } catch (error) {
    console.error('Error fetching decisions:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar decisões' },
      { status: 500 }
    )
  }
}

// POST - Create decision engine (placeholder)
export async function POST(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()

    // TODO: Implementar criação de motor de decisão
    // Por enquanto, retorna erro informando que está em desenvolvimento

    return NextResponse.json(
      { success: false, error: 'Criação de motor de decisão em desenvolvimento' },
      { status: 501 }
    )
  } catch (error) {
    console.error('Error creating decision engine:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao criar motor de decisão' },
      { status: 500 }
    )
  }
}
