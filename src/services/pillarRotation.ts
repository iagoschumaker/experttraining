// ============================================================================
// MÉTODO EXPERT TRAINING — SERVIÇO DE RODÍZIO POR PILARES
// ============================================================================
// Implementa rodízio circular LOWER → PUSH → PULL persistente por aluno
// ============================================================================

export const PILLARS = ['LOWER', 'PUSH', 'PULL'] as const
export type Pillar = (typeof PILLARS)[number]

export const PILLAR_LABELS: Record<Pillar, string> = {
  LOWER: 'Perna & Quadril',
  PUSH: 'Empurrada',
  PULL: 'Puxada',
}

export const PILLAR_LABELS_SHORT: Record<Pillar, string> = {
  LOWER: 'Lower',
  PUSH: 'Push',
  PULL: 'Pull',
}

// ============================================================================
// TIPOS
// ============================================================================

export interface PillarRotationInput {
  trainingDaysPerWeek: number
  totalWeeks: number
  lastPillarIndex: number
}

export interface PillarRotationResult {
  /** Array de semanas, cada uma com array de pilares por sessão */
  schedule: Pillar[][]
  /** Índice a ser salvo no client para continuidade do rodízio */
  lastIndexAfterProgram: number
}

// ============================================================================
// FUNÇÃO PRINCIPAL — GERADOR DE RODÍZIO
// ============================================================================

/**
 * Gera o schedule de pilares para um programa de treino.
 * 
 * O rodízio é circular e contínuo:
 * - 3x/semana → Semana 1: [LOWER, PUSH, PULL], Semana 2: [LOWER, PUSH, PULL], ...
 * - 2x/semana → Semana 1: [LOWER, PUSH], Semana 2: [PULL, LOWER], Semana 3: [PUSH, PULL], ...
 * - 5x/semana → Semana 1: [LOWER, PUSH, PULL, LOWER, PUSH], Semana 2: [PULL, LOWER, PUSH, PULL, LOWER], ...
 * 
 * A função é PURA e DETERMINÍSTICA: mesma entrada → mesma saída.
 */
export function generatePillarRotation(input: PillarRotationInput): PillarRotationResult {
  // Validar frequência: deve ser entre 2 e 6, fallback para 3
  const daysPerWeek = (input.trainingDaysPerWeek >= 2 && input.trainingDaysPerWeek <= 6)
    ? input.trainingDaysPerWeek
    : 3

  // Validar semanas: deve ser entre 1 e 12, fallback para 4
  const totalWeeks = (input.totalWeeks >= 1 && input.totalWeeks <= 12)
    ? input.totalWeeks
    : 4

  // Validar lastPillarIndex: deve ser 0, 1 ou 2
  let currentIndex = (input.lastPillarIndex >= 0 && input.lastPillarIndex < PILLARS.length)
    ? input.lastPillarIndex
    : 0

  const schedule: Pillar[][] = []

  for (let week = 0; week < totalWeeks; week++) {
    const weekPillars: Pillar[] = []

    for (let session = 0; session < daysPerWeek; session++) {
      weekPillars.push(PILLARS[currentIndex])
      currentIndex = (currentIndex + 1) % PILLARS.length
    }

    schedule.push(weekPillars)
  }

  return {
    schedule,
    lastIndexAfterProgram: currentIndex,
  }
}
