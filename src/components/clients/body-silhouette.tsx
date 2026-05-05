'use client'

// ============================================================================
// BODY SILHOUETTE — SVG com anotações de medidas corporais
// Masculino ou Feminino baseado no gênero do aluno
// ============================================================================

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

interface Hotspot {
  cx: number
  cy: number
  label: string
  value: number | null | undefined
  unit: string
  side: 'left' | 'right' | 'center'
  color: string
}

export function BodySilhouette({
  gender,
  chest, waist, hip, abdomen,
  armRight, armLeft,
  forearmRight, forearmLeft,
  thighRight, thighLeft,
  calfRight, calfLeft,
}: BodySilhouetteProps) {
  const isFemale = gender === 'F'

  // Hotspots — posições sobre o SVG (viewBox 200 x 500)
  const hotspots: Hotspot[] = [
    // Centro do corpo
    { cx: 100, cy: 118, label: 'Peitoral', value: chest, unit: 'cm', side: 'right', color: '#3b82f6' },
    { cx: 100, cy: 148, label: 'Abdômen', value: abdomen, unit: 'cm', side: 'left', color: '#6366f1' },
    { cx: 100, cy: 172, label: 'Cintura', value: waist, unit: 'cm', side: 'right', color: '#a855f7' },
    { cx: 100, cy: 210, label: 'Quadril', value: hip, unit: 'cm', side: 'left', color: '#ec4899' },
    // Lado direito (anatomicamente) = lado esquerdo na tela
    { cx: 70, cy: 130, label: 'Braço D', value: armRight, unit: 'cm', side: 'left', color: '#06b6d4' },
    { cx: 57, cy: 172, label: 'Anteb. D', value: forearmRight, unit: 'cm', side: 'left', color: '#14b8a6' },
    { cx: 78, cy: 275, label: 'Coxa D', value: thighRight, unit: 'cm', side: 'left', color: '#10b981' },
    { cx: 80, cy: 355, label: 'Pant. D', value: calfRight, unit: 'cm', side: 'left', color: '#22c55e' },
    // Lado esquerdo (anatomicamente) = lado direito na tela
    { cx: 130, cy: 130, label: 'Braço E', value: armLeft, unit: 'cm', side: 'right', color: '#06b6d4' },
    { cx: 143, cy: 172, label: 'Anteb. E', value: forearmLeft, unit: 'cm', side: 'right', color: '#14b8a6' },
    { cx: 122, cy: 275, label: 'Coxa E', value: thighLeft, unit: 'cm', side: 'right', color: '#10b981' },
    { cx: 120, cy: 355, label: 'Pant. E', value: calfLeft, unit: 'cm', side: 'right', color: '#22c55e' },
  ]

  // Paths SVG — silhueta humana simplificada vista de frente
  // Masculino: ombros largos, quadril estreito
  // Feminino: ombros menores, quadril mais largo, cintura marcada
  const bodyPath = isFemale ? `
    M 100,20
    C 100,20 82,22 78,40
    C 74,58 72,62 72,70
    C 72,78 68,82 64,88
    C 58,92 50,95 46,102
    C 42,110 42,120 44,128
    C 46,136 52,140 56,148
    C 58,154 58,162 56,172
    C 52,188 48,200 46,218
    C 44,236 46,252 52,260
    C 58,268 68,272 76,278
    C 80,290 80,310 78,326
    C 76,342 72,356 70,372
    C 68,388 68,400 70,408
    C 72,416 76,420 80,420
    C 84,420 86,416 86,408
    C 86,400 84,388 84,372
    C 84,356 86,342 88,326
    C 90,310 92,290 92,275
    L 92,268
    L 108,268
    L 108,275
    C 108,290 110,310 112,326
    C 114,342 116,356 116,372
    C 116,388 114,400 114,408
    C 114,416 118,420 122,420
    C 126,420 130,416 130,408
    C 132,400 132,388 130,372
    C 128,356 124,342 122,326
    C 120,310 120,290 124,278
    C 132,272 142,268 148,260
    C 154,252 156,236 154,218
    C 152,200 148,188 144,172
    C 142,162 142,154 144,148
    C 148,140 154,136 156,128
    C 158,120 158,110 154,102
    C 150,95 142,92 136,88
    C 132,82 128,78 128,70
    C 128,62 126,58 122,40
    C 118,22 100,20 100,20 Z
  ` : `
    M 100,20
    C 100,20 80,22 76,40
    C 72,58 70,62 70,70
    C 70,78 64,82 58,88
    C 50,92 40,95 36,104
    C 32,114 32,124 36,132
    C 40,140 48,144 52,152
    C 54,158 54,166 52,174
    C 48,190 44,206 44,220
    C 44,234 48,246 56,254
    C 64,262 74,266 80,272
    C 80,288 78,308 76,324
    C 74,340 70,356 68,372
    C 66,388 66,400 68,408
    C 70,416 74,420 78,420
    C 82,420 84,416 84,408
    C 84,400 82,388 82,372
    C 82,356 84,340 86,324
    C 88,308 90,288 90,272
    L 90,264
    L 110,264
    L 110,272
    C 110,288 112,308 114,324
    C 116,340 118,356 118,372
    C 118,388 116,400 116,408
    C 116,416 120,420 124,420
    C 128,420 132,416 132,408
    C 134,400 134,388 132,372
    C 130,356 126,340 124,324
    C 122,308 120,288 120,272
    C 126,266 136,262 144,254
    C 152,246 156,234 156,220
    C 156,206 152,190 148,174
    C 146,166 146,158 148,152
    C 152,144 160,140 164,132
    C 168,124 168,114 164,104
    C 160,95 150,92 142,88
    C 136,82 130,78 130,70
    C 130,62 128,58 124,40
    C 120,22 100,20 100,20 Z
  `

  const hasAnyMeasure = hotspots.some(h => h.value)

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        Mapa Corporal — {isFemale ? 'Feminino' : 'Masculino'}
      </p>
      <div className="relative">
        <svg
          viewBox="0 0 200 440"
          className="w-full max-w-[200px] mx-auto"
          style={{ height: 'auto' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Cabeça */}
          <ellipse
            cx="100" cy="32" rx={isFemale ? 18 : 20} ry="22"
            fill="hsl(var(--muted) / 0.4)"
            stroke="hsl(var(--border))"
            strokeWidth="1"
          />

          {/* Pescoço */}
          <rect
            x={isFemale ? 93 : 91} y="52" width={isFemale ? 14 : 18} height="16"
            rx="4"
            fill="hsl(var(--muted) / 0.4)"
            stroke="hsl(var(--border))"
            strokeWidth="1"
          />

          {/* Corpo principal */}
          <path
            d={bodyPath}
            fill="hsl(var(--muted) / 0.35)"
            stroke="hsl(var(--border))"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />

          {/* Linha divisória pernas */}
          <line
            x1={isFemale ? 100 : 100} y1={isFemale ? 266 : 264}
            x2={isFemale ? 100 : 100} y2={isFemale ? 340 : 340}
            stroke="hsl(var(--border))"
            strokeWidth="0.8"
            strokeDasharray="3 2"
          />

          {/* Hotspots com linhas de anotação */}
          {hotspots.map((h) => {
            const hasValue = h.value != null && h.value > 0
            const lineLen = 38
            const lineX2 = h.side === 'right' ? h.cx + lineLen : h.cx - lineLen
            const textAnchor = h.side === 'right' ? 'start' : 'end'
            const textX = h.side === 'right' ? lineX2 + 2 : lineX2 - 2

            if (!hasValue) {
              // Marcador fantasma quando sem valor
              return (
                <circle
                  key={h.label}
                  cx={h.cx} cy={h.cy} r="3.5"
                  fill="hsl(var(--muted) / 0.3)"
                  stroke="hsl(var(--border))"
                  strokeWidth="0.8"
                />
              )
            }

            return (
              <g key={h.label}>
                {/* Linha de anotação */}
                <line
                  x1={h.cx} y1={h.cy}
                  x2={lineX2} y2={h.cy}
                  stroke={h.color}
                  strokeWidth="0.8"
                  strokeOpacity="0.7"
                />
                {/* Ponto */}
                <circle
                  cx={h.cx} cy={h.cy} r="4"
                  fill={h.color}
                  fillOpacity="0.9"
                />
                <circle
                  cx={h.cx} cy={h.cy} r="2"
                  fill="white"
                  fillOpacity="0.6"
                />
                {/* Label */}
                <text
                  x={textX} y={h.cy - 3}
                  fontSize="6.5"
                  fill={h.color}
                  textAnchor={textAnchor}
                  fontFamily="system-ui, sans-serif"
                  fontWeight="600"
                >
                  {h.label}
                </text>
                {/* Valor */}
                <text
                  x={textX} y={h.cy + 6}
                  fontSize="7.5"
                  fill="hsl(var(--foreground))"
                  textAnchor={textAnchor}
                  fontFamily="system-ui, sans-serif"
                  fontWeight="700"
                >
                  {Number(h.value).toFixed(1)}{h.unit}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {!hasAnyMeasure && (
        <p className="text-[10px] text-muted-foreground text-center px-2">
          Preencha as circunferências para visualizar o mapa corporal
        </p>
      )}
    </div>
  )
}
