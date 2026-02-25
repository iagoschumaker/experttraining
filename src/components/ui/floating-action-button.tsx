import React, { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

interface FABAction {
  icon: React.ReactNode
  label: string
  onClick: () => void
  className?: string
}

interface FloatingActionButtonProps {
  actions: FABAction[]
  className?: string
}

export function FloatingActionButton({ actions, className }: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Se há apenas uma ação, clica diretamente
  const handleMainClick = () => {
    if (actions.length === 1) {
      actions[0].onClick()
    } else {
      setIsExpanded(!isExpanded)
    }
  }

  return (
    <>
      {/* Overlay para fechar quando expandido */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-20" 
          onClick={() => setIsExpanded(false)}
        />
      )}

      <div className={cn("fixed bottom-6 right-6 z-30", className)}>
        {/* Ações expandidas */}
        {isExpanded && actions.length > 1 && (
          <div className="flex flex-col gap-3 mb-4 items-end">
            {actions.map((action, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
                  <span className="text-sm font-medium text-foreground whitespace-nowrap">
                    {action.label}
                  </span>
                </div>
                <Button
                  size="icon"
                  className={cn(
                    "h-12 w-12 rounded-full shadow-lg bg-amber-500 hover:bg-amber-600 text-white transition-all duration-200 transform",
                    action.className
                  )}
                  onClick={() => {
                    action.onClick()
                    setIsExpanded(false)
                  }}
                >
                  {action.icon}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Botão principal */}
        <Button
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-xl bg-amber-500 hover:bg-amber-600 text-white transition-all duration-300 transform",
            isExpanded && actions.length > 1 ? "rotate-45" : "rotate-0"
          )}
          onClick={handleMainClick}
        >
          {actions.length === 1 ? (
            actions[0].icon
          ) : (
            isExpanded ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />
          )}
        </Button>
      </div>
    </>
  )
}