// ============================================================================
// MOTOR DE DECISÃO — ENGINE PRINCIPAL
// ============================================================================
// Função principal que orquestra a geração do plano de treino
// ============================================================================

import {
  AssessmentInput,
  DecisionContext,
  TrainingPlan,
  TrainingDay,
  TrainingBlock,
  PreparationBlock,
  FinalProtocol,
  FocusExercise,
  IntegratedPushPullExercise,
  CoreExercise,
  MovementPattern,
  ExerciseCatalogEntry,
} from './types'

import { validateAssessment, validateTrainingPlan } from './validators'
import { executeRules } from './rules'
import {
  EXERCISE_CATALOG,
  findFocusExercises,
  findIntegratedExercises,
  findCoreExercises,
} from './catalog'

// ============================================================================
// CONSTANTES
// ============================================================================

const BASE_REST_BETWEEN_BLOCKS = 120 // segundos
const PREPARATION_DURATION_DEFAULT = 10 // minutos
const PREPARATION_DURATION_MOBILITY_FOCUS = 15 // minutos

// Focos por dia da semana baseados em padrões de movimento
const DAY_FOCUS_PATTERNS: MovementPattern[][] = [
  ['squat', 'push'],      // Dia 1: Quadríceps dominante
  ['hinge', 'pull'],      // Dia 2: Posterior dominante
  ['lunge', 'rotation'],  // Dia 3: Unilateral + Rotação
  ['squat', 'push'],      // Dia 4: Variação squat
  ['hinge', 'gait'],      // Dia 5: Posterior + Marcha
  ['lunge', 'rotation'],  // Dia 6: Variação unilateral
  ['gait', 'rotation'],   // Dia 7: Integração global
]

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function generateId(): string {
  return `id_${Date.now().toString(36)}_${Math.floor(Math.random() * 10000)}`
}

function createDecisionContext(assessment: AssessmentInput): DecisionContext {
  return {
    assessment,
    maxBlocks: 2, // Default
    restMultiplier: 1.0,
    blockedPatterns: [],
    blockedRegions: [],
    prioritizeCore: false,
    prioritizeStability: false,
    protocolType: null,
    auditLog: [],
  }
}

function selectPrimaryPattern(
  assessment: AssessmentInput,
  dayPatterns: MovementPattern[],
  blockedPatterns: MovementPattern[]
): MovementPattern {
  // Encontra o padrão com menor score (mais limitante) entre os do dia
  const availablePatterns = dayPatterns.filter(p => !blockedPatterns.includes(p))
  
  if (availablePatterns.length === 0) {
    // Fallback: rotation ou gait (mais seguros)
    return 'rotation'
  }

  let lowestScore = Infinity
  let selectedPattern: MovementPattern = availablePatterns[0]

  for (const pattern of availablePatterns) {
    const score = assessment.movementScores[pattern]
    if (score < lowestScore) {
      lowestScore = score
      selectedPattern = pattern
    }
  }

  return selectedPattern
}

function selectExerciseFromCatalog(
  entries: ExerciseCatalogEntry[],
  usedIds: Set<string>
): ExerciseCatalogEntry | null {
  const available = entries.filter(e => !usedIds.has(e.id))
  if (available.length === 0) return entries[0] ?? null
  return available[Math.floor(Math.random() * available.length)]
}

// ============================================================================
// GERAÇÃO DE PREPARAÇÃO
// ============================================================================

function generatePreparation(
  ctx: DecisionContext
): PreparationBlock {
  const hasMobilityLimitation = ctx.assessment.limitations.includes('MOBILIDADE')
  const duration = hasMobilityLimitation
    ? PREPARATION_DURATION_MOBILITY_FOCUS
    : PREPARATION_DURATION_DEFAULT

  const elements = [
    {
      name: 'Mobilidade Articular',
      duration: '3-4 min',
      focus: 'Tornozelos, quadris, coluna torácica',
    },
    {
      name: 'Ativação Neuromuscular',
      duration: '2-3 min',
      focus: 'Glúteos, core, escápulas',
    },
    {
      name: 'Estabilidade Dinâmica',
      duration: '2-3 min',
      focus: 'Padrões básicos de movimento',
    },
  ]

  if (hasMobilityLimitation) {
    elements.unshift({
      name: 'Liberação Miofascial',
      duration: '3-4 min',
      focus: 'Áreas de restrição identificadas',
    })
  }

  if (ctx.prioritizeStability) {
    elements.push({
      name: 'Ativação de Core',
      duration: '2-3 min',
      focus: 'Respiração diafragmática, bracing',
    })
  }

  ctx.auditLog.push(
    `[PREPARAÇÃO] Duração: ${duration}min, ${elements.length} elementos`
  )

  return {
    durationMinutes: duration,
    elements,
    rationale: `Preparação do movimento: ${duration} minutos. ${
      hasMobilityLimitation ? 'Foco extra em mobilidade.' : ''
    } ${ctx.prioritizeStability ? 'Ativação de core priorizada.' : ''}`.trim(),
  }
}

