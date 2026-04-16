// ============================================================================
// MÉTODO EXPERT TRAINING — REGRAS DE FASES DE TREINAMENTO
// ============================================================================
// Define quais fases estão disponíveis para cada objetivo e nível.
// Cada fase dura 6 semanas. Exercícios são FIXOS durante toda a fase.
// ============================================================================

export type TrainingPhase =
  | 'CONDICIONAMENTO_1'
  | 'CONDICIONAMENTO_2'
  | 'HIPERTROFIA'
  | 'FORCA'
  | 'POTENCIA'
  | 'RESISTENCIA'
  | 'METABOLICO'
  | 'HIPERTROFIA_2'
  | 'FORCA_2'
  | 'RESISTENCIA_2'
  | 'METABOLICO_2'
  | 'GESTANTE_T1'
  | 'GESTANTE_T2'
  | 'GESTANTE_T3_A'
  | 'GESTANTE_T3_B'

export type ClientObjective =
  | 'EMAGRECIMENTO'
  | 'HIPERTROFIA_OBJ'
  | 'PERFORMANCE'
  | 'REABILITACAO'
  | 'GESTANTE'

export type TrainingLevel = 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO'

export const PHASE_LABELS: Record<TrainingPhase, string> = {
  CONDICIONAMENTO_1: 'Fundamento Híbrido I',
  CONDICIONAMENTO_2: 'Condicionamento Híbrido',
  HIPERTROFIA: 'Hipertrofia Híbrida',
  FORCA: 'Força Híbrida',
  POTENCIA: 'Potência Híbrida',
  RESISTENCIA: 'Resistência / Fadiga',
  METABOLICO: 'Metabólico',
  HIPERTROFIA_2: 'Hipertrofia Híbrida II',
  FORCA_2: 'Força Híbrida II',
  RESISTENCIA_2: 'Resistência / Fadiga II',
  METABOLICO_2: 'Metabólico II',
  GESTANTE_T1: 'Gestante — 1º Trimestre',
  GESTANTE_T2: 'Gestante — 2º Trimestre',
  GESTANTE_T3_A: 'Gestante — 3º Trimestre (28-35 sem)',
  GESTANTE_T3_B: 'Gestante — Pré-Parto (36-42 sem)',
}

export const OBJECTIVE_LABELS: Record<ClientObjective, string> = {
  EMAGRECIMENTO: 'Emagrecimento',
  HIPERTROFIA_OBJ: 'Hipertrofia',
  PERFORMANCE: 'Performance',
  REABILITACAO: 'Reabilitação / Saúde',
  GESTANTE: 'Gestante',
}

export const LEVEL_LABELS: Record<TrainingLevel, string> = {
  INICIANTE: 'Iniciante',
  INTERMEDIARIO: 'Intermediário',
  AVANCADO: 'Avançado',
}

// ============================================================================
// REGRAS: Fases disponíveis por OBJETIVO
// ============================================================================
// CONDICIONAMENTO sempre é primeiro — TODOS passam por ele independente do objetivo
// Depois, as fases dependem do objetivo:

const PHASES_BY_OBJECTIVE: Record<ClientObjective, TrainingPhase[]> = {
  EMAGRECIMENTO: [
    'HIPERTROFIA',   // Hipertrofia de Condicionamento
    'FORCA',
    'RESISTENCIA',
    'METABOLICO',
  ],
  HIPERTROFIA_OBJ: [
    'HIPERTROFIA',
    'FORCA',
    'HIPERTROFIA_2',
  ],
  PERFORMANCE: [
    'HIPERTROFIA',
    'FORCA',
    'POTENCIA',
    'RESISTENCIA',
  ],
  REABILITACAO: [
    'HIPERTROFIA',
    'FORCA',
  ],
  GESTANTE: [
    'GESTANTE_T1',
    'GESTANTE_T2',
    'GESTANTE_T3_A',
    'GESTANTE_T3_B',
  ],
}

// ============================================================================
// REGRAS: Fases existentes por NÍVEL
// ============================================================================
// Nem todos os níveis têm todas as fases nas planilhas

const PHASES_BY_LEVEL: Record<TrainingLevel, TrainingPhase[]> = {
  INICIANTE: [
    'CONDICIONAMENTO_1',
    'CONDICIONAMENTO_2',
    'HIPERTROFIA',
    'FORCA',
    'POTENCIA',
    'RESISTENCIA',
    'METABOLICO',
  ],
  INTERMEDIARIO: [
    'CONDICIONAMENTO_1',
    'CONDICIONAMENTO_2',
    'HIPERTROFIA',
    'FORCA',
    'RESISTENCIA',
    'METABOLICO',
  ],
  AVANCADO: [
    'CONDICIONAMENTO_1',
    'CONDICIONAMENTO_2',
    'HIPERTROFIA',
    'FORCA',
    'RESISTENCIA',
    'METABOLICO',
    'HIPERTROFIA_2',
    'FORCA_2',
    'RESISTENCIA_2',
    'METABOLICO_2',
  ],
}

