// ============================================================================
// EXPERT TRAINING - RULES ENGINE
// ============================================================================
// Motor de decisão IF → THEN para determinação de blocos de treino
// Baseado em padrões de movimento e capacidades físicas
// ============================================================================

import type { 
  AssessmentInput, 
  AssessmentResult, 
  RuleConditionGroup,
  RuleCondition,
  ConditionOperator 
} from '@/types'
import prisma from '@/lib/prisma'

// ============================================================================
// TYPES
// ============================================================================

interface RuleWithData {
  id: string
  name: string
  conditionJson: RuleConditionGroup
  allowedBlocks: string[]
  blockedBlocks: string[]
  recommendations: string[]
  priority: number
}

interface EvaluationContext {
  complaints: string[]
  painMap: Record<string, number>
  movementTests: Record<string, { score: number; observations: string }>
  level: string
}

// ============================================================================
// CONDITION EVALUATOR
// ============================================================================

/**
 * Get nested value from object using dot notation
 * Ex: "painMap.lower_back" → input.painMap.lower_back
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current?.[key]
  }, obj)
}

/**
 * Evaluate a single condition against the input
 */
function evaluateCondition(
  condition: RuleCondition,
  context: EvaluationContext
): boolean {
  const actualValue = getNestedValue(context, condition.field)
  const expectedValue = condition.value

  // Handle undefined/null values
  if (actualValue === undefined || actualValue === null) {
    return false
  }

  switch (condition.operator) {
    case '==':
      return actualValue == expectedValue
    case '!=':
      return actualValue != expectedValue
    case '>':
      return Number(actualValue) > Number(expectedValue)
    case '<':
      return Number(actualValue) < Number(expectedValue)
    case '>=':
      return Number(actualValue) >= Number(expectedValue)
    case '<=':
      return Number(actualValue) <= Number(expectedValue)
    case 'contains':
      if (Array.isArray(actualValue)) {
        return actualValue.includes(expectedValue)
      }
      return String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase())
    case 'not_contains':
      if (Array.isArray(actualValue)) {
        return !actualValue.includes(expectedValue)
      }
      return !String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase())
    default:
      return false
  }
}

/**
 * Evaluate a condition group (AND/OR logic)
 */
function evaluateConditionGroup(
  group: RuleConditionGroup,
  context: EvaluationContext
): boolean {
  const results = group.conditions.map(condition => 
    evaluateCondition(condition, context)
  )

  if (group.operator === 'AND') {
    return results.every(r => r === true)
  } else {
    return results.some(r => r === true)
  }
}

// ============================================================================
// PATTERN DETERMINATION
// ============================================================================

/**
 * Determine the functional pattern based on assessment input
 */
function determineFunctionalPattern(input: AssessmentInput): string {
  const { movementTests, painMap, level } = input
  
  // Calculate pain severity
  const painValues = Object.values(painMap)
  const maxPain = Math.max(...painValues, 0)
  const avgPain = painValues.length > 0 
    ? painValues.reduce((a, b) => a + b, 0) / painValues.length 
    : 0

  // Calculate movement scores
  const movementScores = Object.values(movementTests).map(t => t.score)
  const avgMovement = movementScores.reduce((a, b) => a + b, 0) / movementScores.length
  const minMovement = Math.min(...movementScores)

  // Determine pattern
  if (maxPain >= 7 || avgPain >= 5) {
    return 'CORRECTIVE_DOMINANT'
  }
  
  if (minMovement <= 1 || avgMovement < 2) {
    return 'MOBILITY_FOCUS'
  }
  
  if (level === 'BEGINNER') {
    return 'FOUNDATION_BUILDING'
  }
  
  if (avgMovement >= 2.5 && maxPain <= 3) {
    if (level === 'ADVANCED') {
      return 'PERFORMANCE_OPTIMIZATION'
    }
    return 'STRENGTH_DEVELOPMENT'
  }
  
  return 'BALANCED_PROGRESSION'
}

/**
 * Determine primary and secondary focus areas
 */
