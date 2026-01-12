// ============================================================================
// EXPERT TRAINING - DATABASE SEED
// ============================================================================
// Popula o banco com dados iniciais para desenvolvimento
// ============================================================================

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // ============================================================================
  // 1. CRIAR PLANOS
  // ============================================================================
  console.log('📦 Criando planos...')

  // Deleta planos antigos para garantir um seed limpo
  await prisma.plan.deleteMany({})

  const planStart = await prisma.plan.create({
    data: {
      name: 'Studio Start',
      slug: 'studio-start',
      tier: 'START',
      description: 'Ideal para studios pequenos, a partir de 1 personal.',
      pricePerTrainer: 150.0,
      minTrainers: 1,
      recommendedMax: 4,
      features: [
        'Acesso completo ao sistema',
        'Avaliações funcionais ilimitadas',
        'Uso do motor de decisão',
        'Acesso às planilhas/blocos oficiais',
        'Registro de aulas (check-in com foto)',
        'Alunos ilimitados',
        'Histórico completo',
        'Auditoria ativa',
      ],
      isActive: true,
      isVisible: true,
    },
  })

  const planPro = await prisma.plan.create({
    data: {
      name: 'Studio Pro',
      slug: 'studio-pro',
      tier: 'PRO',
      description: 'Para studios médios/grandes, com desconto por volume.',
      pricePerTrainer: 140.0,
      minTrainers: 5,
      recommendedMax: 9,
      features: [
        'Todos os benefícios do Studio Start',
        'Desconto por volume',
      ],
      isActive: true,
      isVisible: true,
    },
  })

  const planPremium = await prisma.plan.create({
    data: {
      name: 'Studio Premium',
      slug: 'studio-premium',
      tier: 'PREMIUM',
      description: 'Para studios referência, com benefícios exclusivos.',
      pricePerTrainer: 130.0,
      minTrainers: 10,
      features: [
        'Todos os benefícios do Studio Pro',
        'Prioridade no suporte',
        'Acesso antecipado a features',
        'Possibilidade futura de co-branding',
      ],
      isActive: true,
      isVisible: true,
    },
  })

  console.log('✅ Planos criados:', { planStart, planPro, planPremium })

  // ============================================================================
  // 2. CRIAR SUPERADMIN (JUBA)
  // ============================================================================
  console.log('👤 Criando SuperAdmin...')
  
  const passwordHash = await bcrypt.hash('super123', 12)
  
  const superAdmin = await prisma.user.upsert({
    where: { email: 'juba@experttraining.com.br' },
    update: {
      passwordHash, // Atualizar a senha caso já exista
      isSuperAdmin: true,
    },
    create: {
      id: 'user_superadmin',
      name: 'Juba',
      email: 'juba@experttraining.com.br',
      passwordHash,
      isSuperAdmin: true,
    },
  })

  console.log('✅ SuperAdmin criado:', superAdmin.email)

  // ============================================================================
  // 3. CRIAR STUDIOS DE EXEMPLO
  // ============================================================================
  console.log('🏢 Criando studios...')

  const studioAlpha = await prisma.studio.upsert({
    where: { slug: 'studio-alpha' },
    update: {},
    create: {
      id: 'studio_alpha',
      name: 'Studio Alpha',
      slug: 'studio-alpha',
      status: 'ACTIVE',
      planId: planPro.id,
      settings: { theme: 'light', timezone: 'America/Sao_Paulo' },
    },
  })

  const studioBeta = await prisma.studio.upsert({
    where: { slug: 'studio-beta' },
    update: {},
    create: {
      id: 'studio_beta',
      name: 'Studio Beta',
      slug: 'studio-beta',
      status: 'ACTIVE',
      planId: planStart.id,
      settings: { theme: 'dark', timezone: 'America/Sao_Paulo' },
    },
  })

  const studioSuspended = await prisma.studio.upsert({
    where: { slug: 'studio-suspended' },
    update: {},
    create: {
      id: 'studio_suspended',
      name: 'Studio Suspenso',
      slug: 'studio-suspended',
      status: 'SUSPENDED',
      planId: planStart.id,
    },
  })

  console.log('✅ Studios criados:', { studioAlpha, studioBeta, studioSuspended })

  // ============================================================================
  // 4. CRIAR USUÁRIOS DE EXEMPLO
  // ============================================================================
  console.log('👥 Criando usuários...')

  const userPassword = await bcrypt.hash('trainer123', 12)

  // Usuário que é admin em um studio e trainer em outro
  const userCarlos = await prisma.user.upsert({
    where: { email: 'carlos@example.com' },
    update: {},
    create: {
      id: 'user_carlos',
      name: 'Carlos Silva',
      email: 'carlos@example.com',
      passwordHash: userPassword,
      isSuperAdmin: false,
    },
  })

  // Usuário que é trainer em dois studios
  const userMaria = await prisma.user.upsert({
    where: { email: 'maria@example.com' },
    update: {},
    create: {
      id: 'user_maria',
      name: 'Maria Santos',
      email: 'maria@example.com',
      passwordHash: userPassword,
      isSuperAdmin: false,
    },
  })

  // Usuário que é trainer em apenas um studio
  const userJoao = await prisma.user.upsert({
    where: { email: 'joao@example.com' },
    update: {},
    create: {
      id: 'user_joao',
      name: 'João Oliveira',
      email: 'joao@example.com',
      passwordHash: userPassword,
      isSuperAdmin: false,
    },
  })

  console.log('✅ Usuários criados')

  // ============================================================================
  // 5. CRIAR VÍNCULOS USER-STUDIO (TABELA PIVÔ)
  // ============================================================================
  console.log('🔗 Criando vínculos user-studio...')

  // Carlos: Admin no Alpha, Trainer no Beta
  await prisma.userStudio.upsert({
    where: { userId_studioId: { userId: userCarlos.id, studioId: studioAlpha.id } },
    update: {},
    create: {
      userId: userCarlos.id,
      studioId: studioAlpha.id,
      role: 'STUDIO_ADMIN',
    },
  })

  await prisma.userStudio.upsert({
    where: { userId_studioId: { userId: userCarlos.id, studioId: studioBeta.id } },
    update: {},
    create: {
      userId: userCarlos.id,
      studioId: studioBeta.id,
      role: 'TRAINER',
    },
  })

  // Maria: Trainer no Alpha e Beta
  await prisma.userStudio.upsert({
    where: { userId_studioId: { userId: userMaria.id, studioId: studioAlpha.id } },
    update: {},
    create: {
      userId: userMaria.id,
      studioId: studioAlpha.id,
      role: 'TRAINER',
    },
  })

  await prisma.userStudio.upsert({
    where: { userId_studioId: { userId: userMaria.id, studioId: studioBeta.id } },
    update: {},
    create: {
      userId: userMaria.id,
      studioId: studioBeta.id,
      role: 'TRAINER',
    },
  })

  // João: Apenas Trainer no Alpha
  await prisma.userStudio.upsert({
    where: { userId_studioId: { userId: userJoao.id, studioId: studioAlpha.id } },
    update: {},
    create: {
      userId: userJoao.id,
      studioId: studioAlpha.id,
      role: 'TRAINER',
    },
  })

  console.log('✅ Vínculos criados')

  // ============================================================================
  // 6. CRIAR BLOCOS DE EXEMPLO
  // ============================================================================
  console.log('🧱 Criando blocos...')

  const blocks = [
    {
      id: 'block_hip_mob_l1',
      code: 'HIP_MOB_L1',
      name: 'Mobilidade de Quadril - Nível 1',
      description: 'Bloco introdutório para ganho de amplitude de movimento no quadril',
      level: 1,
      primaryCapacity: 'MOBILITY',
      secondaryCapacities: ['STABILITY'],
      movementPattern: 'SQUAT',
      riskLevel: 'LOW',
      contraindications: ['acute_hip_pain', 'hip_replacement_recent'],
      exercises: [
        { name: '90/90 Hip Stretch', sets: 2, reps: '30s cada lado' },
        { name: 'Hip Circles', sets: 2, reps: '10 cada direção' },
        { name: 'Frog Stretch', sets: 2, reps: '45s' },
      ],
    },
    {
      id: 'block_core_stab_l1',
      code: 'CORE_STAB_L1',
      name: 'Estabilidade de Core - Nível 1',
      description: 'Fundamentos de ativação e estabilização do core',
      level: 1,
      primaryCapacity: 'STABILITY',
      secondaryCapacities: ['COORDINATION'],
      movementPattern: null,
      riskLevel: 'LOW',
      contraindications: ['acute_lower_back_pain', 'hernia'],
      exercises: [
        { name: 'Dead Bug', sets: 3, reps: '8 cada lado' },
        { name: 'Bird Dog', sets: 3, reps: '8 cada lado' },
        { name: 'Pallof Hold', sets: 3, reps: '20s cada lado' },
      ],
    },
    {
      id: 'block_squat_l1',
      code: 'SQUAT_L1',
      name: 'Padrão Agachamento - Nível 1',
      description: 'Desenvolvimento do padrão de agachamento com foco em controle motor',
      level: 1,
      primaryCapacity: 'STRENGTH',
      secondaryCapacities: ['MOBILITY', 'STABILITY'],
      movementPattern: 'SQUAT',
      riskLevel: 'LOW',
      contraindications: ['acute_knee_pain', 'acute_lower_back_pain'],
      exercises: [
        { name: 'Goblet Squat', sets: 3, reps: '10' },
        { name: 'Box Squat', sets: 3, reps: '10' },
        { name: 'Squat Hold', sets: 2, reps: '30s' },
      ],
    },
    {
      id: 'block_hinge_l1',
      code: 'HINGE_L1',
      name: 'Padrão Dobradiça - Nível 1',
      description: 'Desenvolvimento do padrão de dobradiça de quadril',
      level: 1,
      primaryCapacity: 'STRENGTH',
      secondaryCapacities: ['STABILITY'],
      movementPattern: 'HINGE',
      riskLevel: 'MODERATE',
      contraindications: ['acute_lower_back_pain', 'disc_herniation'],
      exercises: [
        { name: 'Romanian Deadlift', sets: 3, reps: '10' },
        { name: 'Hip Hinge Drill', sets: 2, reps: '12' },
        { name: 'Single Leg RDL', sets: 2, reps: '8 cada lado' },
      ],
    },
    {
      id: 'block_thoracic_l1',
      code: 'THORACIC_L1',
      name: 'Mobilidade Torácica - Nível 1',
      description: 'Ganho de mobilidade em rotação e extensão torácica',
      level: 1,
      primaryCapacity: 'MOBILITY',
      secondaryCapacities: [],
      movementPattern: 'ROTATION',
      riskLevel: 'LOW',
      contraindications: ['acute_thoracic_pain'],
      exercises: [
        { name: 'Thread the Needle', sets: 2, reps: '8 cada lado' },
        { name: 'Cat-Cow', sets: 2, reps: '10' },
        { name: 'Thoracic Extension on Foam Roller', sets: 2, reps: '10' },
      ],
    },
  ]

  for (const block of blocks) {
    await prisma.block.upsert({
      where: { id: block.id },
      update: {},
      create: block as any,
    })
  }

  console.log('✅ Blocos criados')

  // ============================================================================
  // 7. CRIAR REGRAS DE EXEMPLO
  // ============================================================================
  console.log('📋 Criando regras do motor de decisão...')

  const rules = [
    {
      id: 'rule_lower_back_pain',
      name: 'Dor Lombar Aguda',
      description: 'Quando há dor lombar significativa, priorizar estabilidade e evitar carga axial',
      conditionJson: {
        operator: 'AND',
        conditions: [
          { field: 'painMap.lower_back', operator: '>=', value: 5 },
        ],
      },
      allowedBlocks: ['CORE_STAB_L1', 'HIP_MOB_L1'],
      blockedBlocks: ['SQUAT_L1', 'HINGE_L1'],
      recommendations: ['Priorizar estabilização antes de padrões de carga'],
      priority: 100,
    },
    {
      id: 'rule_beginner_squat_limitation',
      name: 'Iniciante com Limitação de Agachamento',
      description: 'Iniciantes com baixa pontuação em agachamento devem focar em mobilidade',
      conditionJson: {
        operator: 'AND',
        conditions: [
          { field: 'level', operator: '==', value: 'BEGINNER' },
          { field: 'movementTests.squat.score', operator: '<=', value: 1 },
        ],
      },
      allowedBlocks: ['HIP_MOB_L1', 'THORACIC_L1', 'CORE_STAB_L1'],
      blockedBlocks: [],
      recommendations: ['Trabalhar mobilidade de quadril antes de progredir para carga'],
      priority: 80,
    },
    {
      id: 'rule_rotation_deficit',
      name: 'Déficit de Rotação',
      description: 'Quando há limitação em rotação, priorizar mobilidade torácica',
      conditionJson: {
        operator: 'AND',
        conditions: [
          { field: 'movementTests.rotation.score', operator: '<=', value: 1 },
        ],
      },
      allowedBlocks: ['THORACIC_L1'],
      blockedBlocks: [],
      recommendations: ['Incluir mobilidade torácica em todas as sessões'],
      priority: 60,
    },
  ]

  for (const rule of rules) {
    await prisma.rule.upsert({
      where: { id: rule.id },
      update: {},
      create: rule as any,
    })
  }

  console.log('✅ Regras criadas')

  // ============================================================================
  // 8. CRIAR CLIENTES DE EXEMPLO
  // ============================================================================
  console.log('👤 Criando clientes...')

  const clients = [
    {
      id: 'client_pedro',
      studioId: studioAlpha.id,
      trainerId: userCarlos.id,
      name: 'Pedro Henrique',
      email: 'pedro@email.com',
      phone: '11999990001',
      birthDate: new Date('1985-03-15'),
      gender: 'M',
      height: 175,
      weight: 82,
      history: 'Histórico de dor lombar crônica. Sedentário por 3 anos.',
      objectives: 'Melhorar mobilidade, fortalecer core, perder peso',
    },
    {
      id: 'client_ana',
      studioId: studioAlpha.id,
      trainerId: userMaria.id,
      name: 'Ana Paula',
      email: 'ana@email.com',
      phone: '11999990002',
      birthDate: new Date('1990-07-22'),
      gender: 'F',
      height: 165,
      weight: 58,
      history: 'Praticante de yoga. Sem lesões significativas.',
      objectives: 'Ganho de força, manter flexibilidade',
    },
    {
      id: 'client_marcos',
      studioId: studioBeta.id,
      trainerId: userMaria.id,
      name: 'Marcos Roberto',
      email: 'marcos@email.com',
      phone: '11999990003',
      birthDate: new Date('1978-11-08'),
      gender: 'M',
      height: 180,
      weight: 95,
      history: 'Ex-atleta de futebol. Artroscopia no joelho direito em 2020.',
      objectives: 'Reabilitação funcional, retorno às atividades esportivas',
    },
  ]

  for (const client of clients) {
    await prisma.client.upsert({
      where: { id: client.id },
      update: {},
      create: client as any,
    })
  }

  console.log('✅ Clientes criados')

  // ============================================================================
  // 10. CRIAR EXERCÍCIOS
  // ============================================================================
  console.log('💪 Criando exercícios...')

  const exercises = [
    // Mobilidade de Quadril
    { name: '90/90 Hip Stretch', muscleGroup: 'Glúteos', equipment: 'Peso Corporal', difficulty: 'BEGINNER', blockId: 'block_hip_mob_l1' },
    { name: 'Hip Circles', muscleGroup: 'Glúteos', equipment: 'Peso Corporal', difficulty: 'BEGINNER', blockId: 'block_hip_mob_l1' },
    { name: 'Pigeon Pose', muscleGroup: 'Glúteos', equipment: 'Peso Corporal', difficulty: 'INTERMEDIATE', blockId: 'block_hip_mob_l1' },
    
    // Core
    { name: 'Dead Bug', muscleGroup: 'Core', equipment: 'Peso Corporal', difficulty: 'BEGINNER', blockId: 'block_core_stab_l1' },
    { name: 'Bird Dog', muscleGroup: 'Core', equipment: 'Peso Corporal', difficulty: 'BEGINNER', blockId: 'block_core_stab_l1' },
    { name: 'Plank', muscleGroup: 'Core', equipment: 'Peso Corporal', difficulty: 'BEGINNER', blockId: 'block_core_stab_l1' },
    { name: 'Hollow Hold', muscleGroup: 'Core', equipment: 'Peso Corporal', difficulty: 'INTERMEDIATE', blockId: 'block_core_stab_l1' },
    
    // Força - Squat
    { name: 'Goblet Squat', muscleGroup: 'Quadríceps', equipment: 'Kettlebell', difficulty: 'BEGINNER', blockId: 'block_squat_l1' },
    { name: 'Back Squat', muscleGroup: 'Quadríceps', equipment: 'Barra', difficulty: 'INTERMEDIATE', blockId: 'block_squat_l1' },
    { name: 'Front Squat', muscleGroup: 'Quadríceps', equipment: 'Barra', difficulty: 'ADVANCED', blockId: 'block_squat_l1' },
    { name: 'Bulgarian Split Squat', muscleGroup: 'Quadríceps', equipment: 'Halteres', difficulty: 'INTERMEDIATE', blockId: 'block_squat_l1' },
    
    // Força - Hinge
    { name: 'Romanian Deadlift', muscleGroup: 'Posterior', equipment: 'Barra', difficulty: 'INTERMEDIATE', blockId: 'block_hinge_l1' },
    { name: 'Kettlebell Swing', muscleGroup: 'Posterior', equipment: 'Kettlebell', difficulty: 'INTERMEDIATE', blockId: 'block_hinge_l1' },
    { name: 'Good Morning', muscleGroup: 'Posterior', equipment: 'Barra', difficulty: 'INTERMEDIATE', blockId: 'block_hinge_l1' },
    
    // Push
    { name: 'Push Up', muscleGroup: 'Peitoral', equipment: 'Peso Corporal', difficulty: 'BEGINNER' },
    { name: 'Bench Press', muscleGroup: 'Peitoral', equipment: 'Barra', difficulty: 'INTERMEDIATE' },
    { name: 'Dumbbell Press', muscleGroup: 'Peitoral', equipment: 'Halteres', difficulty: 'BEGINNER' },
    { name: 'Overhead Press', muscleGroup: 'Deltoides', equipment: 'Barra', difficulty: 'INTERMEDIATE' },
    
    // Pull
    { name: 'Pull Up', muscleGroup: 'Dorsal', equipment: 'Peso Corporal', difficulty: 'INTERMEDIATE' },
    { name: 'Lat Pulldown', muscleGroup: 'Dorsal', equipment: 'Cabo', difficulty: 'BEGINNER' },
    { name: 'Bent Over Row', muscleGroup: 'Dorsal', equipment: 'Barra', difficulty: 'INTERMEDIATE' },
    { name: 'Face Pull', muscleGroup: 'Deltoides', equipment: 'Cabo', difficulty: 'BEGINNER' },
    
    // Isolados
    { name: 'Bicep Curl', muscleGroup: 'Bíceps', equipment: 'Halteres', difficulty: 'BEGINNER' },
    { name: 'Tricep Pushdown', muscleGroup: 'Tríceps', equipment: 'Cabo', difficulty: 'BEGINNER' },
    { name: 'Leg Curl', muscleGroup: 'Posterior', equipment: 'Máquina', difficulty: 'BEGINNER' },
    { name: 'Leg Extension', muscleGroup: 'Quadríceps', equipment: 'Máquina', difficulty: 'BEGINNER' },
    { name: 'Calf Raise', muscleGroup: 'Panturrilha', equipment: 'Peso Corporal', difficulty: 'BEGINNER' },
  ]

  for (const exercise of exercises) {
    await prisma.exercise.upsert({
      where: { id: `exercise_${exercise.name.toLowerCase().replace(/\s+/g, '_')}` },
      update: {},
      create: {
        id: `exercise_${exercise.name.toLowerCase().replace(/\s+/g, '_')}`,
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
        difficulty: exercise.difficulty,
        blockId: exercise.blockId || null,
        isActive: true,
      },
    })
  }

  console.log('✅ Exercícios criados')

  // ============================================================================
  // SEED DO MÉTODO EXPERT TRAINING (DADOS PROTEGIDOS)
  // ============================================================================
  await seedMetodoExpertTraining()

  console.log('')
  console.log('🎉 Seed concluído com sucesso!')
  console.log('')
  console.log('📝 Credenciais de acesso:')
  console.log('   SuperAdmin: juba@experttraining.com.br / super123')
  console.log('   Trainer:    carlos@example.com / trainer123')
  console.log('   Trainer:    maria@example.com / trainer123')
  console.log('   Trainer:    joao@example.com / trainer123')
}

