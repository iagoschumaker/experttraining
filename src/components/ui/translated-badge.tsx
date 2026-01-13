// ============================================================================
// EXPERT TRAINING - TRANSLATED BADGE COMPONENT
// ============================================================================
// Badge component with automatic translation
// ============================================================================

import { Badge, BadgeProps } from '@/components/ui/badge'
import {
  translateAssessmentStatus,
  translateDifficulty,
  translateLevel,
  translateRisk,
  translateWorkoutStatus,
  translateLessonStatus,
  translateLessonType,
  translateFunctionalPattern,
} from '@/lib/translations'

interface TranslatedBadgeProps extends Omit<BadgeProps, 'children'> {
  type: 'assessment' | 'difficulty' | 'level' | 'risk' | 'workout' | 'lesson-status' | 'lesson-type' | 'pattern'
  value: string | number | null
}

export function TranslatedBadge({ type, value, ...props }: TranslatedBadgeProps) {
  if (value === null || value === undefined) {
    return <Badge {...props}>-</Badge>
  }

  let translatedValue: string

  switch (type) {
    case 'assessment':
      translatedValue = translateAssessmentStatus(String(value))
      break
    case 'difficulty':
      translatedValue = translateDifficulty(String(value))
      break
    case 'level':
      translatedValue = translateLevel(Number(value))
      break
    case 'risk':
      translatedValue = translateRisk(String(value))
      break
    case 'workout':
      translatedValue = translateWorkoutStatus(String(value))
      break
    case 'lesson-status':
      translatedValue = translateLessonStatus(String(value))
      break
    case 'lesson-type':
      translatedValue = translateLessonType(String(value))
      break
    case 'pattern':
      translatedValue = translateFunctionalPattern(String(value))
      break
    default:
      translatedValue = String(value)
  }

  return <Badge {...props}>{translatedValue}</Badge>
}
