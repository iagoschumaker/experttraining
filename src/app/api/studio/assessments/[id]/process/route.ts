// ============================================================================
// EXPERT TRAINING - MOTOR DE DECISÃO API
// ============================================================================
// POST /api/studio/assessments/[id]/process - Processar avaliação
// ============================================================================
// 🧠 MOTOR DE DECISÃO BASEADO EM REGRAS
// - Usa regras cadastradas no banco de dados
// - Avalia condições de dor, mobilidade, nível e restrições
// - Determina blocos permitidos e bloqueados
// - Gera recomendações personalizadas
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'

// ============================================================================
// INTERFACES
// ============================================================================
interface Condition {
  field: string
  operator: string
  value: number | string | boolean
}

interface RuleCondition {
  operator: 'AND' | 'OR'
  conditions: Condition[]
}

interface Rule {
  id: string
  name: string
  conditionJson: RuleCondition
  allowedBlocks: string[]
  blockedBlocks: string[]
  recommendations: string[]
  priority: number
}

// ============================================================================
// FUNÇÕES DE AVALIAÇÃO DE REGRAS
// ============================================================================

// Extrai valor de um objeto usando path (ex: "painMap.lower_back")
function getValueFromPath(obj: any, path: string): any {
  const parts = path.split('.')
  let current = obj
  
  for (const part of parts) {
    if (current === undefined || current === null) return undefined
    current = current[part]
  }
  
  return current
}

// Avalia uma condição individual
function evaluateCondition(condition: Condition, inputData: any): boolean {
  const actualValue = getValueFromPath(inputData, condition.field)
  const expectedValue = condition.value
  
  if (actualValue === undefined) return false
  
  switch (condition.operator) {
    case '>=':
      return Number(actualValue) >= Number(expectedValue)
    case '<=':
      return Number(actualValue) <= Number(expectedValue)
    case '>':
      return Number(actualValue) > Number(expectedValue)
    case '<':
      return Number(actualValue) < Number(expectedValue)
    case '==':
    case '===':
      return actualValue === expectedValue
    case '!=':
    case '!==':
      return actualValue !== expectedValue
    default:
      console.warn(`Operador desconhecido: ${condition.operator}`)
      return false
  }
}

// Avalia um conjunto de regras (AND/OR)
function evaluateRuleCondition(ruleCondition: RuleCondition, inputData: any): boolean {
  const { operator, conditions } = ruleCondition
  
  if (!conditions || conditions.length === 0) return false
  
  if (operator === 'AND') {
    return conditions.every(cond => evaluateCondition(cond, inputData))
  } else if (operator === 'OR') {
    return conditions.some(cond => evaluateCondition(cond, inputData))
  }
  
  return false
}

