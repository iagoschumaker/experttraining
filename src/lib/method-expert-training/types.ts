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
