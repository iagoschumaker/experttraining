'use client'

// ============================================================================
// EXPERT TRAINING - CLIENT BODY COMPOSITION
// ============================================================================
// Composição corporal calculada em tempo real direto do cadastro do aluno.
// Mostra % gordura, peso gordo, peso magro com gráfico PieChart e IMC.
// Atualiza automaticamente via props.
// ============================================================================

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Flame, Dumbbell, Scale, Activity } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface ClientBodyCompositionProps {
  weight: number | null
  bodyFat: number | null
  height: number | null
}

// ============================================================================
// HELPERS
// ============================================================================

function round(v: number, d = 1) {
  return parseFloat(v.toFixed(d))
}

// ============================================================================
// CUSTOM PIE LABEL
// ============================================================================

function PieLabel({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: any) {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={13}
      fontWeight="bold"
      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  )
}

// Tooltip styling reutilizável — respeita tema claro/escuro
const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--card-foreground))',
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ClientBodyComposition({ weight, bodyFat, height }: ClientBodyCompositionProps) {
  // Precisamos ao menos de peso + % gordura
  if (!weight || !bodyFat || weight <= 0 || bodyFat <= 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5 text-amber-500" />
            Composição Corporal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Preencha <strong>peso</strong> e <strong>% gordura corporal</strong> no cadastro para calcular a composição automaticamente.
          </p>
        </CardContent>
      </Card>
    )
  }

  // Cálculos principais
  const fatKg = round(weight * (bodyFat / 100))
  const leanKg = round(weight - fatKg)
  const leanPercent = round(100 - bodyFat)

  // IMC
  const bmi = height ? round(weight / ((height / 100) ** 2)) : null

  // -------------------------------------------------------------------------
  // Dados para PieChart — usa percentuais para exibição exata no label
  const pieData = [
    { name: 'Massa Gorda', value: bodyFat, kg: fatKg, color: '#ef4444' },
    { name: 'Massa Magra', value: leanPercent, kg: leanKg, color: '#06b6d4' },
  ]

  // -------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* ──────────────────────── STAT CARDS ──────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {/* % Gordura Atual */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">% Gordura</p>
                <p className="text-2xl font-bold text-red-400">{bodyFat.toFixed(1)}%</p>
              </div>
              <div className="rounded-lg bg-red-500/10 p-2">
                <Flame className="h-5 w-5 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Massa Gorda */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Peso Gordo</p>
                <p className="text-2xl font-bold text-orange-400">{fatKg.toFixed(1)} <span className="text-sm font-normal">kg</span></p>
              </div>
              <div className="rounded-lg bg-orange-500/10 p-2">
                <Scale className="h-5 w-5 text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Massa Magra */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Peso Magro</p>
                <p className="text-2xl font-bold text-cyan-400">{leanKg.toFixed(1)} <span className="text-sm font-normal">kg</span></p>
              </div>
              <div className="rounded-lg bg-cyan-500/10 p-2">
                <Dumbbell className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ──────────────── PIE CHART ──────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Composição Atual ({weight} kg)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                dataKey="value"
                labelLine={false}
                label={PieLabel}
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: 'hsl(var(--card-foreground))' }}
                itemStyle={{ color: 'hsl(var(--card-foreground))' }}
                formatter={(_value: any, _name: any, props: any) => {
                  const entry = props.payload
                  return [`${entry.kg.toFixed(1)} kg (${Number(entry.value).toFixed(1)}%)`, entry.name]
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Legenda manual */}
          <div className="flex justify-center gap-6 mt-1 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
              <span>Gorda {fatKg.toFixed(1)} kg ({bodyFat.toFixed(1)}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" />
              <span>Magra {leanKg.toFixed(1)} kg ({leanPercent.toFixed(1)}%)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ──────────────── IMC ──────────────── */}
      {bmi && (
        <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-4 py-2 text-sm">
          <span className="text-muted-foreground">IMC:</span>
          <span className="font-bold">{bmi}</span>
          <Badge variant="outline" className="text-xs">
            {bmi < 18.5 ? 'Abaixo do peso' :
              bmi < 25 ? 'Peso normal' :
              bmi < 30 ? 'Sobrepeso' :
              bmi < 35 ? 'Obesidade I' :
              bmi < 40 ? 'Obesidade II' : 'Obesidade III'}
          </Badge>
        </div>
      )}
    </div>
  )
}