// ============================================================================
// MÉTODO EXPERT TRAINING - DADOS PROTEGIDOS
// ============================================================================
// ⚠️ ATENÇÃO: Este são CORE DATA do Método Expert Training
// - Todos os dados são IMUTÁVEIS para studios
// - Apenas SUPERADMIN pode modificar via painel administrativo
// - is_locked = true em todos os registros
// ============================================================================

const LEVELS = {
  CONDICIONAMENTO: 0,
  INICIANTE: 1,
  INTERMEDIARIO: 2,
  AVANCADO: 3,
}

// BLOCOS DE CONDICIONAMENTO (NÍVEL 0)
const blocosCondicionamento = [
  {
    code: 'COND_CARDIO_A',
    name: 'Condicionamento Cardio A',
    description: 'Bloco de condicionamento cardiovascular básico para iniciação ao método',
    level: LEVELS.CONDICIONAMENTO,
    levelName: 'CONDICIONAMENTO',
    primaryCapacity: 'CONDITIONING',
    secondaryCapacities: ['ENDURANCE', 'COORDINATION'],
    complexity: 1,
    impact: 2,
    movementPattern: 'CARDIO',
    riskLevel: 'LOW' as const,
    suggestedFrequency: 3,
    estimatedDuration: 15,
    blockOrder: 1,
    blockedIf: ['lesao_aguda', 'restricao_cardiaca'],
    allowedIf: ['liberacao_medica', 'sem_restricoes'],
    exercises: [
      { name: 'Polichinelo', type: 'Cardio', time: '30s', rest: '15s', order: 1 },
      { name: 'Corrida Estacionária', type: 'Cardio', time: '30s', rest: '15s', order: 2 },
      { name: 'Escalador', type: 'Cardio', time: '30s', rest: '15s', order: 3 },
      { name: 'Skipping', type: 'Cardio', time: '30s', rest: '30s', order: 4 },
    ],
  },
  {
    code: 'COND_CARDIO_B',
    name: 'Condicionamento Cardio B',
    description: 'Bloco de condicionamento cardiovascular com variações',
    level: LEVELS.CONDICIONAMENTO,
    levelName: 'CONDICIONAMENTO',
    primaryCapacity: 'CONDITIONING',
    secondaryCapacities: ['ENDURANCE', 'AGILITY'],
    complexity: 1,
    impact: 2,
    movementPattern: 'CARDIO',
    riskLevel: 'LOW' as const,
    suggestedFrequency: 3,
    estimatedDuration: 15,
    blockOrder: 1,
    blockedIf: ['lesao_aguda', 'restricao_cardiaca'],
    allowedIf: ['liberacao_medica', 'sem_restricoes'],
    exercises: [
      { name: 'Burpee Modificado', type: 'Cardio', time: '30s', rest: '20s', order: 1 },
      { name: 'Jumping Jack', type: 'Cardio', time: '30s', rest: '15s', order: 2 },
      { name: 'Agachamento com Salto', type: 'Cardio', time: '20s', rest: '20s', order: 3 },
      { name: 'Prancha com Toque Ombro', type: 'Core', time: '30s', rest: '30s', order: 4 },
    ],
  },
  {
    code: 'COND_MOBILIDADE_A',
    name: 'Condicionamento Mobilidade A',
    description: 'Bloco de mobilidade articular para preparação do corpo',
    level: LEVELS.CONDICIONAMENTO,
    levelName: 'CONDICIONAMENTO',
    primaryCapacity: 'MOBILITY',
    secondaryCapacities: ['STABILITY', 'COORDINATION'],
    complexity: 1,
    impact: 1,
    movementPattern: 'ROTATION',
    riskLevel: 'LOW' as const,
    suggestedFrequency: 5,
    estimatedDuration: 10,
    blockOrder: 0,
    blockedIf: [],
    allowedIf: ['todos'],
    exercises: [
      { name: 'Círculos de Quadril', type: 'Mobilidade', reps: '10 cada lado', rest: '0s', order: 1 },
      { name: 'Rotação Torácica', type: 'Mobilidade', reps: '8 cada lado', rest: '0s', order: 2 },
      { name: 'Cat-Cow', type: 'Mobilidade', reps: '10', rest: '0s', order: 3 },
      { name: 'Alongamento 90/90', type: 'Mobilidade', time: '30s cada lado', rest: '0s', order: 4 },
    ],
  },
]

