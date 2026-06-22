'use client'

import { useTheme } from '@/contexts/ThemeContext'

interface KinexLogoProps {
  /** Altura da logo em pixels (width automático) */
  height?: number
  className?: string
}

/**
 * Logo Kinex Performance sensível ao tema do app.
 * Usa kinex-logo-dark.png no tema escuro e kinex-logo-light.png no claro.
 */
export function KinexLogo({ height = 28, className = '' }: KinexLogoProps) {
  const { theme } = useTheme()

  const src = theme === 'dark' ? '/kinex-logo-dark.png' : '/kinex-logo-light.png'
  const style = { height: `${height}px`, width: 'auto' }

  return (
    <img
      src={src}
      alt="Kinex Performance"
      style={style}
      className={`object-contain ${className}`}
    />
  )
}
