// ============================================================================
// MOTOR DE DECISÃO — ÍNDICE DE EXPORTAÇÃO
// ============================================================================
// Exporta todos os tipos, funções e constantes do motor de decisão
// ============================================================================

// Tipos
export * from './types'

// Catálogo de exercícios
export * from './catalog'

// Sistema de regras
export { RULES, executeRules } from './rules'

// Validadores
export {
  validateAssessment,
  validateBlock,
  validateTrainingDay,
  validateTrainingPlan,
} from './validators'

// Engine principal
export { generateTrainingPlan } from './engine'
