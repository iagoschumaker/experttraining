import { 
  Assessment, 
  ExerciseDef, 
  WorkoutPlan, 
  Block, 
  ExerciseInstance, 
  MovementPattern,
  DailySchedule,
  ScheduleBlock,
  ScheduleExercise,
  Preparation,
  FinalProtocol
} from './types'
import { EXERCISES as REGISTRY } from './exercises'

// ============================================================================
// CONSTANTES DE DESCANSO (OBRIGATÓRIAS E EXPLÍCITAS)
// ============================================================================

const REST_CONFIG = {
  exercise: {
    FOCO_PRINCIPAL: '60-90s',
    PUSH_PULL_INTEGRADO: '40-60s',
    CORE: '20-40s',
  },
  betweenBlocks: {
    1: '90-120s',  // Bloco 1 → 2
    2: '120-150s', // Bloco 2 → 3
    3: '60-90s',   // Após Bloco 3 (antes do protocolo final)
  },
} as const

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

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

function getPatternLabel(pattern: MovementPattern): string {
  const labels: Record<MovementPattern, string> = {
    squat: 'Agachamento',
    hinge: 'Quadril (Hinge)',
    lunge: 'Passada (Lunge)',
    push: 'Empurrar',
    pull: 'Puxar',
    rotation: 'Rotação',
    gait: 'Marcha',
  }
  return labels[pattern] || pattern
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

// ============================================================================
// GERADOR DE PREPARAÇÃO DO MOVIMENTO
// ============================================================================

function generatePreparation(primaryPattern: MovementPattern, assessment: Assessment): Preparation {
  const patternLabel = getPatternLabel(primaryPattern)
  
  const exercises = [
    { name: `Mobilidade de ${patternLabel.toLowerCase()}`, duration: '3 min' },
    { name: 'Ativação de core e estabilizadores', duration: '3 min' },
    { name: `Estabilidade articular (foco: ${patternLabel})`, duration: '3 min' },
    { name: 'Ativação neuromuscular progressiva', duration: '3 min' },
  ]

  return {
    title: 'Preparação do Movimento',
    totalTime: '12 minutos',
    exercises,
  }
}

// ============================================================================
// GERADOR DE PROTOCOLO FINAL (SEMPRE OBRIGATÓRIO)
// ============================================================================

function generateFinalProtocol(assessment: Assessment): FinalProtocol {
  const goal = assessment.primaryGoal
  
  if (goal === 'emagrecimento') {
    return {
      name: 'HIIT Metabólico',
      totalTime: '8 minutos',
      structure: '30s trabalho / 30s descanso × 8 rounds',
    }
  }
  
  if (goal === 'performance') {
    return {
      name: 'Potência Explosiva',
      totalTime: '6 minutos',
      structure: '20s máximo / 40s recuperação × 6 rounds',
    }
  }
  
  if (goal === 'hipertrofia_funcional') {
    return {
      name: 'Drop Set Funcional',
      totalTime: '8 minutos',
      structure: '3 séries descendentes com pausa mínima',
    }
  }
  
  if (goal === 'recondicionamento') {
    return {
      name: 'Circuito Regenerativo',
      totalTime: '6 minutos',
      structure: 'Movimentos suaves de baixa intensidade',
    }
  }
  
  // saude (default)
  return {
    name: 'Protocolo Regenerativo',
    totalTime: '6 minutos',
    structure: 'Respiração + alongamento ativo',
  }
}

// ============================================================================
// ASSEMBLER DE WORKOUT LEGADO (mantido para compatibilidade)
// ============================================================================

export function assembleWorkout(assessment: Assessment): WorkoutPlan {
  if (!assessment) throw new Error('Avaliação obrigatória')

  const audit: string[] = []
  const level = determineLevel(assessment)
  audit.push(`level:${level}`)

  const prep = {
    duration_minutes: 12,
    elements: ['mobilidade', 'estabilidade', 'ativação neuromuscular'],
    rationale: 'Preparação do movimento: obrigatório antes dos blocos',
  }

  // SEMPRE 3 BLOCOS (regra obrigatória)
  const maxBlocks = 3
  audit.push('blocks:3_obrigatorios')

  const primaryPattern = pickPrimaryPattern(assessment)
  audit.push(`primaryPattern:${primaryPattern}`)

  const blocks: Block[] = []
  for (let i = 0; i < maxBlocks; i++) {
    const avoid: string[] = []
    // FOCO PRINCIPAL EM TODOS OS BLOCOS (regra obrigatória)
    const pPattern = primaryPattern

    const e1Def = findExerciseByPattern(pPattern, avoid) || REGISTRY[0]
    avoid.push(e1Def.id)
    const e1 = makeExerciseInstance(e1Def, 'primary', assessment)

    const e2Def = findIntegratedPushPull(avoid) || REGISTRY.find(r=>r.id!==e1Def.id)!
    avoid.push(e2Def.id)
    const e2 = makeExerciseInstance(e2Def, 'integrated', assessment)

    const e3Def = pickCoreExercise(avoid) || REGISTRY.find(r=>!avoid.includes(r.id))!
    const e3 = makeExerciseInstance(e3Def, 'core', assessment)

    // Descanso entre blocos explícito
    const restBetween = i === 0 ? 105 : i === 1 ? 135 : 75

    const block: Block = {
      id: generateId(),
      name: `Bloco ${i + 1} - foco ${pPattern}`,
      exercises: [e1, e2, e3],
      rest_between_blocks_seconds: restBetween,
      rationale: `Foco em ${pPattern}; core integrado; push+pull integrado.`,
    }

    blocks.push(block)
  }

  // PROTOCOLO FINAL SEMPRE PRESENTE (regra obrigatória)
  const protocol = {
    name: generateFinalProtocol(assessment).name,
    duration_minutes: parseInt(generateFinalProtocol(assessment).totalTime) || 6,
    description: generateFinalProtocol(assessment).structure || 'Protocolo final obrigatório',
  }
  audit.push(`protocol:${protocol.name}`)

  return {
    preparation: prep,
    blocks,
    protocol,
    audit: { rulesTriggered: audit },
  }
}

// ============================================================================
// NOVO: GERADOR DE CRONOGRAMA DIÁRIO COMPLETO (DailySchedule)
// ============================================================================

export function generateDailySchedule(assessment: Assessment): DailySchedule {
  if (!assessment) throw new Error('Avaliação obrigatória')

  const audit: string[] = []
  const level = determineLevel(assessment)
  audit.push(`level:${level}`)

  const primaryPattern = pickPrimaryPattern(assessment)
  audit.push(`primaryPattern:${primaryPattern}`)
  audit.push('blocks:3_obrigatorios')

  // 1. PREPARAÇÃO DO MOVIMENTO (obrigatória)
  const preparation = generatePreparation(primaryPattern, assessment)

  // 2. GERAR OS 3 BLOCOS (SEMPRE 3 - OBRIGATÓRIO)
  const blocks: [ScheduleBlock, ScheduleBlock, ScheduleBlock] = [
    generateScheduleBlock(1, primaryPattern, assessment),
    generateScheduleBlock(2, primaryPattern, assessment),
    generateScheduleBlock(3, primaryPattern, assessment),
  ]

  // 3. PROTOCOLO FINAL (obrigatório, sempre após Bloco 3)
  const finalProtocol = generateFinalProtocol(assessment)
  audit.push(`protocol:${finalProtocol.name}`)

  return {
    focus: getPatternLabel(primaryPattern),
    preparation,
    blocks,
    finalProtocol,
    audit: { rulesTriggered: audit },
  }
}

function generateScheduleBlock(
  blockIndex: 1 | 2 | 3,
  primaryPattern: MovementPattern,
  assessment: Assessment
): ScheduleBlock {
  const avoid: string[] = []

  // Exercício 1: FOCO PRINCIPAL (sempre o padrão principal)
  const e1Def = findExerciseByPattern(primaryPattern, avoid) || REGISTRY[0]
  avoid.push(e1Def.id)
  const e1: ScheduleExercise = {
    role: 'FOCO_PRINCIPAL',
    name: e1Def.name,
    execution: '6-12 repetições controladas',
    rest: REST_CONFIG.exercise.FOCO_PRINCIPAL,
  }

  // Exercício 2: PUSH + PULL INTEGRADO
  const e2Def = findIntegratedPushPull(avoid) || REGISTRY.find(r => r.id !== e1Def.id)!
  avoid.push(e2Def.id)
  const e2: ScheduleExercise = {
    role: 'PUSH_PULL_INTEGRADO',
    name: e2Def.name,
    execution: '8-12 repetições',
    rest: REST_CONFIG.exercise.PUSH_PULL_INTEGRADO,
  }

  // Exercício 3: CORE
  const e3Def = pickCoreExercise(avoid) || REGISTRY.find(r => !avoid.includes(r.id))!
  const e3: ScheduleExercise = {
    role: 'CORE',
    name: e3Def.name,
    execution: '30-45 segundos',
    rest: REST_CONFIG.exercise.CORE,
  }

  return {
    blockIndex,
    exercises: [e1, e2, e3],
    restAfterBlock: REST_CONFIG.betweenBlocks[blockIndex],
  }
}

// ============================================================================
// VALIDADORES (atualizados para bloquear cronogramas inválidos)
// ============================================================================

export function validateDailySchedule(schedule: DailySchedule): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // ❌ Cronograma sem preparação
  if (!schedule.preparation || !schedule.preparation.exercises || schedule.preparation.exercises.length === 0) {
    errors.push('Cronograma sem preparação do movimento')
  }

  // ❌ Menos de 3 blocos
  if (!schedule.blocks || schedule.blocks.length !== 3) {
    errors.push('Cronograma deve ter exatamente 3 blocos')
  }

  // Validar cada bloco
  schedule.blocks?.forEach((block, idx) => {
    // ❌ Bloco sem descanso
    if (!block.restAfterBlock) {
      errors.push(`Bloco ${idx + 1} sem descanso após bloco`)
    }

    // ❌ Bloco que não inicia com foco principal
    if (block.exercises[0]?.role !== 'FOCO_PRINCIPAL') {
      errors.push(`Bloco ${idx + 1} não inicia com FOCO_PRINCIPAL`)
    }

    // ❌ Exercício sem descanso
    block.exercises?.forEach((ex, exIdx) => {
      if (!ex.rest) {
        errors.push(`Bloco ${idx + 1}, Exercício ${exIdx + 1} sem descanso`)
      }
    })
  })

  // ❌ Sem protocolo final
  if (!schedule.finalProtocol || !schedule.finalProtocol.name) {
    errors.push('Cronograma sem protocolo final')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
