// ============================================================================
// EXPERT TRAINING - MÉTODO SEED DATA (DADOS PROTEGIDOS)
// ============================================================================
// ⚠️ ATENÇÃO: Este arquivo contém o CORE DATA do Método Expert Training
// - Todos os dados são IMUTÁVEIS para studios
// - Apenas SUPERADMIN pode modificar via painel administrativo
// - is_locked = true em todos os registros
// ============================================================================

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ============================================================================
// NÍVEIS DO MÉTODO (MATURIDADE DO ALUNO)
// ============================================================================
const LEVELS = {
  CONDICIONAMENTO: 0, // Base absoluta - iniciante total
  INICIANTE: 1,       // Base funcional - padrões consolidados
  INTERMEDIARIO: 2,   // Desenvolvimento - múltiplas capacidades
  AVANCADO: 3,        // Performance - alta densidade e complexidade
}

// ============================================================================
// 🔵 PLANILHA 1 — CONDICIONAMENTO HÍBRIDO (NÍVEL 0 - BASE ABSOLUTA)
// ============================================================================
// PERFIL: Iniciante absoluto, retorno pós-parada, baixa coordenação,
//         baixa tolerância, pode ter dor ou limitação
// OBJETIVO: Preparar o corpo para treinar, criar tolerância neuromuscular
//           e cardiorrespiratória, NÃO buscar desempenho
// ============================================================================

const blocosCondicionamento = [
  // 🔹 BLOCO 1 — AQUECIMENTO FUNCIONAL INICIAL
  {
    code: 'COND_AQUECIMENTO',
    name: 'Aquecimento Funcional Inicial',
    description: 'Ativação geral, mobilidade e coordenação para preparar o corpo para treinar',
    
    // 🔒 PROTEÇÃO DO MÉTODO
    isLocked: true,
    createdBy: 'SUPERADMIN',
    
    // 1️⃣ IDENTIDADE DO BLOCO
    sourceSheet: 'Condicionamento Híbrido',
    levelMin: 0,
    levelMax: 1,
    phase: 'Adaptação Geral',
    level: LEVELS.CONDICIONAMENTO,
    levelName: 'CONDICIONAMENTO',
    
    // 2️⃣ INTENÇÃO E PAPEL NO TREINO
    trainingIntent: 'adaptação',
    blockRoleInSession: 'aquecimento',
    
    // 3️⃣ EXIGÊNCIA FÍSICA REAL
    primaryCapacity: 'MOBILITY',
    secondaryCapacities: ['COORDINATION', 'ACTIVATION'],
    
    fatigueLevel: 'baixo',
    cardiorespiratoryDemand: 'baixo',
    neuromuscularDemand: 'baixo',
    
    axialLoad: 'nenhum',
    impactLevel: 'nenhum',
    
    jointStress: [],
    
    // 📊 MÉTRICAS LEGADAS
    complexity: 1,
    impact: 1,
    movementPattern: 'GAIT',
    riskLevel: 'LOW',
    
    // 📋 METADADOS
    suggestedFrequency: 7,
    estimatedDuration: 8,
    blockOrder: 1,
    
    // 4️⃣ PRÉ-REQUISITOS E RESTRIÇÕES
    prerequisites: {
      required_level: 0,
      required_patterns: [],
      required_stability: 'baixa'
    },
    
    blockedIf: ['dor_aguda'],
    allowedIf: ['movimento_sem_dor'],
    
    // 5️⃣ EXERCÍCIOS COM FUNÇÃO
    exercises: [
      {
        exercise_name: 'Marcha no lugar',
        exercise_role: 'primary',
        time_or_reps: '30s',
        rest: '10s',
        tempo_execution: 'controlado',
        technical_focus: 'coordenação básica'
      },
      {
        exercise_name: 'Círculos de Quadril',
        exercise_role: 'primary',
        time_or_reps: '10 cada lado',
        rest: '10s',
        tempo_execution: 'lento',
        technical_focus: 'amplitude de movimento'
      },
      {
        exercise_name: 'Mobilidade de Ombro',
        exercise_role: 'primary',
        time_or_reps: '10 reps',
        rest: '10s',
        tempo_execution: 'controlado',
        technical_focus: 'estabilização escapular'
      },
      {
        exercise_name: 'Rotação Torácica',
        exercise_role: 'secondary',
        time_or_reps: '8 cada lado',
        rest: '10s',
        tempo_execution: 'lento',
        technical_focus: 'controle de tronco'
      }
    ]
  },
  
  // 🔹 BLOCO 2 — CONDICIONAMENTO CARDIORRESPIRATÓRIO LEVE
  {
    code: 'COND_CARDIO_LEVE',
    name: 'Condicionamento Cardiorrespiratório Leve',
    description: 'Trabalho cardiovascular de baixa intensidade para criar tolerância ao esforço',
    
    isLocked: true,
    createdBy: 'SUPERADMIN',
    
    // 1️⃣ IDENTIDADE
    sourceSheet: 'Condicionamento Híbrido',
    levelMin: 0,
    levelMax: 1,
    phase: 'Adaptação Geral',
    level: LEVELS.CONDICIONAMENTO,
    levelName: 'CONDICIONAMENTO',
    
    // 2️⃣ INTENÇÃO
    trainingIntent: 'adaptação',
    blockRoleInSession: 'principal',
    
    // 3️⃣ EXIGÊNCIA FÍSICA
    primaryCapacity: 'CONDITIONING',
    secondaryCapacities: ['ENDURANCE'],
    
    fatigueLevel: 'baixo',
    cardiorespiratoryDemand: 'baixo',
    neuromuscularDemand: 'baixo',
    
    axialLoad: 'baixo',
    impactLevel: 'baixo',
    
    jointStress: ['joelho'],
    
    complexity: 1,
    impact: 2,
    movementPattern: 'CARDIO',
    riskLevel: 'LOW',
    
    suggestedFrequency: 3,
    estimatedDuration: 12,
    blockOrder: 2,
    
    // 4️⃣ RESTRIÇÕES
    prerequisites: {
      required_level: 0,
      required_patterns: [],
      required_stability: 'baixa'
    },
    
    blockedIf: ['intolerancia_cardiorrespiratoria', 'tontura', 'dor_lombar_ativa'],
    allowedIf: ['liberacao_medica', 'ausencia_dor'],
    
    // 5️⃣ EXERCÍCIOS
    exercises: [
      {
        exercise_name: 'Polichinelo Leve',
        exercise_role: 'primary',
        time_or_reps: '20s',
        rest: '40s',
        tempo_execution: 'moderado',
        technical_focus: 'coordenação de membros'
      },
      {
        exercise_name: 'Corrida Estacionária',
        exercise_role: 'primary',
        time_or_reps: '30s',
        rest: '30s',
        tempo_execution: 'moderado',
        technical_focus: 'ritmo constante'
      },
      {
        exercise_name: 'Step Simples',
        exercise_role: 'secondary',
        time_or_reps: '30s',
        rest: '30s',
        tempo_execution: 'controlado',
        technical_focus: 'controle de descida'
      }
    ]
  },

  // 🔹 BLOCO 3 — ESTABILIDADE E CONTROLE DE CORE
  {
    code: 'COND_CORE_BASICO',
    name: 'Estabilidade e Controle de Core',
    description: 'Fortalecimento básico do core e estabilização para base funcional',
    
    isLocked: true,
    createdBy: 'SUPERADMIN',
    
    sourceSheet: 'Condicionamento Híbrido',
    levelMin: 0,
    levelMax: 1,
    phase: 'Adaptação Geral',
    level: LEVELS.CONDICIONAMENTO,
    levelName: 'CONDICIONAMENTO',
    
    trainingIntent: 'adaptação',
    blockRoleInSession: 'principal',
    
    primaryCapacity: 'STABILITY',
    secondaryCapacities: ['STRENGTH'],
    
    fatigueLevel: 'baixo',
    cardiorespiratoryDemand: 'baixo',
    neuromuscularDemand: 'médio',
    
    axialLoad: 'nenhum',
    impactLevel: 'nenhum',
    
    jointStress: ['lombar', 'ombro'],
    
    complexity: 2,
    impact: 1,
    movementPattern: 'ROTATION',
    riskLevel: 'LOW',
    
    suggestedFrequency: 4,
    estimatedDuration: 10,
    blockOrder: 3,
    
    prerequisites: {
      required_level: 0,
      required_patterns: [],
      required_stability: 'baixa'
    },
    
    blockedIf: ['dor_lombar_aguda', 'hernia_ativa'],
    allowedIf: ['sem_dor_lombar', 'movimentos_lentos_ok'],
    
    exercises: [
      {
        exercise_name: 'Dead Bug',
        exercise_role: 'primary',
        time_or_reps: '8 reps cada lado',
        rest: '30s',
        tempo_execution: 'lento e controlado',
        technical_focus: 'manter lombar neutra'
      },
      {
        exercise_name: 'Bird Dog',
        exercise_role: 'primary',
        time_or_reps: '8 reps cada lado',
        rest: '30s',
        tempo_execution: 'pausado no topo',
        technical_focus: 'estabilidade anti-rotação'
      },
      {
        exercise_name: 'Prancha Básica',
        exercise_role: 'primary',
        time_or_reps: '20s',
        rest: '40s',
        tempo_execution: 'isométrico',
        technical_focus: 'alinhamento neutro'
      },
      {
        exercise_name: 'Cat-Cow',
        exercise_role: 'support',
        time_or_reps: '10 reps',
        rest: '20s',
        tempo_execution: 'lento',
        technical_focus: 'mobilidade controlada'
      }
    ]
  },
]

