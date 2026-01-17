// ============================================================================
// EXPERT PRO TRAINING - ASSESSMENT CONSTANTS
// ============================================================================
// Shared constants for assessment fields and rule evaluation
// ============================================================================

export const ASSESSMENT_FIELDS = [
  // Level
  { value: 'level', label: 'Nível do Cliente', type: 'select', options: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] },
  
  // Pain Map - Body regions
  { value: 'painMap.lower_back', label: 'Dor - Lombar', type: 'number', min: 0, max: 10 },
  { value: 'painMap.upper_back', label: 'Dor - Dorsal', type: 'number', min: 0, max: 10 },
  { value: 'painMap.neck', label: 'Dor - Cervical', type: 'number', min: 0, max: 10 },
  { value: 'painMap.shoulder_left', label: 'Dor - Ombro Esquerdo', type: 'number', min: 0, max: 10 },
  { value: 'painMap.shoulder_right', label: 'Dor - Ombro Direito', type: 'number', min: 0, max: 10 },
  { value: 'painMap.knee_left', label: 'Dor - Joelho Esquerdo', type: 'number', min: 0, max: 10 },
  { value: 'painMap.knee_right', label: 'Dor - Joelho Direito', type: 'number', min: 0, max: 10 },
  { value: 'painMap.hip_left', label: 'Dor - Quadril Esquerdo', type: 'number', min: 0, max: 10 },
  { value: 'painMap.hip_right', label: 'Dor - Quadril Direito', type: 'number', min: 0, max: 10 },
  { value: 'painMap.ankle_left', label: 'Dor - Tornozelo Esquerdo', type: 'number', min: 0, max: 10 },
  { value: 'painMap.ankle_right', label: 'Dor - Tornozelo Direito', type: 'number', min: 0, max: 10 },
  { value: 'painMap.wrist_left', label: 'Dor - Punho Esquerdo', type: 'number', min: 0, max: 10 },
  { value: 'painMap.wrist_right', label: 'Dor - Punho Direito', type: 'number', min: 0, max: 10 },
  { value: 'painMap.elbow_left', label: 'Dor - Cotovelo Esquerdo', type: 'number', min: 0, max: 10 },
  { value: 'painMap.elbow_right', label: 'Dor - Cotovelo Direito', type: 'number', min: 0, max: 10 },
  
  // Movement Tests - Scores (0-3)
  { value: 'movementTests.squat.score', label: 'Teste - Agachamento', type: 'number', min: 0, max: 3 },
  { value: 'movementTests.hinge.score', label: 'Teste - Deadlift/Hinge', type: 'number', min: 0, max: 3 },
  { value: 'movementTests.lunge.score', label: 'Teste - Avanço', type: 'number', min: 0, max: 3 },
  { value: 'movementTests.push.score', label: 'Teste - Empurrar', type: 'number', min: 0, max: 3 },
  { value: 'movementTests.pull.score', label: 'Teste - Puxar', type: 'number', min: 0, max: 3 },
  { value: 'movementTests.rotation.score', label: 'Teste - Rotação', type: 'number', min: 0, max: 3 },
  { value: 'movementTests.gait.score', label: 'Teste - Marcha', type: 'number', min: 0, max: 3 },
  
  // Complaints (array)
  { value: 'complaints', label: 'Queixas', type: 'array', description: 'Use contains/not_contains' },
]

export const CONDITION_OPERATORS = {
  'equals': { label: 'Igual a', symbol: '==' },
  'not_equals': { label: 'Diferente de', symbol: '!=' },
  'greater_than': { label: 'Maior que', symbol: '>' },
  'greater_equal': { label: 'Maior ou igual a', symbol: '>=' },
  'less_than': { label: 'Menor que', symbol: '<' },
  'less_equal': { label: 'Menor ou igual a', symbol: '<=' },
  'contains': { label: 'Contém', symbol: 'includes' },
  'not_contains': { label: 'Não contém', symbol: 'not_includes' }
}