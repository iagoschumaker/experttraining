// ============================================================================
// EXPERT PRO TRAINING - WORKOUT GENERATION API
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
  phaseDuration: z.number().min(1).max(4).default(4),
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

    // ========================================================================
    // REGRA DO MÉTODO: Verificar se precisa de reavaliação
    // ========================================================================
    // Se existe cronograma finalizado mais recente que a avaliação,
    // bloquear geração e exigir nova avaliação
    // ========================================================================
    const lastWorkout = await prisma.workout.findFirst({
      where: {
        clientId: assessment.clientId,
        studioId,
        isActive: false, // Cronograma finalizado/inativo
      },
      orderBy: { createdAt: 'desc' },
    })

    if (lastWorkout) {
      // Verificar se a avaliação é mais recente que o último cronograma
      const assessmentDate = new Date(assessment.createdAt)
      const workoutDate = new Date(lastWorkout.createdAt)
      
      if (assessmentDate < workoutDate) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Reavaliação obrigatória! O último cronograma foi finalizado após esta avaliação. Realize uma nova avaliação para gerar novo cronograma.',
            requiresReassessment: true,
            lastWorkoutDate: lastWorkout.createdAt,
            assessmentDate: assessment.createdAt,
          },
          { status: 400 }
        )
      }
    }

    // Verificar se já existe cronograma ativo para este cliente
    const activeWorkout = await prisma.workout.findFirst({
      where: {
        clientId: assessment.clientId,
        studioId,
        isActive: true,
      },
    })

    if (activeWorkout) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Este aluno já possui um cronograma ativo. Finalize ou arquive o cronograma atual antes de gerar um novo.',
          existingWorkoutId: activeWorkout.id,
        },
        { status: 400 }
      )
    }

    const result = assessment.resultJson as any
    const inputData = assessment.inputJson as any

    // ========================================================================
    // 🧠 MÉTODO EXPERT PRO TRAINING - GERAÇÃO DE CRONOGRAMA REAL
    // ========================================================================
    // REGRAS ABSOLUTAS DO MÉTODO:
    // 1. BLOCO = 3 exercícios fixos (NÃO é categoria)
    // 2. Exercício 1 de TODO bloco = FOCO PRINCIPAL da avaliação
    // 3. PREPARAÇÃO = única por sessão (nunca vira bloco)
    // 4. BLOCOS POR NÍVEL: Iniciante = 2, Intermediário/Avançado = 3
    // 5. PROTOCOLO FINAL = separado (nunca substitui bloco)
    // ========================================================================

    // Extrair nível do aluno da avaliação
    const clientLevel = inputData?.level || 'BEGINNER'
    const maxBlocksPerLevel = clientLevel === 'BEGINNER' ? 2 : 3
    console.log(`📊 NÍVEL DO ALUNO: ${clientLevel} → ${maxBlocksPerLevel} blocos por sessão`)

    const allowedBlockCodes = result.allowedBlocks || []
    const blockedBlockCodes = result.blockedBlocks || []
    
    // ========================================================================
    // PASSO 1: DEFINIR FOCO PRINCIPAL DA AVALIAÇÃO
    // ========================================================================
    // O foco vem da avaliação - é o padrão de movimento mais deficiente
    const mainFocus = result.primaryFocus || result.functionalPattern || 'LOWER'
    const mainFocusLabel = mainFocus.includes('LOWER') || mainFocus.includes('SQUAT') || mainFocus.includes('HINGE') || mainFocus.includes('LUNGE')
      ? 'PERNA' 
      : mainFocus.includes('UPPER') || mainFocus.includes('PUSH') || mainFocus.includes('PULL')
      ? 'SUPERIOR'
      : mainFocus.includes('CORE') || mainFocus.includes('ROTATION')
      ? 'CORE'
      : 'PERNA' // Default para perna se não identificado

    console.log(`🎯 FOCO PRINCIPAL: ${mainFocusLabel} (de: ${mainFocus})`)

    // ========================================================================
    // BANCO DE EXERCÍCIOS EXPANDIDO (MÉTODO EXPERT PRO TRAINING)
    // ========================================================================
    // Exercícios diferentes para cada DIA DA SEMANA para evitar repetição
    // ========================================================================
    
    // EXERCÍCIOS DE FOCO PRINCIPAL - PERNA (5+ opções por bloco)
    const exerciciosPerna = {
      bloco1: [ // Introdução - padrão SQUAT
        { name: 'Agachamento Goblet', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Box Squat', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Agachamento com pausa', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Agachamento Frontal', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Agachamento Sumô', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
      ],
      bloco2: [ // Desenvolvimento - padrão HINGE
        { name: 'Levantamento Terra Romeno', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Hip Hinge com Kettlebell', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Stiff unilateral', sets: 3, reps: '8 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Good Morning', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Hip Thrust', sets: 3, reps: '12-15', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
      ],
      bloco3: [ // Integração - padrão LUNGE/UNILATERAL
        { name: 'Avanço Búlgaro', sets: 3, reps: '8 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Step-up com elevação', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Avanço reverso', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Agachamento Pistol assistido', sets: 3, reps: '6-8 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Avanço lateral', sets: 3, reps: '8 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
      ],
    }

    // EXERCÍCIOS DE FOCO PRINCIPAL - SUPERIOR (5+ opções por bloco)
    const exerciciosSuperior = {
      bloco1: [ // PUSH horizontal
        { name: 'Supino com halteres', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Push-up com controle', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Floor Press', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Supino inclinado', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Push-up com pés elevados', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
      ],
      bloco2: [ // PULL
        { name: 'Remada curvada', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Remada unilateral', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Pull-up assistido', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Remada invertida', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Face Pull', sets: 3, reps: '12-15', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
      ],
      bloco3: [ // PUSH vertical
        { name: 'Desenvolvimento de ombros', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Arnold Press', sets: 3, reps: '10-12', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Push Press', sets: 3, reps: '8-10', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Elevação lateral', sets: 3, reps: '12-15', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
        { name: 'Desenvolvimento unilateral', sets: 3, reps: '10 cada', rest: '60-90s', role: 'FOCO_PRINCIPAL' },
      ],
    }

    // EXERCÍCIOS PUSH + PULL INTEGRADO (5+ opções por bloco)
    const exerciciosPushPull = {
      bloco1: [
        { name: 'Landmine Press', sets: 3, reps: '10-12', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Push-up com remada', sets: 3, reps: '8 cada', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Thruster', sets: 3, reps: '10-12', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Man Maker', sets: 3, reps: '6-8', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Clean and Press', sets: 3, reps: '8-10', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
      ],
      bloco2: [
        { name: 'Remada com rotação', sets: 3, reps: '10 cada', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Cable Push-Pull', sets: 3, reps: '10-12', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Renegade Row', sets: 3, reps: '8 cada', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Woodchop', sets: 3, reps: '10 cada', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Single Arm Snatch', sets: 3, reps: '8 cada', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
      ],
      bloco3: [
        { name: 'Turkish Get-up', sets: 2, reps: '3 cada', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Crawling com push-up', sets: 3, reps: '8-10', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Farmers Walk', sets: 3, reps: '30m', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Kettlebell Windmill', sets: 3, reps: '6 cada', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
        { name: 'Suitcase Carry', sets: 3, reps: '30m cada', rest: '40-60s', role: 'PUSH_PULL_INTEGRADO' },
      ],
    }

    // EXERCÍCIOS DE CORE (5+ opções por bloco)
    const exerciciosCore = {
      bloco1: [ // Core estável
        { name: 'Prancha frontal', sets: 3, reps: '30-45s', rest: '20-40s', role: 'CORE' },
        { name: 'Dead Bug', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE' },
        { name: 'Prancha lateral', sets: 3, reps: '20-30s cada', rest: '20-40s', role: 'CORE' },
        { name: 'Glute Bridge', sets: 3, reps: '12-15', rest: '20-40s', role: 'CORE' },
        { name: 'Hollow Hold', sets: 3, reps: '20-30s', rest: '20-40s', role: 'CORE' },
      ],
      bloco2: [ // Core anti-rotação
        { name: 'Pallof Press', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE' },
        { name: 'Bird Dog', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE' },
        { name: 'Anti-rotation Hold', sets: 3, reps: '20s cada', rest: '20-40s', role: 'CORE' },
        { name: 'Half Kneeling Chop', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE' },
        { name: 'Stir the Pot', sets: 3, reps: '8 cada', rest: '20-40s', role: 'CORE' },
      ],
      bloco3: [ // Core dinâmico
        { name: 'Ab Wheel Rollout', sets: 3, reps: '8-10', rest: '20-40s', role: 'CORE' },
        { name: 'Hollow Body Hold', sets: 3, reps: '20-30s', rest: '20-40s', role: 'CORE' },
        { name: 'Cable Crunch', sets: 3, reps: '12-15', rest: '20-40s', role: 'CORE' },
        { name: 'Hanging Knee Raise', sets: 3, reps: '10-12', rest: '20-40s', role: 'CORE' },
        { name: 'Mountain Climber lento', sets: 3, reps: '10 cada', rest: '20-40s', role: 'CORE' },
      ],
    }

    // EXERCÍCIOS DE PREPARAÇÃO POR FOCO
    const exerciciosPreparacaoPerna = [
      [
        { name: 'Círculos de quadril', sets: 2, reps: '10 cada lado', duration: '2 min' },
        { name: '90/90 Hip Stretch', sets: 2, reps: '30s cada lado', duration: '2 min' },
        { name: 'Glute Bridges', sets: 2, reps: '12', duration: '2 min' },
        { name: 'Monster Walk com mini band', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Agachamento sem peso (aquecimento)', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Marcha no lugar', sets: 1, reps: '60s', duration: '2 min' },
      ],
      [
        { name: 'Mobilização de tornozelo', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Alongamento de piriforme', sets: 2, reps: '30s cada', duration: '2 min' },
        { name: 'Clamshell', sets: 2, reps: '12 cada', duration: '2 min' },
        { name: 'Prancha com elevação de perna', sets: 2, reps: '8 cada', duration: '2 min' },
        { name: 'Avanço com rotação', sets: 2, reps: '8 cada', duration: '2 min' },
        { name: 'Polichinelos', sets: 1, reps: '30', duration: '2 min' },
      ],
      [
        { name: 'World Greatest Stretch', sets: 2, reps: '5 cada', duration: '2 min' },
        { name: 'Leg Swings frontal', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Fire Hydrants', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Dead Bug', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Inchworm', sets: 2, reps: '6', duration: '2 min' },
        { name: 'Skip baixo', sets: 1, reps: '60s', duration: '2 min' },
      ],
    ]

    const exerciciosPreparacaoSuperior = [
      [
        { name: 'Círculos de ombro', sets: 2, reps: '10 cada direção', duration: '2 min' },
        { name: 'Rotação torácica', sets: 2, reps: '10 cada lado', duration: '2 min' },
        { name: 'Band Pull-apart', sets: 2, reps: '15', duration: '2 min' },
        { name: 'Prancha com toques no ombro', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Push-up na parede', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Arm Circles', sets: 1, reps: '30s cada', duration: '2 min' },
      ],
      [
        { name: 'Cat-Cow', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Thread the Needle', sets: 2, reps: '8 cada', duration: '2 min' },
        { name: 'Face Pull leve', sets: 2, reps: '15', duration: '2 min' },
        { name: 'Bird Dog', sets: 2, reps: '8 cada', duration: '2 min' },
        { name: 'Scapular Push-up', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Jumping Jacks', sets: 1, reps: '30', duration: '2 min' },
      ],
      [
        { name: 'Doorway Pec Stretch', sets: 2, reps: '30s cada', duration: '2 min' },
        { name: 'YTWL', sets: 2, reps: '8 cada letra', duration: '2 min' },
        { name: 'External Rotation', sets: 2, reps: '12 cada', duration: '2 min' },
        { name: 'Dead Bug', sets: 2, reps: '10 cada', duration: '2 min' },
        { name: 'Push-up plus', sets: 2, reps: '10', duration: '2 min' },
        { name: 'Bear Crawl', sets: 1, reps: '30s', duration: '2 min' },
      ],
    ]

    // Selecionar banco de exercícios baseado no foco
    const exerciciosFoco = mainFocusLabel === 'PERNA' ? exerciciosPerna : 
                          mainFocusLabel === 'SUPERIOR' ? exerciciosSuperior : exerciciosPerna
    const exerciciosPreparacao = mainFocusLabel === 'PERNA' ? exerciciosPreparacaoPerna : exerciciosPreparacaoSuperior

    // ========================================================================
    // PASSO 2: GERAR PREPARAÇÃO (COM EXERCÍCIOS ESPECÍFICOS)
    // ========================================================================
    const generatePreparation = (focusLabel: string, sessionIndex: number) => {
      const prepExercises = exerciciosPreparacao[sessionIndex % exerciciosPreparacao.length]
      return {
        title: 'Preparação do Movimento',
        totalTime: '12 minutos',
        exercises: prepExercises,
      }
    }

    // ========================================================================
    // PASSO 3: GERAR OS 3 BLOCOS (DIFERENTES PARA CADA DIA)
    // ========================================================================
    // Cada bloco tem EXATAMENTE 3 exercícios:
    // 1. FOCO PRINCIPAL (sempre do padrão deficiente)
    // 2. PUSH + PULL INTEGRADO
    // 3. CORE
    // A VARIAÇÃO vem do sessionIndex (dia da semana) e weekIndex (semana)
    // ========================================================================
    const generateBlocks = (weekIndex: number, sessionIndex: number) => {
      const blocks = []
      
      // Número de blocos baseado no nível do aluno
      for (let blockNum = 1; blockNum <= maxBlocksPerLevel; blockNum++) {
        const blockKey = `bloco${blockNum}` as 'bloco1' | 'bloco2' | 'bloco3'
        
        const focoOptions = exerciciosFoco[blockKey]
        const pushPullOptions = exerciciosPushPull[blockKey]
        const coreOptions = exerciciosCore[blockKey]
        
        // VARIAÇÃO POR DIA: sessionIndex muda o exercício principal
        // VARIAÇÃO POR SEMANA: weekIndex adiciona offset
        // Isso garante que cada dia tenha exercícios diferentes
        const focoIdx = (sessionIndex + (weekIndex * 2)) % focoOptions.length
        const pushPullIdx = (sessionIndex + blockNum + weekIndex) % pushPullOptions.length
        const coreIdx = (sessionIndex + blockNum + (weekIndex * 2)) % coreOptions.length
        
        const focoExercise = focoOptions[focoIdx]
        const pushPullExercise = pushPullOptions[pushPullIdx]
        const coreExercise = coreOptions[coreIdx]

        blocks.push({
          blockIndex: blockNum,
          name: `Bloco ${blockNum}`,
          description: blockNum === 1 ? 'Introdução' : blockNum === 2 ? 'Desenvolvimento' : 'Integração',
          restAfterBlock: blockNum === 1 ? '90-120s' : blockNum === 2 ? '120-150s' : '60-90s',
          exercises: [
            { ...focoExercise },
            { ...pushPullExercise },
            { ...coreExercise },
          ],
        })
      }
      
      return blocks
    }

    // ========================================================================
    // PASSO 4: GERAR PROTOCOLO FINAL (SEPARADO - NÃO É BLOCO)
    // ========================================================================
    const generateFinalProtocol = (weekPhase: string, goal: string) => {
      if (goal === 'emagrecimento' || weekPhase === 'PEAK') {
        return {
          name: 'HIIT Metabólico',
          totalTime: '8 minutos',
          structure: '30s trabalho / 30s descanso × 8 rounds',
          exercises: [
            { name: 'Burpees ou variação', duration: '30s', rest: '30s' },
            { name: 'Mountain Climbers', duration: '30s', rest: '30s' },
            { name: 'Jump Squats', duration: '30s', rest: '30s' },
            { name: 'High Knees', duration: '30s', rest: '30s' },
          ],
        }
      }
      if (goal === 'recondicionamento' || weekPhase === 'ADAPTATION') {
        return {
          name: 'Circuito Regenerativo',
          totalTime: '6 minutos',
          structure: 'Movimentos suaves contínuos',
          exercises: [
            { name: 'Caminhada leve', duration: '2 min', rest: '-' },
            { name: 'Alongamento dinâmico', duration: '2 min', rest: '-' },
            { name: 'Respiração diafragmática', duration: '2 min', rest: '-' },
          ],
        }
      }
      return {
        name: 'Protocolo Metabólico Moderado',
        totalTime: '6 minutos',
        structure: '40s trabalho / 20s descanso × 6 rounds',
        exercises: [
          { name: 'Polichinelos', duration: '40s', rest: '20s' },
          { name: 'Agachamento livre', duration: '40s', rest: '20s' },
          { name: 'Corrida estacionária', duration: '40s', rest: '20s' },
        ],
      }
    }

    // ========================================================================
    // GERAR CRONOGRAMA COMPLETO
    // ========================================================================
    const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
    const optimalDays = weeklyFrequency === 2 ? ['Segunda', 'Quinta'] :
                       weeklyFrequency === 3 ? ['Segunda', 'Quarta', 'Sexta'] :
                       weeklyFrequency === 4 ? ['Segunda', 'Terça', 'Quinta', 'Sexta'] :
                       weekDays.slice(0, weeklyFrequency)

    const schedule: any = {
      weeklyFrequency,
      phaseDuration,
      mainFocus: mainFocusLabel,
      methodology: 'Método EXPERT PRO TRAINING',
      structure: {
        preparation: 'Única por sessão (12 min)',
        blocks: '3 blocos obrigatórios (3 exercícios cada)',
        protocol: 'Protocolo final (6-8 min)',
      },
      weeks: [],
    }

    // Gerar cada semana
    for (let week = 1; week <= phaseDuration; week++) {
      const weekPhase = week <= Math.ceil(phaseDuration / 3) ? 'ADAPTATION' : 
                       week <= Math.ceil(phaseDuration * 2 / 3) ? 'DEVELOPMENT' : 'PEAK'
      
      const weekSchedule: any = {
        week,
        phase: weekPhase,
        phaseLabel: weekPhase === 'ADAPTATION' ? 'Adaptação' : weekPhase === 'DEVELOPMENT' ? 'Desenvolvimento' : 'Pico',
        sessions: [],
      }

      // Gerar cada sessão da semana
      for (let session = 0; session < weeklyFrequency; session++) {
        const preparation = generatePreparation(mainFocusLabel, session)
        const blocks = generateBlocks(week - 1, session)
        const finalProtocol = generateFinalProtocol(weekPhase, result.primaryGoal || 'saude')

        // Calcular duração total
        const prepTime = 12
        const blocksTime = 45 // ~15 min por bloco
        const protocolTime = parseInt(finalProtocol.totalTime) || 6
        const totalDuration = prepTime + blocksTime + protocolTime

        weekSchedule.sessions.push({
          session: session + 1,
          day: optimalDays[session] || weekDays[session],
          focus: mainFocusLabel,
          estimatedDuration: totalDuration,
          preparation,
          blocks,
          finalProtocol,
        })
      }

      schedule.weeks.push(weekSchedule)
    }

    console.log(`📅 Cronograma MÉTODO EXPERT gerado:`)
    console.log(`   - Foco Principal: ${mainFocusLabel}`)
    console.log(`   - Semanas: ${phaseDuration}`)
    console.log(`   - Sessões/semana: ${weeklyFrequency}`)
    console.log(`   - Estrutura: Preparação + 3 Blocos + Protocolo Final`)

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
        blocksUsed: allowedBlockCodes.length,
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