// ============================================================================
// 🟢 PLANILHA 2 — TREINO HÍBRIDO INICIANTE (NÍVEL 1 - BASE FUNCIONAL)
// ============================================================================
// PERFIL: Padrões consolidados, boa coordenação básica, sem dor,
//         pronto para introduzir força e resistência
// OBJETIVO: Consolidar padrões, introduzir força sem risco,
//           aumentar resistência geral
// ============================================================================

const blocosIniciante = [
  // 🔹 BLOCO 1 — AQUECIMENTO FUNCIONAL INICIANTE
  {
    code: 'INI_AQUECIMENTO',
    name: 'Aquecimento Funcional Iniciante',
    description: 'Preparação neuromuscular com padrões de movimento fundamentais',
    
    isLocked: true,
    createdBy: 'SUPERADMIN',
    
    sourceSheet: 'Híbrido Iniciante',
    levelMin: 1,
    levelMax: 2,
    phase: 'Base Funcional',
    level: LEVELS.INICIANTE,
    levelName: 'INICIANTE',
    
    trainingIntent: 'aprendizagem',
    blockRoleInSession: 'aquecimento',
    
    primaryCapacity: 'MOBILITY',
    secondaryCapacities: ['ACTIVATION', 'COORDINATION'],
    
    fatigueLevel: 'baixo',
    cardiorespiratoryDemand: 'baixo',
    neuromuscularDemand: 'baixo',
    
    axialLoad: 'baixo',
    impactLevel: 'baixo',
    
    jointStress: [],
    
    complexity: 2,
    impact: 2,
    movementPattern: 'SQUAT',
    riskLevel: 'LOW',
    
    suggestedFrequency: 4,
    estimatedDuration: 10,
    blockOrder: 1,
    
    prerequisites: {
      required_level: 1,
      required_patterns: ['agachar_básico'],
      required_stability: 'básica'
    },
    
    blockedIf: ['dor_articular'],
    allowedIf: ['nivel_1_ou_superior', 'padroes_ok'],
    
    exercises: [
      {
        exercise_name: 'Agachamento com Peso Corporal',
        exercise_role: 'primary',
        time_or_reps: '10 reps',
        rest: '20s',
        tempo_execution: '3-0-1',
        technical_focus: 'profundidade e controle'
      },
      {
        exercise_name: 'Avanço Alternado',
        exercise_role: 'primary',
        time_or_reps: '8 cada perna',
        rest: '20s',
        tempo_execution: 'controlado',
        technical_focus: 'estabilidade unilateral'
      },
      {
        exercise_name: 'Rotação Torácica em Quadrupedia',
        exercise_role: 'secondary',
        time_or_reps: '10 cada lado',
        rest: '15s',
        tempo_execution: 'pausado no final',
        technical_focus: 'mobilidade torácica'
      }
    ]
  },

  // 🔹 BLOCO 2 — FORÇA FUNCIONAL BÁSICA
  {
    code: 'INI_FORCA_INFERIOR',
    name: 'Força Funcional Inferior',
    description: 'Fortalecimento de membros inferiores com padrões fundamentais',
    
    isLocked: true,
    createdBy: 'SUPERADMIN',
    
    sourceSheet: 'Híbrido Iniciante',
    levelMin: 1,
    levelMax: 2,
    phase: 'Base Funcional',
    level: LEVELS.INICIANTE,
    levelName: 'INICIANTE',
    
    trainingIntent: 'aprendizagem',
    blockRoleInSession: 'principal',
    
    primaryCapacity: 'STRENGTH',
    secondaryCapacities: ['STABILITY', 'COORDINATION'],
    
    fatigueLevel: 'médio',
    cardiorespiratoryDemand: 'médio',
    neuromuscularDemand: 'médio',
    
    axialLoad: 'baixo',
    impactLevel: 'baixo',
    
    jointStress: ['joelho', 'quadril'],
    
    complexity: 2,
    impact: 2,
    movementPattern: 'SQUAT',
    riskLevel: 'LOW',
    
    suggestedFrequency: 3,
    estimatedDuration: 15,
    blockOrder: 2,
    
    prerequisites: {
      required_level: 1,
      required_patterns: ['agachar', 'avanço'],
      required_stability: 'básica'
    },
    
    blockedIf: ['dor_lombar', 'dor_joelho', 'falha_de_padrao'],
    allowedIf: ['padrao_ok', 'sem_dor'],
    
    exercises: [
      {
        exercise_name: 'Agachamento Goblet',
        exercise_role: 'primary',
        time_or_reps: '12 reps',
        rest: '60s',
        tempo_execution: '3-0-1-0',
        technical_focus: 'controle de tronco e profundidade'
      },
      {
        exercise_name: 'Avanço com Halteres',
        exercise_role: 'primary',
        time_or_reps: '10 cada perna',
        rest: '60s',
        tempo_execution: '2-0-2-0',
        technical_focus: 'estabilidade e alinhamento'
      },
      {
        exercise_name: 'Ponte de Glúteo',
        exercise_role: 'secondary',
        time_or_reps: '15 reps',
        rest: '45s',
        tempo_execution: '2-1-2-0',
        technical_focus: 'ativação de glúteo'
      },
      {
        exercise_name: 'Stiff Unilateral',
        exercise_role: 'secondary',
        time_or_reps: '10 cada perna',
        rest: '45s',
        tempo_execution: 'controlado',
        technical_focus: 'padrão hinge'
      }
    ]
  },

  // 🔹 BLOCO 3 — FORÇA FUNCIONAL SUPERIOR
  {
    code: 'INI_FORCA_SUPERIOR',
    name: 'Força Funcional Superior',
    description: 'Fortalecimento de membros superiores com padrões push/pull',
    
    isLocked: true,
    createdBy: 'SUPERADMIN',
    
    sourceSheet: 'Híbrido Iniciante',
    levelMin: 1,
    levelMax: 2,
    phase: 'Base Funcional',
    level: LEVELS.INICIANTE,
    levelName: 'INICIANTE',
    
    trainingIntent: 'aprendizagem',
    blockRoleInSession: 'principal',
    
    primaryCapacity: 'STRENGTH',
    secondaryCapacities: ['STABILITY'],
    
    fatigueLevel: 'médio',
    cardiorespiratoryDemand: 'baixo',
    neuromuscularDemand: 'médio',
    
    axialLoad: 'baixo',
    impactLevel: 'nenhum',
    
    jointStress: ['ombro'],
    
    complexity: 2,
    impact: 1,
    movementPattern: 'PUSH',
    riskLevel: 'LOW',
    
    suggestedFrequency: 3,
    estimatedDuration: 15,
    blockOrder: 2,
    
    prerequisites: {
      required_level: 1,
      required_patterns: ['push', 'pull'],
      required_stability: 'básica'
    },
    
    blockedIf: ['dor_ombro', 'instabilidade_escapular'],
    allowedIf: ['mobilidade_ombro_ok', 'sem_dor'],
    
    exercises: [
      {
        exercise_name: 'Flexão de Joelhos',
        exercise_role: 'primary',
        time_or_reps: '10 reps',
        rest: '60s',
        tempo_execution: '2-0-2-0',
        technical_focus: 'controle escapular'
      },
      {
        exercise_name: 'Remada com Halteres',
        exercise_role: 'primary',
        time_or_reps: '12 reps',
        rest: '60s',
        tempo_execution: '2-1-2-0',
        technical_focus: 'retração escapular'
      },
      {
        exercise_name: 'Desenvolvimento com Halteres',
        exercise_role: 'secondary',
        time_or_reps: '10 reps',
        rest: '45s',
        tempo_execution: 'controlado',
        technical_focus: 'estabilidade de tronco'
      },
      {
        exercise_name: 'Rosca Alternada',
        exercise_role: 'support',
        time_or_reps: '12 cada braço',
        rest: '45s',
        tempo_execution: '2-0-2-0',
        technical_focus: 'controle anti-rotação'
      }
    ]
  },

  // 🔹 BLOCO 4 — CORE INICIANTE
  {
    code: 'INI_CORE',
    name: 'Core e Estabilidade Iniciante',
    description: 'Fortalecimento de core com padrões anti-extensão e anti-rotação',
    
    isLocked: true,
    createdBy: 'SUPERADMIN',
    
    sourceSheet: 'Híbrido Iniciante',
    levelMin: 1,
    levelMax: 2,
    phase: 'Base Funcional',
    level: LEVELS.INICIANTE,
    levelName: 'INICIANTE',
    
    trainingIntent: 'aprendizagem',
    blockRoleInSession: 'principal',
    
    primaryCapacity: 'STABILITY',
    secondaryCapacities: ['STRENGTH'],
    
    fatigueLevel: 'médio',
    cardiorespiratoryDemand: 'baixo',
    neuromuscularDemand: 'médio',
    
    axialLoad: 'nenhum',
    impactLevel: 'nenhum',
    
    jointStress: ['lombar'],
    
    complexity: 2,
    impact: 1,
    movementPattern: 'ROTATION',
    riskLevel: 'LOW',
    
    suggestedFrequency: 4,
    estimatedDuration: 12,
    blockOrder: 3,
    
    prerequisites: {
      required_level: 1,
      required_patterns: ['prancha'],
      required_stability: 'básica'
    },
    
    blockedIf: ['dor_lombar', 'hernia_ativa'],
    allowedIf: ['sem_dor_lombar', 'controle_postural_ok'],
    
    exercises: [
      {
        exercise_name: 'Prancha Frontal',
        exercise_role: 'primary',
        time_or_reps: '30s',
        rest: '30s',
        tempo_execution: 'isométrico',
        technical_focus: 'alinhamento neutro'
      },
      {
        exercise_name: 'Prancha Lateral',
        exercise_role: 'primary',
        time_or_reps: '20s cada lado',
        rest: '30s',
        tempo_execution: 'isométrico',
        technical_focus: 'anti-flexão lateral'
      },
      {
        exercise_name: 'Pallof Press',
        exercise_role: 'primary',
        time_or_reps: '10 cada lado',
        rest: '30s',
        tempo_execution: 'pausado',
        technical_focus: 'anti-rotação'
      },
      {
        exercise_name: 'Dead Bug Progressivo',
        exercise_role: 'secondary',
        time_or_reps: '10 reps',
        rest: '30s',
        tempo_execution: 'lento',
        technical_focus: 'anti-extensão'
      }
    ]
  },

  // 🔹 BLOCO 5 — METABÓLICO INICIANTE
  {
    code: 'INI_METABOLICO',
    name: 'Metabólico Iniciante',
    description: 'Trabalho metabólico controlado para aumentar resistência',
    
    isLocked: true,
    createdBy: 'SUPERADMIN',
    
    sourceSheet: 'Híbrido Iniciante',
    levelMin: 1,
    levelMax: 2,
    phase: 'Base Funcional',
    level: LEVELS.INICIANTE,
    levelName: 'INICIANTE',
    
    trainingIntent: 'estímulo_secundário',
    blockRoleInSession: 'finalização',
    
    primaryCapacity: 'CONDITIONING',
    secondaryCapacities: ['ENDURANCE'],
    
    fatigueLevel: 'médio',
    cardiorespiratoryDemand: 'médio',
    neuromuscularDemand: 'médio',
    
    axialLoad: 'baixo',
    impactLevel: 'moderado',
    
    jointStress: ['joelho'],
    
    complexity: 2,
    impact: 3,
    movementPattern: 'CARDIO',
    riskLevel: 'LOW',
    
    suggestedFrequency: 2,
    estimatedDuration: 12,
    blockOrder: 4,
    
    prerequisites: {
      required_level: 1,
      required_patterns: ['cardio_basico'],
      required_stability: 'básica'
    },
    
    blockedIf: ['baixa_tolerancia_fadiga', 'restricao_cardiaca'],
    allowedIf: ['boa_tolerancia_esforco', 'liberacao_medica'],
    
    exercises: [
      {
        exercise_name: 'Burpee Modificado',
        exercise_role: 'primary',
        time_or_reps: '30s',
        rest: '30s',
        tempo_execution: 'moderado',
        technical_focus: 'coordenação e ritmo'
      },
      {
        exercise_name: 'Mountain Climber',
        exercise_role: 'primary',
        time_or_reps: '30s',
        rest: '30s',
        tempo_execution: 'controlado',
        technical_focus: 'estabilidade de tronco'
      },
      {
        exercise_name: 'Jumping Jack',
        exercise_role: 'secondary',
        time_or_reps: '40s',
        rest: '20s',
        tempo_execution: 'ritmado',
        technical_focus: 'coordenação'
      },
      {
        exercise_name: 'High Knees',
        exercise_role: 'finisher',
        time_or_reps: '30s',
        rest: '30s',
        tempo_execution: 'explosivo',
        technical_focus: 'potência de quadril'
      }
    ]
  },
]

