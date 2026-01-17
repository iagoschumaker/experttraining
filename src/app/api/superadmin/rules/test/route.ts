// ============================================================================
// EXPERT PRO TRAINING - SUPERADMIN RULES TEST API
// ============================================================================
// POST /api/superadmin/rules/test - Testa regras com dados de avaliação mock
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'

// ============================================================================
// TYPES
// ============================================================================

interface RuleCondition {
  field: string
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'not_contains'
  value: string | number | boolean
}

interface RuleConditionGroup {
  operator: 'AND' | 'OR'
  conditions: RuleCondition[]
}

interface EvaluationContext {
  complaints: string[]
  painMap: Record<string, number>
  movementTests: Record<string, { score: number; observations: string }>
  level: string
}

// ============================================================================
// SCHEMA
// ============================================================================

const testRequestSchema = z.object({
  // Assessment data to test against
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).default('INTERMEDIATE'),
  complaints: z.array(z.string()).default([]),
  painMap: z.record(z.number().min(0).max(10)).default({}),
  movementTests: z.record(
    z.object({
      score: z.number().min(0).max(3),
      observations: z.string().optional().default(''),
    })
  ).default({}),
  
  // Optional: test only specific rules
  ruleIds: z.array(z.string()).optional(),
  
  // Optional: test a rule condition without saving
  testCondition: z.object({
    operator: z.enum(['AND', 'OR']),
    conditions: z.array(z.object({
      field: z.string(),
      operator: z.enum(['==', '!=', '>', '<', '>=', '<=', 'contains', 'not_contains']),
      value: z.union([z.string(), z.number(), z.boolean()]),
    })),
  }).optional(),
})

// ============================================================================
// MIDDLEWARE
// ============================================================================

async function verifySuperAdmin() {
  const accessToken = await getAccessTokenCookie()
  
  if (!accessToken) {
    return { error: 'Não autenticado', status: 401 }
  }

  const payload = verifyAccessToken(accessToken)
  
  if (!payload || !payload.isSuperAdmin) {
    return { error: 'Acesso negado', status: 403 }
  }

  return { payload }
}

// ============================================================================
// CONDITION EVALUATION
// ============================================================================

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current?.[key]
  }, obj)
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(
  condition: RuleCondition,
  context: EvaluationContext
): { result: boolean; actualValue: any; explanation: string } {
  const actualValue = getNestedValue(context, condition.field)
  const expectedValue = condition.value

  // Handle undefined/null values
  if (actualValue === undefined || actualValue === null) {
    return {
      result: false,
      actualValue: null,
      explanation: `Campo "${condition.field}" não definido na avaliação`,
    }
  }

  let result = false
  let explanation = ''

  switch (condition.operator) {
    case '==':
      result = actualValue == expectedValue
      explanation = `${actualValue} == ${expectedValue}`
      break
    case '!=':
      result = actualValue != expectedValue
      explanation = `${actualValue} != ${expectedValue}`
      break
    case '>':
      result = Number(actualValue) > Number(expectedValue)
      explanation = `${actualValue} > ${expectedValue}`
      break
    case '<':
      result = Number(actualValue) < Number(expectedValue)
      explanation = `${actualValue} < ${expectedValue}`
      break
    case '>=':
      result = Number(actualValue) >= Number(expectedValue)
      explanation = `${actualValue} >= ${expectedValue}`
      break
    case '<=':
      result = Number(actualValue) <= Number(expectedValue)
      explanation = `${actualValue} <= ${expectedValue}`
      break
    case 'contains':
      if (Array.isArray(actualValue)) {
        result = actualValue.includes(expectedValue)
        explanation = `[${actualValue.join(', ')}] contém "${expectedValue}"`
      } else {
        result = String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase())
        explanation = `"${actualValue}" contém "${expectedValue}"`
      }
      break
    case 'not_contains':
      if (Array.isArray(actualValue)) {
        result = !actualValue.includes(expectedValue)
        explanation = `[${actualValue.join(', ')}] não contém "${expectedValue}"`
      } else {
        result = !String(actualValue).toLowerCase().includes(String(expectedValue).toLowerCase())
        explanation = `"${actualValue}" não contém "${expectedValue}"`
      }
      break
  }

  return { result, actualValue, explanation }
}

/**
 * Evaluate a condition group
 */