// BLOCOS INICIANTE (NÍVEL 1)
const blocosIniciante = [
  {
    code: 'INI_FORCA_A',
    name: 'Força Iniciante A - Membros Inferiores',
    description: 'Bloco de força para membros inferiores - padrão agachamento e hinge',
    level: LEVELS.INICIANTE,
    levelName: 'INICIANTE',
    primaryCapacity: 'STRENGTH',
    secondaryCapacities: ['STABILITY', 'COORDINATION'],
    complexity: 2,
    impact: 3,
    movementPattern: 'SQUAT',
    riskLevel: 'LOW' as const,
    suggestedFrequency: 2,
    estimatedDuration: 20,
    blockOrder: 2,
    blockedIf: ['dor_joelho_aguda', 'dor_lombar_aguda', 'nivel_insuficiente'],
    allowedIf: ['nivel_adequado', 'ausencia_dor_articular', 'boa_mobilidade_quadril'],
    exercises: [
      { name: 'Agachamento Goblet', type: 'Força', sets: 3, reps: '10-12', rest: '60s', order: 1 },
      { name: 'Stiff com Halteres', type: 'Força', sets: 3, reps: '10-12', rest: '60s', order: 2 },
      { name: 'Afundo Estático', type: 'Força', sets: 3, reps: '8 cada', rest: '60s', order: 3 },
      { name: 'Ponte de Glúteos', type: 'Força', sets: 3, reps: '12-15', rest: '45s', order: 4 },
    ],
  },
  {
    code: 'INI_FORCA_B',
    name: 'Força Iniciante B - Membros Superiores',
    description: 'Bloco de força para membros superiores - padrão push e pull',
    level: LEVELS.INICIANTE,
    levelName: 'INICIANTE',
    primaryCapacity: 'STRENGTH',
    secondaryCapacities: ['STABILITY', 'HYPERTROPHY'],
    complexity: 2,
    impact: 2,
    movementPattern: 'PUSH',
    riskLevel: 'LOW' as const,
    suggestedFrequency: 2,
    estimatedDuration: 20,
    blockOrder: 2,
    blockedIf: ['dor_ombro_aguda', 'lesao_manguito'],
    allowedIf: ['nivel_adequado', 'ausencia_dor_ombro', 'boa_mobilidade_ombro'],
    exercises: [
      { name: 'Supino com Halteres', type: 'Força', sets: 3, reps: '10-12', rest: '60s', order: 1 },
      { name: 'Remada Curvada', type: 'Força', sets: 3, reps: '10-12', rest: '60s', order: 2 },
      { name: 'Desenvolvimento', type: 'Força', sets: 3, reps: '10', rest: '60s', order: 3 },
      { name: 'Rosca Direta', type: 'Força', sets: 2, reps: '12', rest: '45s', order: 4 },
    ],
  },
  {
    code: 'INI_CORE_A',
    name: 'Core Iniciante A',
    description: 'Bloco de estabilização e fortalecimento do core',
    level: LEVELS.INICIANTE,
    levelName: 'INICIANTE',
    primaryCapacity: 'STABILITY',
    secondaryCapacities: ['STRENGTH', 'COORDINATION'],
    complexity: 2,
    impact: 2,
    movementPattern: 'ROTATION',
    riskLevel: 'LOW' as const,
    suggestedFrequency: 3,
    estimatedDuration: 10,
    blockOrder: 3,
    blockedIf: ['dor_lombar_aguda', 'hernia_discal_ativa'],
    allowedIf: ['nivel_adequado', 'sem_lesao_coluna'],
    exercises: [
      { name: 'Prancha Frontal', type: 'Core', time: '30s', rest: '30s', sets: 3, order: 1 },
      { name: 'Prancha Lateral', type: 'Core', time: '20s cada', rest: '20s', sets: 2, order: 2 },
      { name: 'Dead Bug', type: 'Core', reps: '8 cada', rest: '30s', sets: 3, order: 3 },
      { name: 'Bird Dog', type: 'Core', reps: '8 cada', rest: '30s', sets: 3, order: 4 },
    ],
  },
  {
    code: 'INI_CARDIO_HIIT',
    name: 'HIIT Iniciante',
    description: 'Bloco de alta intensidade intervalada para iniciantes',
    level: LEVELS.INICIANTE,
    levelName: 'INICIANTE',
    primaryCapacity: 'CONDITIONING',
    secondaryCapacities: ['POWER', 'ENDURANCE'],
    complexity: 2,
    impact: 4,
    movementPattern: 'CARDIO',
    riskLevel: 'MODERATE' as const,
    suggestedFrequency: 2,
    estimatedDuration: 15,
    blockOrder: 4,
    blockedIf: ['restricao_cardiaca', 'lesao_aguda', 'nivel_condicionamento_baixo'],
    allowedIf: ['nivel_adequado', 'liberacao_cardiaca', 'boa_recuperacao'],
    exercises: [
      { name: 'Burpee', type: 'HIIT', time: '20s', rest: '40s', rounds: 4, order: 1 },
      { name: 'Mountain Climber', type: 'HIIT', time: '20s', rest: '40s', rounds: 4, order: 2 },
      { name: 'Jumping Lunges', type: 'HIIT', time: '20s', rest: '40s', rounds: 4, order: 3 },
      { name: 'Squat Jump', type: 'HIIT', time: '20s', rest: '40s', rounds: 4, order: 4 },
    ],
  },
]

