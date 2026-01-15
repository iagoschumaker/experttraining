export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'push'
  | 'pull'
  | 'rotation'
  | 'gait'

export type Capacity =
  | 'strength'
  | 'stability'
  | 'mobility'
  | 'endurance'
  | 'coordination'

export type Goal =
  | 'emagrecimento'
  | 'saude'
  | 'performance'
  | 'recondicionamento'
  | 'hipertrofia_funcional'

export type MovementScores = Record<MovementPattern, number>

export type Assessment = {
  complaints: string[]
  painMap: { region: string; intensity: number }[]
  movementScores: MovementScores
  limitingCapacities: Capacity[]
  primaryGoal: Goal
  frequencyPerWeek: number
  level?: 'iniciante' | 'intermediario' | 'avancado'
}

export type ExerciseDef = {
  id: string
  name: string
  patterns: MovementPattern[]
  primary_capacity: Capacity
  risk_level: 'baixo' | 'moderado' | 'alto'
  contraindications?: string[]
  default_rest_seconds?: number
}

export type ExerciseInstance = {
  exerciseId: string
  name: string
  patterns: MovementPattern[]
  execution: { mode: 'reps' | 'tempo'; value: string }
  rest_after_exercise: number
  rationale: string
}

export type Block = {
  id: string
  name: string
  exercises: [ExerciseInstance, ExerciseInstance, ExerciseInstance]
  rest_between_blocks_seconds: number
  rationale: string
}

export type Protocol = {
  name: string
  duration_minutes: number
  description: string
}

export type WorkoutPlan = {
  preparation: {
    duration_minutes: number
    elements: string[]
    rationale: string
  }
  blocks: Block[]
  protocol?: Protocol
  audit: { rulesTriggered: string[] }
}

// ============================================================================
// DAILY SCHEDULE - Cronograma Completo do Dia (Novo Output do Motor)
// ============================================================================

export type ExerciseRole = 'FOCO_PRINCIPAL' | 'PUSH_PULL_INTEGRADO' | 'CORE'

export type ScheduleExercise = {
  role: ExerciseRole
  name: string
  execution: string
  rest: string
}

export type ScheduleBlock = {
  blockIndex: 1 | 2 | 3
  exercises: [ScheduleExercise, ScheduleExercise, ScheduleExercise]
  restAfterBlock: string
}

export type PreparationExercise = {
  name: string
  duration: string
}

export type Preparation = {
  title: 'Preparação do Movimento'
  totalTime: string
  exercises: PreparationExercise[]
}

export type FinalProtocol = {
  name: string
  totalTime: string
  structure?: string
}

export type DailySchedule = {
  focus: string
  preparation: Preparation
  blocks: [ScheduleBlock, ScheduleBlock, ScheduleBlock]
  finalProtocol: FinalProtocol
  audit: { rulesTriggered: string[] }
}
