import React from 'react'
import { cn } from "@/lib/utils"

interface ResponsiveTableProps {
  children: React.ReactNode
  className?: string
}

interface ResponsiveRowProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

interface ResponsiveHeaderProps {
  children: React.ReactNode
  className?: string
}

interface ResponsiveCellProps {
  children: React.ReactNode
  label?: string
  className?: string
  priority?: 'high' | 'medium' | 'low'
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {children}
          </table>
        </div>
      </div>
      
      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {children}
      </div>
    </div>
  )
}

export function ResponsiveHeader({ children, className }: ResponsiveHeaderProps) {
  return (
    <thead className={cn("hidden md:table-header-group", className)}>
      {children}
    </thead>
  )
}

export function ResponsiveBody({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <tbody className={cn("hidden md:table-row-group", className)}>
      {children}
    </tbody>
  )
}

export function ResponsiveRow({ children, className, onClick }: ResponsiveRowProps) {
  return (
    <>
      {/* Desktop Row */}
      <tr 
        className={cn("hidden md:table-row border-b border-border hover:bg-muted/50", className)}
        onClick={onClick}
      >
        {children}
      </tr>
      
      {/* Mobile Card */}
      <div 
        className={cn(
          "md:hidden bg-card border border-border rounded-lg p-4 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors",
          className
        )}
        onClick={onClick}
      >
        {children}
      </div>
    </>
  )
}

export function ResponsiveCell({ children, label, className, priority = 'medium' }: ResponsiveCellProps) {
  return (
    <>
      {/* Desktop Cell */}
      <td className={cn("hidden md:table-cell px-4 py-3 text-sm", className)}>
        {children}
      </td>
      
      {/* Mobile Field */}
      <div className={cn(
        "md:hidden flex justify-between items-center",
        priority === 'low' && "text-muted-foreground text-xs",
        priority === 'high' && "font-medium",
        className
      )}>
        {label && (
          <span className="text-muted-foreground text-xs font-medium min-w-[80px]">
            {label}:
          </span>
        )}
        <span className="text-right flex-1">{children}</span>
      </div>
    </>
  )
}

export function ResponsiveHeaderCell({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <th className={cn("hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider", className)}>
      {children}
    </th>
  )
}