// BLOCOS INTERMEDIÁRIO (NÍVEL 2)
const blocosIntermediario = [
  {
    code: 'INT_FORCA_A',
    name: 'Força Intermediário A - Membros Inferiores',
    description: 'Bloco de força avançada para membros inferiores',
    level: LEVELS.INTERMEDIARIO,
    levelName: 'INTERMEDIÁRIO',
    primaryCapacity: 'STRENGTH',
    secondaryCapacities: ['POWER', 'HYPERTROPHY'],
    complexity: 3,
    impact: 4,
    movementPattern: 'SQUAT',
    riskLevel: 'MODERATE' as const,
    suggestedFrequency: 2,
    estimatedDuration: 25,
    blockOrder: 2,
    blockedIf: ['dor_joelho', 'dor_lombar', 'nivel_insuficiente', 'mobilidade_quadril_ruim'],
    allowedIf: ['nivel_intermediario', 'boa_tecnica_agachamento', 'ausencia_dor'],
    exercises: [
      { name: 'Agachamento com Barra', type: 'Força', sets: 4, reps: '8-10', rest: '90s', order: 1 },
      { name: 'Levantamento Terra', type: 'Força', sets: 4, reps: '6-8', rest: '120s', order: 2 },
      { name: 'Afundo Búlgaro', type: 'Força', sets: 3, reps: '10 cada', rest: '60s', order: 3 },
      { name: 'Leg Press', type: 'Força', sets: 3, reps: '12', rest: '60s', order: 4 },
      { name: 'Panturrilha em Pé', type: 'Força', sets: 3, reps: '15', rest: '45s', order: 5 },
    ],
  },
  {
    code: 'INT_FORCA_B',
    name: 'Força Intermediário B - Membros Superiores',
    description: 'Bloco de força avançada para membros superiores',
    level: LEVELS.INTERMEDIARIO,
    levelName: 'INTERMEDIÁRIO',
    primaryCapacity: 'STRENGTH',
    secondaryCapacities: ['POWER', 'HYPERTROPHY'],
    complexity: 3,
    impact: 3,
    movementPattern: 'PUSH',
    riskLevel: 'MODERATE' as const,
    suggestedFrequency: 2,
    estimatedDuration: 25,
    blockOrder: 2,
    blockedIf: ['dor_ombro', 'lesao_manguito', 'nivel_insuficiente'],
    allowedIf: ['nivel_intermediario', 'boa_mobilidade_ombro', 'ausencia_dor'],
    exercises: [
      { name: 'Supino Reto com Barra', type: 'Força', sets: 4, reps: '8-10', rest: '90s', order: 1 },
      { name: 'Remada Cavalinho', type: 'Força', sets: 4, reps: '8-10', rest: '90s', order: 2 },
      { name: 'Desenvolvimento Militar', type: 'Força', sets: 3, reps: '8-10', rest: '60s', order: 3 },
      { name: 'Barra Fixa', type: 'Força', sets: 3, reps: 'Máximo', rest: '90s', order: 4 },
      { name: 'Tríceps Francês', type: 'Força', sets: 3, reps: '12', rest: '45s', order: 5 },
    ],
  },
  {
    code: 'INT_HIIT_COMPLEXO',
    name: 'HIIT Intermediário - Complexo',
    description: 'Bloco de HIIT com exercícios compostos',
    level: LEVELS.INTERMEDIARIO,
    levelName: 'INTERMEDIÁRIO',
    primaryCapacity: 'CONDITIONING',
    secondaryCapacities: ['POWER', 'ENDURANCE', 'STRENGTH'],
    complexity: 4,
    impact: 5,
    movementPattern: 'CARDIO',
    riskLevel: 'MODERATE' as const,
    suggestedFrequency: 2,
    estimatedDuration: 20,
    blockOrder: 4,
    blockedIf: ['restricao_cardiaca', 'lesao_aguda', 'nivel_condicionamento_baixo'],
    allowedIf: ['nivel_intermediario', 'boa_tecnica', 'recuperacao_adequada'],
    exercises: [
      { name: 'Thruster', type: 'HIIT', time: '40s', rest: '20s', rounds: 5, order: 1 },
      { name: 'Burpee Over Bar', type: 'HIIT', time: '40s', rest: '20s', rounds: 5, order: 2 },
      { name: 'Kettlebell Swing', type: 'HIIT', time: '40s', rest: '20s', rounds: 5, order: 3 },
      { name: 'Box Jump', type: 'HIIT', time: '40s', rest: '20s', rounds: 5, order: 4 },
    ],
  },
  {
    code: 'INT_POTENCIA_A',
    name: 'Potência Intermediário A',
    description: 'Bloco de desenvolvimento de potência muscular',
    level: LEVELS.INTERMEDIARIO,
    levelName: 'INTERMEDIÁRIO',
    primaryCapacity: 'POWER',
    secondaryCapacities: ['STRENGTH', 'COORDINATION'],
    complexity: 4,
    impact: 4,
    movementPattern: 'HINGE',
    riskLevel: 'MODERATE' as const,
    suggestedFrequency: 2,
    estimatedDuration: 20,
    blockOrder: 2,
    blockedIf: ['dor_lombar', 'tecnica_ruim', 'nivel_insuficiente'],
    allowedIf: ['nivel_intermediario', 'boa_tecnica_olimpico', 'ausencia_dor'],
    exercises: [
      { name: 'Clean com Kettlebell', type: 'Potência', sets: 4, reps: '6 cada', rest: '90s', order: 1 },
      { name: 'Snatch com Kettlebell', type: 'Potência', sets: 4, reps: '5 cada', rest: '90s', order: 2 },
      { name: 'Medicine Ball Slam', type: 'Potência', sets: 3, reps: '10', rest: '60s', order: 3 },
      { name: 'Jump Squat com Peso', type: 'Potência', sets: 3, reps: '8', rest: '60s', order: 4 },
    ],
  },
]