// ============================================================================
// GERAÇÃO DE BLOCO
// ============================================================================

function generateBlock(
  blockIndex: number,
  primaryPattern: MovementPattern,
  ctx: DecisionContext,
  usedExerciseIds: Set<string>
): TrainingBlock {
  const contraindications = ctx.blockedRegions

  // Exercício 1: FOCUS (padrão principal)
  const focusOptions = findFocusExercises(
    primaryPattern,
    ctx.blockedPatterns,
    contraindications
  )
  const focusEntry = selectExerciseFromCatalog(focusOptions, usedExerciseIds)

  if (!focusEntry) {
    // Fallback para qualquer exercício de focus disponível
    const allFocus = EXERCISE_CATALOG.filter(e => e.slot === 'FOCUS')
    const fallback = selectExerciseFromCatalog(allFocus, usedExerciseIds)
    if (!fallback) throw new Error('Sem exercícios de focus disponíveis')
  }

  const focusEx = focusEntry!
  usedExerciseIds.add(focusEx.id)

  const focusRest = Math.round(focusEx.defaultRest * ctx.restMultiplier)

  const focusExercise: FocusExercise = {
    id: focusEx.id,
    name: focusEx.name,
    patterns: focusEx.patterns,
    execution: { ...focusEx.defaultExecution },
    restAfter: Math.max(45, Math.min(90, focusRest)),
    rationale: `Foco principal: padrão ${primaryPattern}`,
    slot: 'FOCUS',
  }

  // Exercício 2: INTEGRATED_PUSH_PULL
  const maxRisk = ctx.assessment.level === 'INICIANTE' ? 'BAIXO' : 'MODERADO'
  const integratedOptions = findIntegratedExercises(contraindications, maxRisk)
  const integratedEntry = selectExerciseFromCatalog(integratedOptions, usedExerciseIds)

  if (!integratedEntry) {
    throw new Error('Sem exercícios integrados push+pull disponíveis')
  }

  usedExerciseIds.add(integratedEntry.id)

  const integratedRest = Math.round(integratedEntry.defaultRest * ctx.restMultiplier)

  const integratedExercise: IntegratedPushPullExercise = {
    id: integratedEntry.id,
    name: integratedEntry.name,
    patterns: integratedEntry.patterns,
    execution: { ...integratedEntry.defaultExecution },
    restAfter: Math.max(30, Math.min(60, integratedRest)),
    rationale: 'Movimento integrado push + pull',
    slot: 'INTEGRATED_PUSH_PULL',
  }

  // Exercício 3: CORE
  const coreType = ctx.prioritizeCore ? 'anti_extension' : undefined
  const coreOptions = findCoreExercises(contraindications, coreType)
  const coreEntry = selectExerciseFromCatalog(coreOptions, usedExerciseIds)

  if (!coreEntry) {
    throw new Error('Sem exercícios de core disponíveis')
  }

  usedExerciseIds.add(coreEntry.id)

  const coreRest = Math.round(coreEntry.defaultRest * ctx.restMultiplier)

  const coreExercise: CoreExercise = {
    id: coreEntry.id,
    name: coreEntry.name,
    patterns: coreEntry.patterns,
    execution: { ...coreEntry.defaultExecution },
    restAfter: Math.max(20, Math.min(40, coreRest)),
    rationale: ctx.prioritizeCore
      ? 'Core desafiador (priorizado por regra de dor)'
      : 'Core desafiador',
    slot: 'CORE',
  }

  const restBetweenBlocks = Math.round(BASE_REST_BETWEEN_BLOCKS * ctx.restMultiplier)

  ctx.auditLog.push(
    `[BLOCO ${blockIndex + 1}] Focus: ${focusEx.name}, Integrado: ${integratedEntry.name}, Core: ${coreEntry.name}`
  )

  return {
    index: blockIndex,
    name: `Bloco ${blockIndex + 1} - ${primaryPattern.toUpperCase()}`,
    exercises: [focusExercise, integratedExercise, coreExercise],
    restBetweenBlocks: Math.max(90, Math.min(180, restBetweenBlocks)),
    rationale: `Bloco ${blockIndex + 1}: foco em ${primaryPattern}, exercício integrado push+pull, core desafiador.`,
  }
}

