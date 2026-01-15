'use client'

import { ReactNode, useRef, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Skeleton } from './skeleton'
import Link from 'next/link'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  iconColor?: string
  iconBgColor?: string
  href?: string
  loading?: boolean
}

function FitValue({ value }: { value: string | number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = useState(24)

  useEffect(() => {
    const container = containerRef.current
    const text = textRef.current
    if (!container || !text) return

    const containerWidth = container.offsetWidth
    let currentSize = 24

    text.style.fontSize = `${currentSize}px`
    
    while (text.scrollWidth > containerWidth && currentSize > 12) {
      currentSize -= 1
      text.style.fontSize = `${currentSize}px`
    }

    setFontSize(currentSize)
  }, [value])

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <span
        ref={textRef}
        className="font-bold text-foreground whitespace-nowrap"
        style={{ fontSize: `${fontSize}px` }}
      >
        {value}
      </span>
    </div>
  )
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = 'text-amber-500',
  iconBgColor = 'bg-amber-500/10',
  href,
  loading = false,
}: StatsCardProps) {
  const content = (
    <Card className="bg-card border-border hover:border-amber-500/50 transition-colors h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground line-clamp-1">
          {title}
        </CardTitle>
        {icon && (
          <div className={`p-1.5 sm:p-2 rounded-lg ${iconBgColor} shrink-0`}>
            <span className={iconColor}>{icon}</span>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <Skeleton className="h-6 w-16 bg-muted" />
        ) : (
          <>
            <FitValue value={value} />
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {subtitle}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }

  return content
}

interface StatsGridProps {
  children: ReactNode
  columns?: 2 | 3 | 4
}

export function StatsGrid({ children, columns = 4 }: StatsGridProps) {
  const colClasses = {
    2: 'grid-cols-2 md:grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  }

  return (
    <div className={`grid gap-3 sm:gap-4 ${colClasses[columns]}`}>
      {children}
    </div>
  )
}