// BLOCOS AVANÇADO (NÍVEL 3)
const blocosAvancado = [
  {
    code: 'AVA_FORCA_MAXIMA',
    name: 'Força Máxima Avançado',
    description: 'Bloco de força máxima para atletas avançados',
    level: LEVELS.AVANCADO,
    levelName: 'AVANÇADO',
    primaryCapacity: 'STRENGTH',
    secondaryCapacities: ['POWER'],
    complexity: 5,
    impact: 5,
    movementPattern: 'SQUAT',
    riskLevel: 'HIGH' as const,
    suggestedFrequency: 1,
    estimatedDuration: 30,
    blockOrder: 2,
    blockedIf: ['qualquer_dor', 'nivel_insuficiente', 'tecnica_inadequada', 'fadiga_acumulada'],
    allowedIf: ['nivel_avancado', 'tecnica_perfeita', 'recuperacao_completa', 'ausencia_total_dor'],
    exercises: [
      { name: 'Agachamento Back Squat', type: 'Força', sets: 5, reps: '3-5', rest: '180s', order: 1 },
      { name: 'Levantamento Terra Convencional', type: 'Força', sets: 5, reps: '3-5', rest: '180s', order: 2 },
      { name: 'Front Squat', type: 'Força', sets: 4, reps: '5', rest: '120s', order: 3 },
      { name: 'Romanian Deadlift', type: 'Força', sets: 3, reps: '8', rest: '90s', order: 4 },
    ],
  },
  {
    code: 'AVA_OLIMPICO',
    name: 'Levantamentos Olímpicos',
    description: 'Bloco de levantamentos olímpicos para atletas avançados',
    level: LEVELS.AVANCADO,
    levelName: 'AVANÇADO',
    primaryCapacity: 'POWER',
    secondaryCapacities: ['STRENGTH', 'COORDINATION', 'MOBILITY'],
    complexity: 5,
    impact: 5,
    movementPattern: 'HINGE',
    riskLevel: 'HIGH' as const,
    suggestedFrequency: 2,
    estimatedDuration: 35,
    blockOrder: 2,
    blockedIf: ['qualquer_dor', 'nivel_insuficiente', 'mobilidade_inadequada', 'tecnica_ruim'],
    allowedIf: ['nivel_avancado', 'tecnica_olimpica', 'boa_mobilidade', 'experiencia_minima_2anos'],
    exercises: [
      { name: 'Clean & Jerk', type: 'Olímpico', sets: 5, reps: '2-3', rest: '180s', order: 1 },
      { name: 'Snatch', type: 'Olímpico', sets: 5, reps: '2-3', rest: '180s', order: 2 },
      { name: 'Power Clean', type: 'Olímpico', sets: 4, reps: '3', rest: '120s', order: 3 },
      { name: 'Overhead Squat', type: 'Olímpico', sets: 3, reps: '5', rest: '120s', order: 4 },
    ],
  },
  {
    code: 'AVA_HIIT_EXTREME',
    name: 'HIIT Extremo Avançado',
    description: 'Bloco de HIIT de alta demanda para atletas condicionados',
    level: LEVELS.AVANCADO,
    levelName: 'AVANÇADO',
    primaryCapacity: 'CONDITIONING',
    secondaryCapacities: ['POWER', 'ENDURANCE', 'MENTAL'],
    complexity: 5,
    impact: 5,
    movementPattern: 'CARDIO',
    riskLevel: 'HIGH' as const,
    suggestedFrequency: 1,
    estimatedDuration: 25,
    blockOrder: 4,
    blockedIf: ['restricao_cardiaca', 'lesao', 'fadiga', 'nivel_condicionamento_insuficiente'],
    allowedIf: ['nivel_avancado', 'vo2max_alto', 'recuperacao_excelente', 'sem_restricoes'],
    exercises: [
      { name: 'EMOM Complexo', type: 'HIIT', time: '1min', rest: '0s', rounds: 10, order: 1 },
      { name: 'Assault Bike Sprint', type: 'HIIT', time: '30s', rest: '30s', rounds: 8, order: 2 },
      { name: 'Row Sprint', type: 'HIIT', time: '500m', rest: '60s', rounds: 5, order: 3 },
      { name: 'Double Unders', type: 'HIIT', reps: '50', rest: '30s', rounds: 4, order: 4 },
    ],
  },
  {
    code: 'AVA_CORE_AVANCADO',
    name: 'Core Avançado',
    description: 'Bloco de core de alta intensidade para atletas avançados',
    level: LEVELS.AVANCADO,
    levelName: 'AVANÇADO',
    primaryCapacity: 'STABILITY',
    secondaryCapacities: ['STRENGTH', 'POWER'],
    complexity: 4,
    impact: 4,
    movementPattern: 'ROTATION',
    riskLevel: 'MODERATE' as const,
    suggestedFrequency: 2,
    estimatedDuration: 15,
    blockOrder: 3,
    blockedIf: ['hernia_discal', 'dor_lombar_cronica', 'nivel_insuficiente'],
    allowedIf: ['nivel_avancado', 'core_forte', 'sem_lesao_coluna'],
    exercises: [
      { name: 'L-Sit', type: 'Core', time: '20s', rest: '60s', sets: 4, order: 1 },
      { name: 'Dragon Flag', type: 'Core', reps: '5-8', rest: '60s', sets: 3, order: 2 },
      { name: 'Ab Wheel Rollout', type: 'Core', reps: '10', rest: '45s', sets: 3, order: 3 },
      { name: 'Pallof Press', type: 'Core', reps: '10 cada', rest: '30s', sets: 3, order: 4 },
      { name: 'Hanging Leg Raise', type: 'Core', reps: '12', rest: '45s', sets: 3, order: 5 },
    ],
  },
]

