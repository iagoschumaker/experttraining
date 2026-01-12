import { Assessment, ExerciseDef, WorkoutPlan, Block, ExerciseInstance, MovementPattern } from './types'
import { EXERCISES as REGISTRY } from './exercises'

function generateId() {
  return `id_${Date.now().toString(36)}_${Math.floor(Math.random() * 10000)}`
}

function determineLevel(assessment: Assessment) {
  if (assessment.level) return assessment.level
  const f = assessment.frequencyPerWeek
  if (f <= 2) return 'iniciante'
  if (f <= 4) return 'intermediario'
  return 'avancado'
}

function pickPrimaryPattern(assessment: Assessment): MovementPattern {
  const scores = assessment.movementScores
  const sorted = Object.entries(scores).sort((a, b) => a[1] - b[1])
  return sorted[0][0] as MovementPattern
}

function findExerciseByPattern(pattern: MovementPattern, avoid: string[] = []): ExerciseDef | null {
  const ex = REGISTRY.find((e) => e.patterns.includes(pattern) && !avoid.includes(e.id))
  return ex || null
}

function findIntegratedPushPull(avoid: string[] = []): ExerciseDef | null {
  const ex = REGISTRY.find((e) => e.patterns.includes('push') && e.patterns.includes('pull') && !avoid.includes(e.id))
  return ex || null
}

function pickCoreExercise(avoid: string[] = []): ExerciseDef | null {
  const ex = REGISTRY.find((e) => e.primary_capacity === 'stability' && !avoid.includes(e.id))
  return ex || null
}

function makeExerciseInstance(def: ExerciseDef, role: 'primary' | 'integrated' | 'core', assessment: Assessment) : ExerciseInstance {
  const pain = Math.max(...assessment.painMap.map(p => p.intensity), 0)
  let execution: ExerciseInstance['execution']
  let rest = def.default_rest_seconds || 45

  if (role === 'primary') {
    execution = { mode: 'reps', value: '6-12' }
    rest = Math.min(90, Math.max(45, rest))
    if (pain >= 6) rest = Math.max(rest, 90)
    if (assessment.primaryGoal === 'emagrecimento') rest = Math.max(30, Math.min(60, rest))
  } else if (role === 'integrated') {
    execution = { mode: 'reps', value: '8-12' }
    rest = Math.min(60, Math.max(30, rest))
    if (rest > 90) rest = 60
  } else {
    execution = { mode: 'tempo', value: '30-45s' }
    rest = Math.min(40, Math.max(20, rest))
  }

  return {
    exerciseId: def.id,
    name: def.name,
    patterns: def.patterns,
    execution,
    rest_after_exercise: rest,
    rationale: `Selecionado por padrão(s) ${def.patterns.join(', ')}`,
  }
}

export function assembleWorkout(assessment: Assessment): WorkoutPlan {
  if (!assessment) throw new Error('Avaliação obrigatória')

  const audit: string[] = []
  const level = determineLevel(assessment)
  audit.push(`level:${level}`)

  const prep = {
    duration_minutes: 10,
    elements: ['mobilidade', 'estabilidade', 'ativação neuromuscular'],
    rationale: 'Preparação do movimento: obrigatório antes dos blocos',
  }

  let maxBlocks = 2
  if (level === 'iniciante') maxBlocks = 2
  if (level === 'intermediario') maxBlocks = 3
  if (level === 'avancado') maxBlocks = 3

  const primaryPattern = pickPrimaryPattern(assessment)
  audit.push(`primaryPattern:${primaryPattern}`)

  const blocks: Block[] = []
  const usedPatterns: string[] = []
  for (let i = 0; i < maxBlocks; i++) {
    const avoid: string[] = []
    const pPattern = i === 0 ? primaryPattern : primaryPattern

    const e1Def = findExerciseByPattern(pPattern, avoid) || REGISTRY[0]
    avoid.push(e1Def.id)
    const e1 = makeExerciseInstance(e1Def, 'primary', assessment)

    const e2Def = findIntegratedPushPull(avoid) || REGISTRY.find(r=>r.id!==e1Def.id)!
    avoid.push(e2Def.id)
    const e2 = makeExerciseInstance(e2Def, 'integrated', assessment)

    const e3Def = pickCoreExercise(avoid) || REGISTRY.find(r=>!avoid.includes(r.id))!
    const e3 = makeExerciseInstance(e3Def, 'core', assessment)

    const block: Block = {
      id: generateId(),
      name: `Bloco ${i + 1} - foco ${pPattern}`,
      exercises: [e1, e2, e3],
      rest_between_blocks_seconds: 120,
      rationale: `Foco em ${pPattern}; core integrado; push+pull integrado.`,
    }

    blocks.push(block)
    usedPatterns.push(...[...e1.patterns, ...e2.patterns, ...e3.patterns])
  }

  let protocol: WorkoutPlan['protocol'] | undefined = undefined
  if (assessment.primaryGoal === 'emagrecimento') {
    protocol = { name: 'HIIT curto', duration_minutes: 8, description: 'Protocolo metabólico curto' }
    audit.push('protocol:HIIT')
  } else if (assessment.primaryGoal === 'saude') {
    protocol = { name: 'Regenerativo', duration_minutes: 6, description: 'Protocolo regenerativo leve' }
    audit.push('protocol:regenerativo')
  }

  return {
    preparation: prep,
    blocks,
    protocol,
    audit: { rulesTriggered: audit },
  }
}
