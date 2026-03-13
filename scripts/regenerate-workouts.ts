// ============================================================================
// SCRIPT: Regenerar treinos existentes com novo motor (nível + lesões)
// ============================================================================
// Uso: npx tsx scripts/regenerate-workouts.ts
// Ou:  npx ts-node scripts/regenerate-workouts.ts
// ============================================================================

import { PrismaClient } from '@prisma/client'

// Importações dos serviços (caminhos relativos ao script)
const { generatePillarRotation, PILLAR_LABELS } = require('../src/services/pillarRotation')
const { mapClientLevel, buildPainContext } = require('../src/services/pillarExercises')
const { generateWorkoutTemplate, expandTemplateToSchedule } = require('../src/services/workoutTemplate')

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 REGENERANDO TREINOS EXISTENTES...')
  console.log('=' .repeat(60))

  // Buscar todos os treinos ativos
  const workouts = await prisma.workout.findMany({
    where: { isActive: true },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          level: true,
          lastPillarIndex: true,
          trainingDaysPerWeek: true,
        },
      },
    },
  })

  console.log(`📋 Encontrados ${workouts.length} treinos ativos\n`)

  if (workouts.length === 0) {
    console.log('✅ Nenhum treino ativo para regenerar.')
    return
  }

  let updatedCount = 0
  let errorCount = 0

  for (const workout of workouts) {
    try {
      const client = workout.client
      console.log(`\n🏋️ Processando: ${client.name}`)
      console.log(`   Nível: ${client.level}`)

      // Buscar última avaliação completada antes do treino
      const assessment = await prisma.assessment.findFirst({
        where: {
          clientId: client.id,
          status: 'COMPLETED',
          createdAt: { lte: workout.createdAt },
        },
        orderBy: { createdAt: 'desc' },
      })

      // Construir contexto de dor/lesão
      const inputData = assessment?.inputJson as any
      const painMap = inputData?.painMap || null
      const painContext = buildPainContext(painMap)

      // Mapear nível
      const clientLevel = client.level || 'INICIANTE'
      const exerciseLevel = mapClientLevel(clientLevel)

      console.log(`   exerciseLevel: ${exerciseLevel}`)
      console.log(`   Dor: joelho=${painContext.knee}, lombar=${painContext.lowerBack}, ombro=${painContext.shoulder}, quadril=${painContext.hip}`)

      // Parâmetros do treino
      const weeklyFrequency = workout.sessionsPerWeek || 3
      const targetWeeks = workout.targetWeeks || 8

      // Calcular pillar index de início
      const totalSessions = weeklyFrequency * targetWeeks
      const PILLARS_COUNT = 3
      const startPillarIndex = ((client.lastPillarIndex || 0) - totalSessions % PILLARS_COUNT + PILLARS_COUNT * 100) % PILLARS_COUNT

      // Gerar rotação de pilares
      const pillarSchedule = generatePillarRotation({
        trainingDaysPerWeek: weeklyFrequency,
        totalWeeks: targetWeeks,
        lastPillarIndex: startPillarIndex,
      })

      const allPillars = pillarSchedule.schedule.flat()

      // Objetivo
      const resultData = assessment?.resultJson as any
      const primaryGoal = resultData?.primaryGoal || inputData?.primaryGoal || 'saude'

      // Gerar novo template com filtro de nível + lesões
      const template = generateWorkoutTemplate(
        allPillars,
        primaryGoal,
        weeklyFrequency,
        targetWeeks,
        exerciseLevel,
        painContext,
      )

      // Expandir para schedule
      const schedule = expandTemplateToSchedule(template, primaryGoal)

      // Atualizar no banco
      await prisma.workout.update({
        where: { id: workout.id },
        data: {
          scheduleJson: schedule,
          templateJson: template as any,
          name: `Programa ${PILLAR_LABELS[allPillars[0]]} - ${client.name}`,
        },
      })

      console.log(`   ✅ Atualizado com sucesso!`)
      updatedCount++
    } catch (err: any) {
      console.error(`   ❌ Erro: ${err.message}`)
      errorCount++
    }
  }

  console.log('\n' + '=' .repeat(60))
  console.log(`📊 RESULTADO FINAL:`)
  console.log(`   ✅ Atualizados: ${updatedCount}`)
  console.log(`   ❌ Erros: ${errorCount}`)
  console.log(`   📋 Total: ${workouts.length}`)
}

main()
  .catch((e) => {
    console.error('Erro fatal:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