// ============================================================================
// 🟡 PLANILHA 3 — TREINO HÍBRIDO INTERMEDIÁRIO (NÍVEL 2 - DESENVOLVIMENTO)
// ============================================================================
// PERFIL: Boa coordenação, boa tolerância, sem dor relevante,
//         consegue misturar capacidades
// OBJETIVO: Aumentar intensidade, misturar força + potência,
//           exigir coordenação real
// ============================================================================

const blocosIntermediario = [
  // 🔹 BLOCO 1 — ATIVAÇÃO NEUROMUSCULAR INTERMEDIÁRIA
  {
    code: 'INT_ATIVACAO',
    name: 'Ativação Neuromuscular Intermediária',
    description: 'Movimentos complexos de ativação e preparação para carga moderada',
    
    isLocked: true,
    createdBy: 'SUPERADMIN',
    
    sourceSheet: 'Híbrido Intermediário',
    levelMin: 2,
    levelMax: 3,
    phase: 'Desenvolvimento',
    level: LEVELS.INTERMEDIARIO,
    levelName: 'INTERMEDIÁRIO',
    
    trainingIntent: 'estímulo_secundário',
    blockRoleInSession: 'aquecimento',
    
    primaryCapacity: 'ACTIVATION',
    secondaryCapacities: ['MOBILITY', 'COORDINATION'],
    
    fatigueLevel: 'baixo',
    cardiorespiratoryDemand: 'baixo',
    neuromuscularDemand: 'médio',
    
    axialLoad: 'baixo',
    impactLevel: 'baixo',
    
    jointStress: [],
    
    complexity: 3,
    impact: 2,
    movementPattern: 'ROTATION',
    riskLevel: 'LOW',
    
    suggestedFrequency: 4,
    estimatedDuration: 12,
    blockOrder: 1,
    
    prerequisites: {
      required_level: 2,
      required_patterns: ['agachar', 'hinge', 'rotação'],
      required_stability: 'boa'
    },
    
    blockedIf: ['dor_articular'],
    allowedIf: ['nivel_2_ou_superior', 'boa_coordenacao'],
    
    exercises: [
      {
        exercise_name: 'Turkish Get-Up Parcial',
        exercise_role: 'primary',
        time_or_reps: '3 cada lado',
        rest: '30s',
        tempo_execution: 'muito controlado',
        technical_focus: 'transições e estabilidade'
      },
      {
        exercise_name: 'Cossack Squat',
        exercise_role: 'primary',
        time_or_reps: '8 cada lado',
        rest: '20s',
        tempo_execution: 'controlado',
        technical_focus: 'mobilidade de quadril'
      },
      {
        exercise_name: 'Bear Crawl',
        exercise_role: 'secondary',
        time_or_reps: '30s',
        rest: '30s',
        tempo_execution: 'moderado',
        technical_focus: 'coordenação contra-lateral'
      }
    ]
  },

  // 🔹 BLOCO 2 — FORÇA + POTÊNCIA CONTROLADA INFERIOR
  {
    code: 'INT_FORCA_POTENCIA_INF',
    name: 'Força + Potência Controlada Inferior',
    description: 'Combinação de força e potência para membros inferiores com carga moderada',
    
    isLocked: true,
    createdBy: 'SUPERADMIN',
    
    sourceSheet: 'Híbrido Intermediário',
    levelMin: 2,
    levelMax: 3,
    phase: 'Desenvolvimento',
    level: LEVELS.INTERMEDIARIO,
    levelName: 'INTERMEDIÁRIO',
    
    trainingIntent: 'estímulo_principal',
    blockRoleInSession: 'principal',
    
    primaryCapacity: 'STRENGTH',
    secondaryCapacities: ['POWER', 'HYPERTROPHY'],
    
    fatigueLevel: 'médio',
    cardiorespiratoryDemand: 'médio',
    neuromuscularDemand: 'alto',
    
    axialLoad: 'moderado',
    impactLevel: 'moderado',
    
    jointStress: ['joelho', 'quadril', 'lombar'],
    
    complexity: 3,
    impact: 4,
    movementPattern: 'SQUAT',
    riskLevel: 'MODERATE',
    
    suggestedFrequency: 2,
    estimatedDuration: 25,
    blockOrder: 2,
    
    prerequisites: {
      required_level: 2,
      required_patterns: ['agachar', 'hinge', 'saltar'],
      required_stability: 'boa'
    },
    
    blockedIf: ['instabilidade_lombar', 'dor_articular', 'falha_excentrica'],
    allowedIf: ['padrao_consolidado', 'tolerancia_carga', 'sem_dor'],
    
    exercises: [
      {
        exercise_name: 'Agachamento com Barra',
        exercise_role: 'primary',
        time_or_reps: '8-10 reps',
        rest: '90s',
        tempo_execution: '3-0-1-0',
        technical_focus: 'profundidade e controle excêntrico'
      },
      {
        exercise_name: 'Levantamento Terra',
        exercise_role: 'primary',
        time_or_reps: '6-8 reps',
        rest: '120s',
        tempo_execution: '2-0-1-0',
        technical_focus: 'padrão hinge perfeito'
      },
      {
        exercise_name: 'Agachamento com Salto',
        exercise_role: 'secondary',
        time_or_reps: '6 reps',
        rest: '90s',
        tempo_execution: 'explosivo',
        technical_focus: 'potência de quadril'
      },
      {
        exercise_name: 'Afundo Búlgaro',
        exercise_role: 'support',
        time_or_reps: '10 cada perna',
        rest: '60s',
        tempo_execution: '3-0-1-0',
        technical_focus: 'estabilidade unilateral'
      }
    ]
  },

  // 🔹 BLOCO 3 — FORÇA + POTÊNCIA SUPERIOR
  {
    code: 'INT_FORCA_POTENCIA_SUP',
    name: 'Força + Potência Superior',
    description: 'Empurrar e puxar com elementos de potência',
    
    isLocked: true,
    createdBy: 'SUPERADMIN',
    
    sourceSheet: 'Híbrido Intermediário',
    levelMin: 2,
    levelMax: 3,
    phase: 'Desenvolvimento',
    level: LEVELS.INTERMEDIARIO,
    levelName: 'INTERMEDIÁRIO',
    
    trainingIntent: 'estímulo_principal',
    blockRoleInSession: 'principal',
    
    primaryCapacity: 'STRENGTH',
    secondaryCapacities: ['POWER'],
    
    fatigueLevel: 'médio',
    cardiorespiratoryDemand: 'baixo',
    neuromuscularDemand: 'alto',
    
    axialLoad: 'baixo',
    impactLevel: 'baixo',
    
    jointStress: ['ombro'],
    
    complexity: 3,
    impact: 3,
    movementPattern: 'PUSH',
    riskLevel: 'MODERATE',
    
    suggestedFrequency: 2,
    estimatedDuration: 25,
    blockOrder: 2,
    
    prerequisites: {
      required_level: 2,
      required_patterns: ['push', 'pull'],
      required_stability: 'boa'
    },
    
    blockedIf: ['dor_ombro', 'lesao_manguito', 'falha_controle'],
    allowedIf: ['mobilidade_ombro_ok', 'sem_dor', 'estabilidade_escapular'],
    
    exercises: [
      {
        exercise_name: 'Supino com Barra',
        exercise_role: 'primary',
        time_or_reps: '8-10 reps',
        rest: '90s',
        tempo_execution: '3-0-1-0',
        technical_focus: 'controle escapular'
      },
      {
        exercise_name: 'Remada Cavalinho',
        exercise_role: 'primary',
        time_or_reps: '8-10 reps',
        rest: '90s',
        tempo_execution: '2-1-1-0',
        technical_focus: 'retração escapular'
      },
      {
        exercise_name: 'Push Press',
        exercise_role: 'secondary',
        time_or_reps: '6-8 reps',
        rest: '90s',
        tempo_execution: 'explosivo',
        technical_focus: 'potência de ombro'
      },
      {
        exercise_name: 'Pull-up Assistido',
        exercise_role: 'support',
        time_or_reps: '8 reps',
        rest: '60s',
        tempo_execution: 'controlado',
        technical_focus: 'força de puxar'
      }
    ]
  },

  // 🔹 BLOCO 4 — METABÓLICO INTENSO
  {
    code: 'INT_METABOLICO_INTENSO',
    name: 'Metabólico Intenso',
    description: 'Trabalho metabólico de alta intensidade - teste de tolerância à fadiga',
    
    isLocked: true,
    createdBy: 'SUPERADMIN',
    
    sourceSheet: 'Híbrido Intermediário',
    levelMin: 2,
    levelMax: 3,
    phase: 'Desenvolvimento',
    level: LEVELS.INTERMEDIARIO,
    levelName: 'INTERMEDIÁRIO',
    
    trainingIntent: 'estímulo_secundário',
    blockRoleInSession: 'finalização',
    
    primaryCapacity: 'CONDITIONING',
    secondaryCapacities: ['ENDURANCE', 'POWER'],
    
    fatigueLevel: 'alto',
    cardiorespiratoryDemand: 'alto',
    neuromuscularDemand: 'médio',
    
    axialLoad: 'moderado',
    impactLevel: 'alto',
    
    jointStress: ['joelho', 'quadril'],
    
    complexity: 3,
    impact: 4,
    movementPattern: 'CARDIO',
    riskLevel: 'MODERATE',
    
    suggestedFrequency: 2,
    estimatedDuration: 15,
    blockOrder: 4,
    
    prerequisites: {
      required_level: 2,
      required_patterns: ['cardio_avançado'],
      required_stability: 'boa'
    },
    
    blockedIf: ['baixa_tolerancia_fadiga', 'restricao_cardiaca', 'lesao_aguda'],
    allowedIf: ['alta_tolerancia', 'liberacao_medica', 'sem_dor'],
    
    exercises: [
      {
        exercise_name: 'Burpee Completo',
        exercise_role: 'primary',
        time_or_reps: '40s',
        rest: '20s',
        tempo_execution: 'explosivo',
        technical_focus: 'velocidade e eficiência'
      },
      {
        exercise_name: 'Kettlebell Swing',
        exercise_role: 'primary',
        time_or_reps: '40s',
        rest: '20s',
        tempo_execution: 'explosivo',
        technical_focus: 'potência de quadril'
      },
      {
        exercise_name: 'Box Jump',
        exercise_role: 'secondary',
        time_or_reps: '30s',
        rest: '30s',
        tempo_execution: 'explosivo',
        technical_focus: 'potência e controle de aterrissagem'
      },
      {
        exercise_name: 'Battle Rope',
        exercise_role: 'finisher',
        time_or_reps: '30s',
        rest: '30s',
        tempo_execution: 'máximo',
        technical_focus: 'resistência de braços'
      }
    ]
  },

  // BLOCO ATIVAÇÃO INTERMEDIÁRIO
  {
    code: 'INT_ATIVACAO',
    name: 'Ativação Intermediário',
    description: 'Preparação corporal para treino intermediário',
    level: LEVELS.INTERMEDIARIO,
    levelName: 'INTERMEDIÁRIO',
    primaryCapacity: 'MOBILITY',
    exercises: [
      { name: 'Turkish Get-Up Parcial', type: 'Ativação', reps: '3 cada', rest: '30s', order: 1 },
      { name: 'Cossack Squat', type: 'Ativação', reps: '8 cada', rest: '0s', order: 2 },
      { name: 'Bear Crawl', type: 'Ativação', time: '30s', rest: '30s', order: 3 },
      { name: 'Spiderman Push-up', type: 'Ativação', reps: '8', rest: '0s', order: 4 },
    ],
  },

  // BLOCO 2 – FORÇA + POTÊNCIA (INFERIOR)
  {
    code: 'INT_FORCA_POTENCIA_INF',
    name: 'Força e Potência Inferior - Intermediário',
    description: 'Desenvolvimento de força e potência para membros inferiores',
    level: LEVELS.INTERMEDIARIO,
    levelName: 'INTERMEDIÁRIO',
    primaryCapacity: 'STRENGTH',
    secondaryCapacities: ['POWER', 'HYPERTROPHY'],
    complexity: 3,
    impact: 4,
    movementPattern: 'SQUAT',
    riskLevel: 'MODERATE',
    suggestedFrequency: 2,
    estimatedDuration: 25,
    blockOrder: 2,
    blockedIf: ['dor_joelho', 'dor_lombar', 'falha_controle'],
    allowedIf: ['nivel_2_ou_mais', 'boa_estabilidade', 'sem_dor'],
    exercises: [
      { name: 'Agachamento com Barra', type: 'Força', sets: 4, reps: '8-10', rest: '90s', order: 1 },
      { name: 'Levantamento Terra', type: 'Força', sets: 4, reps: '6-8', rest: '120s', order: 2 },
      { name: 'Agachamento com Salto', type: 'Potência', sets: 3, reps: '6', rest: '90s', order: 3 },
      { name: 'Afundo Búlgaro', type: 'Força', sets: 3, reps: '10 cada', rest: '60s', order: 4 },
    ],
  },

  // BLOCO 3 – FORÇA + POTÊNCIA (SUPERIOR)
  {
    code: 'INT_FORCA_POTENCIA_SUP',
    name: 'Força e Potência Superior - Intermediário',
    description: 'Empurrar/puxar combinados com elementos de potência',
    level: LEVELS.INTERMEDIARIO,
    levelName: 'INTERMEDIÁRIO',
    primaryCapacity: 'STRENGTH',
    secondaryCapacities: ['POWER', 'HYPERTROPHY'],
    complexity: 3,
    impact: 3,
    movementPattern: 'PUSH',
    riskLevel: 'MODERATE',
    suggestedFrequency: 2,
    estimatedDuration: 25,
    blockOrder: 2,
    blockedIf: ['dor_ombro', 'lesao_manguito', 'falha_controle'],
    allowedIf: ['nivel_2_ou_mais', 'boa_mobilidade_ombro', 'sem_dor'],
    exercises: [
      { name: 'Supino Reto com Barra', type: 'Força', sets: 4, reps: '8-10', rest: '90s', order: 1 },
      { name: 'Remada Cavalinho', type: 'Força', sets: 4, reps: '8-10', rest: '90s', order: 2 },
      { name: 'Desenvolvimento Militar', type: 'Força', sets: 3, reps: '8-10', rest: '60s', order: 3 },
      { name: 'Flexão Pliométrica', type: 'Potência', sets: 3, reps: '6', rest: '90s', order: 4 },
    ],
  },

  // BLOCO 4 – METABÓLICO INTENSO
  {
    code: 'INT_METABOLICO_INTENSO',
    name: 'Metabólico Intenso - Intermediário',
    description: 'Circuitos de alta densidade com intervalos curtos',
    level: LEVELS.INTERMEDIARIO,
    levelName: 'INTERMEDIÁRIO',
    primaryCapacity: 'CONDITIONING',
    secondaryCapacities: ['POWER', 'ENDURANCE'],
    complexity: 4,
    impact: 5,
    movementPattern: 'CARDIO',
    riskLevel: 'MODERATE',
    suggestedFrequency: 2,
    estimatedDuration: 20,
    blockOrder: 4,
    blockedIf: ['restricao_cardiaca', 'lesao_aguda', 'fadiga_excessiva'],
    allowedIf: ['nivel_2_ou_mais', 'boa_recuperacao', 'sem_restricoes'],
    exercises: [
      { name: 'Kettlebell Swing', type: 'Metabólico', time: '40s', rest: '20s', rounds: 5, order: 1 },
      { name: 'Thruster', type: 'Metabólico', time: '40s', rest: '20s', rounds: 5, order: 2 },
      { name: 'Burpee Over Bar', type: 'Metabólico', time: '40s', rest: '20s', rounds: 5, order: 3 },
      { name: 'Box Jump', type: 'Metabólico', time: '40s', rest: '20s', rounds: 5, order: 4 },
    ],
  },
]

