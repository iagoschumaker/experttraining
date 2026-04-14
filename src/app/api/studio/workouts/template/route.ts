// ============================================================================
// EXPERT PRO TRAINING - WORKOUT TEMPLATE API
// ============================================================================
// GET /api/studio/workouts/template - Retorna o template de exercícios para uma fase/nível
// Usado no modo manual para carregar os exercícios editáveis
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { getPhaseWorkout } from '@/services/phaseWorkouts'
import { type TrainingPhase, type TrainingLevel } from '@/services/trainingPhases'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId } = auth

  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const phase = searchParams.get('phase')

    if (!clientId || !phase) {
      return NextResponse.json(
        { success: false, error: 'clientId e phase são obrigatórios' },
        { status: 400 }
      )
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, studioId },
      select: { level: true },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    const level = (client.level || 'INICIANTE') as TrainingLevel
    const template = getPhaseWorkout(level, phase as TrainingPhase)

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template não encontrado para esta fase/nível' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        level,
        phase,
        phaseLabel: template.phaseLabel,
        treinos: template.treinos,
        preparations: template.preparations,
        weeklyProgression: template.weeklyProgression,
      },
    })
  } catch (error) {
    console.error('Get template error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar template' },
      { status: 500 }
    )
  }
}
