// ============================================================================
// EXPERT PRO TRAINING — DATE UTILITIES
// ============================================================================
// Fixes timezone issue where "2026-04-24" parsed as UTC midnight
// shifts to previous day in UTC-3 (Brazil) when stored as @db.Date
// ============================================================================

/**
 * Parse a date string safely for @db.Date fields.
 * Adds T12:00:00 to prevent timezone shift from UTC to local.
 */
export function parseLocalDate(dateStr: string | Date): Date {
  if (dateStr instanceof Date) return dateStr
  // If it's already a full ISO string with time, parse normally
  if (dateStr.includes('T')) return new Date(dateStr)
  // For "YYYY-MM-DD" format, add noon to avoid timezone issues
  return new Date(`${dateStr}T12:00:00`)
}
