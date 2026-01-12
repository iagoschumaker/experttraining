// ============================================================================
// EXPERT TRAINING - THEME TOGGLE BUTTON
// ============================================================================

'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative w-8 h-8 md:w-9 md:h-9 rounded-lg hover:bg-surface-hover transition-colors touch-manipulation"
      title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
    >
      <Sun className="h-4 w-4 md:h-5 md:w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-foreground" />
      <Moon className="absolute h-4 w-4 md:h-5 md:w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-foreground" />
    </Button>
  )
}
