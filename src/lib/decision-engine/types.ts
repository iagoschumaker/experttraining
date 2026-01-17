// ============================================================================
// MOTOR DE DECISÃO — TIPOS
// ============================================================================
// Definições de tipos para o motor de decisão do Método EXPERT PRO TRAINING
// ============================================================================

// ============================================================================
// INPUT: AVALIAÇÃO FUNCIONAL
// ============================================================================

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'push'
  | 'pull'
  | 'rotation'
  | 'gait'

export type Limitation =
  | 'FORCA'
  | 'ESTABILIDADE'
  | 'MOBILIDADE'
  | 'RESISTENCIA'
  | 'COORDENACAO'

export type Goal =
  | 'EMAGRECIMENTO'
  | 'SAUDE'
  | 'PERFORMANCE'
  | 'RECONDICIONAMENTO'
  | 'HIPERTROFIA_FUNCIONAL'

export type Level = 'INICIANTE' | 'INTERMEDIARIO' | 'AVANCADO'

export type MovementScores = Record<MovementPattern, number>

export type AssessmentInput = {
  painMap: Record<string, number> // região -> intensidade 0–10
  movementScores: MovementScores
  limitations: Limitation[]
  goal: Goal
  level: Level
  frequencyPerWeek: number
}

// ============================================================================
// OUTPUT: PLANO DE TREINO
// ============================================================================

export type ExecutionType = 'REPS' | 'TIME'

export type Execution = {
  type: ExecutionType
  value: string
}

export type ExerciseSlot = 'FOCUS' | 'INTEGRATED_PUSH_PULL' | 'CORE'

export type BaseExercise = {
  id: string
  name: string
  patterns: MovementPattern[]
  execution: Execution
  restAfter: number
  rationale: string
}

export type FocusExercise = BaseExercise & {
  slot: 'FOCUS'
}

export type IntegratedPushPullExercise = BaseExercise & {
  slot: 'INTEGRATED_PUSH_PULL'
}

export type CoreExercise = BaseExercise & {
  slot: 'CORE'
}

export type TrainingBlock = {
  index: number
  name: string
  exercises: [FocusExercise, IntegratedPushPullExercise, CoreExercise]
  restBetweenBlocks: number
  rationale: string
}

export type PreparationElement = {
  name: string
  duration: string
  focus: string
}

export type PreparationBlock = {
  durationMinutes: number
  elements: PreparationElement[]
  rationale: string
}

export type FinalProtocol = {
  name: string
  type: 'HIIT' | 'METABOLICO' | 'REGENERATIVO' | 'POTENCIA'
  durationMinutes: number
  description: string
  rationale: string
}

export type TrainingDay = {
  dayIndex: number
  focus: string
  preparation: PreparationBlock
  blocks: TrainingBlock[]
  protocol?: FinalProtocol
}

export type TrainingPlan = {
  days: TrainingDay[]
  auditLog: string[]
}

// ============================================================================
// MOTOR DE REGRAS
// ============================================================================

export type DecisionContext = {
  assessment: AssessmentInput
  maxBlocks: number
  restMultiplier: number
  blockedPatterns: MovementPattern[]
  blockedRegions: string[]
  prioritizeCore: boolean
  prioritizeStability: boolean
  protocolType: FinalProtocol['type'] | null
  auditLog: string[]
}

export type Rule = {
  id: string
  priority: number
  condition: (input: AssessmentInput) => boolean
  action: (ctx: DecisionContext) => void
  reason: string
}

// ============================================================================
// CATÁLOGO DE EXERCÍCIOS
// ============================================================================

export type ExerciseCatalogEntry = {
  id: string
  name: string
  patterns: MovementPattern[]
  slot: ExerciseSlot
  defaultExecution: Execution
  defaultRest: number
  contraindications: string[]
  riskLevel: 'BAIXO' | 'MODERADO' | 'ALTO'
}

// ============================================================================
// ERROS DO MOTOR
// ============================================================================

export class EngineValidationError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'EngineValidationError'
  }
}
