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
  title: string
  metrics: Metric[]
}

export function BodySilhouette(props: BodySilhouetteProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
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

  // Agrupa as métricas por chave da parte do corpo
  const muscleValues: Record<string, MuscleData> = {}

  const addMetric = (key: string, val: number | null | undefined, label: string, unit: string) => {
    if (!val) return
    if (!muscleValues[key]) muscleValues[key] = { title: '', metrics: [] }
    muscleValues[key].metrics.push({ val, label, unit })
  }

  // Peitoral
  addMetric('chest', chest, 'Circunferência', 'cm')
  addMetric('chest', sfChest, 'Dobra Cutânea', 'mm')
  if (muscleValues['chest']) muscleValues['chest'].title = 'Peitoral'

  // Abdômen e Cintura (agrupados como 'core' para iluminar toda a região do tronco de uma vez)
  addMetric('core', waist, 'Cintura (Circ.)', 'cm')
  addMetric('core', abdomen, 'Abdômen (Circ.)', 'cm')
  addMetric('core', sfSuprailiac, 'Dobra Suprailíaca', 'mm')
  addMetric('core', sfAbdomen, 'Dobra Abdominal', 'mm')
  addMetric('core', bodyFat, 'Gordura Corporal Total', '%')
  if (muscleValues['core']) muscleValues['core'].title = 'Cintura / Abdômen'

  // Quadril
  addMetric('gluteal', hip, 'Circunferência', 'cm')
  if (muscleValues['gluteal']) muscleValues['gluteal'].title = 'Quadril / Glúteos'

  // Braço Direito
  addMetric('arm-right', armRight, 'Circunferência', 'cm')
  addMetric('arm-right', sfTriceps, 'Dobra Cutânea (Tríceps)', 'mm')
  if (muscleValues['arm-right']) muscleValues['arm-right'].title = 'Braço Dir.'

  // Braço Esquerdo
  addMetric('arm-left', armLeft, 'Circunferência', 'cm')
  addMetric('arm-left', sfTriceps, 'Dobra Cutânea (Tríceps)', 'mm')
  if (muscleValues['arm-left']) muscleValues['arm-left'].title = 'Braço Esq.'

  // Antebraço Direito
  addMetric('forearm-right', forearmRight, 'Circunferência', 'cm')
  if (muscleValues['forearm-right']) muscleValues['forearm-right'].title = 'Antebraço Dir.'

  // Antebraço Esquerdo
  addMetric('forearm-left', forearmLeft, 'Circunferência', 'cm')
  if (muscleValues['forearm-left']) muscleValues['forearm-left'].title = 'Antebraço Esq.'

  // Coxa Direita
  addMetric('thigh-right', thighRight, 'Circunferência', 'cm')
  addMetric('thigh-right', sfThigh, 'Dobra Cutânea (Coxa)', 'mm')
  if (muscleValues['thigh-right']) muscleValues['thigh-right'].title = 'Coxa Dir.'

  // Coxa Esquerda
  addMetric('thigh-left', thighLeft, 'Circunferência', 'cm')
  addMetric('thigh-left', sfThigh, 'Dobra Cutânea (Coxa)', 'mm')
  if (muscleValues['thigh-left']) muscleValues['thigh-left'].title = 'Coxa Esq.'

  // Panturrilha Direita
  addMetric('calf-right', calfRight, 'Circunferência', 'cm')
  if (muscleValues['calf-right']) muscleValues['calf-right'].title = 'Panturrilha Dir.'

  // Panturrilha Esquerda
  addMetric('calf-left', calfLeft, 'Circunferência', 'cm')
  if (muscleValues['calf-left']) muscleValues['calf-left'].title = 'Panturrilha Esq.'

  // Costas / Axilar / Tórax
  addMetric('upper-back', chest, 'Circunferência do Tórax', 'cm')
  addMetric('upper-back', sfSubscapular, 'Dobra Subescapular', 'mm')
  if (muscleValues['upper-back']) muscleValues['upper-back'].title = 'Costas Superiores'
  
  addMetric('back-deltoids', sfMidaxillary, 'Dobra Axilar Média', 'mm')
  if (muscleValues['back-deltoids']) muscleValues['back-deltoids'].title = 'Costas / Axilar'

  const modelData = view === 'anterior' ? anteriorData : posteriorData

  const activeData = hoveredKey ? muscleValues[hoveredKey] : null
  const showTooltip = !!(hoveredKey && activeData?.metrics.length)

  // Mapeia qual é a chave do body part baseado no músculo e no lado
  const getBodyPartKey = (muscle: Muscle, side: 'left' | 'right'): string => {
    if (['biceps', 'triceps'].includes(muscle)) return `arm-${side}`
    if (['forearm'].includes(muscle)) return `forearm-${side}`
    if (['quadriceps', 'hamstring'].includes(muscle)) return `thigh-${side}`
    if (['calves', 'left-soleus', 'right-soleus'].includes(muscle)) return `calf-${side}`
    if (['abs', 'obliques', 'lower-back'].includes(muscle)) return 'core'
    return muscle // músculos centrais ou que não precisam separar
  }

  // Lógica Dinâmica de Biotipo (Morphing do SVG)
  type Phenotype = 'definido' | 'magro' | 'normal' | 'sobrepeso' | 'obeso'

  const getPhenotype = (gender: 'M' | 'F' | null, bf?: number | null): Phenotype => {
    if (!bf) return 'normal'
    if (gender === 'F') {
      if (bf < 20) return 'definido'
      if (bf < 24) return 'magro'
      if (bf < 30) return 'normal'
      if (bf < 35) return 'sobrepeso'
      return 'obeso'
    } else {
      if (bf < 12) return 'definido'
      if (bf < 15) return 'magro'
      if (bf < 20) return 'normal'
      if (bf < 25) return 'sobrepeso'
      return 'obeso'
    }
  }

  const phenotype = getPhenotype(props.gender, bodyFat)

  const morphProfiles: Record<Phenotype, {y: number, mult: number}[]> = {
    'normal': [
      { y: 0, mult: 1.0 }, { y: 220, mult: 1.0 }
    ],
    'magro': [
      { y: 0, mult: 0.95 },
      { y: 40, mult: 0.9 }, // ombros menores
      { y: 70, mult: 0.85 }, // cintura bem fina
      { y: 110, mult: 0.9 }, // quadril fino
      { y: 220, mult: 0.9 }
    ],
    'definido': [
      { y: 0, mult: 1.0 },
      { y: 35, mult: 1.15 }, // ombros largos (shape em V)
      { y: 50, mult: 1.1 }, // peitoral largo
      { y: 75, mult: 0.95 }, // cintura fina
      { y: 110, mult: 1.05 }, // coxas fortes
      { y: 220, mult: 1.05 }
    ],
    'sobrepeso': [
      { y: 0, mult: 1.05 }, // rosto levemente mais largo
      { y: 40, mult: 1.1 }, // ombros largos
      { y: 75, mult: 1.25 }, // barriga
      { y: 110, mult: 1.2 }, // quadril largo
      { y: 220, mult: 1.1 }
    ],
    'obeso': [
      { y: 0, mult: 1.1 },
      { y: 40, mult: 1.2 },
      { y: 75, mult: 1.5 }, // barriga grande
      { y: 110, mult: 1.4 }, // quadril muito largo
      { y: 220, mult: 1.2 }
    ]
  }

  const getMultiplier = (y: number, profileName: Phenotype) => {
    const profile = morphProfiles[profileName]
    if (y <= profile[0].y) return profile[0].mult
    if (y >= profile[profile.length - 1].y) return profile[profile.length - 1].mult
    
    for (let i = 0; i < profile.length - 1; i++) {
      const p1 = profile[i]
      const p2 = profile[i + 1]
      if (y >= p1.y && y <= p2.y) {
        const t = (y - p1.y) / (p2.y - p1.y)
        return p1.mult + t * (p2.mult - p1.mult)
      }
    }
    return 1.0
  }

  const applyMorph = (pointsString: string, phenotypeType: Phenotype) => {
    if (phenotypeType === 'normal') return pointsString // sem distorção

    const coords = pointsString.trim().split(/\s+/)
    const newCoords = []
    for (let i = 0; i < coords.length; i += 2) {
      const x = parseFloat(coords[i])
      const y = parseFloat(coords[i+1])
      if (!isNaN(x) && !isNaN(y)) {
        const mult = getMultiplier(y, phenotypeType)
        const newX = 50 + (x - 50) * mult
        newCoords.push(`${newX.toFixed(2)} ${y.toFixed(2)}`)
      }
    }
    return newCoords.join(' ')
  }

  const biotypeLabels: Record<Phenotype, string> = {
    'definido': 'Atleta / Definido',
    'magro': 'Magro / Esbelto',
    'normal': 'Normal',
    'sobrepeso': 'Sobrepeso / Forte',
    'obeso': 'Obeso'
  }

  return (
    <div className="flex flex-col items-center gap-4 select-none w-full max-w-sm mx-auto relative">
      <div className="flex items-center justify-between w-full">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Mapa Corporal 3D — {props.gender === 'F' ? 'Feminino' : 'Masculino'}
          </p>
          {bodyFat && (
            <span className="text-xs font-bold text-primary flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              Biotipo: {biotypeLabels[phenotype]}
            </span>
          )}
        </div>
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
          className="w-full h-auto drop-shadow-lg transition-all duration-700"
          xmlns="http://www.w3.org/2000/svg"
        >
          {modelData.map((part) => {
            return part.svgPoints.map((points, idx) => {
              // Descobre o lado (esquerdo ou direito) baseado no primeiro ponto X
              const firstX = parseFloat(points.split(' ')[0])
              const isImageLeft = firstX < 50
              
              // No Anterior, ImageLeft (< 50) é o Braço DIREITO da pessoa.
              // No Posterior, ImageLeft (< 50) é o Braço ESQUERDO da pessoa.
              const side = view === 'anterior' 
                ? (isImageLeft ? 'right' : 'left') 
                : (isImageLeft ? 'left' : 'right')

              const key = getBodyPartKey(part.muscle, side)
              const data = muscleValues[key]
              const hasData = !!data?.metrics.length
              const isHovered = hoveredKey === key

              let fill = 'hsl(var(--muted) / 0.5)'
              if (hasData) {
                fill = 'hsl(var(--primary) / 0.4)'
              }
              if (isHovered) {
                fill = 'hsl(var(--primary))'
              }

              return (
                <polygon
                  key={`${part.muscle}-${idx}`}
                  points={applyMorph(points, phenotype)}
                  className="transition-all duration-500 ease-out outline-none"
                  style={{
                    fill,
                    cursor: hasData ? 'pointer' : 'default',
                    stroke: isHovered ? 'hsl(var(--primary))' : 'hsl(var(--background))',
                    strokeWidth: isHovered ? 0.5 : 0.2,
                  }}
                  onMouseEnter={() => setHoveredKey(key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                />
              )
            })
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
            {activeData.title}
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
