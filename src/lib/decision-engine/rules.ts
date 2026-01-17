// ============================================================================
// MOTOR DE DECISÃO — REGRAS IF/THEN
// ============================================================================
// Sistema de regras versionadas do Método EXPERT PRO TRAINING
// Cada regra altera o contexto de decisão antes da geração do treino
// ============================================================================

import { Rule, AssessmentInput, DecisionContext } from './types'

// ============================================================================
// REGRAS DE DOR (PRIORIDADE ALTA)
// ============================================================================

const RULE_PAIN_LUMBAR_HIGH: Rule = {
  id: 'pain_lumbar_high',
  priority: 100,
  condition: (input: AssessmentInput) => {
    const lumbarPain = input.painMap['lombar'] ?? input.painMap['lower_back'] ?? 0
    return lumbarPain >= 6
  },
  action: (ctx: DecisionContext) => {
    ctx.blockedPatterns.push('hinge')
    ctx.blockedRegions.push('dor_lombar_aguda')
    ctx.restMultiplier = Math.max(ctx.restMultiplier, 1.5)
    ctx.prioritizeCore = true
  },
  reason: 'Dor lombar ≥6: bloquear carga axial, priorizar core anti-extensão, aumentar descanso',
}

const RULE_PAIN_LUMBAR_HINGE_BLOCKED: Rule = {
  id: 'pain_lumbar_hinge_blocked',
  priority: 99,
  condition: (input: AssessmentInput) => {
    const lumbarPain = input.painMap['lombar'] ?? input.painMap['lower_back'] ?? 0
    return lumbarPain >= 6 && input.movementScores.hinge <= 1
  },
  action: (ctx: DecisionContext) => {
    ctx.blockedPatterns.push('hinge')
    ctx.prioritizeStability = true
  },
  reason: 'Dor lombar ≥6 E hinge ≤1: bloquear hinge, priorizar estabilidade',
}

const RULE_PAIN_KNEE_HIGH: Rule = {
  id: 'pain_knee_high',
  priority: 98,
  condition: (input: AssessmentInput) => {
    const kneePain = input.painMap['joelho'] ?? input.painMap['knee'] ?? 0
    return kneePain >= 6
  },
  action: (ctx: DecisionContext) => {
    ctx.blockedPatterns.push('squat', 'lunge')
    ctx.blockedRegions.push('dor_joelho_aguda')
    ctx.restMultiplier = Math.max(ctx.restMultiplier, 1.3)
  },
  reason: 'Dor joelho ≥6: bloquear squat e lunge',
}

const RULE_PAIN_SHOULDER_HIGH: Rule = {
  id: 'pain_shoulder_high',
  priority: 97,
  condition: (input: AssessmentInput) => {
    const shoulderPain = input.painMap['ombro'] ?? input.painMap['shoulder'] ?? 0
    return shoulderPain >= 6
  },
  action: (ctx: DecisionContext) => {
    ctx.blockedRegions.push('dor_ombro_aguda')
  },
  reason: 'Dor ombro ≥6: evitar exercícios com overhead ou carga em ombro',
}

// ============================================================================
// REGRAS DE OBJETIVO (PRIORIDADE MÉDIA)
// ============================================================================

const RULE_GOAL_EMAGRECIMENTO: Rule = {
  id: 'goal_emagrecimento',
  priority: 50,
  condition: (input: AssessmentInput) => input.goal === 'EMAGRECIMENTO',
  action: (ctx: DecisionContext) => {
    ctx.restMultiplier = Math.min(ctx.restMultiplier, 0.8)
    ctx.protocolType = 'HIIT'
  },
  reason: 'Objetivo emagrecimento: reduzir descanso entre blocos, protocolo HIIT',
}

const RULE_GOAL_PERFORMANCE: Rule = {
  id: 'goal_performance',
  priority: 50,
  condition: (input: AssessmentInput) => input.goal === 'PERFORMANCE',
  action: (ctx: DecisionContext) => {
    ctx.restMultiplier = Math.max(ctx.restMultiplier, 1.2)
    ctx.protocolType = 'POTENCIA'
    if (ctx.assessment.level !== 'INICIANTE') {
      ctx.maxBlocks = 3
    }
  },
  reason: 'Objetivo performance: descanso completo, protocolo potência, 3 blocos se não iniciante',
}

const RULE_GOAL_SAUDE: Rule = {
  id: 'goal_saude',
  priority: 50,
  condition: (input: AssessmentInput) => input.goal === 'SAUDE',
  action: (ctx: DecisionContext) => {
    ctx.protocolType = 'REGENERATIVO'
  },
  reason: 'Objetivo saúde: protocolo regenerativo',
}

const RULE_GOAL_RECONDICIONAMENTO: Rule = {
  id: 'goal_recondicionamento',
  priority: 50,
  condition: (input: AssessmentInput) => input.goal === 'RECONDICIONAMENTO',
  action: (ctx: DecisionContext) => {
    ctx.restMultiplier = Math.max(ctx.restMultiplier, 1.3)
    ctx.protocolType = 'REGENERATIVO'
    ctx.maxBlocks = Math.min(ctx.maxBlocks, 2)
  },
  reason: 'Objetivo recondicionamento: mais descanso, máximo 2 blocos, protocolo regenerativo',
}

