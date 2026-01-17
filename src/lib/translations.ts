// ============================================================================
// EXPERT PRO TRAINING - TRADUÇÕES E CONSTANTES
// ============================================================================
// Traduções de termos técnicos do inglês para português
// ============================================================================

// Níveis de dificuldade
export const DIFFICULTY_LABELS: Record<string, string> = {
  'BEGINNER': 'Iniciante',
  'INTERMEDIATE': 'Intermediário',
  'ADVANCED': 'Avançado',
}

// Níveis do método
export const LEVEL_LABELS: Record<number, string> = {
  0: 'Condicionamento',
  1: 'Iniciante',
  2: 'Intermediário',
  3: 'Avançado',
}

// Níveis de risco
export const RISK_LABELS: Record<string, string> = {
  'LOW': 'Baixo',
  'MODERATE': 'Moderado',
  'HIGH': 'Alto',
  'CRITICAL': 'Crítico',
}

// Status de avaliação
export const ASSESSMENT_STATUS_LABELS: Record<string, string> = {
  'PENDING': 'Pendente',
  'IN_PROGRESS': 'Em Andamento',
  'COMPLETED': 'Concluída',
  'CANCELLED': 'Cancelada',
}

// Padrões funcionais
export const FUNCTIONAL_PATTERN_LABELS: Record<string, string> = {
  'GENERAL_CONDITIONING': 'Condicionamento Geral',
  'CORRECTIVE_LUMBAR': 'Corretivo Lombar',
  'CORRECTIVE_KNEE': 'Corretivo Joelho',
  'CORRECTIVE_SHOULDER': 'Corretivo Ombro',
  'CORRECTIVE_MOVEMENT': 'Corretivo Movimento',
  'PERFORMANCE': 'Performance',
  'HYBRID_TRAINING': 'Treino Híbrido',
  'FOUNDATION': 'Fundação',
  'BALANCED': 'Equilibrado',
}

// Padrões de movimento (bilíngue)
export const MOVEMENT_PATTERN_LABELS: Record<string, string> = {
  'SQUAT': 'Agachamento (Squat)',
  'squat': 'Agachamento (Squat)',
  'HINGE': 'Dobradiça (Hinge)',
  'hinge': 'Dobradiça (Hinge)',
  'LUNGE': 'Afundo (Lunge)',
  'lunge': 'Afundo (Lunge)',
  'PUSH': 'Empurrar (Push)',
  'push': 'Empurrar (Push)',
  'PULL': 'Puxar (Pull)',
  'pull': 'Puxar (Pull)',
  'ROTATION': 'Rotação (Rotation)',
  'rotation': 'Rotação (Rotation)',
  'GAIT': 'Marcha (Gait)',
  'gait': 'Marcha (Gait)',
  'CARRY': 'Carregar (Carry)',
  'carry': 'Carregar (Carry)',
  'locomotion_pattern': 'Padrão de Locomoção (Locomotion Pattern)',
  'hip_mobility': 'Mobilidade do Quadril (Hip Mobility)',
  'knee_left_recovery': 'Recuperação Joelho Esquerdo (Knee Left Recovery)',
  'knee_right_recovery': 'Recuperação Joelho Direito (Knee Right Recovery)',
}

// Capacidades físicas
export const CAPACITY_LABELS: Record<string, string> = {
  'CONDICIONAMENTO': 'Condicionamento',
  'FORÇA': 'Força',
  'POTÊNCIA': 'Potência',
  'HIPERTROFIA': 'Hipertrofia',
  'RESISTÊNCIA': 'Resistência',
  'MOBILIDADE': 'Mobilidade',
  'ESTABILIDADE': 'Estabilidade',
  'COORDENAÇÃO': 'Coordenação',
}

// Tipos de exercício
export const EXERCISE_TYPE_LABELS: Record<string, string> = {
  'STRENGTH': 'Força',
  'CARDIO': 'Cardio',
  'MOBILITY': 'Mobilidade',
  'POWER': 'Potência',
  'STABILITY': 'Estabilidade',
  'CONDITIONING': 'Condicionamento',
}

// Grupos musculares
export const MUSCLE_GROUP_LABELS: Record<string, string> = {
  'Peitoral': 'Peitoral',
  'Costas': 'Costas',
  'Ombros': 'Ombros',
  'Bíceps': 'Bíceps',
  'Tríceps': 'Tríceps',
  'Antebraço': 'Antebraço',
  'Core': 'Core',
  'Quadríceps': 'Quadríceps',
  'Posterior': 'Posterior',
  'Glúteos': 'Glúteos',
  'Panturrilha': 'Panturrilha',
  'Corpo Todo': 'Corpo Todo',
}