// ============================================================================
// CONSTANTES
// ============================================================================

export const PHASE_DURATION_WEEKS = 6
export const DEFAULT_SESSIONS_PER_WEEK = 3

// ============================================================================
// FUNÇÕES PÚBLICAS
// ============================================================================

/**
 * Retorna as fases disponíveis para um aluno, considerando:
 * 1. Nível do aluno (quais fases existem naquele nível)
 * 2. Objetivo do aluno (quais fases são pertinentes ao objetivo)
 * 
 * Condicionamento 1 e 2 são SEMPRE incluídos no início.
 */
export function getAvailablePhases(
  level: TrainingLevel,
  objective: ClientObjective
): TrainingPhase[] {
  const levelPhases = PHASES_BY_LEVEL[level] || PHASES_BY_LEVEL.INICIANTE
  const objectivePhases = PHASES_BY_OBJECTIVE[objective] || PHASES_BY_OBJECTIVE.REABILITACAO
  
  // GESTANTE: fases próprias, ignora nível (gestante não tem nível de treino)
  if (objective === 'GESTANTE') {
    return objectivePhases
  }

  // Condicionamento é SEMPRE primeiro
  const result: TrainingPhase[] = ['CONDICIONAMENTO_1', 'CONDICIONAMENTO_2']
  
  // Adicionar fases que existem TANTO no nível quanto no objetivo
  for (const phase of objectivePhases) {
    if (levelPhases.includes(phase) && !result.includes(phase)) {
      result.push(phase)
    }
  }
  
  return result
}

/**
 * Retorna a próxima fase recomendada com base na fase atual.
 * Retorna null se completou todas as fases do nível/objetivo.
 */
export function getNextPhase(
  currentPhase: TrainingPhase | null,
  level: TrainingLevel,
  objective: ClientObjective
): TrainingPhase | null {
  const phases = getAvailablePhases(level, objective)
  
  if (!currentPhase) {
    return phases[0] || null
  }
  
  const idx = phases.indexOf(currentPhase)
  if (idx === -1 || idx >= phases.length - 1) {
    return null // Completou todas as fases
  }
  
  return phases[idx + 1]
}

/**
 * Verifica se o aluno completou todas as fases do nível atual.
 * Se sim, uma reavaliação é necessária para subir de nível.
 */
export function hasCompletedAllPhases(
  currentPhase: TrainingPhase | null,
  level: TrainingLevel,
  objective: ClientObjective
): boolean {
  const phases = getAvailablePhases(level, objective)
  if (!currentPhase) return false
  const idx = phases.indexOf(currentPhase)
  return idx === phases.length - 1
}

/**
 * Verifica se uma fase é válida para o nível e objetivo do aluno.
 */
export function isPhaseValid(
  phase: TrainingPhase,
  level: TrainingLevel,
  objective: ClientObjective
): boolean {
  const available = getAvailablePhases(level, objective)
  return available.includes(phase)
}

/**
 * Verifica se a fase foi completada (6 semanas de treino).
 */
export function isPhaseComplete(
  sessionsCompleted: number,
  sessionsPerWeek: number
): boolean {
  const totalRequired = PHASE_DURATION_WEEKS * sessionsPerWeek
  return sessionsCompleted >= totalRequired
}

/**
 * Calcula o progresso na fase atual.
 */
export function calculatePhaseProgress(
  sessionsCompleted: number,
  sessionsPerWeek: number
) {
  const totalRequired = PHASE_DURATION_WEEKS * sessionsPerWeek
  const currentWeek = Math.min(
    PHASE_DURATION_WEEKS,
    Math.floor(sessionsCompleted / sessionsPerWeek) + 1
  )
  const percentage = Math.min(100, Math.round((sessionsCompleted / totalRequired) * 100))
  const isComplete = sessionsCompleted >= totalRequired
  
  return {
    currentWeek,
    totalWeeks: PHASE_DURATION_WEEKS,
    sessionsCompleted,
    totalSessions: totalRequired,
    percentage,
    isComplete,
    sessionsRemaining: Math.max(0, totalRequired - sessionsCompleted),
  }
}
