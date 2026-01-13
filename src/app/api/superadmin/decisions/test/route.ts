// ============================================================================
// EXPERT TRAINING - SUPERADMIN DECISIONS TEST API
// ============================================================================
// POST /api/superadmin/decisions/test - Testa motor de decisão com dados simulados
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken, getAccessTokenCookie } from '@/lib/auth'

// Middleware to check superadmin
async function verifySuperAdmin() {
  const accessToken = await getAccessTokenCookie()
  
  if (!accessToken) {
    return { error: 'Não autenticado', status: 401 }
  }

  const payload = verifyAccessToken(accessToken)
  
  if (!payload || !payload.isSuperAdmin) {
    return { error: 'Acesso negado - Apenas SuperAdmin', status: 403 }
  }

  return { payload }
}

// POST - Test decision engine
export async function POST(request: NextRequest) {
  const auth = await verifySuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const { level, movementScores, painMap, complaints } = body

    // Simular processamento do motor de decisão
    const startTime = Date.now()

    // Análise de padrão de movimento
    const avgMovementScore = Object.values(movementScores as Record<string, number>).reduce((sum: number, score) => sum + score, 0) / Object.keys(movementScores).length

    // Análise de dor
    const painRegions = Object.entries(painMap as Record<string, number>).filter(([_, intensity]) => intensity > 0)
    const avgPainIntensity = painRegions.length > 0
      ? painRegions.reduce((sum, [_, intensity]) => sum + intensity, 0) / painRegions.length
      : 0

    // Determinar padrão funcional baseado nos scores
    let functionalPattern = 'BALANCED'
    const patterns = Object.entries(movementScores as Record<string, number>)
    const weakestPattern = patterns.reduce((min, curr) => curr[1] < min[1] ? curr : min)
    
    if (weakestPattern[1] <= 1) {
      functionalPattern = weakestPattern[0].toUpperCase()
    }

    // Calcular confiança
    let confidence = 0.6 // Base

    // Ajustar por nível
    if (level === 'BEGINNER') confidence *= 0.9
    else if (level === 'INTERMEDIATE') confidence *= 1.0
    else if (level === 'ADVANCED') confidence *= 1.1

    // Ajustar por qualidade dos dados
    if (avgMovementScore >= 2) confidence += 0.1
    if (avgMovementScore >= 2.5) confidence += 0.1

    // Reduzir confiança se houver muita dor
    if (avgPainIntensity > 5) confidence -= 0.15
    else if (avgPainIntensity > 3) confidence -= 0.1

    // Limitar confiança entre 0 e 1
    confidence = Math.max(0.3, Math.min(0.95, confidence))

    const processingTime = Date.now() - startTime

    // Gerar recomendações baseadas na análise
    const recommendations = []
    
    if (avgMovementScore < 2) {
      recommendations.push('Foco em condicionamento e padrões básicos')
    }
    
    if (painRegions.length > 0) {
      recommendations.push(`Atenção às regiões: ${painRegions.map(([region]) => region).join(', ')}`)
    }
    
    if (avgPainIntensity > 5) {
      recommendations.push('Evitar exercícios de alto impacto')
    }

    if (weakestPattern[1] <= 1) {
      recommendations.push(`Trabalhar padrão ${weakestPattern[0]}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        functionalPattern,
        confidence,
        processingTime,
        analysis: {
          avgMovementScore: avgMovementScore.toFixed(2),
          avgPainIntensity: avgPainIntensity.toFixed(2),
          painRegions: painRegions.length,
          weakestPattern: weakestPattern[0],
        },
        recommendations,
        suggestedBlocks: [
          'Condicionamento Geral',
          'Mobilidade Articular',
          'Fortalecimento Core',
        ],
      },
    })
  } catch (error) {
    console.error('Error testing decision engine:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao testar motor de decisão' },
      { status: 500 }
    )
  }
}