// ============================================================================
// POST - Process Assessment (Motor de Decisão)
// ============================================================================
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth
  const assessmentId = params.id

  try {
    // Get assessment
    const where: any = { id: assessmentId }
    where.client = { studioId }

    if (role === 'TRAINER') {
      where.assessorId = userId
    }

    const assessment = await prisma.assessment.findFirst({ 
      where,
      include: { client: true }
    })

    if (!assessment) {
      return NextResponse.json(
        { success: false, error: 'Avaliação não encontrada' },
        { status: 404 }
      )
    }

    if (assessment.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Avaliação já foi processada' },
        { status: 400 }
      )
    }

    const inputJson = assessment.inputJson as any

    // ========================================================================
    // 1. BUSCAR REGRAS ATIVAS (ordenadas por prioridade)
    // ========================================================================
    const rules = await prisma.rule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    })

    console.log(`📋 ${rules.length} regras ativas encontradas`)

    // ========================================================================
    // 2. BUSCAR TODOS OS BLOCOS DISPONÍVEIS
    // ========================================================================
    const allBlocks = await prisma.block.findMany({
      where: { isActive: true, isLocked: true },
      select: {
        code: true,
        name: true,
        level: true,
        levelName: true,
        primaryCapacity: true,
        movementPattern: true,
        riskLevel: true,
        blockedIf: true,
        allowedIf: true,
      },
    })

    console.log(`📦 ${allBlocks.length} blocos disponíveis`)

    // ========================================================================
    // 3. ANALISAR DADOS DE ENTRADA
    // ========================================================================
    const painMap = inputJson.painMap || {}
    const movementTests = inputJson.movementTests || {}
    const level = inputJson.level || 'BEGINNER'
    const restrictions = inputJson.restrictions || {}

    // Scores de movimento (1=ruim, 2=médio, 3=bom)
    const squatScore = movementTests.squat?.score || 1
    const hingeScore = movementTests.hinge?.score || 1
    const pushScore = movementTests.push?.score || 1
    const pullScore = movementTests.pull?.score || 1
    const rotationScore = movementTests.rotation?.score || 1
    const gaitScore = movementTests.gait?.score || 1
    const avgScore = (squatScore + hingeScore + pushScore + pullScore + rotationScore + gaitScore) / 6

    // Análise de dor
    const hasLowerBackPain = (painMap.lower_back || 0) >= 5
    const hasKneePain = (painMap.knee || 0) >= 5
    const hasShoulderPain = (painMap.shoulder || 0) >= 5
    const hasNeckPain = (painMap.neck || 0) >= 5

    // ========================================================================
    // 4. APLICAR REGRAS DO BANCO DE DADOS
    // ========================================================================
    const allowedBlocksSet = new Set<string>()
    const blockedBlocksSet = new Set<string>()
    const allRecommendations: string[] = []
    const appliedRules: string[] = []

    // Preparar dados para avaliação de regras
    const evaluationData = {
      level,
      painMap,
      movementTests,
      restrictions,
      avgScore,
    }

    for (const dbRule of rules) {
      try {
        const rule = dbRule as unknown as Rule
        const ruleCondition = rule.conditionJson as RuleCondition
        const matches = evaluateRuleCondition(ruleCondition, evaluationData)
        
        if (matches) {
          console.log(`✅ Regra aplicada: ${rule.name} (prioridade: ${rule.priority})`)
          appliedRules.push(rule.name)
          
          // Adicionar blocos permitidos
          for (const blockCode of rule.allowedBlocks) {
            allowedBlocksSet.add(blockCode)
          }
          
          // Adicionar blocos bloqueados
          for (const blockCode of rule.blockedBlocks) {
            blockedBlocksSet.add(blockCode)
          }
          
          // Adicionar recomendações
          allRecommendations.push(...rule.recommendations)
        }
      } catch (err) {
        console.error(`Erro ao avaliar regra ${dbRule.name}:`, err)
      }
    }

    // ========================================================================
    // 5. FILTRAR BLOCOS BASEADO NO NÍVEL DO ALUNO
    // ========================================================================
    const levelMap: Record<string, number> = {
      'BEGINNER': 1,
      'INTERMEDIATE': 2,
      'ADVANCED': 3,
    }
    const clientLevel = levelMap[level] || 1

    // Adicionar blocos base permitidos pelo nível
    for (const block of allBlocks) {
      // Bloco permitido se nível do bloco <= nível do aluno
      if (block.level <= clientLevel) {
        // Verificar blockedIf do bloco
        const blockedConditions = (block.blockedIf || []) as string[]
        let isBlockedByCondition = false
        
        for (const condition of blockedConditions) {
          if (
            (condition === 'dor_lombar' && hasLowerBackPain) ||
            (condition === 'dor_lombar_aguda' && hasLowerBackPain) ||
            (condition === 'dor_joelho' && hasKneePain) ||
            (condition === 'dor_joelho_aguda' && hasKneePain) ||
            (condition === 'dor_ombro' && hasShoulderPain) ||
            (condition === 'dor_ombro_aguda' && hasShoulderPain) ||
            (condition === 'restricao_cardiaca' && restrictions.cardiac) ||
            (condition === 'mobilidade_quadril_ruim' && squatScore <= 1) ||
            (condition === 'nivel_insuficiente' && block.level > clientLevel)
          ) {
            isBlockedByCondition = true
            blockedBlocksSet.add(block.code)
            break
          }
        }
        
        if (!isBlockedByCondition && !blockedBlocksSet.has(block.code)) {
          allowedBlocksSet.add(block.code)
        }
      }
    }

    // ========================================================================
    // 6. REMOVER BLOCOS BLOQUEADOS DA LISTA DE PERMITIDOS
    // ========================================================================
    Array.from(blockedBlocksSet).forEach(blockedCode => {
      allowedBlocksSet.delete(blockedCode)
    })

    // ========================================================================
    // 7. DETERMINAR PADRÃO FUNCIONAL E FOCO
    // ========================================================================
    let functionalPattern = 'GENERAL_CONDITIONING'
    let primaryFocus = 'conditioning'
    const secondaryFocus: string[] = []
    let confidence = 70

    // Determinar padrão baseado nas condições
    if (hasLowerBackPain) {
      functionalPattern = 'CORRECTIVE_LUMBAR'
      primaryFocus = 'core_stability'
      secondaryFocus.push('hip_mobility')
      confidence = 85
    } else if (hasKneePain) {
      functionalPattern = 'CORRECTIVE_KNEE'
      primaryFocus = 'hip_strength'
      secondaryFocus.push('vmo_activation')
      confidence = 85
    } else if (hasShoulderPain) {
      functionalPattern = 'CORRECTIVE_SHOULDER'
      primaryFocus = 'scapular_stability'
      secondaryFocus.push('rotator_cuff')
      confidence = 85
    } else if (avgScore < 2 && level === 'BEGINNER') {
      functionalPattern = 'CORRECTIVE_MOVEMENT'
      primaryFocus = 'movement_patterns'
      secondaryFocus.push('mobility', 'stability')
      confidence = 90
    } else if (avgScore >= 2.5 && level === 'ADVANCED') {
      functionalPattern = 'PERFORMANCE'
      primaryFocus = 'strength'
      secondaryFocus.push('power', 'conditioning')
      confidence = 75
    } else if (avgScore >= 2 && level === 'INTERMEDIATE') {
      functionalPattern = 'HYBRID_TRAINING'
      primaryFocus = 'strength'
      secondaryFocus.push('conditioning', 'hypertrophy')
      confidence = 80
    } else {
      // Padrão iniciante sem dores
      functionalPattern = 'FOUNDATION'
      primaryFocus = 'conditioning'
      secondaryFocus.push('movement_patterns', 'stability')
      confidence = 85
    }

    // ========================================================================
    // 8. MONTAR RESULTADO FINAL
    // ========================================================================
    const uniqueAllowedBlocks = Array.from(allowedBlocksSet)
    const uniqueBlockedBlocks = Array.from(blockedBlocksSet)
    const uniqueRecommendations = Array.from(new Set(allRecommendations))

    const resultJson = {
      functionalPattern,
      primaryFocus,
      secondaryFocus,
      allowedBlocks: uniqueAllowedBlocks,
      blockedBlocks: uniqueBlockedBlocks,
      recommendations: uniqueRecommendations,
      appliedRules,
      analysisDate: new Date().toISOString(),
      scoresAnalysis: {
        squat: squatScore,
        hinge: hingeScore,
        push: pushScore,
        pull: pullScore,
        rotation: rotationScore,
        gait: gaitScore,
        average: Math.round(avgScore * 100) / 100,
      },
      painAnalysis: {
        hasLowerBackPain,
        hasKneePain,
        hasShoulderPain,
        hasNeckPain,
        painMap,
      },
      levelAnalysis: {
        clientLevel: level,
        numericLevel: clientLevel,
      },
    }

    console.log(`📊 Resultado:`)
    console.log(`   - Padrão: ${functionalPattern}`)
    console.log(`   - Foco: ${primaryFocus}`)
    console.log(`   - Blocos permitidos: ${uniqueAllowedBlocks.length}`)
    console.log(`   - Blocos bloqueados: ${uniqueBlockedBlocks.length}`)
    console.log(`   - Regras aplicadas: ${appliedRules.length}`)
    console.log(`   - Confiança: ${confidence}%`)

    // Update assessment
    const updatedAssessment = await prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: 'COMPLETED',
        resultJson,
        confidence,
        completedAt: new Date(),
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        studioId,
        action: 'UPDATE',
        entity: 'Assessment',
        entityId: assessmentId,
        newData: { 
          status: 'COMPLETED', 
          functionalPattern,
          blocksAllowed: uniqueAllowedBlocks.length,
          blocksBlocked: uniqueBlockedBlocks.length,
          rulesApplied: appliedRules.length,
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        assessment: updatedAssessment,
        result: resultJson,
      },
      message: 'Avaliação processada com sucesso',
    })
  } catch (error) {
    console.error('Process assessment error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao processar avaliação' },
      { status: 500 }
    )
  }
}
