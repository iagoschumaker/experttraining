// ============================================================================
// EXPERT TRAINING - WORKOUT GENERATION API
// ============================================================================
// POST /api/studio/workouts/generate - Gerar treino baseado em avaliação
// ============================================================================
// 🧠 CÉREBRO ÚNICO - Usado por Studio e Personal
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { z } from 'zod'

// ============================================================================
// POST - Generate Workout from Assessment
// ============================================================================
const generateWorkoutSchema = z.object({
  assessmentId: z.string().cuid(),
  weeklyFrequency: z.number().min(1).max(7),
  phaseDuration: z.number().min(1).max(52).default(4),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { userId, studioId, role } = auth

  try {
    const body = await request.json()
    console.log('📦 Workout Generation Request:', JSON.stringify(body, null, 2))
    
    const validation = generateWorkoutSchema.safeParse(body)

    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error.errors)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dados inválidos', 
          details: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          }))
        },
        { status: 400 }
      )
    }

    const { assessmentId, weeklyFrequency, phaseDuration, notes } = validation.data

    // Buscar avaliação
    const where: any = { id: assessmentId }
    where.client = { studioId }

    if (role === 'TRAINER') {
      where.assessorId = userId
    }

    const assessment = await prisma.assessment.findFirst({
      where,
      include: {
        client: true,
      },
    })

    if (!assessment) {
      return NextResponse.json(
        { success: false, error: 'Avaliação não encontrada' },
        { status: 404 }
      )
    }

    if (assessment.status !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Avaliação não foi processada' },
        { status: 400 }
      )
    }

    if (!assessment.resultJson) {
      return NextResponse.json(
        { success: false, error: 'Avaliação sem resultado processado' },
        { status: 400 }
      )
    }

    // TRAINER só pode gerar para seus clientes
    if (role === 'TRAINER' && assessment.client.trainerId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Sem permissão para este cliente' },
        { status: 403 }
      )
    }

    const result = assessment.resultJson as any

    // ========================================================================
    // 🧠 GERAÇÃO DE CRONOGRAMA - PERIODIZAÇÃO CIENTÍFICA
    // ========================================================================
    // Princípios aplicados:
    // 1. Alternância entre grupos musculares (push/pull, upper/lower)
    // 2. Progressão de volume ao longo das semanas
    // 3. Mobilidade sempre no início da sessão
    // 4. Core/estabilidade antes de força
    // 5. Cardio/HIIT no final ou em dias separados
    // 6. Respeitar dias de recuperação
    // ========================================================================

    const allowedBlockCodes = result.allowedBlocks || []
    const blockedBlockCodes = result.blockedBlocks || []
    const primaryFocus = result.primaryFocus || 'conditioning'

    // Buscar blocos permitidos do banco com todas as informações
    const allowedBlocks = await prisma.block.findMany({
      where: {
        code: { in: allowedBlockCodes },
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        level: true,
        levelName: true,
        primaryCapacity: true,
        secondaryCapacities: true,
        movementPattern: true,
        suggestedFrequency: true,
        estimatedDuration: true,
        blockOrder: true,
        riskLevel: true,
        complexity: true,
        impact: true,
      },
    })

    if (allowedBlocks.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum bloco disponível para geração. Verifique se os blocos estão cadastrados.' },
        { status: 400 }
      )
    }

    console.log(`📦 ${allowedBlocks.length} blocos disponíveis para cronograma`)

    // ========================================================================
    // CATEGORIZAÇÃO DOS BLOCOS POR FUNÇÃO
    // ========================================================================
    const categorizedBlocks = {
      // Preparação (início da sessão)
      mobility: allowedBlocks.filter((b: any) => 
        b.primaryCapacity === 'MOBILITY' || 
        b.code.includes('MOBILIDADE') || 
        b.code.includes('MOB')
      ),
      
      // Estabilização (após mobilidade)
      stability: allowedBlocks.filter((b: any) => 
        b.primaryCapacity === 'STABILITY' || 
        b.code.includes('STAB') || 
        b.code.includes('CORE')
      ),
      
      // Força - Membros Inferiores
      strengthLower: allowedBlocks.filter((b: any) => 
        b.primaryCapacity === 'STRENGTH' && 
        (b.movementPattern === 'SQUAT' || b.movementPattern === 'HINGE' || b.movementPattern === 'LUNGE' ||
         b.code.includes('FORCA_A') || b.code.includes('INFERIOR'))
      ),
      
      // Força - Membros Superiores
      strengthUpper: allowedBlocks.filter((b: any) => 
        b.primaryCapacity === 'STRENGTH' && 
        (b.movementPattern === 'PUSH' || b.movementPattern === 'PULL' ||
         b.code.includes('FORCA_B') || b.code.includes('SUPERIOR'))
      ),
      
      // Potência
      power: allowedBlocks.filter((b: any) => 
        b.primaryCapacity === 'POWER' ||
        b.code.includes('POTENCIA') ||
        b.code.includes('OLIMPICO')
      ),
      
      // Condicionamento/Cardio
      conditioning: allowedBlocks.filter((b: any) => 
        b.primaryCapacity === 'CONDITIONING' ||
        b.movementPattern === 'CARDIO' ||
        b.code.includes('CARDIO') ||
        b.code.includes('HIIT') ||
        b.code.includes('COND')
      ),
    }

    console.log(`📊 Blocos categorizados:`)
    console.log(`   - Mobilidade: ${categorizedBlocks.mobility.length}`)
    console.log(`   - Estabilidade: ${categorizedBlocks.stability.length}`)
    console.log(`   - Força Inferior: ${categorizedBlocks.strengthLower.length}`)
    console.log(`   - Força Superior: ${categorizedBlocks.strengthUpper.length}`)
    console.log(`   - Potência: ${categorizedBlocks.power.length}`)
    console.log(`   - Condicionamento: ${categorizedBlocks.conditioning.length}`)

    // ========================================================================
    // CRIAR TEMPLATES DE SESSÃO BASEADO NA FREQUÊNCIA
    // ========================================================================
    // Princípios de periodização:
    // - 2x/sem: Full body ou Upper/Lower split
    // - 3x/sem: Push/Pull/Legs ou A/B/C
    // - 4x/sem: Upper/Lower split
    // - 5x+/sem: Especializado por grupo muscular
    // ========================================================================

    interface SessionTemplate {
      focus: string
      structure: string[]
      description: string
    }

    const sessionTemplates: SessionTemplate[] = []

    if (weeklyFrequency <= 2) {
      // Full Body - cada sessão trabalha todo o corpo
      for (let i = 0; i < weeklyFrequency; i++) {
        sessionTemplates.push({
          focus: 'FULL_BODY',
          structure: ['mobility', 'stability', 'strengthLower', 'strengthUpper', 'conditioning'],
          description: `Sessão Full Body ${String.fromCharCode(65 + i)}`,
        })
      }
    } else if (weeklyFrequency === 3) {
      // A/B/C Split - Alternância inteligente
      sessionTemplates.push({
        focus: 'LOWER_FOCUS',
        structure: ['mobility', 'stability', 'strengthLower', 'conditioning'],
        description: 'Foco Membros Inferiores',
      })
      sessionTemplates.push({
        focus: 'UPPER_FOCUS',
        structure: ['mobility', 'stability', 'strengthUpper', 'conditioning'],
        description: 'Foco Membros Superiores',
      })
      sessionTemplates.push({
        focus: 'CONDITIONING',
        structure: ['mobility', 'stability', 'power', 'conditioning'],
        description: 'Foco Condicionamento e Potência',
      })
    } else if (weeklyFrequency >= 4) {
      // Upper/Lower Split com dia de condicionamento
      sessionTemplates.push({
        focus: 'LOWER_A',
        structure: ['mobility', 'stability', 'strengthLower'],
        description: 'Inferior A - Força',
      })
      sessionTemplates.push({
        focus: 'UPPER_A',
        structure: ['mobility', 'stability', 'strengthUpper'],
        description: 'Superior A - Força',
      })
      sessionTemplates.push({
        focus: 'LOWER_B',
        structure: ['mobility', 'stability', 'strengthLower', 'conditioning'],
        description: 'Inferior B - Força + Cardio',
      })
      sessionTemplates.push({
        focus: 'UPPER_B',
        structure: ['mobility', 'stability', 'strengthUpper', 'conditioning'],
        description: 'Superior B - Força + Cardio',
      })
      
      // Sessões extras se frequência > 4
      for (let i = 4; i < weeklyFrequency; i++) {
        sessionTemplates.push({
          focus: 'CONDITIONING',
          structure: ['mobility', 'conditioning'],
          description: 'Condicionamento Extra',
        })
      }
    }

    // ========================================================================
    // GERAR CRONOGRAMA COM PERIODIZAÇÃO
    // ========================================================================
    const schedule: any = {
      weeklyFrequency,
      phaseDuration,
      primaryFocus,
      totalBlocks: allowedBlocks.length,
      methodology: 'Expert Training Method',
      weeks: [],
    }

    // Dias da semana para distribuição (evitar dias consecutivos de força pesada)
    const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
    const optimalDays: string[] = []
    
    if (weeklyFrequency === 2) {
      optimalDays.push('Segunda', 'Quinta')
    } else if (weeklyFrequency === 3) {
      optimalDays.push('Segunda', 'Quarta', 'Sexta')
    } else if (weeklyFrequency === 4) {
      optimalDays.push('Segunda', 'Terça', 'Quinta', 'Sexta')
    } else if (weeklyFrequency === 5) {
      optimalDays.push('Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta')
    } else {
      for (let i = 0; i < weeklyFrequency; i++) {
        optimalDays.push(weekDays[i])
      }
    }

    // Função auxiliar para selecionar bloco de uma categoria
    const selectBlock = (category: keyof typeof categorizedBlocks, sessionIndex: number, weekIndex: number): any | null => {
      const blocks = categorizedBlocks[category]
      if (blocks.length === 0) return null
      
      // Rotaciona entre blocos disponíveis para variedade
      const index = (sessionIndex + weekIndex) % blocks.length
      return blocks[index]
    }

    // Gerar cada semana
    for (let week = 1; week <= phaseDuration; week++) {
      const weekSchedule: any = {
        week,
        phase: week <= Math.ceil(phaseDuration / 3) ? 'ADAPTATION' : 
               week <= Math.ceil(phaseDuration * 2 / 3) ? 'DEVELOPMENT' : 'PEAK',
        sessions: [],
      }

      // Gerar cada sessão da semana
      for (let session = 0; session < weeklyFrequency; session++) {
        const template = sessionTemplates[session % sessionTemplates.length]
        const sessionBlocks: any[] = []
        
        // Construir sessão baseada na estrutura do template
        for (const category of template.structure) {
          const block = selectBlock(category as keyof typeof categorizedBlocks, session, week - 1)
          if (block) {
            sessionBlocks.push({
              blockCode: block.code,
              blockName: block.name,
              category: block.primaryCapacity || category.toUpperCase(),
              movementPattern: block.movementPattern,
              order: sessionBlocks.length + 1,
              estimatedDuration: block.estimatedDuration || 15,
            })
          }
        }

        // Se sessão ficou vazia, adicionar blocos disponíveis
        if (sessionBlocks.length === 0) {
          const fallbackBlocks = allowedBlocks.slice(0, Math.min(3, allowedBlocks.length))
          fallbackBlocks.forEach((block: any, idx: number) => {
            sessionBlocks.push({
              blockCode: block.code,
              blockName: block.name,
              category: block.primaryCapacity || 'GENERAL',
              movementPattern: block.movementPattern,
              order: idx + 1,
              estimatedDuration: block.estimatedDuration || 15,
            })
          })
        }

        // Calcular duração estimada da sessão
        const totalDuration = sessionBlocks.reduce((sum: number, b: any) => sum + (b.estimatedDuration || 15), 0)

        weekSchedule.sessions.push({
          session: session + 1,
          day: optimalDays[session] || weekDays[session],
          focus: template.focus,
          description: template.description,
          estimatedDuration: totalDuration,
          blocks: sessionBlocks,
        })
      }

      schedule.weeks.push(weekSchedule)
    }

    console.log(`📅 Cronograma gerado:`)
    console.log(`   - Semanas: ${phaseDuration}`)
    console.log(`   - Sessões/semana: ${weeklyFrequency}`)
    console.log(`   - Blocos únicos: ${allowedBlocks.length}`)

    // Criar treino
    const workout = await prisma.workout.create({
      data: {
        clientId: assessment.clientId,
        studioId,
        createdById: userId,
        name: `Programa ${result.functionalPattern || 'Funcional'} - ${assessment.client.name}`,
        blocksUsed: allowedBlockCodes,
        scheduleJson: schedule,
        isActive: true,
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'GENERATE',
        entity: 'Workout',
        entityId: workout.id,
        newData: {
          assessmentId,
          blocksUsed: allowedBlockCodes.length,
          weeklyFrequency,
        } as any,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        workout,
        schedule,
        blocksUsed: allowedBlocks.length,
        blockedBlocks: blockedBlockCodes.length,
        recommendations: result.recommendations || [],
      },
    })
  } catch (error) {
    console.error('Generate workout error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao gerar treino' },
      { status: 500 }
    )
  }
}