// ============================================================================
// GERAÇÃO DE PROTOCOLO FINAL
// ============================================================================

function generateProtocol(ctx: DecisionContext): FinalProtocol | undefined {
  if (!ctx.protocolType) return undefined

  const protocols: Record<FinalProtocol['type'], FinalProtocol> = {
    HIIT: {
      name: 'HIIT - Alta Intensidade',
      type: 'HIIT',
      durationMinutes: 8,
      description: '30s trabalho / 30s descanso, 8 rounds',
      rationale: 'Protocolo metabólico para emagrecimento',
    },
    METABOLICO: {
      name: 'Circuito Metabólico',
      type: 'METABOLICO',
      durationMinutes: 10,
      description: 'Circuito de 4 exercícios, 3 rounds',
      rationale: 'Protocolo metabólico para hipertrofia funcional',
    },
    REGENERATIVO: {
      name: 'Protocolo Regenerativo',
      type: 'REGENERATIVO',
      durationMinutes: 6,
      description: 'Respiração + alongamento leve + relaxamento',
      rationale: 'Protocolo de recuperação ativa',
    },
    POTENCIA: {
      name: 'Potência Controlada',
      type: 'POTENCIA',
      durationMinutes: 8,
      description: 'Sprints curtos ou saltos com descanso completo',
      rationale: 'Protocolo de potência para performance',
    },
  }

  ctx.auditLog.push(`[PROTOCOLO] ${protocols[ctx.protocolType].name}`)

  return protocols[ctx.protocolType]
}

// ============================================================================
// GERAÇÃO DE DIA DE TREINO
// ============================================================================

function generateTrainingDay(
  dayIndex: number,
  ctx: DecisionContext
): TrainingDay {
  const dayPatterns = DAY_FOCUS_PATTERNS[dayIndex % DAY_FOCUS_PATTERNS.length]
  const primaryPattern = selectPrimaryPattern(
    ctx.assessment,
    dayPatterns,
    ctx.blockedPatterns
  )

  ctx.auditLog.push(`[DIA ${dayIndex + 1}] Padrão principal: ${primaryPattern}`)

  // Preparação (obrigatória)
  const preparation = generatePreparation(ctx)

  // Blocos
  const blocks: TrainingBlock[] = []
  const usedExerciseIds = new Set<string>()

  for (let i = 0; i < ctx.maxBlocks; i++) {
    // Para bloco 3, usar padrão mais integrado
    const blockPattern =
      i === 2 ? 'rotation' : i === 1 ? dayPatterns[1] ?? primaryPattern : primaryPattern

    const block = generateBlock(i, blockPattern, ctx, usedExerciseIds)
    blocks.push(block)
  }

  // Protocolo final (opcional, após blocos)
  const protocol = generateProtocol(ctx)

  return {
    dayIndex,
    focus: `Foco: ${primaryPattern.toUpperCase()}`,
    preparation,
    blocks,
    protocol,
  }
}

// ============================================================================
// FUNÇÃO PRINCIPAL: generateTrainingPlan
// ============================================================================

export function generateTrainingPlan(assessment: AssessmentInput): TrainingPlan {
  // 1. Validar entrada
  validateAssessment(assessment)

  // 2. Criar contexto de decisão
  const ctx = createDecisionContext(assessment)

  // 3. Executar regras IF/THEN (alteram contexto)
  executeRules(assessment, ctx)

  // 4. Ajustar maxBlocks por nível (regras já aplicaram, mas garantimos limites)
  if (assessment.level === 'INICIANTE') {
    ctx.maxBlocks = Math.min(ctx.maxBlocks, 2)
  } else if (assessment.level === 'AVANCADO') {
    ctx.maxBlocks = Math.min(ctx.maxBlocks, 3)
  } else {
    // Intermediário: 2-3 dependendo do objetivo (já aplicado pelas regras)
    ctx.maxBlocks = Math.min(ctx.maxBlocks, 3)
  }

  ctx.auditLog.push(`[CONFIG] Blocos por dia: ${ctx.maxBlocks}, Multiplicador descanso: ${ctx.restMultiplier.toFixed(2)}`)

  // 5. Gerar dias de treino
  const days: TrainingDay[] = []
  for (let i = 0; i < assessment.frequencyPerWeek; i++) {
    const day = generateTrainingDay(i, ctx)
    days.push(day)
  }

  // 6. Validar plano completo
  validateTrainingPlan(days, assessment.frequencyPerWeek)

  ctx.auditLog.push(`[RESULTADO] Plano gerado: ${days.length} dias, ${days.reduce((acc, d) => acc + d.blocks.length, 0)} blocos total`)

  return {
    days,
    auditLog: ctx.auditLog,
  }
}
