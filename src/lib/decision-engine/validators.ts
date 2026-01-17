// ============================================================================
// MOTOR DE DECISÃO — VALIDADORES
// ============================================================================
// Validadores que garantem a hierarquia e estrutura do Método EXPERT PRO TRAINING
// ============================================================================

import {
  AssessmentInput,
  TrainingDay,
  TrainingBlock,
  EngineValidationError,
} from './types'

// ============================================================================
// VALIDAÇÃO DE ENTRADA (AVALIAÇÃO)
// ============================================================================

export function validateAssessment(input: AssessmentInput): void {
  // Verifica se avaliação existe
  if (!input) {
    throw new EngineValidationError(
      'MISSING_ASSESSMENT',
      'Avaliação é obrigatória para gerar treino'
    )
  }

  // Verifica painMap
  if (!input.painMap || typeof input.painMap !== 'object') {
    throw new EngineValidationError(
      'INVALID_PAIN_MAP',
      'Mapa de dor é obrigatório'
    )
  }

  // Verifica movementScores
  const requiredPatterns = ['squat', 'hinge', 'lunge', 'push', 'pull', 'rotation', 'gait']
  for (const pattern of requiredPatterns) {
    if (typeof input.movementScores[pattern as keyof typeof input.movementScores] !== 'number') {
      throw new EngineValidationError(
        'INVALID_MOVEMENT_SCORE',
        `Score do padrão ${pattern} é obrigatório e deve ser número (0-3)`
      )
    }
  }

  // Verifica goal
  const validGoals = ['EMAGRECIMENTO', 'SAUDE', 'PERFORMANCE', 'RECONDICIONAMENTO', 'HIPERTROFIA_FUNCIONAL']
  if (!validGoals.includes(input.goal)) {
    throw new EngineValidationError(
      'INVALID_GOAL',
      `Objetivo inválido. Deve ser um de: ${validGoals.join(', ')}`
    )
  }

  // Verifica level
  const validLevels = ['INICIANTE', 'INTERMEDIARIO', 'AVANCADO']
  if (!validLevels.includes(input.level)) {
    throw new EngineValidationError(
      'INVALID_LEVEL',
      `Nível inválido. Deve ser um de: ${validLevels.join(', ')}`
    )
  }

  // Verifica frequência
  if (!input.frequencyPerWeek || input.frequencyPerWeek < 1 || input.frequencyPerWeek > 7) {
    throw new EngineValidationError(
      'INVALID_FREQUENCY',
      'Frequência semanal deve ser entre 1 e 7'
    )
  }
}

// ============================================================================
// VALIDAÇÃO DE BLOCO
// ============================================================================

export function validateBlock(block: TrainingBlock, blockIndex: number): void {
  // Verifica se bloco tem exatamente 3 exercícios
  if (!block.exercises || block.exercises.length !== 3) {
    throw new EngineValidationError(
      'INVALID_BLOCK_STRUCTURE',
      `Bloco ${blockIndex + 1} deve ter exatamente 3 exercícios`
    )
  }

  const [ex1, ex2, ex3] = block.exercises

  // Exercício 1: FOCUS (padrão principal do dia)
  if (ex1.slot !== 'FOCUS') {
    throw new EngineValidationError(
      'INVALID_EXERCISE_ORDER',
      `Bloco ${blockIndex + 1}: Exercício 1 deve ser do tipo FOCUS`
    )
  }

  // Exercício 2: INTEGRATED_PUSH_PULL
  if (ex2.slot !== 'INTEGRATED_PUSH_PULL') {
    throw new EngineValidationError(
      'INVALID_EXERCISE_ORDER',
      `Bloco ${blockIndex + 1}: Exercício 2 deve ser INTEGRATED_PUSH_PULL`
    )
  }

  // Verifica se exercício 2 tem push E pull
  const hasPush = ex2.patterns.includes('push')
  const hasPull = ex2.patterns.includes('pull')
  if (!hasPush || !hasPull) {
    throw new EngineValidationError(
      'INVALID_INTEGRATED_EXERCISE',
      `Bloco ${blockIndex + 1}: Exercício 2 deve integrar push E pull`
    )
  }

  // Exercício 3: CORE
  if (ex3.slot !== 'CORE') {
    throw new EngineValidationError(
      'INVALID_EXERCISE_ORDER',
      `Bloco ${blockIndex + 1}: Exercício 3 deve ser CORE`
    )
  }

  // Verifica descansos definidos
  for (let i = 0; i < block.exercises.length; i++) {
    const ex = block.exercises[i]
    if (typeof ex.restAfter !== 'number' || ex.restAfter < 0) {
      throw new EngineValidationError(
        'MISSING_REST',
        `Bloco ${blockIndex + 1}, Exercício ${i + 1}: descanso deve ser definido`
      )
    }
  }
}

// ============================================================================
// VALIDAÇÃO DE DIA DE TREINO
// ============================================================================

export function validateTrainingDay(day: TrainingDay): void {
  // Verifica preparação obrigatória
  if (!day.preparation) {
    throw new EngineValidationError(
      'MISSING_PREPARATION',
      `Dia ${day.dayIndex}: preparação do movimento é obrigatória`
    )
  }

  if (!day.preparation.elements || day.preparation.elements.length === 0) {
    throw new EngineValidationError(
      'EMPTY_PREPARATION',
      `Dia ${day.dayIndex}: preparação deve ter pelo menos 1 elemento`
    )
  }

  // Verifica blocos
  if (!day.blocks || day.blocks.length === 0) {
    throw new EngineValidationError(
      'MISSING_BLOCKS',
      `Dia ${day.dayIndex}: treino deve ter pelo menos 1 bloco`
    )
  }

  if (day.blocks.length > 3) {
    throw new EngineValidationError(
      'TOO_MANY_BLOCKS',
      `Dia ${day.dayIndex}: máximo de 3 blocos por treino`
    )
  }

  // Valida cada bloco
  for (let i = 0; i < day.blocks.length; i++) {
    validateBlock(day.blocks[i], i)
  }

  // Protocolo só pode vir APÓS blocos (estrutura garante isso, mas verificamos)
  // Aqui a validação é implícita pela estrutura do tipo
}

// ============================================================================
// VALIDAÇÃO DE PLANO COMPLETO
// ============================================================================

export function validateTrainingPlan(
  days: TrainingDay[],
  expectedDays: number
): void {
  if (!days || days.length === 0) {
    throw new EngineValidationError(
      'EMPTY_PLAN',
      'Plano de treino não pode estar vazio'
    )
  }

  if (days.length !== expectedDays) {
    throw new EngineValidationError(
      'INVALID_DAYS_COUNT',
      `Plano deve ter ${expectedDays} dias conforme frequência semanal`
    )
  }

  for (const day of days) {
    validateTrainingDay(day)
  }
}

// ============================================================================
// VALIDAÇÃO DE CONTEXTO DE DECISÃO
// ============================================================================

export function assertContextValid(ctx: {
  maxBlocks: number
  assessment: AssessmentInput
}): void {
  if (ctx.maxBlocks < 1 || ctx.maxBlocks > 3) {
    throw new EngineValidationError(
      'INVALID_MAX_BLOCKS',
      'Número máximo de blocos deve ser 1, 2 ou 3'
    )
  }
}
