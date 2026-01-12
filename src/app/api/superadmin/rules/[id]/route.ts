// ============================================================================
// EXPERT TRAINING - SUPERADMIN RULE BY ID API
// ============================================================================
// GET /api/superadmin/rules/[id] - Get rule details
// PUT /api/superadmin/rules/[id] - Update rule
// DELETE /api/superadmin/rules/[id] - Delete rule
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'
import { ASSESSMENT_FIELDS } from '@/lib/assessment-constants'

// Single condition schema
const conditionItemSchema = z.object({
  field: z.string().min(1, 'Campo é obrigatório'),
  operator: z.enum(['==', '!=', '>', '<', '>=', '<=', 'contains', 'not_contains']),
  value: z.union([z.string(), z.number(), z.boolean()]),
})

// Condition group schema
const conditionGroupSchema = z.object({
  operator: z.enum(['AND', 'OR']),
  conditions: z.array(conditionItemSchema).min(1),
})

// Validation schema for update
const updateRuleSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  conditionJson: conditionGroupSchema.optional(),
  allowedBlocks: z.array(z.string()).optional(),
  blockedBlocks: z.array(z.string()).optional(),
  recommendations: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

// Middleware to check superadmin
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

// GET - Get rule by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const rule = await prisma.rule.findUnique({
      where: { id: params.id },
    })

    if (!rule) {
      return NextResponse.json(
        { success: false, error: 'Regra não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: rule,
    })
  } catch (error) {
    console.error('Get rule error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Update rule with validation
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const existingRule = await prisma.rule.findUnique({
      where: { id: params.id },
    })

    if (!existingRule) {
      return NextResponse.json(
        { success: false, error: 'Regra não encontrada' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validation = updateRuleSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { conditionJson, allowedBlocks, blockedBlocks, name, ...rest } = validation.data

    // Check for duplicate name (if changing)
    if (name && name !== existingRule.name) {
      const duplicateName = await prisma.rule.findFirst({
        where: { 
          name: { equals: name, mode: 'insensitive' },
          id: { not: params.id },
        },
      })
      
      if (duplicateName) {
        return NextResponse.json(
          { success: false, error: 'Já existe uma regra com este nome' },
          { status: 400 }
        )
      }
    }

    // Validate block codes if provided
    const allBlockCodes = [...(allowedBlocks || []), ...(blockedBlocks || [])]
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

    // Validate condition fields if provided
    if (conditionJson) {
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
          },
          { status: 400 }
        )
      }
    }

    const rule = await prisma.rule.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(name && { name }),
        ...(conditionJson && { conditionJson: conditionJson as any }),
        ...(allowedBlocks && { allowedBlocks }),
        ...(blockedBlocks && { blockedBlocks }),
      },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'UPDATE',
        entity: 'Rule',
        entityId: rule.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: rule,
    })
  } catch (error) {
    console.error('Update rule error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PATCH - Partial update (for toggling status, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    
    const rule = await prisma.rule.findUnique({
      where: { id: params.id },
    })

    if (!rule) {
      return NextResponse.json(
        { success: false, error: 'Regra não encontrada' },
        { status: 404 }
      )
    }

    // Update only the fields provided
    const updatedRule = await prisma.rule.update({
      where: { id: params.id },
      data: body,
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'UPDATE',
        entity: 'Rule',
        entityId: params.id,
        newData: body,
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedRule,
    })
  } catch (error) {
    console.error('Patch rule error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Delete rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const rule = await prisma.rule.findUnique({
      where: { id: params.id },
    })

    if (!rule) {
      return NextResponse.json(
        { success: false, error: 'Regra não encontrada' },
        { status: 404 }
      )
    }

    // Check if rule is locked (protected)
    if (rule.isLocked) {
      return NextResponse.json(
        { success: false, error: 'Regras protegidas não podem ser excluídas' },
        { status: 403 }
      )
    }

    await prisma.rule.delete({
      where: { id: params.id },
    })

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: auth.payload.userId,
        action: 'DELETE',
        entity: 'Rule',
        entityId: params.id,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Regra excluída com sucesso',
    })
  } catch (error) {
    console.error('Delete rule error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
