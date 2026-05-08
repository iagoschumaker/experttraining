// ============================================================================
// PDF GENERATOR — SINGLE A4 PAGE
// Three pillar columns + rotation & progression tables — all on one page
// ============================================================================

export async function generateWorkoutPDF(workout: any, schedule: any) {
  const freq = workout.weeklyFrequency || 3
  const studioName = workout.studio?.name || 'Studio'
  const studioLogo = workout.studio?.logoUrl || ''
  const studioPhone = workout.studio?.phone || ''
  const studioEmail = workout.studio?.email || ''

  let logoBase64 = ''
  if (studioLogo) {
    try {
      const response = await fetch(studioLogo)
      const blob = await response.blob()
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
    } catch (e) {
      console.error('Erro ao converter logo:', e)
    }
  }

  const pColor = (p: string) => p === 'LOWER' ? '#b45309' : p === 'PUSH' ? '#1d4ed8' : '#7c3aed'
  const pBg = (p: string) => p === 'LOWER' ? '#fef3c7' : p === 'PUSH' ? '#dbeafe' : '#ede9fe'
  const pBorder = (p: string) => p === 'LOWER' ? '#fcd34d' : p === 'PUSH' ? '#93c5fd' : '#c4b5fd'

  // Exercise row
  const exRow = (ex: any) => {
    const l = ex.role === 'FOCO_PRINCIPAL' ? 'F' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? 'S' : 'C'
    const bg = ex.role === 'FOCO_PRINCIPAL' ? '#ffedd5' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? '#f3e8ff' : '#dcfce7'
    const tc = ex.role === 'FOCO_PRINCIPAL' ? '#c2410c' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? '#7c3aed' : '#15803d'
    const tech = ex.technique ? ` <span style="font-size:5pt;background:#fee2e2;color:#dc2626;padding:0.2mm 0.8mm;border-radius:0.4mm;font-weight:600">${ex.technique}</span>` : ''
    return `<div style="display:flex;align-items:center;padding:1mm 1.5mm;border-bottom:0.3px solid #f0f0f0;gap:1mm;font-size:6.5pt;line-height:1.3">
      <span style="width:4mm;height:4mm;font-size:5pt;font-weight:700;display:inline-flex;align-items:center;justify-content:center;border-radius:0.5mm;flex-shrink:0;background:${bg};color:${tc}">${l}</span>
      <span style="flex:1;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ex.name}${tech}</span>
      <span style="flex-shrink:0;color:#555;font-size:5.5pt">${ex.sets}×${ex.reps}</span>
      <span style="flex-shrink:0;color:#d97706;font-size:5pt;margin-left:0.5mm">${ex.rest || ''}</span>
    </div>`
  }

  // Preparation
  const genPrep = (prep: any) => {
    if (!prep?.exercises || prep.exercises.length === 0) return ''
    return `<div style="background:#fffbeb;border:0.5px solid #fcd34d;border-radius:1mm;padding:1.5mm;margin-bottom:1.5mm">
      <div style="font-size:6pt;font-weight:600;color:#b45309;margin-bottom:0.5mm">Preparação <span style="font-weight:400">${prep.totalTime || ''}</span></div>
      <div style="font-size:5.5pt;color:#78716c">
        ${prep.exercises.map((ex: any) =>
          `<div style="display:flex;justify-content:space-between;padding:0.4mm 0"><span>${ex.name}</span><span>${ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.duration || ''}</span></div>`
        ).join('')}
      </div>
    </div>`
  }

  // Block
  const genBlock = (b: any, idx: number) => `
    <div style="border:0.5px solid #93c5fd;border-radius:1mm;margin-bottom:1.5mm;overflow:hidden">
      <div style="background:#eff6ff;padding:1mm 1.5mm;font-size:6pt;font-weight:600;color:#1e40af;display:flex;justify-content:space-between">
        <span>${b.name || `Bloco ${idx + 1}`}</span><span style="color:#3b82f6;font-weight:400;font-size:5pt">${b.restAfterBlock || ''}</span>
      </div>
      ${b.exercises?.map((e: any) => exRow(e)).join('') || ''}
    </div>`

  // Protocol
  const genProt = (p: any) => {
    if (!p) return ''
    return `<div style="background:#ecfdf5;border:0.5px solid #6ee7b7;border-radius:1mm;padding:1mm 1.5mm;font-size:6pt;color:#047857;margin-top:1mm">
      <b>${p.name || ''}</b> ${p.totalTime || ''} ${p.structure ? `<div style="font-size:5pt;color:#6b7280;margin-top:0.5mm">${p.structure}</div>` : ''}
    </div>`
  }

  // Get unique pillars
  const week1 = schedule.weeks?.[0]
  if (!week1) return

  const pillarSessions: Record<string, any> = {}
  week1.sessions?.forEach((s: any) => {
    const key = s.pillar || 'UNKNOWN'
    if (!pillarSessions[key]) pillarSessions[key] = s
  })

  const numPillars = Object.keys(pillarSessions).length

  // Normalize session to unified format for PDF rendering
  const normalizeSession = (session: any) => {
    const isNew = !!session.treino
    const treino = isNew ? session.treino : null
    const blocos = isNew ? (treino?.blocos || []) : (session.blocks || [])
    const prep = session.preparation
    const rawProtocol = isNew ? treino?.protocoloFinal : session.finalProtocol
    const protocol = rawProtocol
      ? (typeof rawProtocol === 'string'
          ? { name: 'Protocolo Final', structure: rawProtocol, totalTime: '' }
          : rawProtocol)
      : null
    const pillarLabel = isNew
      ? (treino?.pillarLabel || session.pillarLabel || session.pillar)
      : (session.pillarLabel || session.pillar)

    // Normalize prep exercises
    const prepExercises = (prep?.exercises || []).map((ex: any) => ({
      name: typeof ex === 'string' ? ex : ex.name,
      detail: typeof ex === 'string' ? '' : (ex.detail || (ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.duration || '')),
    }))

    // Normalize blocks
    const normBlocos = blocos.map((b: any) => ({
      name: b.name,
      restAfterBlock: b.restAfterBlock || '',
      exercises: (b.exercises || []).map((ex: any, i: number) => {
        if (isNew) {
          // New: {name, reps (string), load}
          const roles = ['FOCO_PRINCIPAL', 'SECUNDARIO', 'CORE_STABILITY']
          return { name: ex.name, role: roles[i] || 'CORE_STABILITY', sets: '', reps: ex.reps || '', rest: ex.load || '', weight: ex.weight }
        }
        return { name: ex.name, role: ex.role, sets: ex.sets, reps: ex.reps, rest: ex.rest, weight: ex.weight }
      }),
    }))

    return { pillarLabel, prep: prep ? { ...prep, exercises: prepExercises } : null, blocos: normBlocos, protocol, estimatedDuration: session.estimatedDuration }
  }

  // Pillar cards in grid
  const pillarGrid = `<div style="display:grid;grid-template-columns:repeat(${numPillars}, 1fr);gap:3mm;align-items:start">
    ${Object.entries(pillarSessions).map(([pillar, session]: [string, any]) => {
    const norm = normalizeSession(session)
    return `
    <div style="border:1px solid ${pBorder(pillar)};border-radius:2mm;overflow:hidden">
      <div style="background:${pBg(pillar)};padding:2mm 3mm;border-bottom:0.5px solid ${pBorder(pillar)};display:flex;align-items:center;gap:2mm">
        <span style="font-size:9pt;font-weight:700;color:${pColor(pillar)}">${norm.pillarLabel}</span>
        <span style="font-size:6pt;color:#666;margin-left:auto">${norm.estimatedDuration || 60} min</span>
      </div>
      <div style="padding:2mm">
        ${norm.prep ? `<div style="background:#fffbeb;border:0.5px solid #fcd34d;border-radius:1mm;padding:1.5mm;margin-bottom:1.5mm">
          <div style="font-size:6pt;font-weight:600;color:#b45309;margin-bottom:0.5mm">Preparação <span style="font-weight:400">${norm.prep.totalTime || ''}</span></div>
          <div style="font-size:5.5pt;color:#78716c">
            ${norm.prep.exercises.map((ex: any) => `<div style="display:flex;justify-content:space-between;padding:0.4mm 0"><span>${ex.name}</span><span>${ex.detail || ''}</span></div>`).join('')}
          </div>
        </div>` : ''}
        ${norm.blocos.map((b: any, i: number) => genBlock(b, i)).join('')}
        ${genProt(norm.protocol)}
      </div>
    </div>`
  }).join('')}
  </div>`

  // Rotation table — compact
  const allWeeks = schedule.weeks || []
  const rotTable = `<div>
    <div style="font-size:8pt;font-weight:700;margin-bottom:2mm">🔄 Rotação Semanal</div>
    <table style="width:100%;border-collapse:collapse;font-size:7pt">
      <tr style="background:#f8fafc">
        <th style="padding:1.5mm 2mm;text-align:left;border-bottom:1px solid #e5e5e5;font-weight:700">Sem</th>
        ${week1.sessions.map((_: any, i: number) => `<th style="padding:1.5mm;text-align:center;border-bottom:1px solid #e5e5e5">Dia ${i + 1}</th>`).join('')}
      </tr>
      ${allWeeks.map((w: any) => `<tr>
        <td style="padding:1.2mm 2mm;font-weight:600;border-bottom:0.5px solid #eee">${w.week}</td>
        ${w.sessions.map((s: any) => `<td style="padding:1.2mm;text-align:center;border-bottom:0.5px solid #eee">
          <span style="background:${pBg(s.pillar)};color:${pColor(s.pillar)};padding:0.5mm 2mm;border-radius:0.5mm;font-weight:600;font-size:6pt">${s.pillarLabel || ''}</span>
        </td>`).join('')}
      </tr>`).join('')}
    </table>
  </div>`

  // Progression table — compact
  const progTable = `<div>
    <div style="font-size:8pt;font-weight:700;margin-bottom:2mm">📊 Progressão Semanal</div>
    <table style="width:100%;border-collapse:collapse;font-size:7pt">
      <tr style="background:#f8fafc">
        <th style="padding:1.5mm 2mm;text-align:left;border-bottom:1px solid #e5e5e5">Sem</th>
        <th style="padding:1.5mm;text-align:left;border-bottom:1px solid #e5e5e5">Fase</th>
        <th style="padding:1.5mm;text-align:left;border-bottom:1px solid #e5e5e5;color:#c2410c">Foco(F)</th>
        <th style="padding:1.5mm;text-align:left;border-bottom:1px solid #e5e5e5;color:#7c3aed">Sec(S)</th>
        <th style="padding:1.5mm;text-align:left;border-bottom:1px solid #e5e5e5;color:#15803d">Core(C)</th>
        <th style="padding:1.5mm;text-align:left;border-bottom:1px solid #e5e5e5;color:#d97706">Descanso</th>
        <th style="padding:1.5mm;text-align:left;border-bottom:1px solid #e5e5e5;color:#047857">Protocolo</th>
      </tr>
      ${allWeeks.map((w: any) => {
        const s = w.sessions?.[0]
        const isNew = !!s?.treino
        let fReps = '', sReps = '', cReps = '', fRest = '', protName = ''
        if (isNew) {
          const b0 = s?.treino?.blocos?.[0]?.exercises || []
          fReps = b0[0]?.reps || ''; sReps = b0[1]?.reps || ''; cReps = b0[2]?.reps || ''
          fRest = b0[0]?.load || ''
          const rawP = s?.treino?.protocoloFinal
          protName = typeof rawP === 'string' ? 'Protocolo Final' : (rawP?.name || '')
        } else {
          const fEx = s?.blocks?.[0]?.exercises?.[0]
          const sEx = s?.blocks?.[0]?.exercises?.find((e: any) => e.role === 'SECUNDARIO' || e.role === 'PUSH_PULL_INTEGRADO')
          const cEx = s?.blocks?.[0]?.exercises?.find((e: any) => e.role === 'CORE_STABILITY')
          fReps = fEx ? `${fEx.sets}×${fEx.reps}` : ''; sReps = sEx ? `${sEx.sets}×${sEx.reps}` : ''
          cReps = cEx ? `${cEx.sets}×${cEx.reps}` : ''; fRest = fEx?.rest || ''
          protName = s?.finalProtocol?.name || ''
        }
        return `<tr>
          <td style="padding:1.2mm 2mm;font-weight:600;border-bottom:0.5px solid #eee">${w.week}</td>
          <td style="padding:1.2mm;border-bottom:0.5px solid #eee;color:#666">${w.phaseLabel || ''}</td>
          <td style="padding:1.2mm;border-bottom:0.5px solid #eee"><b style="color:#c2410c">${fReps}</b></td>
          <td style="padding:1.2mm;border-bottom:0.5px solid #eee;color:#7c3aed">${sReps}</td>
          <td style="padding:1.2mm;border-bottom:0.5px solid #eee;color:#15803d">${cReps}</td>
          <td style="padding:1.2mm;border-bottom:0.5px solid #eee;color:#d97706">${fRest}</td>
          <td style="padding:1.2mm;border-bottom:0.5px solid #eee;color:#047857">${protName}</td>
        </tr>`
      }).join('')}
    </table>
  </div>`

  // Put rotation + progression side by side
  const bottomGrid = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:3mm">${rotTable}${progTable}</div>`

  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Treino ${workout.client.name}</title>
<style>
@page{size:A4 portrait;margin:6mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:6pt;color:#1a1a1a;line-height:1.3;background:#fff;height:100vh;display:flex;flex-direction:column}
</style></head><body>

<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:2mm;margin-bottom:3mm;border-bottom:2px solid #f59e0b">
  <div style="display:flex;align-items:center;gap:3mm">
    ${logoBase64 ? `<img src="${logoBase64}" style="height:12mm;max-width:28mm;object-fit:contain">` : ''}
    <div>
      <div style="font-size:11pt;font-weight:700">${studioName}</div>
      <div style="font-size:7pt;color:#666"><b>Aluno:</b> ${workout.client.name} | <b>Programa:</b> ${workout.phaseDuration} sem. • ${freq}x/sem.</div>
      ${studioPhone ? `<div style="font-size:6pt;color:#999">${studioPhone}${studioEmail ? ` • ${studioEmail}` : ''}</div>` : ''}
    </div>
  </div>
  <div style="text-align:right;font-size:7pt;color:#666">
    <b style="display:block;font-size:8pt;color:#333">Expert Pro Training</b>
    ${new Date().toLocaleDateString('pt-BR')}
  </div>
</div>

<div style="font-size:9pt;font-weight:700;margin-bottom:3mm">📋 Exercícios por Pilar</div>
${pillarGrid}
${bottomGrid}

</body></html>`

  const res = await fetch('/api/pdf/treino', {
    method: 'POST',
    body: htmlContent,
    headers: { 'Content-Type': 'text/html' },
    credentials: 'include',
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('Erro ao gerar PDF:', errorText)
    throw new Error('Erro ao gerar PDF.')
  }

  const blob = await res.blob()
  const pdfBlob = new Blob([blob], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(pdfBlob)
  const fileName = `Treino_${workout.client.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`

  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = fileName
  a.type = 'application/pdf'
  document.body.appendChild(a)
  try { a.click() } catch { window.open(url, '_blank') }
  setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url) }, 1000)
}

// ============================================================================
// BODY COMPOSITION PDF — SINGLE A4 PAGE
// Pollock analysis, skinfolds, circumferences, optional comparison
// ============================================================================

interface BodyCompData {
  clientName: string
  gender: 'M' | 'F' | null
  age: number | null
  weight: number | null
  height: number | null
  bodyFat: number | null
  // Skinfolds
  sfChest?: number | null
  sfAbdomen?: number | null
  sfThigh?: number | null
  sfTriceps?: number | null
  sfSuprailiac?: number | null
  sfSubscapular?: number | null
  sfMidaxillary?: number | null
  // Circumferences
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
  // Studio
  studioName?: string
  studioLogo?: string
  studioPhone?: string
}

interface ComparisonData {
  labelA: string
  labelB: string
  dataA: Record<string, number>
  dataB: Record<string, number>
}

export async function generateBodyCompositionPDF(
  data: BodyCompData,
  comparison?: ComparisonData | null
) {
  const {
    clientName, gender, age, weight, height, bodyFat,
    studioName = 'Studio', studioLogo = '', studioPhone = '',
  } = data

  // Logo to base64
  let logoBase64 = ''
  if (studioLogo) {
    try {
      const response = await fetch(studioLogo)
      const blob = await response.blob()
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
    } catch (e) {
      console.error('Erro ao converter logo:', e)
    }
  }

  // ===== BODY COMPOSITION SECTION =====
  let bodySection = ''
  if (weight && bodyFat) {
    const fatKg = weight * bodyFat / 100
    const leanKg = weight - fatKg
    const leanPct = 100 - bodyFat
    const bmi = height ? (weight / ((height / 100) ** 2)).toFixed(1) : null
    const bmiClass = bmi ? (
      parseFloat(bmi) < 18.5 ? 'Abaixo' :
      parseFloat(bmi) < 25 ? 'Normal' :
      parseFloat(bmi) < 30 ? 'Sobrepeso' :
      parseFloat(bmi) < 35 ? 'Obesidade I' :
      parseFloat(bmi) < 40 ? 'Obesidade II' : 'Obesidade III'
    ) : null

    const bfClass = gender === 'M'
      ? (bodyFat < 6 ? 'Essencial' : bodyFat < 14 ? 'Atleta' : bodyFat < 18 ? 'Bom' : bodyFat < 25 ? 'Normal' : 'Acima')
      : gender === 'F'
        ? (bodyFat < 14 ? 'Essencial' : bodyFat < 21 ? 'Atleta' : bodyFat < 25 ? 'Bom' : bodyFat < 32 ? 'Normal' : 'Acima')
        : ''
    const bfColor = gender === 'M'
      ? (bodyFat < 6 ? '#3b82f6' : bodyFat < 14 ? '#22c55e' : bodyFat < 18 ? '#10b981' : bodyFat < 25 ? '#eab308' : '#ef4444')
      : gender === 'F'
        ? (bodyFat < 14 ? '#3b82f6' : bodyFat < 21 ? '#22c55e' : bodyFat < 25 ? '#10b981' : bodyFat < 32 ? '#eab308' : '#ef4444')
        : '#888'

    bodySection = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-bottom:4mm">
      <!-- Left: Pie Chart + Classification -->
      <div style="border:1px solid #e5e7eb;border-radius:3mm;padding:4mm;display:flex;flex-direction:column;align-items:center;gap:3mm">
        <div style="font-size:8pt;font-weight:700;color:#333;width:100%">📊 Composição Corporal</div>
        <!-- CSS Pie Chart -->
        <div style="position:relative;width:50mm;height:50mm">
          <div style="width:100%;height:100%;border-radius:50%;background:conic-gradient(#22d3ee 0% ${leanPct}%, #f87171 ${leanPct}% 100%);box-shadow:0 2px 8px rgba(0,0,0,0.1)"></div>
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">
            <div style="width:28mm;height:28mm;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center">
              <span style="font-size:14pt;font-weight:800">${bodyFat.toFixed(1)}%</span>
              <span style="font-size:6pt;color:#888">Gordura</span>
            </div>
          </div>
        </div>
        <!-- Legend -->
        <div style="display:flex;gap:5mm;font-size:7pt">
          <div style="display:flex;align-items:center;gap:1mm"><span style="width:3mm;height:3mm;border-radius:50%;background:#22d3ee;display:inline-block"></span>Magra ${leanPct.toFixed(1)}%</div>
          <div style="display:flex;align-items:center;gap:1mm"><span style="width:3mm;height:3mm;border-radius:50%;background:#f87171;display:inline-block"></span>Gorda ${bodyFat.toFixed(1)}%</div>
        </div>
        <!-- Classification bar -->
        <div style="width:100%;height:5mm;border-radius:3mm;overflow:hidden;display:flex;background:#f3f4f6">
          <div style="width:${leanPct}%;background:linear-gradient(90deg,#22d3ee,#06b6d4);height:100%;display:flex;align-items:center;justify-content:center;font-size:5pt;color:#fff;font-weight:700">Magra ${leanPct.toFixed(0)}%</div>
          <div style="width:${bodyFat}%;background:linear-gradient(90deg,#f87171,#ef4444);height:100%;display:flex;align-items:center;justify-content:center;font-size:5pt;color:#fff;font-weight:700">Gorda ${bodyFat.toFixed(0)}%</div>
        </div>
        <div style="display:flex;align-items:center;gap:2mm;font-size:7pt;background:#f9fafb;border-radius:1.5mm;padding:1.5mm 3mm;width:100%;justify-content:space-between">
          <span style="color:#666">Classificação (${gender === 'M' ? 'Masc.' : 'Fem.'}):</span>
          <span style="font-weight:700;color:${bfColor}">${bfClass}</span>
        </div>
      </div>

      <!-- Right: Data Cards -->
      <div style="display:flex;flex-direction:column;gap:3mm">
        <!-- Stats Grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2mm">
          <div style="border:1px solid #e5e7eb;border-radius:2mm;padding:3mm;text-align:center">
            <div style="font-size:14pt;font-weight:800;color:#3b82f6">${weight.toFixed(1)}<span style="font-size:7pt;font-weight:400">kg</span></div>
            <div style="font-size:6pt;color:#888;margin-top:1mm">Peso</div>
          </div>
          <div style="border:1px solid #e5e7eb;border-radius:2mm;padding:3mm;text-align:center">
            <div style="font-size:14pt;font-weight:800;color:#a855f7">${height ? height.toFixed(0) : '—'}<span style="font-size:7pt;font-weight:400">cm</span></div>
            <div style="font-size:6pt;color:#888;margin-top:1mm">Altura</div>
          </div>
          <div style="border:1px solid #e5e7eb;border-radius:2mm;padding:3mm;text-align:center;background:#ecfdf5">
            <div style="font-size:14pt;font-weight:800;color:#06b6d4">${leanKg.toFixed(1)}<span style="font-size:7pt;font-weight:400">kg</span></div>
            <div style="font-size:6pt;color:#888;margin-top:1mm">Massa Magra (${leanPct.toFixed(0)}%)</div>
          </div>
          <div style="border:1px solid #e5e7eb;border-radius:2mm;padding:3mm;text-align:center;background:#fef2f2">
            <div style="font-size:14pt;font-weight:800;color:#ef4444">${fatKg.toFixed(1)}<span style="font-size:7pt;font-weight:400">kg</span></div>
            <div style="font-size:6pt;color:#888;margin-top:1mm">Massa Gorda (${bodyFat.toFixed(0)}%)</div>
          </div>
        </div>
        ${bmi ? `<div style="border:1px solid #fcd34d;border-radius:2mm;padding:2mm 3mm;background:#fffbeb;display:flex;justify-content:space-between;align-items:center;font-size:8pt">
          <span style="color:#92400e">IMC</span>
          <span><b style="font-size:12pt">${bmi}</b> <span style="font-size:7pt;color:#92400e">${bmiClass}</span></span>
        </div>` : ''}
        ${age ? `<div style="border:1px solid #e5e7eb;border-radius:2mm;padding:2mm 3mm;display:flex;justify-content:space-between;align-items:center;font-size:8pt;color:#666">
          <span>Idade</span><b>${age} anos</b>
        </div>` : ''}
      </div>
    </div>`
  }

  // ===== SKINFOLDS SECTION =====
  const skinfolds = [
    { label: 'Peitoral', val: data.sfChest },
    { label: 'Abdômen', val: data.sfAbdomen },
    { label: 'Coxa', val: data.sfThigh },
    { label: 'Tríceps', val: data.sfTriceps },
    { label: 'Suprailíaca', val: data.sfSuprailiac },
    { label: 'Subescapular', val: data.sfSubscapular },
    { label: 'Axilar Médio', val: data.sfMidaxillary },
  ].filter(s => s.val)

  let skinfoldsSection = ''
  if (skinfolds.length > 0) {
    const sumSf = skinfolds.reduce((acc, s) => acc + Number(s.val), 0)
    const method = skinfolds.length >= 7 ? 'Pollock 7 Dobras' : skinfolds.length >= 3 ? 'Pollock 3 Dobras' : 'Parcial'
    skinfoldsSection = `
    <div style="border:1px solid #fcd34d;border-radius:2mm;overflow:hidden;margin-bottom:3mm">
      <div style="background:#fffbeb;padding:2mm 3mm;display:flex;justify-content:space-between;align-items:center;border-bottom:0.5px solid #fcd34d">
        <span style="font-size:8pt;font-weight:700;color:#92400e">📏 Dobras Cutâneas (mm)</span>
        <span style="font-size:6pt;color:#92400e;background:#fef3c7;padding:0.5mm 2mm;border-radius:1mm">${method}</span>
      </div>
      <div style="padding:2mm 3mm">
        <table style="width:100%;border-collapse:collapse;font-size:8pt">
          ${skinfolds.map(s => `<tr>
            <td style="padding:1mm 0;color:#666;border-bottom:0.3px solid #f3f4f6">${s.label}</td>
            <td style="padding:1mm 0;text-align:right;font-weight:600;border-bottom:0.3px solid #f3f4f6">${Number(s.val).toFixed(1)} mm</td>
          </tr>`).join('')}
          <tr style="border-top:1px solid #fcd34d">
            <td style="padding:1.5mm 0;font-weight:700;color:#92400e">Soma</td>
            <td style="padding:1.5mm 0;text-align:right;font-weight:700;color:#d97706">${sumSf.toFixed(1)} mm</td>
          </tr>
        </table>
      </div>
    </div>`
  }

  // ===== BODY SILHOUETTE SVG (inline for PDF) — matches screen BodySilhouette =====
  function getMorphMult(y: number, bf: number | null, gender: 'M' | 'F' | null): number {
    if (!bf) return 1.0
    type Phenotype = 'definido' | 'magro' | 'normal' | 'sobrepeso' | 'obeso'
    let pheno: Phenotype = 'normal'
    if (gender === 'F') {
      if (bf < 20) pheno = 'definido'
      else if (bf < 24) pheno = 'magro'
      else if (bf < 30) pheno = 'normal'
      else if (bf < 35) pheno = 'sobrepeso'
      else pheno = 'obeso'
    } else {
      if (bf < 12) pheno = 'definido'
      else if (bf < 15) pheno = 'magro'
      else if (bf < 20) pheno = 'normal'
      else if (bf < 25) pheno = 'sobrepeso'
      else pheno = 'obeso'
    }
    const profiles: Record<Phenotype, {y: number; mult: number}[]> = {
      normal:    [{ y: 0, mult: 1.0 }, { y: 220, mult: 1.0 }],
      magro:     [{ y: 0, mult: 0.95 }, { y: 40, mult: 0.9 }, { y: 70, mult: 0.85 }, { y: 110, mult: 0.9 }, { y: 220, mult: 0.9 }],
      definido:  [{ y: 0, mult: 1.0 }, { y: 35, mult: 1.15 }, { y: 50, mult: 1.1 }, { y: 75, mult: 0.95 }, { y: 110, mult: 1.05 }, { y: 220, mult: 1.05 }],
      sobrepeso: [{ y: 0, mult: 1.05 }, { y: 40, mult: 1.1 }, { y: 75, mult: 1.25 }, { y: 110, mult: 1.2 }, { y: 220, mult: 1.1 }],
      obeso:     [{ y: 0, mult: 1.1 }, { y: 40, mult: 1.2 }, { y: 75, mult: 1.5 }, { y: 110, mult: 1.4 }, { y: 220, mult: 1.2 }],
    }
    const profile = profiles[pheno]
    if (y <= profile[0].y) return profile[0].mult
    if (y >= profile[profile.length - 1].y) return profile[profile.length - 1].mult
    for (let i = 0; i < profile.length - 1; i++) {
      const p1 = profile[i], p2 = profile[i + 1]
      if (y >= p1.y && y <= p2.y) {
        const t = (y - p1.y) / (p2.y - p1.y)
        return p1.mult + t * (p2.mult - p1.mult)
      }
    }
    return 1.0
  }

  function morphPts(pts: string, bf: number | null, g: 'M' | 'F' | null): string {
    if (!bf) return pts
    const coords = pts.trim().split(/\s+/)
    const out: string[] = []
    for (let i = 0; i < coords.length; i += 2) {
      const x = parseFloat(coords[i]), yv = parseFloat(coords[i + 1])
      if (!isNaN(x) && !isNaN(yv)) {
        const mult = getMorphMult(yv, bf, g)
        out.push(`${(50 + (x - 50) * mult).toFixed(1)} ${yv.toFixed(1)}`)
      }
    }
    return out.join(' ')
  }

  function generateBodySVGForPDF(g: 'M' | 'F' | null, bf: number | null, measurements: {
    chest?: number | null, waist?: number | null, hip?: number | null, abdomen?: number | null,
    armRight?: number | null, armLeft?: number | null, forearmRight?: number | null, forearmLeft?: number | null,
    thighRight?: number | null, thighLeft?: number | null, calfRight?: number | null, calfLeft?: number | null,
  }, width = 130): string {
    // Muscle region polygons (same as body-svg-data used in screen)
    const regions: { key: string; pts: string; color: string; label: string; val?: number | null }[] = [
      { key: 'chest',       pts: '38 55 62 55 65 75 60 80 40 80 35 75', color: '#0e7490', label: 'Peitoral',   val: measurements.chest },
      { key: 'core',        pts: '38 80 62 80 63 108 37 108',            color: '#7c3aed', label: 'Cintura',    val: measurements.waist ?? measurements.abdomen },
      { key: 'gluteal',     pts: '34 108 66 108 68 125 32 125',          color: '#be185d', label: 'Quadril',    val: measurements.hip },
      { key: 'arm-right',   pts: '26 55 35 55 33 95 24 95',              color: '#0369a1', label: 'Braço D',    val: measurements.armRight },
      { key: 'arm-left',    pts: '65 55 74 55 76 95 67 95',              color: '#0369a1', label: 'Braço E',    val: measurements.armLeft },
      { key: 'forearm-right', pts:'21 95 32 95 30 130 19 130',           color: '#0891b2', label: 'Anteb.D',   val: measurements.forearmRight },
      { key: 'forearm-left',  pts:'68 95 79 95 81 130 70 130',           color: '#0891b2', label: 'Anteb.E',   val: measurements.forearmLeft },
      { key: 'thigh-right', pts: '33 125 50 125 48 165 31 165',          color: '#059669', label: 'Coxa D',    val: measurements.thighRight },
      { key: 'thigh-left',  pts: '50 125 67 125 69 165 52 165',          color: '#059669', label: 'Coxa E',    val: measurements.thighLeft },
      { key: 'calf-right',  pts: '33 165 48 165 46 200 31 200',          color: '#16a34a', label: 'Pant.D',    val: measurements.calfRight },
      { key: 'calf-left',   pts: '52 165 67 165 65 200 50 200',          color: '#16a34a', label: 'Pant.E',    val: measurements.calfLeft },
    ]

    // Biótype label
    const getPheno = () => {
      if (!bf) return 'Normal'
      if (g === 'F') return bf < 20 ? 'Definida' : bf < 24 ? 'Magra' : bf < 30 ? 'Normal' : bf < 35 ? 'Sobrepeso' : 'Obesa'
      return bf < 12 ? 'Definido' : bf < 15 ? 'Magro' : bf < 20 ? 'Normal' : bf < 25 ? 'Sobrepeso' : 'Obeso'
    }

    const polygons = regions.map(r => {
      const morphed = morphPts(r.pts, bf, g)
      const hasVal = r.val != null && Number(r.val) > 0
      const fill = hasVal ? r.color : '#1e293b'
      const opacity = hasVal ? '0.85' : '0.3'
      return `<polygon points="${morphed}" fill="${fill}" fill-opacity="${opacity}" stroke="#0f172a" stroke-width="0.5"/>`
    }).join('')

    // Labels — only for regions with values
    const labels = regions.map(r => {
      if (!r.val || Number(r.val) <= 0) return ''
      const pts = morphPts(r.pts, bf, g).split(/\s+/)
      const xs = [], ys = []
      for (let i = 0; i < pts.length; i += 2) { xs.push(parseFloat(pts[i])); ys.push(parseFloat(pts[i + 1])) }
      const cx = xs.reduce((a, b) => a + b, 0) / xs.length
      const cy = ys.reduce((a, b) => a + b, 0) / ys.length
      return `<text x="${cx.toFixed(1)}" y="${(cy + 1).toFixed(1)}" font-size="4" fill="white" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700">${Number(r.val).toFixed(0)}</text>`
    }).join('')

    // Silhouette outline — head + neck + body morphed
    const headX = 50, headY = 10, headRx = bf ? Math.min(14, 10 + bf * 0.08) : 10, headRy = 11
    const neckPts = morphPts('44 22 56 22 55 32 45 32', bf, g)

    const bodyPath = g === 'F'
      ? morphPts('38 32 62 32 68 55 74 90 79 125 72 165 68 200 32 200 28 165 21 125 21 90 26 55 32 32', bf, g)
      : morphPts('36 32 64 32 70 55 76 90 80 125 74 165 68 200 32 200 26 165 20 125 24 90 30 55 36 32', bf, g)

    const h = width * (220 / 100)
    return `<svg viewBox="0 0 100 220" width="${width}" height="${h.toFixed(0)}" xmlns="http://www.w3.org/2000/svg" style="background:#0f172a;border-radius:4px">
      <defs>
        <radialGradient id="bg" cx="50%" cy="0%" r="100%">
          <stop offset="0%" stop-color="#1e293b"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </radialGradient>
      </defs>
      <rect width="100" height="220" fill="url(#bg)"/>
      <!-- Body outline -->
      <polygon points="${bodyPath}" fill="#1e293b" stroke="#334155" stroke-width="0.8"/>
      <!-- Head -->
      <ellipse cx="${headX}" cy="${headY + headRy}" rx="${headRx}" ry="${headRy}" fill="#1e293b" stroke="#334155" stroke-width="0.8"/>
      <!-- Neck -->
      <polygon points="${neckPts}" fill="#1e293b" stroke="#334155" stroke-width="0.5"/>
      <!-- Muscle regions -->
      ${polygons}
      <!-- Measurement labels -->
      ${labels}
      <!-- Biotype label -->
      ${bf ? `<text x="50" y="215" font-size="4.5" fill="#f59e0b" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700">${getPheno()}</text>` : ''}
    </svg>`
  }

  // ===== CIRCUMFERENCES SECTION =====
  const measurements = [
    { label: 'Peitoral', val: data.chest },
    { label: 'Cintura', val: data.waist },
    { label: 'Quadril', val: data.hip },
    { label: 'Abdômen', val: data.abdomen },
    { label: 'Braço Dir.', val: data.armRight },
    { label: 'Braço Esq.', val: data.armLeft },
    { label: 'Anteb. Dir.', val: data.forearmRight },
    { label: 'Anteb. Esq.', val: data.forearmLeft },
    { label: 'Coxa Dir.', val: data.thighRight },
    { label: 'Coxa Esq.', val: data.thighLeft },
    { label: 'Pant. Dir.', val: data.calfRight },
    { label: 'Pant. Esq.', val: data.calfLeft },
  ].filter(m => m.val)

  let circumSection = ''
  if (measurements.length > 0) {
    const bodySVG = generateBodySVGForPDF(gender, bodyFat, data)
    circumSection = `
    <div style="border:1px solid #93c5fd;border-radius:2mm;overflow:hidden;margin-bottom:3mm">
      <div style="background:#eff6ff;padding:2mm 3mm;border-bottom:0.5px solid #93c5fd">
        <span style="font-size:8pt;font-weight:700;color:#1e40af">📐 Circunferências (cm) — Mapa Corporal</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr auto;gap:4mm;padding:2mm 3mm;align-items:center">
        <table style="width:100%;border-collapse:collapse;font-size:8pt">
          ${measurements.map(m => `<tr>
            <td style="padding:1mm 0;color:#666;border-bottom:0.3px solid #f3f4f6">${m.label}</td>
            <td style="padding:1mm 0;text-align:right;font-weight:600;border-bottom:0.3px solid #f3f4f6">${Number(m.val).toFixed(1)} cm</td>
          </tr>`).join('')}
        </table>
        <div style="flex-shrink:0">${bodySVG}</div>
      </div>
    </div>`
  }

  // ===== DATA TABLES ASSEMBLY =====
  let dataTablesSection = ''
  if (skinfoldsSection || circumSection) {
    dataTablesSection = (skinfoldsSection || '') + (circumSection || '')
  }

  // ===== COMPARISON SECTION =====
  let comparisonSection = ''
  if (comparison && comparison.labelA !== comparison.labelB) {
    const metrics = [
      { label: 'Peso', key: 'weight', unit: 'kg', lowerBetter: false },
      { label: '% Gordura', key: 'bodyFat', unit: '%', lowerBetter: true },
      { label: 'Massa Magra', key: 'leanMassKg', unit: 'kg', lowerBetter: false },
      { label: '% Magra', key: 'leanMassPct', unit: '%', lowerBetter: false },
      { label: 'Peitoral', key: 'chest', unit: 'cm', lowerBetter: false },
      { label: 'Cintura', key: 'waist', unit: 'cm', lowerBetter: true },
      { label: 'Quadril', key: 'hip', unit: 'cm', lowerBetter: false },
      { label: 'Abdômen', key: 'abdomen', unit: 'cm', lowerBetter: true },
      { label: 'Braço D', key: 'armRight', unit: 'cm', lowerBetter: false },
      { label: 'Braço E', key: 'armLeft', unit: 'cm', lowerBetter: false },
      { label: 'Coxa D', key: 'thighRight', unit: 'cm', lowerBetter: false },
      { label: 'Coxa E', key: 'thighLeft', unit: 'cm', lowerBetter: false },
      { label: 'Pant. D', key: 'calfRight', unit: 'cm', lowerBetter: false },
      { label: 'Pant. E', key: 'calfLeft', unit: 'cm', lowerBetter: false },
      { label: 'DC Tríceps', key: 'sfTriceps', unit: 'mm', lowerBetter: true },
      { label: 'DC Suprail.', key: 'sfSuprailiac', unit: 'mm', lowerBetter: true },
      { label: 'DC Coxa', key: 'sfThigh', unit: 'mm', lowerBetter: true },
      { label: 'DC Peito', key: 'sfChest', unit: 'mm', lowerBetter: true },
      { label: 'DC Abdômen', key: 'sfAbdomen', unit: 'mm', lowerBetter: true },
    ]

    // Compute lean mass for comparison datasets
    const enrichLean = (d: Record<string, number>) => {
      if (d.weight && d.bodyFat != null) {
        d.leanMassKg = d.weight - (d.weight * d.bodyFat / 100)
        d.leanMassPct = 100 - d.bodyFat
      }
      return d
    }
    const dA = enrichLean({ ...comparison.dataA })
    const dB = enrichLean({ ...comparison.dataB })

    const active = metrics.filter(m => dA[m.key] != null || dB[m.key] != null)

    if (active.length > 0) {
      // Generate two body SVGs for comparison
      const svgA = generateBodySVGForPDF(gender, dA.bodyFat ?? null, {
        chest: dA.chest, waist: dA.waist, hip: dA.hip, abdomen: dA.abdomen,
        armRight: dA.armRight, armLeft: dA.armLeft, forearmRight: dA.forearmRight, forearmLeft: dA.forearmLeft,
        thighRight: dA.thighRight, thighLeft: dA.thighLeft, calfRight: dA.calfRight, calfLeft: dA.calfLeft,
      }, 110)
      const svgB = generateBodySVGForPDF(gender, dB.bodyFat ?? null, {
        chest: dB.chest, waist: dB.waist, hip: dB.hip, abdomen: dB.abdomen,
        armRight: dB.armRight, armLeft: dB.armLeft, forearmRight: dB.forearmRight, forearmLeft: dB.forearmLeft,
        thighRight: dB.thighRight, thighLeft: dB.thighLeft, calfRight: dB.calfRight, calfLeft: dB.calfLeft,
      }, 110)

      comparisonSection = `
      <div style="border:1px solid #c4b5fd;border-radius:2mm;overflow:hidden;margin-top:3mm">
        <div style="background:#ede9fe;padding:2mm 3mm;border-bottom:0.5px solid #c4b5fd;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:8pt;font-weight:700;color:#5b21b6">📊 Comparação: ${comparison.labelA} → ${comparison.labelB}</span>
        </div>
        <!-- Side-by-side 3D avatars -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm;padding:3mm;background:#0f172a">
          <div style="display:flex;flex-direction:column;align-items:center;gap:2mm">
            <div style="font-size:7pt;font-weight:700;color:#60a5fa;text-align:center">${comparison.labelA}</div>
            ${svgA}
            ${dA.bodyFat ? `<div style="font-size:6pt;color:#60a5fa;text-align:center">${dA.bodyFat.toFixed(1)}% Gordura</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:2mm">
            <div style="font-size:7pt;font-weight:700;color:#fbbf24;text-align:center">${comparison.labelB}</div>
            ${svgB}
            ${dB.bodyFat ? `<div style="font-size:6pt;color:#fbbf24;text-align:center">${dB.bodyFat.toFixed(1)}% Gordura</div>` : ''}
          </div>
        </div>
        <div style="padding:2mm 3mm">
          <table style="width:100%;border-collapse:collapse;font-size:8pt">
            <tr style="background:#f8fafc">
              <th style="padding:1.5mm 2mm;text-align:left;border-bottom:1px solid #e5e5e5;font-weight:600;color:#666">Medida</th>
              <th style="padding:1.5mm 2mm;text-align:right;border-bottom:1px solid #e5e5e5;font-weight:600;color:#3b82f6">${comparison.labelA}</th>
              <th style="padding:1.5mm 2mm;text-align:right;border-bottom:1px solid #e5e5e5;font-weight:600;color:#f59e0b">${comparison.labelB}</th>
              <th style="padding:1.5mm 2mm;text-align:right;border-bottom:1px solid #e5e5e5;font-weight:600;color:#666">Δ</th>
            </tr>
            ${active.map(m => {
              const vA = dA[m.key]
              const vB = dB[m.key]
              const delta = (vB ?? 0) - (vA ?? 0)
              const isGood = m.lowerBetter ? delta <= 0 : delta >= 0
              const deltaColor = vA != null && vB != null && delta !== 0 ? (isGood ? '#22c55e' : '#ef4444') : '#888'
              return `<tr>
                <td style="padding:1.2mm 2mm;border-bottom:0.3px solid #f3f4f6;color:#555">${m.label}</td>
                <td style="padding:1.2mm 2mm;text-align:right;border-bottom:0.3px solid #f3f4f6;font-weight:600">${vA != null ? vA.toFixed(1) : '—'} <span style="color:#999;font-weight:400">${m.unit}</span></td>
                <td style="padding:1.2mm 2mm;text-align:right;border-bottom:0.3px solid #f3f4f6;font-weight:600">${vB != null ? vB.toFixed(1) : '—'} <span style="color:#999;font-weight:400">${m.unit}</span></td>
                <td style="padding:1.2mm 2mm;text-align:right;border-bottom:0.3px solid #f3f4f6;font-weight:700;color:${deltaColor}">${vA != null && vB != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}` : '—'}</td>
              </tr>`
            }).join('')}
          </table>
        </div>
      </div>`
    }
  }


  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Composição Corporal — ${clientName}</title>
<style>
@page{size:A4 portrait;margin:6mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:7pt;color:#1a1a1a;line-height:1.3;background:#fff}
</style></head><body>

<!-- Header -->
<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:2mm;margin-bottom:3mm;border-bottom:2px solid #f59e0b">
  <div style="display:flex;align-items:center;gap:3mm">
    ${logoBase64 ? `<img src="${logoBase64}" style="height:12mm;max-width:28mm;object-fit:contain">` : ''}
    <div>
      <div style="font-size:11pt;font-weight:700">${studioName}</div>
      <div style="font-size:8pt;color:#666"><b>Aluno:</b> ${clientName}${gender ? ` • ${gender === 'M' ? 'Masculino' : 'Feminino'}` : ''}${age ? ` • ${age} anos` : ''}</div>
      ${studioPhone ? `<div style="font-size:6pt;color:#999">${studioPhone}</div>` : ''}
    </div>
  </div>
  <div style="text-align:right;font-size:7pt;color:#666">
    <b style="display:block;font-size:8pt;color:#333">Composição Corporal</b>
    ${new Date().toLocaleDateString('pt-BR')}
  </div>
</div>

${bodySection}
${dataTablesSection}
${comparisonSection}

</body></html>`

  // ===== GENERATE PDF =====
  const res = await fetch('/api/pdf/treino', {
    method: 'POST',
    body: htmlContent,
    headers: { 'Content-Type': 'text/html' },
    credentials: 'include',
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('Erro ao gerar PDF:', errorText)
    throw new Error('Erro ao gerar PDF da composição corporal.')
  }

  const blob = await res.blob()
  const pdfBlob = new Blob([blob], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(pdfBlob)
  const fileName = `Composicao_Corporal_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`

  const anchor = document.createElement('a')
  anchor.style.display = 'none'
  anchor.href = url
  anchor.download = fileName
  anchor.type = 'application/pdf'
  document.body.appendChild(anchor)
  try { anchor.click() } catch { window.open(url, '_blank') }
  setTimeout(() => { document.body.removeChild(anchor); window.URL.revokeObjectURL(url) }, 1000)
}