function determineFocus(input: AssessmentInput): { primary: string; secondary: string[] } {
  const { movementTests, painMap } = input
  
  const priorities: { area: string; score: number }[] = []

  // Analyze pain areas
  for (const [area, intensity] of Object.entries(painMap)) {
    if (intensity >= 4) {
      priorities.push({ 
        area: `${area}_recovery`, 
        score: intensity * 2 
      })
    }
  }

  // Analyze movement deficits
  const movementMap: Record<string, string> = {
    squat: 'hip_mobility',
    hinge: 'posterior_chain',
    lunge: 'unilateral_stability',
    push: 'shoulder_stability',
    pull: 'scapular_control',
    rotation: 'thoracic_mobility',
    gait: 'locomotion_pattern',
  }

  for (const [test, result] of Object.entries(movementTests)) {
    if (result.score <= 1) {
      priorities.push({ 
        area: movementMap[test] || test, 
        score: (3 - result.score) * 3 
      })
    } else if (result.score === 2) {
      priorities.push({ 
        area: movementMap[test] || test, 
        score: 1 
      })
    }
  }

  // Sort by score
  priorities.sort((a, b) => b.score - a.score)

  const primary = priorities[0]?.area || 'general_conditioning'
  const secondary = priorities
    .slice(1, 4)
    .map(p => p.area)
    .filter(a => a !== primary)

  return { primary, secondary }
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

/**
 * Process an assessment through the rules engine
 */
export async function processAssessment(
  input: AssessmentInput
): Promise<AssessmentResult> {
  // Build context for evaluation
  const context: EvaluationContext = {
    complaints: input.complaints,
    painMap: input.painMap,
    movementTests: input.movementTests as unknown as Record<string, { score: number; observations: string }>,
    level: input.level,
  }

  // Get all active rules, ordered by priority
  const rules = await prisma.rule.findMany({
    where: { isActive: true },
    orderBy: { priority: 'desc' },
    select: {
      id: true,
      name: true,
      conditionJson: true,
      allowedBlocks: true,
      blockedBlocks: true,
      recommendations: true,
      priority: true,
    },
  })

  // Evaluate each rule
  const matchedRules: RuleWithData[] = []
  
  for (const rule of rules) {
    const conditionGroup = rule.conditionJson as unknown as RuleConditionGroup
    
    if (evaluateConditionGroup(conditionGroup, context)) {
      matchedRules.push(rule as unknown as RuleWithData)
    }
  }

  // Aggregate results from matched rules
  const allowedBlocksSet = new Set<string>()
  const blockedBlocksSet = new Set<string>()
  const recommendationsSet = new Set<string>()

  for (const rule of matchedRules) {
    rule.allowedBlocks.forEach(b => allowedBlocksSet.add(b))
    rule.blockedBlocks.forEach(b => blockedBlocksSet.add(b))
    rule.recommendations.forEach(r => recommendationsSet.add(r))
  }

  // Remove blocked blocks from allowed
  blockedBlocksSet.forEach(b => allowedBlocksSet.delete(b))

  // Get default blocks based on level if no specific rules matched
  if (allowedBlocksSet.size === 0) {
    const defaultBlocks = await getDefaultBlocks(input.level)
    defaultBlocks.forEach(b => allowedBlocksSet.add(b))
  }

  // Determine pattern and focus
  const functionalPattern = determineFunctionalPattern(input)
  const { primary, secondary } = determineFocus(input)

  // Calculate confidence based on rule coverage
  const confidence = calculateConfidence(matchedRules, input)

  return {
    functionalPattern,
    primaryFocus: primary,
    secondaryFocus: secondary,
    allowedBlocks: Array.from(allowedBlocksSet),
    blockedBlocks: Array.from(blockedBlocksSet),
    recommendations: Array.from(recommendationsSet),
    confidence,
  }
}

/**
 * Get default blocks based on level
 */
async function getDefaultBlocks(level: string): Promise<string[]> {
  const levelMap: Record<string, number> = {
    BEGINNER: 1,
    INTERMEDIATE: 2,
    ADVANCED: 3,
  }

  const maxLevel = levelMap[level] || 1

  const blocks = await prisma.block.findMany({
    where: {
      isActive: true,
      level: { lte: maxLevel },
      riskLevel: { in: ['LOW', 'MODERATE'] },
    },
    select: { code: true },
    take: 10,
  })

  return blocks.map((b: { code: string }) => b.code)
}

/**
 * Calculate confidence score based on matched rules
 */
function calculateConfidence(
  matchedRules: RuleWithData[],
  input: AssessmentInput
): number {
  let confidence = 50 // Base confidence

  // More matched rules = higher confidence
  confidence += Math.min(matchedRules.length * 10, 30)

  // Check data completeness
  const painValues = Object.values(input.painMap)
  if (painValues.length >= 5) confidence += 5
  
  const movementTests = Object.values(input.movementTests)
  const completedTests = movementTests.filter(t => t.score > 0 || t.observations)
  if (completedTests.length >= 5) confidence += 10

  // Cap at 95
  return Math.min(confidence, 95)
}

// ============================================================================
// EXPORTS
// ============================================================================

export { evaluateCondition, evaluateConditionGroup, determineFunctionalPattern }