// ============================================================================
// 🔴 PLANILHA 4 — TREINO HÍBRIDO AVANÇADO (NÍVEL 3 - PERFORMANCE)
// ============================================================================
// PERFIL: Alta capacidade física, excelente coordenação, objetivo performance
// OBJETIVO: Expressar potência, alta densidade, alta exigência neuromuscular
// ============================================================================

const blocosAvancado = [
  // 🔹 BLOCO 1 — ATIVAÇÃO NEUROMUSCULAR AVANÇADA
  {
    code: 'AVA_ATIVACAO_NEURO',
    name: 'Ativação Neuromuscular Avançada',
    description: 'Movimentos explosivos e pliométricos para preparação neural máxima',
    
    isLocked: true,
    createdBy: 'SUPERADMIN',
    
    sourceSheet: 'Híbrido Avançado',
    levelMin: 3,
    levelMax: 3,
    phase: 'Performance',
    level: LEVELS.AVANCADO,
    levelName: 'AVANÇADO',
    
    trainingIntent: 'performance',
    blockRoleInSession: 'aquecimento',
    
    primaryCapacity: 'POWER',
    secondaryCapacities: ['COORDINATION', 'ACTIVATION'],
    
    fatigueLevel: 'médio',
    cardiorespiratoryDemand: 'médio',
    neuromuscularDemand: 'alto',
    
    axialLoad: 'moderado',
    impactLevel: 'alto',
    
    jointStress: ['joelho', 'quadril', 'tornozelo'],
    
    complexity: 4,
    impact: 4,
    movementPattern: 'HINGE',
    riskLevel: 'MODERATE',
    
    suggestedFrequency: 3,
    estimatedDuration: 15,
    blockOrder: 1,
    
    prerequisites: {
      required_level: 3,
      required_patterns: ['agachar', 'hinge', 'saltar', 'aterrissar'],
      required_stability: 'alta'
    },
    
    blockedIf: ['qualquer_dor', 'fadiga_excessiva', 'tecnica_inadequada'],
    allowedIf: ['nivel_3', 'recuperacao_completa', 'sem_dor'],
    
    exercises: [
      {
        exercise_name: 'Box Jump',
        exercise_role: 'primary',
        time_or_reps: '5 reps',
        rest: '60s',
        tempo_execution: 'explosivo',
        technical_focus: 'potência e aterrissagem controlada'
      },
      {
        exercise_name: 'Broad Jump',
        exercise_role: 'primary',
        time_or_reps: '5 reps',
        rest: '60s',
        tempo_execution: 'máxima explosão',
        technical_focus: 'extensão tripla'
      },
      {
        exercise_name: 'Med Ball Slam',
        exercise_role: 'secondary',
        time_or_reps: '8 reps',
        rest: '45s',
        tempo_execution: 'explosivo',
        technical_focus: 'potência de tronco'
      },
      {
        exercise_name: 'Skater Jump',
        exercise_role: 'secondary',
        time_or_reps: '8 cada lado',
        rest: '45s',
        tempo_execution: 'explosivo',
        technical_focus: 'estabilidade lateral'
      }
    ]
  },

  // 🔹 BLOCO 2 — FORÇA E POTÊNCIA AVANÇADA
  {
    code: 'AVA_FORCA_POTENCIA',
    name: 'Força e Potência Avançada',
    description: 'Movimentos olímpicos e complexos de alta demanda técnica',
    
    isLocked: true,
    createdBy: 'SUPERADMIN',
    
    sourceSheet: 'Híbrido Avançado',
    levelMin: 3,
    levelMax: 3,
    phase: 'Performance',
    level: LEVELS.AVANCADO,
    levelName: 'AVANÇADO',
    
    trainingIntent: 'performance',
    blockRoleInSession: 'principal',
    
    primaryCapacity: 'POWER',
    secondaryCapacities: ['STRENGTH', 'COORDINATION'],
    
    fatigueLevel: 'alto',
    cardiorespiratoryDemand: 'médio',
    neuromuscularDemand: 'alto',
    
    axialLoad: 'alto',
    impactLevel: 'alto',
    
    jointStress: ['joelho', 'quadril', 'lombar', 'ombro'],
    
    complexity: 5,
    impact: 5,
    movementPattern: 'HINGE',
    riskLevel: 'HIGH',
    
    suggestedFrequency: 2,
    estimatedDuration: 30,
    blockOrder: 2,
    
    prerequisites: {
      required_level: 3,
      required_patterns: ['clean', 'snatch', 'agachar_profundo'],
      required_stability: 'alta'
    },
    
    blockedIf: ['qualquer_dor', 'tecnica_inadequada', 'fadiga_acumulada'],
    allowedIf: ['nivel_3', 'tecnica_perfeita', 'sem_historico_lesao_recente'],
    
    exercises: [
      {
        exercise_name: 'Clean & Jerk',
        exercise_role: 'primary',
        time_or_reps: '2-3 reps',
        rest: '180s',
        tempo_execution: 'explosivo técnico',
        technical_focus: 'coordenação total e timing'
      },
      {
        exercise_name: 'Snatch',
        exercise_role: 'primary',
        time_or_reps: '2-3 reps',
        rest: '180s',
        tempo_execution: 'explosivo técnico',
        technical_focus: 'velocidade e estabilização overhead'
      },
      {
        exercise_name: 'Agachamento Back Squat Pesado',
        exercise_role: 'primary',
        time_or_reps: '3-5 reps',
        rest: '180s',
        tempo_execution: '3-0-X-0',
        technical_focus: 'profundidade e força'
      },
      {
        exercise_name: 'Turkish Get-Up',
        exercise_role: 'support',
        time_or_reps: '3 cada lado',
        rest: '90s',
        tempo_execution: 'controlado',
        technical_focus: 'transições e estabilidade'
      }
    ]
  },

  // 🔹 BLOCO 3 — CORE EXIGENTE
  {
    code: 'AVA_CORE_EXIGENTE',
    name: 'Core Avançado Exigente',
    description: 'Altíssima exigência de core com cargas e instabilidade',
    
    isLocked: true,
    createdBy: 'SUPERADMIN',
    
    sourceSheet: 'Híbrido Avançado',
    levelMin: 3,
    levelMax: 3,
    phase: 'Performance',
    level: LEVELS.AVANCADO,
    levelName: 'AVANÇADO',
    
    trainingIntent: 'performance',
    blockRoleInSession: 'principal',
    
    primaryCapacity: 'STABILITY',
    secondaryCapacities: ['STRENGTH', 'POWER'],
    
    fatigueLevel: 'alto',
    cardiorespiratoryDemand: 'médio',
    neuromuscularDemand: 'alto',
    
    axialLoad: 'moderado',
    impactLevel: 'baixo',
    
    jointStress: ['lombar', 'ombro'],
    
    complexity: 5,
    impact: 3,
    movementPattern: 'ROTATION',
    riskLevel: 'MODERATE',
    
    suggestedFrequency: 3,
    estimatedDuration: 15,
    blockOrder: 3,
    
    prerequisites: {
      required_level: 3,
      required_patterns: ['anti_extensao', 'anti_rotacao', 'anti_flexao_lateral'],
      required_stability: 'alta'
    },
    
    blockedIf: ['dor_lombar', 'instabilidade_coluna'],
    allowedIf: ['nivel_3', 'controle_perfeito', 'sem_dor'],
    
    exercises: [
      {
        exercise_name: 'Roda Abdominal',
        exercise_role: 'primary',
        time_or_reps: '10 reps',
        rest: '60s',
        tempo_execution: 'controlado',
        technical_focus: 'anti-extensão máxima'
      },
      {
        exercise_name: 'Windmill com Kettlebell',
        exercise_role: 'primary',
        time_or_reps: '6 cada lado',
        rest: '60s',
        tempo_execution: 'lento',
        technical_focus: 'estabilidade overhead'
      },
      {
        exercise_name: 'Dragon Flag',
        exercise_role: 'primary',
        time_or_reps: '6 reps',
        rest: '90s',
        tempo_execution: '3-0-3-0',
        technical_focus: 'controle total de tronco'
      },
      {
        exercise_name: 'Pallof Press com Rotação',
        exercise_role: 'secondary',
        time_or_reps: '8 cada lado',
        rest: '45s',
        tempo_execution: 'controlado',
        technical_focus: 'anti-rotação dinâmica'
      }
    ]
  },

  // 🔹 BLOCO 4 — METABÓLICO EXTREMO
  {
    code: 'AVA_METABOLICO_EXTREMO',
    name: 'Metabólico Extremo',
    description: 'Máxima densidade e intensidade - teste definitivo de capacidade',
    
    isLocked: true,
    createdBy: 'SUPERADMIN',
    
    sourceSheet: 'Híbrido Avançado',
    levelMin: 3,
    levelMax: 3,
    phase: 'Performance',
    level: LEVELS.AVANCADO,
    levelName: 'AVANÇADO',
    
    trainingIntent: 'performance',
    blockRoleInSession: 'finalização',
    
    primaryCapacity: 'CONDITIONING',
    secondaryCapacities: ['ENDURANCE', 'POWER', 'MENTAL_TOUGHNESS'],
    
    fatigueLevel: 'alto',
    cardiorespiratoryDemand: 'alto',
    neuromuscularDemand: 'alto',
    
    axialLoad: 'moderado',
    impactLevel: 'alto',
    
    jointStress: ['joelho', 'quadril', 'ombro'],
    
    complexity: 4,
    impact: 5,
    movementPattern: 'CARDIO',
    riskLevel: 'HIGH',
    
    suggestedFrequency: 2,
    estimatedDuration: 20,
    blockOrder: 4,
    
    prerequisites: {
      required_level: 3,
      required_patterns: ['todos_os_padroes'],
      required_stability: 'alta'
    },
    
    blockedIf: ['qualquer_dor', 'fadiga_excessiva', 'restricao_cardiaca'],
    allowedIf: ['nivel_3', 'maxima_tolerancia', 'liberacao_medica', 'recuperacao_completa'],
    
    exercises: [
      {
        exercise_name: 'Thruster com Barra',
        exercise_role: 'primary',
        time_or_reps: '21-15-9 reps',
        rest: 'minimo',
        tempo_execution: 'maximo esforco',
        technical_focus: 'eficiência sob fadiga'
      },
      {
        exercise_name: 'Burpee Box Jump Over',
        exercise_role: 'primary',
        time_or_reps: '21-15-9 reps',
        rest: 'minimo',
        tempo_execution: 'explosivo',
        technical_focus: 'velocidade e segurança'
      },
      {
        exercise_name: 'Assault Bike',
        exercise_role: 'finisher',
        time_or_reps: '60s all-out',
        rest: '120s',
        tempo_execution: 'máxima potência',
        technical_focus: 'resist��ncia anaeróbica'
      },
      {
        exercise_name: 'Sled Push',
        exercise_role: 'finisher',
        time_or_reps: '40m',
        rest: '90s',
        tempo_execution: 'máximo',
        technical_focus: 'potência de empurrar'
      }
    ]
  },

  // BLOCO CORE AVANÇADO
  {
    code: 'ADV_CORE_EXTREMO',
    name: 'Core Extremo',
    description: 'Desafios máximos de estabilidade e força core',
    level: LEVELS.AVANCADO,
    levelName: 'AVANÇADO',
    primaryCapacity: 'STRENGTH',
    complexity: 5,
    impact: 4,
    movementPattern: 'ROTATION',
    riskLevel: 'HIGH',
    suggestedFrequency: 2,
    estimatedDuration: 18,
    blockOrder: 3,
    blockedIf: ['hernia_discal', 'dor_lombar_cronica', 'qualquer_dor_coluna'],
    allowedIf: ['nivel_3', 'core_muito_forte', 'sem_lesao_coluna'],
    exercises: [
      { name: 'L-Sit', type: 'Core', time: '20s', rest: '60s', sets: 4, order: 1 },
      { name: 'Dragon Flag', type: 'Core', reps: '5-8', rest: '60s', sets: 3, order: 2 },
      { name: 'Ab Wheel Standing', type: 'Core', reps: '8', rest: '60s', sets: 3, order: 3 },
      { name: 'Hanging Windshield Wiper', type: 'Core', reps: '8', rest: '60s', sets: 3, order: 4 },
    ],
  },

  // BLOCO 4 – METABÓLICO EXTREMO
  {
    code: 'AVA_METABOLICO_EXTREMO',
    name: 'Metabólico Extremo - Avançado',
    description: 'Alta intensidade, curto descanso, alta densidade',
    level: LEVELS.AVANCADO,
    levelName: 'AVANÇADO',
    primaryCapacity: 'CONDITIONING',
    secondaryCapacities: ['POWER', 'ENDURANCE', 'MENTAL'],
    complexity: 5,
    impact: 5,
    movementPattern: 'CARDIO',
    riskLevel: 'HIGH',
    suggestedFrequency: 1,
    estimatedDuration: 25,
    blockOrder: 4,
    blockedIf: ['restricao_cardiaca', 'lesao_ativa', 'fadiga_excessiva', 'qualquer_dor'],
    allowedIf: ['nivel_3', 'vo2max_alto', 'recuperacao_excelente', 'sem_restricoes'],
    exercises: [
      { name: 'EMOM Complexo (5 movimentos)', type: 'HIIT', time: '1min', rest: '0s', rounds: 10, order: 1 },
      { name: 'Assault Bike Sprint', type: 'HIIT', time: '30s', rest: '30s', rounds: 8, order: 2 },
      { name: 'Row Sprint 500m', type: 'HIIT', time: '500m', rest: '60s', rounds: 4, order: 3 },
      { name: 'Burpee + Box Jump Over', type: 'HIIT', reps: '10', rest: '30s', rounds: 4, order: 4 },
    ],
  },
]

