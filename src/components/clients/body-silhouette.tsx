'use client'

import { useState } from 'react'
import { anteriorData, posteriorData, Muscle } from './body-svg-data'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface BodySilhouetteProps {
  gender: 'M' | 'F' | null
  chest?: number | null
  waist?: number | null
  hip?: number | null
  abdomen?: number | null
  armRight?: number | null
  armLeft?: number | null
  forearmRight?: number | null
  forearmLeft?: number | null
  thighRight?: number | null
  thighLeft?: number | null
  calfRight?: number | null
  calfLeft?: number | null
}

interface MuscleData {
  value: number | null | undefined
  label: string
}

export function BodySilhouette(props: BodySilhouetteProps) {
  const [hoveredMuscle, setHoveredMuscle] = useState<Muscle | null>(null)
  const [view, setView] = useState<'anterior' | 'posterior'>('anterior')

  const {
    chest, waist, hip, abdomen,
    armRight, armLeft,
    forearmRight, forearmLeft,
    thighRight, thighLeft,
    calfRight, calfLeft
  } = props

  // Mapeia os dados do corpo para os músculos do react-body-highlighter
  // Combina direita e esquerda fazendo média ou somando, dependendo do caso, 
  // já que o SVG ilumina o músculo inteiro (ambos os lados juntos na maioria dos SVGs)
  const avg = (a?: number | null, b?: number | null) => {
    if (a && b) return (a + b) / 2
    return a || b || null
  }

  const muscleValues: Partial<Record<Muscle, MuscleData>> = {
    'chest': { value: chest, label: 'Peitoral' },
    'abs': { value: abdomen, label: 'Abdômen' },
    'obliques': { value: waist, label: 'Cintura' },
    'gluteal': { value: hip, label: 'Quadril' },
    'biceps': { value: avg(armRight, armLeft), label: 'Braço (Bíceps)' },
    'triceps': { value: avg(armRight, armLeft), label: 'Braço (Tríceps)' },
    'forearm': { value: avg(forearmRight, forearmLeft), label: 'Antebraço' },
    'quadriceps': { value: avg(thighRight, thighLeft), label: 'Coxa' },
    'hamstring': { value: avg(thighRight, thighLeft), label: 'Coxa (Posterior)' },
    'calves': { value: avg(calfRight, calfLeft), label: 'Panturrilha' },
  }

  const modelData = view === 'anterior' ? anteriorData : posteriorData

  return (
    <div className="flex flex-col items-center gap-4 select-none w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between w-full">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          Mapa Corporal 3D — {props.gender === 'F' ? 'Feminino' : 'Masculino'}
        </p>
        <div className="flex bg-muted rounded-lg p-1">
          <button
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${view === 'anterior' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setView('anterior')}
          >
            Frente
          </button>
          <button
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${view === 'posterior' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setView('posterior')}
          >
            Costas
          </button>
        </div>
      </div>

      <TooltipProvider delayDuration={0}>
        <div className="relative w-full max-w-[200px] mx-auto group">
          <svg
            viewBox="0 0 100 220"
            className="w-full h-auto drop-shadow-lg transition-all"
            xmlns="http://www.w3.org/2000/svg"
          >
            {modelData.map((part) => {
              const data = muscleValues[part.muscle]
              const hasData = !!data?.value
              const isHovered = hoveredMuscle === part.muscle

              // Cores
              // Sem dados: cor base escurecida
              // Com dados: cor primária opaca
              // Hover: cor primária brilhante
              let fill = 'hsl(var(--muted))'
              if (hasData) {
                fill = 'hsl(var(--primary) / 0.4)' // Cor sutil indicando que tem info
              }
              if (isHovered) {
                fill = 'hsl(var(--primary))' // Destaque forte
              }

              return part.svgPoints.map((points, idx) => (
                <Tooltip key={`${part.muscle}-${idx}`}>
                  <TooltipTrigger asChild>
                    <polygon
                      points={points}
                      className="transition-all duration-200 ease-out outline-none"
                      style={{
                        fill,
                        cursor: hasData ? 'pointer' : 'default',
                        stroke: isHovered ? 'hsl(var(--primary))' : 'hsl(var(--background))',
                        strokeWidth: isHovered ? 0.5 : 0.2,
                      }}
                      onMouseEnter={() => setHoveredMuscle(part.muscle)}
                      onMouseLeave={() => setHoveredMuscle(null)}
                    />
                  </TooltipTrigger>
                  {hasData && (
                    <TooltipContent side="right" className="bg-foreground text-background border-none shadow-xl flex flex-col gap-1 p-2">
                      <span className="text-[10px] uppercase font-bold text-muted">{data.label}</span>
                      <span className="text-sm font-bold text-primary-foreground">
                        {Number(data.value).toFixed(1)} cm
                      </span>
                    </TooltipContent>
                  )}
                </Tooltip>
              ))
            })}
          </svg>

          {/* Legenda de dica */}
          <div className="absolute -bottom-6 left-0 right-0 text-center pointer-events-none">
            <span className="text-[9px] text-muted-foreground bg-background/80 px-2 py-1 rounded-full backdrop-blur-sm">
              💡 Passe o mouse nas áreas em destaque
            </span>
          </div>
        </div>
      </TooltipProvider>

      {!Object.values(muscleValues).some(m => m?.value) && (
        <p className="text-[10px] text-muted-foreground text-center mt-4">
          Preencha as circunferências para ver o modelo colorido
        </p>
      )}
    </div>
  )
}
