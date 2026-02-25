// ============================================================================
// EXPERT TRAINING - EVOLUTION API (PER CLIENT)
// ============================================================================
// GET /api/clients/[id]/evolution
// Retorna timeline completa de composição, medidas, e cálculos Juba
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth/protection'
import { calculateJubaMethod, normalizeSex, type JubaComputed, type Sex } from '@/services/jubaMethod'

// ============================================================================
// HELPERS
// ============================================================================

function toNumber(val: any): number | null {
  if (val === null || val === undefined) return null
  const n = typeof val === 'number' ? val : Number(val)
  return isNaN(n) ? null : n
}

function computeFromMetrics(
  bodyMetrics: any,
  gender: string | null,
): JubaComputed | null {
  if (!bodyMetrics) return null
  const weight = toNumber(bodyMetrics.weight)
  const bodyFat = toNumber(bodyMetrics.bodyFat)
  const sex = normalizeSex(gender)
  if (!weight || !bodyFat || !sex) return null
  return calculateJubaMethod({ weight, bodyFatPercent: bodyFat, sex })
}

// ============================================================================
// GET — Client Evolution Data
// ============================================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Auth + studio context
  const auth = await verifyAuth(request, ['STUDIO_ADMIN', 'TRAINER'])
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { studioId, role, userId } = auth
  const clientId = params.id

  try {
    // ========================================================================
    // 1. CLIENT
    // ========================================================================
    const client = await prisma.client.findFirst({
      where: { id: clientId, studioId },
      select: {
        id: true,
        name: true,
        gender: true,
        weight: true,
        height: true,
        bodyFat: true,
        chest: true,
        waist: true,
        hip: true,
        arm: true,
        thigh: true,
        calf: true,
        goalType: true,
        goalWeight: true,
        trainerId: true,
      },
    })

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    // TRAINER vê somente seus clientes
    if (role === 'TRAINER' && client.trainerId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado' },
        { status: 403 }
      )
    }

    // ========================================================================
    // 2. ALL COMPLETED ASSESSMENTS (asc)
    // ========================================================================
    const assessments = await prisma.assessment.findMany({
      where: { clientId, status: 'COMPLETED' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        createdAt: true,
        bodyMetricsJson: true,
        computedJson: true,
        performanceJson: true,
        resultJson: true,
      },
    })

    // ========================================================================
    // 3. BUILD TIMELINE
    // ========================================================================
    const compositionTimeline: any[] = []
    const measuresTimeline: any[] = []

    for (const a of assessments) {
      const bm = a.bodyMetricsJson as any
      if (!bm) continue

      const date = a.createdAt.toISOString().split('T')[0]
      const weight = toNumber(bm.weight)
      const bodyFatPct = toNumber(bm.bodyFat)

      // Try to use stored computedJson, or recalculate
      let computed: JubaComputed | null = a.computedJson as any
      if (!computed && weight && bodyFatPct) {
        computed = computeFromMetrics(bm, client.gender)
      }

      compositionTimeline.push({
        date,
        weight,
        bodyFat: bodyFatPct,
        fatKg: computed?.fatKg ?? null,
        leanKg: computed?.leanKg ?? null,
        ratioCurrent: computed?.ratioCurrent ?? null,
        ratioTarget: computed?.ratioTarget ?? null,
        leanToGainKg: computed?.leanToGainKg ?? null,
      })

      // Measures
      const m = bm.measurements
      if (m) {
        measuresTimeline.push({
          date,
          chest: toNumber(m.chest),
          waist: toNumber(m.waist),
          abdomen: toNumber(m.abdomen),
          hip: toNumber(m.hip),
          arm_right: toNumber(m.arm_right) ?? toNumber(m.arm),
          arm_left: toNumber(m.arm_left),
          thigh_right: toNumber(m.thigh_right) ?? toNumber(m.thigh),
          thigh_left: toNumber(m.thigh_left),
          calf_right: toNumber(m.calf_right) ?? toNumber(m.calf),
          calf_left: toNumber(m.calf_left),
          forearm_right: toNumber(m.forearm_right),
          forearm_left: toNumber(m.forearm_left),
        })
      }
    }

    // ========================================================================
    // 4. LATEST COMPUTED (from last assessment or recalculate)
    // ========================================================================
    let latestComputed: JubaComputed | null = null
    if (assessments.length > 0) {
      const last = assessments[assessments.length - 1]
      latestComputed = (last.computedJson as any) ?? computeFromMetrics(last.bodyMetricsJson, client.gender)
    }

    // ========================================================================
    // 5. SUMMARY (first vs last)
    // ========================================================================
    let summary: any = null
    if (assessments.length >= 1) {
      const first = assessments[0]
      const last = assessments[assessments.length - 1]
      const firstBM = first.bodyMetricsJson as any
      const lastBM = last.bodyMetricsJson as any

      const firstComputed = (first.computedJson as any) ?? computeFromMetrics(firstBM, client.gender)
      const lastComputed = (last.computedJson as any) ?? computeFromMetrics(lastBM, client.gender)

      const delta = (cur: number | null, prev: number | null) => {
        if (cur == null || prev == null) return null
        return Math.round((cur - prev) * 100) / 100
      }

      summary = {
        totalAssessments: assessments.length,
        firstDate: first.createdAt.toISOString(),
        lastDate: last.createdAt.toISOString(),
        daysBetween: Math.round(
          (last.createdAt.getTime() - first.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
        deltas: {
          weight: delta(toNumber(lastBM?.weight), toNumber(firstBM?.weight)),
          bodyFat: delta(toNumber(lastBM?.bodyFat), toNumber(firstBM?.bodyFat)),
          leanKg: delta(lastComputed?.leanKg ?? null, firstComputed?.leanKg ?? null),
          fatKg: delta(lastComputed?.fatKg ?? null, firstComputed?.fatKg ?? null),
        },
        first: {
          weight: toNumber(firstBM?.weight),
          bodyFat: toNumber(firstBM?.bodyFat),
          leanKg: firstComputed?.leanKg ?? null,
          fatKg: firstComputed?.fatKg ?? null,
        },
        last: {
          weight: toNumber(lastBM?.weight),
          bodyFat: toNumber(lastBM?.bodyFat),
          leanKg: lastComputed?.leanKg ?? null,
          fatKg: lastComputed?.fatKg ?? null,
        },
      }
    }

    // ========================================================================
    // 6. PERFORMANCE scores (from latest)
    // ========================================================================
    let performanceScores: any = null
    if (assessments.length > 0) {
      const last = assessments[assessments.length - 1]
      performanceScores = last.performanceJson as any
    }

    // ========================================================================
    // 7. INSIGHTS
    // ========================================================================
    const insights: string[] = []
    if (latestComputed) {
      if (latestComputed.leanToGainKg > 0) {
        insights.push(
          `Foco da fase: ganho de ${latestComputed.leanToGainKg.toFixed(1)} kg de massa magra para acelerar recomposição`
        )
        const { minMonths, maxMonths } = latestComputed.monthsEstimate
        if (minMonths > 0) {
          insights.push(
            `Tempo estimado: ${minMonths}–${maxMonths} meses (metodologia 6–12 meses, mínimo 6)`
          )
        }
      }
      if (latestComputed.ratioCurrent !== null && latestComputed.ratioCurrent >= latestComputed.ratioTarget) {
        insights.push('Estrutura adequada — foco em performance e manutenção')
      }
      if (latestComputed.ratioCurrent !== null && latestComputed.ratioCurrent < 2) {
        insights.push('Proporção muito baixa — priorizar recomposição corporal com urgência')
      }
    }

    if (summary?.deltas?.weight != null && summary.deltas.weight < -2) {
      insights.push(`Perda de ${Math.abs(summary.deltas.weight).toFixed(1)} kg desde a primeira avaliação`)
    }
    if (summary?.deltas?.leanKg != null && summary.deltas.leanKg > 0) {
      insights.push(`Ganho de ${summary.deltas.leanKg.toFixed(1)} kg de massa magra desde o início`)
    }
    if (summary?.deltas?.fatKg != null && summary.deltas.fatKg < 0) {
      insights.push(`Perda de ${Math.abs(summary.deltas.fatKg).toFixed(1)} kg de gordura desde o início`)
    }

    // ========================================================================
    // 8. RESPONSE
    // ========================================================================
    return NextResponse.json({
      success: true,
      data: {
        client: {
          id: client.id,
          name: client.name,
          gender: client.gender,
          goalType: client.goalType,
          goalWeight: toNumber(client.goalWeight),
          currentWeight: toNumber(client.weight),
          currentHeight: toNumber(client.height),
          currentBodyFat: toNumber(client.bodyFat),
        },
        latestComputed,
        compositionTimeline,
        measuresTimeline,
        summary,
        performanceScores,
        insights,
      },
    })
  } catch (error) {
    console.error('Evolution API error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