// ============================================================================
// ⚙️ REGRAS DO MOTOR DE DECISÃO (COMO O SISTEMA "PENSA")
// ============================================================================
// Essas regras implementam a lógica de QUANDO USAR / QUANDO BLOQUEAR
// baseado no perfil do aluno e nas condições de saúde
// ============================================================================

const regrasMetodo = [
  // REGRA 1: Dor Lombar Aguda - Proteção máxima da coluna
  {
    name: 'Proteção Lombar - Dor Aguda',
    description: 'Bloqueia exercícios de alto impacto na coluna quando há dor lombar significativa',
    isLocked: true,
    createdBy: 'SUPERADMIN',
    conditionJson: {
      operator: 'AND',
      conditions: [
        { field: 'painMap.lower_back', operator: '>=', value: 5 },
      ],
    },
    allowedBlocks: ['COND_AQUECIMENTO', 'COND_CORE_BASICO', 'INI_FORCA_SUPERIOR'],
    blockedBlocks: ['COND_CARDIO_LEVE', 'INI_FORCA_INFERIOR', 'INT_FORCA_POTENCIA_INF', 'INT_METABOLICO_INTENSO', 'AVA_FORCA_POTENCIA', 'AVA_METABOLICO_EXTREMO'],
    recommendations: [
      'Priorizar mobilidade sem carga',
      'Evitar qualquer carga axial',
      'Trabalhar estabilização de core sem flexão/extensão',
      'Consultar fisioterapeuta antes de progredir'
    ],
    priority: 100,
  },

  // REGRA 2: Dor de Joelho - Proteção articular
  {
    name: 'Proteção Joelho - Dor Articular',
    description: 'Bloqueia exercícios de impacto e carga no joelho quando há dor',
    isLocked: true,
    createdBy: 'SUPERADMIN',
    conditionJson: {
      operator: 'AND',
      conditions: [
        { field: 'painMap.knee', operator: '>=', value: 4 },
      ],
    },
    allowedBlocks: ['COND_AQUECIMENTO', 'INI_FORCA_SUPERIOR', 'INI_CORE', 'INT_FORCA_POTENCIA_SUP'],
    blockedBlocks: ['COND_CARDIO_LEVE', 'INI_FORCA_INFERIOR', 'INI_METABOLICO', 'INT_FORCA_POTENCIA_INF', 'INT_METABOLICO_INTENSO', 'AVA_FORCA_POTENCIA', 'AVA_METABOLICO_EXTREMO'],
    recommendations: [
      'Evitar agachamento profundo e saltos',
      'Priorizar membros superiores e core',
      'Fortalecer VMO com exercícios isolados',
      'Avaliar biomecânica do joelho'
    ],
    priority: 95,
  },

  // REGRA 3: Nível 0 - Condicionamento (Base Absoluta)
  {
    name: 'Restrição de Nível - Condicionamento',
    description: 'Alunos em condicionamento só podem acessar blocos de nível 0',
    isLocked: true,
    createdBy: 'SUPERADMIN',
    conditionJson: {
      operator: 'AND',
      conditions: [
        { field: 'level', operator: '==', value: 'CONDITIONING' },
      ],
    },
    allowedBlocks: ['COND_AQUECIMENTO', 'COND_CARDIO_LEVE', 'COND_CORE_BASICO'],
    blockedBlocks: [
      'INI_AQUECIMENTO', 'INI_FORCA_INFERIOR', 'INI_FORCA_SUPERIOR', 'INI_CORE', 'INI_METABOLICO',
      'INT_ATIVACAO', 'INT_FORCA_POTENCIA_INF', 'INT_FORCA_POTENCIA_SUP', 'INT_METABOLICO_INTENSO',
      'AVA_ATIVACAO_NEURO', 'AVA_FORCA_POTENCIA', 'AVA_CORE_EXIGENTE', 'AVA_METABOLICO_EXTREMO'
    ],
    recommendations: [
      'Completar 4-6 semanas de condicionamento antes de progredir',
      'Desenvolver tolerância ao esforço',
      'Aprender padrões básicos de movimento'
    ],
    priority: 90,
  },

  // REGRA 4: Nível 1 - Iniciante
  {
    name: 'Restrição de Nível - Iniciante',
    description: 'Iniciantes não podem acessar blocos intermediários ou avançados',
    isLocked: true,
    createdBy: 'SUPERADMIN',
    conditionJson: {
      operator: 'AND',
      conditions: [
        { field: 'level', operator: '==', value: 'BEGINNER' },
      ],
    },
    allowedBlocks: [
      'COND_AQUECIMENTO', 'COND_CARDIO_LEVE', 'COND_CORE_BASICO',
      'INI_AQUECIMENTO', 'INI_FORCA_INFERIOR', 'INI_FORCA_SUPERIOR', 'INI_CORE', 'INI_METABOLICO'
    ],
    blockedBlocks: [
      'INT_ATIVACAO', 'INT_FORCA_POTENCIA_INF', 'INT_FORCA_POTENCIA_SUP', 'INT_METABOLICO_INTENSO',
      'AVA_ATIVACAO_NEURO', 'AVA_FORCA_POTENCIA', 'AVA_CORE_EXIGENTE', 'AVA_METABOLICO_EXTREMO'
    ],
    recommendations: [
      'Completar 8-12 semanas de treino iniciante',
      'Dominar técnica dos movimentos básicos',
      'Desenvolver base de força e condicionamento'
    ],
    priority: 85,
  },

  // REGRA 5: Nível 2 - Intermediário
  {
    name: 'Restrição de Nível - Intermediário',
    description: 'Intermediários não podem acessar blocos avançados',
    isLocked: true,
    createdBy: 'SUPERADMIN',
    conditionJson: {
      operator: 'AND',
      conditions: [
        { field: 'level', operator: '==', value: 'INTERMEDIATE' },
      ],
    },
    allowedBlocks: [
      'COND_AQUECIMENTO', 'COND_CARDIO_LEVE', 'COND_CORE_BASICO',
      'INI_AQUECIMENTO', 'INI_FORCA_INFERIOR', 'INI_FORCA_SUPERIOR', 'INI_CORE', 'INI_METABOLICO',
      'INT_ATIVACAO', 'INT_FORCA_POTENCIA_INF', 'INT_FORCA_POTENCIA_SUP', 'INT_METABOLICO_INTENSO'
    ],
    blockedBlocks: [
      'AVA_ATIVACAO_NEURO', 'AVA_FORCA_POTENCIA', 'AVA_CORE_EXIGENTE', 'AVA_METABOLICO_EXTREMO'
    ],
    recommendations: [
      'Dominar técnica intermediária por 12-16 semanas',
      'Desenvolver base sólida de força e potência',
      'Preparar sistema nervoso para cargas mais altas'
    ],
    priority: 80,
  },

  // REGRA 6: Restrição Cardiovascular
  {
    name: 'Proteção Cardiovascular',
    description: 'Bloqueia HIIT e alta intensidade para pessoas com restrição cardíaca',
    isLocked: true,
    createdBy: 'SUPERADMIN',
    conditionJson: {
      operator: 'AND',
      conditions: [
        { field: 'restrictions.cardiac', operator: '==', value: true },
      ],
    },
    allowedBlocks: [
      'COND_AQUECIMENTO', 'COND_CORE_BASICO',
      'INI_AQUECIMENTO', 'INI_FORCA_INFERIOR', 'INI_FORCA_SUPERIOR', 'INI_CORE',
      'INT_ATIVACAO', 'INT_FORCA_POTENCIA_INF', 'INT_FORCA_POTENCIA_SUP'
    ],
    blockedBlocks: [
      'COND_CARDIO_LEVE', 'INI_METABOLICO', 'INT_METABOLICO_INTENSO',
      'AVA_ATIVACAO_NEURO', 'AVA_METABOLICO_EXTREMO'
    ],
    recommendations: [
      'Manter FC abaixo de 140bpm',
      'Priorizar trabalho de força com descanso amplo',
      'Monitorar constantemente sinais vitais',
      'Liberação médica obrigatória para progressão'
    ],
    priority: 100,
  },

  // REGRA 7: Mobilidade Ruim - Agachamento
  {
    name: 'Restrição Mobilidade - Agachamento',
    description: 'Restringe agachamento profundo quando há déficit severo de mobilidade',
    isLocked: true,
    createdBy: 'SUPERADMIN',
    conditionJson: {
      operator: 'AND',
      conditions: [
        { field: 'movementTests.squat.score', operator: '<=', value: 2 },
      ],
    },
    allowedBlocks: [
      'COND_AQUECIMENTO', 'COND_CORE_BASICO',
      'INI_AQUECIMENTO', 'INI_FORCA_SUPERIOR', 'INI_CORE'
    ],
    blockedBlocks: [
      'INI_FORCA_INFERIOR', 'INT_FORCA_POTENCIA_INF', 'AVA_FORCA_POTENCIA'
    ],
    recommendations: [
      'Trabalhar mobilidade de tornozelo, quadril e torácica diariamente',
      'Usar progressões do agachamento (box squat, goblet squat)',
      'Melhorar score de movimento para 3+ antes de progredir',
      'Avaliar restrições anatômicas vs funcionais'
    ],
    priority: 75,
  },

  // REGRA 8: Qualquer Dor - Nível Avançado
  {
    name: 'Bloqueio Total Avançado - Presença de Dor',
    description: 'Bloqueia TODOS os blocos avançados se houver QUALQUER dor reportada',
    isLocked: true,
    createdBy: 'SUPERADMIN',
    conditionJson: {
      operator: 'OR',
      conditions: [
        { field: 'painMap.lower_back', operator: '>=', value: 3 },
        { field: 'painMap.knee', operator: '>=', value: 3 },
        { field: 'painMap.shoulder', operator: '>=', value: 3 },
        { field: 'painMap.neck', operator: '>=', value: 3 },
        { field: 'painMap.hip', operator: '>=', value: 3 },
      ],
    },
    allowedBlocks: [],
    blockedBlocks: [
      'AVA_ATIVACAO_NEURO', 'AVA_FORCA_POTENCIA', 'AVA_CORE_EXIGENTE', 'AVA_METABOLICO_EXTREMO'
    ],
    recommendations: [
      'Nível avançado exige ZERO dor para execução segura',
      'Resolver completamente qualquer quadro álgico antes de retomar',
      'Avaliar causa da dor e corrigir antes de progressão',
      'Considerar regressão temporária para nível intermediário'
    ],
    priority: 100,
  },
]