// REGRAS DO MOTOR DE DECISÃO
const regrasMetodo = [
  {
    name: 'Bloqueio por Dor Lombar Aguda',
    description: 'Bloqueia exercícios de alto impacto na coluna quando há dor lombar',
    conditionJson: {
      operator: 'AND',
      conditions: [
        { field: 'painMap.lower_back', operator: '>=', value: 5 },
      ],
    },
    allowedBlocks: ['COND_MOBILIDADE_A'],
    blockedBlocks: ['INT_FORCA_A', 'AVA_FORCA_MAXIMA', 'AVA_OLIMPICO'],
    recommendations: ['Priorizar mobilidade', 'Evitar carga axial', 'Consultar fisioterapeuta'],
    priority: 100,
  },
  {
    name: 'Bloqueio por Dor de Joelho',
    description: 'Bloqueia exercícios de impacto e carga no joelho quando há dor',
    conditionJson: {
      operator: 'AND',
      conditions: [
        { field: 'painMap.knee', operator: '>=', value: 4 },
      ],
    },
    allowedBlocks: ['COND_MOBILIDADE_A', 'INI_FORCA_B'],
    blockedBlocks: ['INI_FORCA_A', 'INT_FORCA_A', 'AVA_FORCA_MAXIMA', 'INI_CARDIO_HIIT'],
    recommendations: ['Evitar agachamento profundo', 'Priorizar membros superiores', 'Fortalecer VMO'],
    priority: 95,
  },
  {
    name: 'Restrição de Nível - Iniciante',
    description: 'Iniciantes não podem acessar blocos intermediários ou avançados',
    conditionJson: {
      operator: 'AND',
      conditions: [
        { field: 'level', operator: '==', value: 'BEGINNER' },
      ],
    },
    allowedBlocks: ['COND_CARDIO_A', 'COND_CARDIO_B', 'COND_MOBILIDADE_A', 'INI_FORCA_A', 'INI_FORCA_B', 'INI_CORE_A', 'INI_CARDIO_HIIT'],
    blockedBlocks: ['INT_FORCA_A', 'INT_FORCA_B', 'INT_HIIT_COMPLEXO', 'INT_POTENCIA_A', 'AVA_FORCA_MAXIMA', 'AVA_OLIMPICO', 'AVA_HIIT_EXTREME', 'AVA_CORE_AVANCADO'],
    recommendations: ['Completar programa iniciante antes de progredir'],
    priority: 90,
  },
  {
    name: 'Restrição de Nível - Intermediário',
    description: 'Intermediários não podem acessar blocos avançados',
    conditionJson: {
      operator: 'AND',
      conditions: [
        { field: 'level', operator: '==', value: 'INTERMEDIATE' },
      ],
    },
    allowedBlocks: ['COND_CARDIO_A', 'COND_CARDIO_B', 'COND_MOBILIDADE_A', 'INI_FORCA_A', 'INI_FORCA_B', 'INI_CORE_A', 'INI_CARDIO_HIIT', 'INT_FORCA_A', 'INT_FORCA_B', 'INT_HIIT_COMPLEXO', 'INT_POTENCIA_A'],
    blockedBlocks: ['AVA_FORCA_MAXIMA', 'AVA_OLIMPICO', 'AVA_HIIT_EXTREME', 'AVA_CORE_AVANCADO'],
    recommendations: ['Dominar técnica intermediária antes de progredir para avançado'],
    priority: 85,
  },
  {
    name: 'Proteção Cardiovascular',
    description: 'Bloqueia HIIT de alta intensidade para pessoas com restrição cardíaca',
    conditionJson: {
      operator: 'AND',
      conditions: [
        { field: 'restrictions.cardiac', operator: '==', value: true },
      ],
    },
    allowedBlocks: ['COND_MOBILIDADE_A', 'INI_FORCA_A', 'INI_FORCA_B', 'INI_CORE_A'],
    blockedBlocks: ['COND_CARDIO_A', 'COND_CARDIO_B', 'INI_CARDIO_HIIT', 'INT_HIIT_COMPLEXO', 'AVA_HIIT_EXTREME'],
    recommendations: ['Manter FC abaixo de 140bpm', 'Priorizar trabalho de força', 'Monitorar constantemente'],
    priority: 100,
  },
  {
    name: 'Mobilidade Ruim - Agachamento',
    description: 'Restringe agachamento profundo quando há déficit de mobilidade',
    conditionJson: {
      operator: 'AND',
      conditions: [
        { field: 'movementTests.squat.score', operator: '<=', value: 2 },
      ],
    },
    allowedBlocks: ['COND_MOBILIDADE_A', 'INI_CORE_A'],
    blockedBlocks: ['INT_FORCA_A', 'AVA_FORCA_MAXIMA', 'AVA_OLIMPICO'],
    recommendations: ['Trabalhar mobilidade de tornozelo e quadril', 'Usar progressões do agachamento'],
    priority: 80,
  },
]