// Equipamentos
export const EQUIPMENT_LABELS: Record<string, string> = {
  'Peso Corporal': 'Peso Corporal',
  'Halteres': 'Halteres',
  'Barra': 'Barra',
  'Kettlebell': 'Kettlebell',
  'Elástico': 'Elástico',
  'TRX': 'TRX',
  'Medicine Ball': 'Medicine Ball',
  'Caixa': 'Caixa',
  'Corda': 'Corda',
  'Outro': 'Outro',
}

// Regiões de dor (bilíngue)
export const PAIN_REGION_LABELS: Record<string, string> = {
  'lower_back': 'Lombar (Lower Back)',
  'knee': 'Joelho (Knee)',
  'knee_left': 'Joelho Esquerdo (Knee Left)',
  'knee_right': 'Joelho Direito (Knee Right)',
  'shoulder': 'Ombro (Shoulder)',
  'shoulder_left': 'Ombro Esquerdo (Shoulder Left)',
  'shoulder_right': 'Ombro Direito (Shoulder Right)',
  'neck': 'Pescoço (Neck)',
  'hip': 'Quadril (Hip)',
  'hip_left': 'Quadril Esquerdo (Hip Left)',
  'hip_right': 'Quadril Direito (Hip Right)',
  'ankle': 'Tornozelo (Ankle)',
  'ankle_left': 'Tornozelo Esquerdo (Ankle Left)',
  'ankle_right': 'Tornozelo Direito (Ankle Right)',
  'elbow': 'Cotovelo (Elbow)',
  'wrist': 'Punho (Wrist)',
}

// Status de treino
export const WORKOUT_STATUS_LABELS: Record<string, string> = {
  'DRAFT': 'Rascunho',
  'ACTIVE': 'Ativo',
  'COMPLETED': 'Concluído',
  'CANCELLED': 'Cancelado',
}

// Tipos de aula
export const LESSON_TYPE_LABELS: Record<string, string> = {
  'TRAINING': 'Treino',
  'ASSESSMENT': 'Avaliação',
  'CONSULTATION': 'Consulta',
}

// Status de aula
export const LESSON_STATUS_LABELS: Record<string, string> = {
  'SCHEDULED': 'Agendada',
  'IN_PROGRESS': 'Em Andamento',
  'COMPLETED': 'Concluída',
  'CANCELLED': 'Cancelada',
  'NO_SHOW': 'Faltou',
}

// Funções auxiliares
export function translateDifficulty(difficulty: string | null): string {
  if (!difficulty) return '-'
  return DIFFICULTY_LABELS[difficulty] || difficulty
}

export function translateLevel(level: number): string {
  return LEVEL_LABELS[level] || `Nível ${level}`
}

export function translateRisk(risk: string): string {
  return RISK_LABELS[risk] || risk
}

export function translateAssessmentStatus(status: string): string {
  return ASSESSMENT_STATUS_LABELS[status] || status
}

export function translateFunctionalPattern(pattern: string | null): string {
  if (!pattern) return '-'
  return FUNCTIONAL_PATTERN_LABELS[pattern] || pattern
}

export function translateMovementPattern(pattern: string | null): string {
  if (!pattern) return '-'
  return MOVEMENT_PATTERN_LABELS[pattern] || pattern
}

export function translateCapacity(capacity: string): string {
  return CAPACITY_LABELS[capacity] || capacity
}

export function translateExerciseType(type: string | null): string {
  if (!type) return '-'
  return EXERCISE_TYPE_LABELS[type] || type
}

export function translateMuscleGroup(group: string | null): string {
  if (!group) return '-'
  return MUSCLE_GROUP_LABELS[group] || group
}

export function translateEquipment(equipment: string | null): string {
  if (!equipment) return '-'
  return EQUIPMENT_LABELS[equipment] || equipment
}

export function translatePainRegion(region: string): string {
  return PAIN_REGION_LABELS[region] || region
}

export function translateWorkoutStatus(status: string): string {
  return WORKOUT_STATUS_LABELS[status] || status
}

export function translateLessonType(type: string): string {
  return LESSON_TYPE_LABELS[type] || type
}

export function translateLessonStatus(status: string): string {
  return LESSON_STATUS_LABELS[status] || status
}
