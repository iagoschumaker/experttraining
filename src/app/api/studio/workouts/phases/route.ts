// ============================================================================
// EXPERT PRO TRAINING - TRAINING PHASES API
// ============================================================================
// GET /api/studio/workouts/phases - Listar fases disponíveis para um aluno
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import {
  getAvailablePhases,
  PHASE_LABELS,
  OBJECTIVE_LABELS,
  LEVEL_LABELS,
  type TrainingPhase,
  type TrainingLevel,
  type ClientObjective,
} from '@/services/trainingPhases'

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId } = auth

  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const objectiveParam = searchParams.get('objective')

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'clientId é obrigatório' },
        { status: 400 }
      )
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, studioId },
      select: {
        id: true,
        name: true,
        level: true,
        objective: true,
        currentPhase: true,
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // Buscar última avaliação completa do cliente
    const latestAssessment = await prisma.assessment.findFirst({
      where: {
        clientId,
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        inputJson: true,
        bodyMetricsJson: true,
        resultJson: true,
        selectedPhase: true,
        objective: true,
      },
    })

    const level = (client.level || 'INICIANTE') as TrainingLevel
    const objective = (objectiveParam || client.objective || 'REABILITACAO') as ClientObjective

    const availablePhases = getAvailablePhases(level, objective)

    const phases = availablePhases.map(phase => ({
      value: phase,
      label: PHASE_LABELS[phase],
      isCurrent: client.currentPhase === phase,
      isRecommended: !client.currentPhase
        ? phase === availablePhases[0]
        : false,
    }))

    // Extrair dados da avaliação para avisos de segurança
    const inputData = latestAssessment?.inputJson as any
    const assessmentContext = latestAssessment ? {
      id: latestAssessment.id,
      complaints: inputData?.complaints || [],
      painMap: inputData?.painMap || {},
      movementTests: inputData?.movementTests || {},
      level: inputData?.level || 'BEGINNER',
      selectedPhase: latestAssessment.selectedPhase,
      objective: latestAssessment.objective,
    } : null

    return NextResponse.json({
      success: true,
      data: {
        client: {
          id: client.id,
          name: client.name,
          level,
          levelLabel: LEVEL_LABELS[level],
          objective,
          objectiveLabel: OBJECTIVE_LABELS[objective] || objective,
          currentPhase: client.currentPhase,
          currentPhaseLabel: client.currentPhase ? PHASE_LABELS[client.currentPhase as TrainingPhase] : null,
        },
        phases,
        objectives: Object.entries(OBJECTIVE_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
        assessmentContext,
      },
    })
  } catch (error) {
    console.error('Get phases error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar fases' },
      { status: 500 }
    )
  }
}