// ============================================================================
// FUNÇÃO PRINCIPAL DE SEED
// ============================================================================
export async function seedMetodoExpertTraining() {
  console.log('🔐 Iniciando seed do MÉTODO EXPERT TRAINING...')
  console.log('⚠️  Estes são DADOS PROTEGIDOS - apenas SuperAdmin pode modificar')

  // Combinar todos os blocos
  const todosBlocos = [
    ...blocosCondicionamento,
    ...blocosIniciante,
    ...blocosIntermediario,
    ...blocosAvancado,
  ]

  // Criar blocos
  console.log('\n📦 Criando blocos funcionais...')
  for (const bloco of todosBlocos) {
    const exercisesJson = bloco.exercises.map((ex: any, idx: number) => ({
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
        riskLevel: bloco.riskLevel as any,
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
        riskLevel: bloco.riskLevel as any,
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

  // Criar exercícios individuais para a biblioteca
  console.log('\n🏋️ Criando biblioteca de exercícios...')
  const blocosDb = await prisma.block.findMany()
  const blocoMap = new Map(blocosDb.map((b: any) => [b.code, b.id]))

  for (const bloco of todosBlocos) {
    const blockId = blocoMap.get(bloco.code)
    if (!blockId) continue

    for (const ex of bloco.exercises) {
      const exData = ex as any
      const exerciseName = exData.name || exData.exercise_name || 'Unknown Exercise'
      const exerciseType = exData.type || exData.exercise_role || 'Exercise'
      
      await prisma.exercise.upsert({
        where: {
          id: `${bloco.code}_${exerciseName.replace(/\s+/g, '_').toUpperCase()}`,
        },
        update: {
          name: exerciseName,
          type: exerciseType,
          defaultSets: exData.sets,
          defaultReps: exData.reps || exData.time_or_reps,
          defaultTime: exData.time,
          defaultRest: exData.rest,
          orderInBlock: exData.order,
          blockId,
          isLocked: true,
          createdBy: 'SUPERADMIN',
          isActive: true,
        },
        create: {
          id: `${bloco.code}_${exerciseName.replace(/\s+/g, '_').toUpperCase()}`,
          name: exerciseName,
          type: exerciseType,
          defaultSets: exData.sets,
          defaultReps: exData.reps || exData.time_or_reps,
          defaultTime: exData.time,
          defaultRest: exData.rest,
          orderInBlock: exData.order,
          blockId,
          isLocked: true,
          createdBy: 'SUPERADMIN',
          isActive: true,
        },
      })
    }
  }

  // Criar regras
  console.log('\n⚙️ Criando regras do motor de decisão...')
  for (const regra of regrasMetodo) {
    await prisma.rule.upsert({
      where: { id: regra.name.replace(/\s+/g, '_').toLowerCase() },
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
        id: regra.name.replace(/\s+/g, '_').toLowerCase(),
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

  console.log('\n✅ Seed do MÉTODO EXPERT TRAINING concluído!')
  console.log(`   📦 ${todosBlocos.length} blocos funcionais criados`)
  console.log(`   🏋️ ${todosBlocos.reduce((acc, b) => acc + b.exercises.length, 0)} exercícios criados`)
  console.log(`   ⚙️ ${regrasMetodo.length} regras do motor criadas`)
  console.log('\n🔒 Todos os dados estão PROTEGIDOS (is_locked = true)')
}

// Executar se chamado diretamente
if (require.main === module) {
  seedMetodoExpertTraining()
    .catch((e) => {
      console.error('❌ Erro no seed:', e)
      process.exit(1)
    })
    .finally(() => prisma.$disconnect())
}
