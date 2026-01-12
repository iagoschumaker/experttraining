// ============================================================================
// EXPERT TRAINING - SUPERADMIN RULES API
// ============================================================================
// GET /api/superadmin/rules - Lista regras do motor de decisão
// POST /api/superadmin/rules - Cria regra
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'
import { ASSESSMENT_FIELDS, CONDITION_OPERATORS } from '@/lib/assessment-constants'

// ============================================================================
// SCHEMAS
// ============================================================================

// Single condition schema
const conditionItemSchema = z.object({
  field: z.string().min(1, 'Campo é obrigatório'),
  operator: z.enum(['==', '!=', '>', '<', '>=', '<=', 'contains', 'not_contains']),
  value: z.union([z.string(), z.number(), z.boolean()]),
})

// Condition group schema (AND/OR with multiple conditions)
const conditionGroupSchema = z.object({
  operator: z.enum(['AND', 'OR']),
  conditions: z.array(conditionItemSchema).min(1, 'Pelo menos uma condição é obrigatória'),
})

// Validation schema for create
const createRuleSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  priority: z.number().int().min(0).max(100).default(50),
  conditionJson: conditionGroupSchema,
  allowedBlocks: z.array(z.string()).default([]),
  blockedBlocks: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
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
// GET - List rules with stats
// ============================================================================

export async function GET(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const isActive = searchParams.get('isActive')
    const priorityMin = searchParams.get('priorityMin')
    const priorityMax = searchParams.get('priorityMax')
    const hasBlockCode = searchParams.get('hasBlockCode')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }
    
    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true'
    }

    if (priorityMin) {
      where.priority = { ...where.priority, gte: parseInt(priorityMin) }
    }
    
    if (priorityMax) {
      where.priority = { ...where.priority, lte: parseInt(priorityMax) }
    }

    // Filter by block code (in allowedBlocks or blockedBlocks)
    if (hasBlockCode) {
      where.OR = [
        { allowedBlocks: { has: hasBlockCode } },
        { blockedBlocks: { has: hasBlockCode } },
      ]
    }

    const total = await prisma.rule.count({ where })

    const rules = await prisma.rule.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // Get all blocks for selection
    const blocks = await prisma.block.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        level: true,
        primaryCapacity: true,
        riskLevel: true,
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    })

    // Calculate stats
    const allRules = await prisma.rule.findMany({
      select: {
        isActive: true,
        priority: true,
        allowedBlocks: true,
        blockedBlocks: true,
      },
    })

    const stats = {
      total: allRules.length,
      active: allRules.filter(r => r.isActive).length,
      inactive: allRules.filter(r => !r.isActive).length,
      byPriority: {
        critical: allRules.filter(r => r.priority >= 90).length,      // 90-100: Protection rules
        high: allRules.filter(r => r.priority >= 70 && r.priority < 90).length,
        medium: allRules.filter(r => r.priority >= 40 && r.priority < 70).length,
        low: allRules.filter(r => r.priority < 40).length,
      },
      withAllowedBlocks: allRules.filter(r => r.allowedBlocks.length > 0).length,
      withBlockedBlocks: allRules.filter(r => r.blockedBlocks.length > 0).length,
    }

    return NextResponse.json({
      success: true,
      data: {
        rules: rules,  // Retorna como "rules" para consistência com a página
        items: rules,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        blocks,
        assessmentFields: ASSESSMENT_FIELDS,
        conditionOperators: CONDITION_OPERATORS,
        stats,
      },
    })
  } catch (error) {
    console.error('List rules error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Create rule with validation
// ============================================================================

export async function POST(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const validation = createRuleSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { name, description, priority, conditionJson, allowedBlocks, blockedBlocks, recommendations, isActive } = validation.data

    // Validate that all block codes exist
    const allBlockCodes = [...allowedBlocks, ...blockedBlocks]
    if (allBlockCodes.length > 0) {
      const existingBlocks = await prisma.block.findMany({
        where: { code: { in: allBlockCodes } },
        select: { code: true },
      })
      
      const existingCodes = new Set(existingBlocks.map(b => b.code))
      const invalidCodes = allBlockCodes.filter(code => !existingCodes.has(code))
      
      if (invalidCodes.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Códigos de bloco inválidos: ${invalidCodes.join(', ')}`,
            invalidCodes,
          },
          { status: 400 }
        )
      }
    }

    // Validate condition fields
    const validFields = new Set(ASSESSMENT_FIELDS.map(f => f.value))
    const invalidFields: string[] = []
    
    for (const condition of conditionJson.conditions) {
      if (!validFields.has(condition.field)) {
        invalidFields.push(condition.field)
      }
    }
    
    if (invalidFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Campos de condição inválidos: ${invalidFields.join(', ')}`,
          invalidFields,
          validFields: ASSESSMENT_FIELDS.map(f => f.value),
        },
        { status: 400 }
      )
    }

    // Check for duplicate rule name
    const existingRule = await prisma.rule.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    })
    
    if (existingRule) {
      return NextResponse.json(
        { success: false, error: 'Já existe uma regra com este nome' },
        { status: 400 }
      )
    }

    const rule = await prisma.rule.create({
      data: {
        name,
        description,
        priority,
        conditionJson: conditionJson as any,
        allowedBlocks,
        blockedBlocks,
        recommendations,
        isActive,
      },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'CREATE',
        entity: 'Rule',
        entityId: rule.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: rule,
    })
  } catch (error) {
    console.error('Create rule error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