async function seedMetodoExpertTraining() {
  console.log('')
  console.log('🔐 ============================================')
  console.log('🔐 MÉTODO EXPERT TRAINING - DADOS PROTEGIDOS')
  console.log('🔐 ============================================')
  console.log('⚠️  Estes dados são IMUTÁVEIS para studios')
  console.log('⚠️  Apenas SUPERADMIN pode modificar')

  // Combinar todos os blocos
  const todosBlocos = [
    ...blocosCondicionamento,
    ...blocosIniciante,
    ...blocosIntermediario,
    ...blocosAvancado,
  ]

  // Criar blocos
  console.log('\n📦 Criando blocos funcionais do método...')
  for (const bloco of todosBlocos) {
    const exercisesJson = bloco.exercises.map((ex, idx) => ({
      ...ex,
      order: ex.order || idx + 1,
    }))

    await prisma.block.upsert({
      where: { code: bloco.code },
      update: {
        name: bloco.name,
        description: bloco.description,
        level: bloco.level,
        levelName: bloco.levelName,
        primaryCapacity: bloco.primaryCapacity,
        secondaryCapacities: bloco.secondaryCapacities,
        complexity: bloco.complexity,
        impact: bloco.impact,
        movementPattern: bloco.movementPattern,
        riskLevel: bloco.riskLevel,
        suggestedFrequency: bloco.suggestedFrequency,
        estimatedDuration: bloco.estimatedDuration,
        blockOrder: bloco.blockOrder,
        blockedIf: bloco.blockedIf,
        allowedIf: bloco.allowedIf,
        exercises: exercisesJson,
        isLocked: true,
        createdBy: 'SUPERADMIN',
        isActive: true,
      },
      create: {
        code: bloco.code,
        name: bloco.name,
        description: bloco.description,
        level: bloco.level,
        levelName: bloco.levelName,
        primaryCapacity: bloco.primaryCapacity,
        secondaryCapacities: bloco.secondaryCapacities,
        complexity: bloco.complexity,
        impact: bloco.impact,
        movementPattern: bloco.movementPattern,
        riskLevel: bloco.riskLevel,
        suggestedFrequency: bloco.suggestedFrequency,
        estimatedDuration: bloco.estimatedDuration,
        blockOrder: bloco.blockOrder,
        blockedIf: bloco.blockedIf,
        allowedIf: bloco.allowedIf,
        exercises: exercisesJson,
        isLocked: true,
        createdBy: 'SUPERADMIN',
        isActive: true,
      },
    })
    console.log(`  ✓ ${bloco.code} - ${bloco.name}`)
  }

  // Criar exercícios individuais
  console.log('\n🏋️ Criando biblioteca de exercícios...')
  const blocosDb = await prisma.block.findMany()
  const blocoMap = new Map(blocosDb.map((b: any) => [b.code, b.id]))

  let exerciseCount = 0
  for (const bloco of todosBlocos) {
    const blockId = blocoMap.get(bloco.code)
    if (!blockId) continue

    for (const ex of bloco.exercises) {
      const exerciseId = `${bloco.code}_${ex.name.replace(/\s+/g, '_').toUpperCase()}`
      const exAny = ex as any
      
      await prisma.exercise.upsert({
        where: { id: exerciseId },
        update: {
          name: ex.name,
          type: ex.type,
          defaultSets: exAny.sets ?? null,
          defaultReps: exAny.reps ?? null,
          defaultTime: exAny.time ?? null,
          defaultRest: exAny.rest ?? null,
          orderInBlock: ex.order,
          blockId,
          isLocked: true,
          createdBy: 'SUPERADMIN',
          isActive: true,
        },
        create: {
          id: exerciseId,
          name: ex.name,
          type: ex.type,
          defaultSets: exAny.sets ?? null,
          defaultReps: exAny.reps ?? null,
          defaultTime: exAny.time ?? null,
          defaultRest: exAny.rest ?? null,
          orderInBlock: ex.order,
          blockId,
          isLocked: true,
          createdBy: 'SUPERADMIN',
          isActive: true,
        },
      })
      exerciseCount++
    }
  }
  console.log(`  ✓ ${exerciseCount} exercícios criados`)

  // Criar regras
  console.log('\n⚙️ Criando regras do motor de decisão...')
  for (const regra of regrasMetodo) {
    const ruleId = regra.name.replace(/\s+/g, '_').toLowerCase()
    
    await prisma.rule.upsert({
      where: { id: ruleId },
      update: {
        name: regra.name,
        description: regra.description,
        conditionJson: regra.conditionJson,
        allowedBlocks: regra.allowedBlocks,
        blockedBlocks: regra.blockedBlocks,
        recommendations: regra.recommendations,
        priority: regra.priority,
        isLocked: true,
        createdBy: 'SUPERADMIN',
        isActive: true,
      },
      create: {
        id: ruleId,
        name: regra.name,
        description: regra.description,
        conditionJson: regra.conditionJson,
        allowedBlocks: regra.allowedBlocks,
        blockedBlocks: regra.blockedBlocks,
        recommendations: regra.recommendations,
        priority: regra.priority,
        isLocked: true,
        createdBy: 'SUPERADMIN',
        isActive: true,
      },
    })
    console.log(`  ✓ ${regra.name}`)
  }

  console.log('')
  console.log('🔒 MÉTODO EXPERT TRAINING - RESUMO:')
  console.log(`   📦 ${todosBlocos.length} blocos funcionais`)
  console.log(`   🏋️ ${exerciseCount} exercícios`)
  console.log(`   ⚙️ ${regrasMetodo.length} regras do motor`)
  console.log('   🔐 Todos os dados estão PROTEGIDOS (is_locked = true)')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
