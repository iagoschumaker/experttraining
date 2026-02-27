'use client'

// ============================================================================
// EXPERT TRAINING - CLIENT BODY COMPOSITION
// ============================================================================
// Composição corporal calculada em tempo real direto do cadastro do aluno.
// Mostra % gordura atual vs ideal, peso gordo, peso magro, relação gordura:músculo
// com gráficos Recharts. Atualiza automaticamente via props.
// ============================================================================

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Flame, Dumbbell, Target, Scale, Activity } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface ClientBodyCompositionProps {
  weight: number | null
  bodyFat: number | null
  gender: string | null
  height: number | null
}

// ============================================================================
// CONSTANTS
// ============================================================================

const RATIO_TARGET: Record<string, number> = { M: 6, F: 4 }

// % gordura alvo pelo método Juba (derivado do ratio)
// ratio 6:1 → fat% = 1/(6+1)*100 = 14.3%
// ratio 4:1 → fat% = 1/(4+1)*100 = 20.0%
function getIdealFatPercent(gender: string | null): number | null {
  if (!gender || (gender !== 'M' && gender !== 'F')) return null
  const ratio = RATIO_TARGET[gender]
  return parseFloat((100 / (ratio + 1)).toFixed(1))
}

function round(v: number, d = 1) {
  return parseFloat(v.toFixed(d))
}

// ============================================================================
// CUSTOM PIE LABEL
// ============================================================================

function PieLabel({
  cx, cy, midAngle, innerRadius, outerRadius, percent, name,
}: any) {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight="bold">
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ClientBodyComposition({ weight, bodyFat, gender, height }: ClientBodyCompositionProps) {
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
  const ratioTarget = gender === 'M' || gender === 'F' ? RATIO_TARGET[gender] : null
  const ratioCurrent = fatKg > 0 ? round(leanKg / fatKg) : null
  const idealFatPercent = getIdealFatPercent(gender)

  // Ideal baseado no ratio (massa gorda atual projeta a ideal massa magra)
  const idealLeanKg = ratioTarget ? round(fatKg * ratioTarget) : null
  const idealFatKg = ratioTarget ? round(weight / (ratioTarget + 1)) : null
  const idealLeanFromWeight = ratioTarget ? round((weight * ratioTarget) / (ratioTarget + 1)) : null

  // IMC
  const bmi = height ? round(weight / ((height / 100) ** 2)) : null

  // -------------------------------------------------------------------------
  // Dados para PieChart — composição atual
  const pieData = [
    { name: 'Massa Gorda', value: fatKg, color: '#ef4444' },
    { name: 'Massa Magra', value: leanKg, color: '#06b6d4' },
  ]

  // Dados para BarChart — atual vs ideal
  const barData = ratioTarget
    ? [
        {
          name: 'Gordura',
          Atual: fatKg,
          Ideal: idealFatKg ?? 0,
          unit: 'kg',
        },
        {
          name: 'Massa Magra',
          Atual: leanKg,
          Ideal: idealLeanFromWeight ?? 0,
          unit: 'kg',
        },
      ]
    : []

  // Status do ratio
  const ratioOk = ratioCurrent != null && ratioTarget != null && ratioCurrent >= ratioTarget
  const ratioProgress = ratioCurrent != null && ratioTarget != null
    ? Math.min(100, Math.round((ratioCurrent / ratioTarget) * 100))
    : null

  // -------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* ──────────────────────── STAT CARDS ──────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* % Gordura Atual */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">% Gordura</p>
                <p className="text-2xl font-bold text-red-400">{bodyFat.toFixed(1)}%</p>
                {idealFatPercent && (
                  <p className="text-xs text-muted-foreground">Alvo: {idealFatPercent}%</p>
                )}
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
                {idealFatKg && (
                  <p className="text-xs text-muted-foreground">Ideal: {idealFatKg.toFixed(1)} kg</p>
                )}
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
                {idealLeanFromWeight && (
                  <p className="text-xs text-muted-foreground">Ideal: {idealLeanFromWeight.toFixed(1)} kg</p>
                )}
              </div>
              <div className="rounded-lg bg-cyan-500/10 p-2">
                <Dumbbell className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Relação Gordura:Músculo */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Relação M:G</p>
                <p className={`text-2xl font-bold ${ratioOk ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {ratioCurrent != null ? `${ratioCurrent.toFixed(1)}:1` : '—'}
                </p>
                {ratioTarget && (
                  <p className="text-xs text-muted-foreground">Alvo: {ratioTarget}:1</p>
                )}
              </div>
              <div className={`rounded-lg p-2 ${ratioOk ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                <Target className={`h-5 w-5 ${ratioOk ? 'text-emerald-400' : 'text-amber-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ──────────────── CHARTS ROW ──────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* PieChart — Composição atual */}
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
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--card-foreground))',
                  }}
                  formatter={(value: number | undefined) => value != null ? [`${value.toFixed(1)} kg`] : ['—']}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legenda manual */}
            <div className="flex justify-center gap-6 mt-1 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
                <span>Gorda {fatKg.toFixed(1)} kg</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" />
                <span>Magra {leanKg.toFixed(1)} kg</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BarChart — Atual vs Ideal */}
        {barData.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Atual vs Ideal (Método Expert)
                </CardTitle>
                {gender && (
                  <Badge variant="outline" className="text-xs">
                    Alvo {RATIO_TARGET[gender]}:1
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" unit=" kg" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--card-foreground))',
                    }}
                    formatter={(v: number | undefined) => v != null ? `${v.toFixed(1)} kg` : '—'}
                  />
                  <Legend />
                  <Bar dataKey="Atual" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ideal" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          /* Se sem gênero, mostra apenas BMI + aviso */
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Dados Adicionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {bmi && (
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
                  <span className="text-sm font-medium">IMC</span>
                  <span className="text-xl font-bold">{bmi}</span>
                </div>
              )}
              <p className="text-xs text-amber-500 text-center">
                ⚠️ Defina o gênero no cadastro para ver o comparativo Atual vs Ideal (Expert Method)
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ──────────────── PROGRESSO DO RATIO ──────────────── */}
      {ratioProgress != null && ratioTarget != null && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Progresso até o Ratio Alvo ({ratioTarget}:1 — Método Expert)
              </span>
              <span className={`text-sm font-bold ${ratioOk ? 'text-emerald-400' : 'text-amber-400'}`}>
                {ratioProgress}%
                {ratioOk && ' ✓'}
              </span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${ratioOk ? 'bg-emerald-400' : 'bg-amber-400'}`}
                style={{ width: `${Math.min(ratioProgress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0:1</span>
              <span>
                {ratioCurrent != null && `Atual: ${ratioCurrent.toFixed(1)}:1`}
              </span>
              <span>Alvo: {ratioTarget}:1</span>
            </div>
            {!ratioOk && ratioCurrent != null && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Precisa ganhar {round(Math.max(0, idealLeanFromWeight! - leanKg)).toFixed(1)} kg de massa magra para atingir o alvo
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* IMC — se tiver gênero (já exibido no bar chart acima, aqui é extra info) */}
      {bmi && gender && (
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
