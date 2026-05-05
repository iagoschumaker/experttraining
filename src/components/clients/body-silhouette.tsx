'use client'

import { useState } from 'react'
import { anteriorData, posteriorData, Muscle } from './body-svg-data'

interface BodySilhouetteProps {
  gender: 'M' | 'F' | null
  bodyFat?: number | null
  // Circunferências (cm)
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
  // Dobras cutâneas (mm)
  sfChest?: number | null
  sfAbdomen?: number | null
  sfThigh?: number | null
  sfTriceps?: number | null
  sfSuprailiac?: number | null
  sfSubscapular?: number | null
  sfMidaxillary?: number | null
}

interface Metric {
  val: number | null | undefined
  label: string
  unit: string
}

interface MuscleData {
  metrics: Metric[]
}

export function BodySilhouette(props: BodySilhouetteProps) {
  const [hoveredMuscle, setHoveredMuscle] = useState<Muscle | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [view, setView] = useState<'anterior' | 'posterior'>('anterior')

  const {
    bodyFat,
    chest, waist, hip, abdomen,
    armRight, armLeft,
    forearmRight, forearmLeft,
    thighRight, thighLeft,
    calfRight, calfLeft,
    sfChest, sfAbdomen, sfThigh, sfTriceps, sfSuprailiac, sfSubscapular, sfMidaxillary
  } = props

  // Faz média para membros
  const avg = (a?: number | null, b?: number | null) => {
    if (a && b) return (a + b) / 2
    return a || b || null
  }

  // Agrupa as métricas por músculo
  const muscleValues: Partial<Record<Muscle, MuscleData>> = {}

  const addMetric = (m: Muscle, val: number | null | undefined, label: string, unit: string) => {
    if (!val) return
    if (!muscleValues[m]) muscleValues[m] = { metrics: [] }
    muscleValues[m]!.metrics.push({ val, label, unit })
  }

  // Peitoral
  addMetric('chest', chest, 'Circunferência', 'cm')
  addMetric('chest', sfChest, 'Dobra Cutânea', 'mm')

  // Abdômen
  addMetric('abs', abdomen, 'Circunferência', 'cm')
  addMetric('abs', sfAbdomen, 'Dobra Cutânea', 'mm')
  addMetric('abs', bodyFat, 'Gordura Corporal (Total)', '%') // Exibe o BF no centro do corpo

  // Cintura / Supra-ilíaca (Obliques)
  addMetric('obliques', waist, 'Cintura', 'cm')
  addMetric('obliques', sfSuprailiac, 'Dobra Suprailíaca', 'mm')

  // Quadril
  addMetric('gluteal', hip, 'Quadril', 'cm')

  // Braços
  const armCm = avg(armRight, armLeft)
  addMetric('biceps', armCm, 'Braço', 'cm')
  addMetric('triceps', armCm, 'Braço', 'cm')
  addMetric('triceps', sfTriceps, 'Dobra Tríceps', 'mm')

  // Antebraço
  addMetric('forearm', avg(forearmRight, forearmLeft), 'Antebraço', 'cm')

  // Coxas
  const thighCm = avg(thighRight, thighLeft)
  addMetric('quadriceps', thighCm, 'Coxa', 'cm')
  addMetric('quadriceps', sfThigh, 'Dobra Coxa', 'mm')
  addMetric('hamstring', thighCm, 'Coxa', 'cm')
  addMetric('hamstring', sfThigh, 'Dobra Coxa', 'mm')

  // Panturrilhas
  addMetric('calves', avg(calfRight, calfLeft), 'Panturrilha', 'cm')

  // Costas / Axilar
  addMetric('upper-back', sfSubscapular, 'Dobra Subescapular', 'mm')
  addMetric('back-deltoids', sfMidaxillary, 'Dobra Axilar Média', 'mm')

  const modelData = view === 'anterior' ? anteriorData : posteriorData

  const activeData = hoveredMuscle ? muscleValues[hoveredMuscle] : null
  const showTooltip = !!(hoveredMuscle && activeData?.metrics.length)

  const muscleNames: Record<Muscle, string> = {
    'chest': 'Peitoral', 'abs': 'Abdômen', 'obliques': 'Cintura / Oblíquos', 'gluteal': 'Quadril / Glúteos',
    'biceps': 'Bíceps', 'triceps': 'Tríceps', 'forearm': 'Antebraço', 'quadriceps': 'Coxa (Anterior)',
    'hamstring': 'Coxa (Posterior)', 'calves': 'Panturrilha', 'upper-back': 'Costas Superiores',
    'lower-back': 'Lombar', 'back-deltoids': 'Costas / Axilar', 'front-deltoids': 'Deltoide Anterior',
    'trapezius': 'Trapézio', 'adductor': 'Adutores', 'abductors': 'Abdutores', 'head': 'Cabeça',
    'neck': 'Pescoço', 'knees': 'Joelhos', 'left-soleus': 'Sóleo', 'right-soleus': 'Sóleo'
  }

  return (
    <div className="flex flex-col items-center gap-4 select-none w-full max-w-sm mx-auto relative">
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

      <div className="relative w-full max-w-[200px] mx-auto group">
        <svg
          viewBox="0 0 100 220"
          className="w-full h-auto drop-shadow-lg transition-all"
          xmlns="http://www.w3.org/2000/svg"
        >
          {modelData.map((part) => {
            const data = muscleValues[part.muscle]
            const hasData = !!data?.metrics.length
            const isHovered = hoveredMuscle === part.muscle

            let fill = 'hsl(var(--muted) / 0.5)'
            if (hasData) {
              fill = 'hsl(var(--primary) / 0.4)'
            }
            if (isHovered) {
              fill = 'hsl(var(--primary))'
            }

            return part.svgPoints.map((points, idx) => (
              <polygon
                key={`${part.muscle}-${idx}`}
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
                onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
              />
            ))
          })}
        </svg>

        <div className="absolute -bottom-6 left-0 right-0 text-center pointer-events-none">
          <span className="text-[9px] text-muted-foreground bg-background/80 px-2 py-1 rounded-full backdrop-blur-sm shadow-sm border border-border/50">
            💡 Passe o mouse nas áreas em destaque
          </span>
        </div>
      </div>

      {showTooltip && activeData && (
        <div
          className="fixed z-[100] pointer-events-none bg-popover text-popover-foreground shadow-2xl flex flex-col gap-1 p-3 rounded-xl border border-border transform -translate-x-1/2 -translate-y-[110%]"
          style={{ left: mousePos.x, top: mousePos.y, minWidth: '160px' }}
        >
          <div className="text-[10px] uppercase font-bold text-muted-foreground border-b border-border/50 pb-1 mb-1 tracking-wider">
            {muscleNames[hoveredMuscle!]}
          </div>
          {activeData.metrics.map((m, i) => (
             <div key={i} className="flex justify-between items-center gap-4">
               <span className="text-xs font-semibold text-popover-foreground/80">{m.label}</span>
               <span className="text-sm font-black text-primary">
                 {Number(m.val).toFixed(1)} <span className="text-[10px] text-primary/70">{m.unit}</span>
               </span>
             </div>
          ))}
        </div>
      )}

      {Object.keys(muscleValues).length === 0 && (
        <p className="text-[10px] text-muted-foreground text-center mt-4">
          Preencha as circunferências para ver o modelo colorido
        </p>
      )}
    </div>
  )
}