function evaluateConditionGroup(
  group: RuleConditionGroup,
  context: EvaluationContext
): {
  result: boolean
  conditionResults: Array<{
    field: string
    operator: string
    expectedValue: any
    actualValue: any
    result: boolean
    explanation: string
  }>
} {
  const conditionResults = group.conditions.map(condition => {
    const evaluation = evaluateCondition(condition, context)
    return {
      field: condition.field,
      operator: condition.operator,
      expectedValue: condition.value,
      actualValue: evaluation.actualValue,
      result: evaluation.result,
      explanation: evaluation.explanation,
    }
  })

  const results = conditionResults.map(r => r.result)
  const groupResult = group.operator === 'AND'
    ? results.every(r => r === true)
    : results.some(r => r === true)

  return {
    result: groupResult,
    conditionResults,
  }
}

// ============================================================================
// POST - Test rules
// ============================================================================

export async function POST(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const validation = testRequestSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { level, complaints, painMap, movementTests, ruleIds, testCondition } = validation.data

    // Build context
    const context: EvaluationContext = {
      level,
      complaints,
      painMap,
      movementTests: movementTests as Record<string, { score: number; observations: string }>,
    }

    // If testing a single condition (not saved rule)
    if (testCondition) {
      const evaluation = evaluateConditionGroup(testCondition as RuleConditionGroup, context)
      
      return NextResponse.json({
        success: true,
        data: {
          testCondition: {
            operator: testCondition.operator,
            result: evaluation.result,
            conditionResults: evaluation.conditionResults,
          },
          context,
        },
      })
    }

    // Get rules to test
    const where: any = { isActive: true }
    if (ruleIds && ruleIds.length > 0) {
      where.id = { in: ruleIds }
    }

    const rules = await prisma.rule.findMany({
      where,
      orderBy: { priority: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        conditionJson: true,
        allowedBlocks: true,
        blockedBlocks: true,
        recommendations: true,
        priority: true,
        isActive: true,
      },
    })

    // Evaluate each rule
    const ruleResults = rules.map(rule => {
      const conditionGroup = rule.conditionJson as unknown as RuleConditionGroup
      const evaluation = evaluateConditionGroup(conditionGroup, context)
      
      return {
        id: rule.id,
        name: rule.name,
        description: rule.description,
        priority: rule.priority,
        matched: evaluation.result,
        operator: conditionGroup.operator,
        conditionResults: evaluation.conditionResults,
        effects: evaluation.result ? {
          allowedBlocks: rule.allowedBlocks,
          blockedBlocks: rule.blockedBlocks,
          recommendations: rule.recommendations,
        } : null,
      }
    })

    // Aggregate results from matched rules
    const matchedRules = ruleResults.filter(r => r.matched)
    const allowedBlocksSet = new Set<string>()
    const blockedBlocksSet = new Set<string>()
    const recommendationsSet = new Set<string>()

    for (const rule of matchedRules) {
      if (rule.effects) {
        rule.effects.allowedBlocks.forEach(b => allowedBlocksSet.add(b))
        rule.effects.blockedBlocks.forEach(b => blockedBlocksSet.add(b))
        rule.effects.recommendations.forEach(r => recommendationsSet.add(r))
      }
    }

    // Remove blocked from allowed
    blockedBlocksSet.forEach(b => allowedBlocksSet.delete(b))

    // Get block details for the final lists
    const finalAllowedBlocks = Array.from(allowedBlocksSet)
    const finalBlockedBlocks = Array.from(blockedBlocksSet)
    
    const blockDetails = await prisma.block.findMany({
      where: {
        code: { in: [...finalAllowedBlocks, ...finalBlockedBlocks] },
      },
      select: {
        code: true,
        name: true,
        level: true,
        primaryCapacity: true,
      },
    })

    const blockMap = new Map(blockDetails.map(b => [b.code, b]))

    return NextResponse.json({
      success: true,
      data: {
        input: context,
        rulesEvaluated: rules.length,
        rulesMatched: matchedRules.length,
        ruleResults,
        aggregatedResult: {
          allowedBlocks: finalAllowedBlocks.map(code => ({
            code,
            ...blockMap.get(code),
          })),
          blockedBlocks: finalBlockedBlocks.map(code => ({
            code,
            ...blockMap.get(code),
          })),
          recommendations: Array.from(recommendationsSet),
        },
      },
    })
  } catch (error) {
    console.error('Test rules error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