const RULE_GOAL_HIPERTROFIA: Rule = {
  id: 'goal_hipertrofia',
  priority: 50,
  condition: (input: AssessmentInput) => input.goal === 'HIPERTROFIA_FUNCIONAL',
  action: (ctx: DecisionContext) => {
    ctx.restMultiplier = Math.max(ctx.restMultiplier, 1.0)
    ctx.protocolType = 'METABOLICO'
  },
  reason: 'Objetivo hipertrofia funcional: descanso normal, protocolo metabólico',
}

// ============================================================================
// REGRAS DE NÍVEL (PRIORIDADE MÉDIA)
// ============================================================================

const RULE_LEVEL_INICIANTE: Rule = {
  id: 'level_iniciante',
  priority: 40,
  condition: (input: AssessmentInput) => input.level === 'INICIANTE',
  action: (ctx: DecisionContext) => {
    ctx.maxBlocks = 2
    ctx.restMultiplier = Math.max(ctx.restMultiplier, 1.2)
  },
  reason: 'Nível iniciante: máximo 2 blocos, descanso aumentado',
}

const RULE_LEVEL_INTERMEDIARIO: Rule = {
  id: 'level_intermediario',
  priority: 40,
  condition: (input: AssessmentInput) => input.level === 'INTERMEDIARIO',
  action: (ctx: DecisionContext) => {
    // Mantém default de 2-3 blocos
    // Pode ter 3 se objetivo for performance
  },
  reason: 'Nível intermediário: 2-3 blocos dependendo do objetivo',
}

const RULE_LEVEL_AVANCADO: Rule = {
  id: 'level_avancado',
  priority: 40,
  condition: (input: AssessmentInput) => input.level === 'AVANCADO',
  action: (ctx: DecisionContext) => {
    ctx.maxBlocks = 3
  },
  reason: 'Nível avançado: 3 blocos',
}

// ============================================================================
// REGRAS DE LIMITAÇÃO (PRIORIDADE MÉDIA)
// ============================================================================

const RULE_LIMITATION_STABILITY: Rule = {
  id: 'limitation_stability',
  priority: 45,
  condition: (input: AssessmentInput) => input.limitations.includes('ESTABILIDADE'),
  action: (ctx: DecisionContext) => {
    ctx.prioritizeStability = true
    ctx.prioritizeCore = true
  },
  reason: 'Limitação de estabilidade: priorizar exercícios de estabilidade e core',
}

const RULE_LIMITATION_MOBILITY: Rule = {
  id: 'limitation_mobility',
  priority: 45,
  condition: (input: AssessmentInput) => input.limitations.includes('MOBILIDADE'),
  action: (ctx: DecisionContext) => {
    // Preparação mais longa será ajustada no engine
  },
  reason: 'Limitação de mobilidade: preparação estendida',
}

// ============================================================================
// REGRAS DE PADRÕES DE MOVIMENTO (PRIORIDADE BAIXA)
// ============================================================================

const RULE_POOR_SQUAT: Rule = {
  id: 'poor_squat',
  priority: 30,
  condition: (input: AssessmentInput) => input.movementScores.squat <= 1,
  action: (ctx: DecisionContext) => {
    // Usar variações mais seguras de squat
  },
  reason: 'Squat score ≤1: usar variações controladas (box squat)',
}

const RULE_POOR_HINGE: Rule = {
  id: 'poor_hinge',
  priority: 30,
  condition: (input: AssessmentInput) => input.movementScores.hinge <= 1,
  action: (ctx: DecisionContext) => {
    // Usar variações mais seguras de hinge
  },
  reason: 'Hinge score ≤1: usar variações com suporte (hip hinge com bastão)',
}

// ============================================================================
// REGISTRO DE REGRAS (ORDENADO POR PRIORIDADE)
// ============================================================================

export const RULES: Rule[] = [
  // Prioridade alta (dor)
  RULE_PAIN_LUMBAR_HIGH,
  RULE_PAIN_LUMBAR_HINGE_BLOCKED,
  RULE_PAIN_KNEE_HIGH,
  RULE_PAIN_SHOULDER_HIGH,
  // Prioridade média (objetivo)
  RULE_GOAL_EMAGRECIMENTO,
  RULE_GOAL_PERFORMANCE,
  RULE_GOAL_SAUDE,
  RULE_GOAL_RECONDICIONAMENTO,
  RULE_GOAL_HIPERTROFIA,
  // Prioridade média (nível)
  RULE_LEVEL_INICIANTE,
  RULE_LEVEL_INTERMEDIARIO,
  RULE_LEVEL_AVANCADO,
  // Prioridade média (limitações)
  RULE_LIMITATION_STABILITY,
  RULE_LIMITATION_MOBILITY,
  // Prioridade baixa (padrões)
  RULE_POOR_SQUAT,
  RULE_POOR_HINGE,
].sort((a, b) => b.priority - a.priority)

// ============================================================================
// EXECUTOR DE REGRAS
// ============================================================================

export function executeRules(
  input: AssessmentInput,
  ctx: DecisionContext
): void {
  for (const rule of RULES) {
    if (rule.condition(input)) {
      rule.action(ctx)
      ctx.auditLog.push(`[REGRA:${rule.id}] ${rule.reason}`)
    }
  }
}
