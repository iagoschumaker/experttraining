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

  // ===== BODY SILHOUETTE SVG — exact anteriorData polygons, matches screen =====
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

  function generateBodySVGForPDF(g: 'M' | 'F' | null, bf: number | null, m: {
    chest?: number | null, waist?: number | null, hip?: number | null, abdomen?: number | null,
    armRight?: number | null, armLeft?: number | null, forearmRight?: number | null, forearmLeft?: number | null,
    thighRight?: number | null, thighLeft?: number | null, calfRight?: number | null, calfLeft?: number | null,
  }, width = 120): string {
    // Exact anteriorData polygons from body-svg-data.ts — keyed by body part
    // Points format: "x1 y1 x2 y2 ..." in viewBox 0 0 100 220
    const anteriorPolygons: { key: string; pts: string[] }[] = [
      { key: 'chest', pts: [
        '51.8367347 41.6326531 51.0204082 55.1020408 57.9591837 57.9591837 67.755102 55.5102041 70.6122449 47.3469388 62.0408163 41.6326531',
        '29.7959184 46.5306122 31.4285714 55.5102041 40.8163265 57.9591837 48.1632653 55.1020408 47.755102 42.0408163 37.5510204 42.0408163',
      ]},
      { key: 'core', pts: [
        '56.3265306 59.1836735 57.9591837 64.0816327 58.3673469 77.9591837 58.3673469 92.6530612 56.3265306 98.3673469 55.1020408 104.081633 51.4285714 107.755102 51.0204082 84.4897959 50.6122449 67.3469388 51.0204082 57.1428571',
        '43.6734694 58.7755102 48.5714286 57.1428571 48.9795918 67.3469388 48.5714286 84.4897959 48.1632653 107.346939 44.4897959 103.673469 40.8163265 91.4285714 40.8163265 78.3673469 41.2244898 64.4897959',
        '68.5714286 63.2653061 67.3469388 57.1428571 58.7755102 59.5918367 60 64.0816327 60.4081633 83.2653061 65.7142857 78.7755102 66.5306122 69.7959184',
        '33.877551 78.3673469 33.0612245 71.8367347 31.0204082 63.2653061 32.244898 57.1428571 40.8163265 59.1836735 39.1836735 63.2653061 39.1836735 83.6734694',
      ]},
      { key: 'gluteal', pts: [
        '52.6530612 110.204082 54.2857143 124.897959 60 110.204082 62.0408163 100 64.8979592 94.2857143 60 92.6530612 56.7346939 104.489796',
        '47.755102 110.612245 44.8979592 125.306122 42.0408163 115.918367 40.4081633 113.061224 39.5918367 107.346939 37.9591837 102.44898 34.6938776 93.877551 39.5918367 92.244898 41.6326531 99.1836735 43.6734694 105.306122',
      ]},
      { key: 'arm-right', pts: [
        '16.7346939 68.1632653 17.9591837 71.4285714 22.8571429 66.122449 28.9795918 53.877551 27.755102 49.3877551 20.4081633 55.9183673',
        '22.4489796 69.3877551 29.7959184 55.5102041 29.7959184 60.8163265 22.8571429 73.0612245',
      ]},
      { key: 'arm-left', pts: [
        '71.4285714 49.3877551 70.2040816 54.6938776 76.3265306 66.122449 81.6326531 71.8367347 82.8571429 68.9795918 78.7755102 55.5102041',
        '69.3877551 55.5102041 69.3877551 61.6326531 75.9183673 72.6530612 77.5510204 70.2040816 75.5102041 67.3469388',
      ]},
      { key: 'forearm-right', pts: [
        '6.12244898 88.5714286 10.2040816 75.1020408 14.6938776 70.2040816 16.3265306 74.2857143 19.1836735 73.4693878 4.48979592 97.5510204 0 100',
        '6.93877551 101.22449 13.4693878 90.6122449 18.7755102 84.0816327 21.6326531 77.1428571 21.2244898 71.8367347 4.89795918 98.7755102',
      ]},
      { key: 'forearm-left', pts: [
        '84.4897959 69.7959184 83.2653061 73.4693878 80 73.0612245 95.1020408 98.3673469 100 100.408163 93.4693878 89.3877551 89.7959184 76.3265306',
        '77.5510204 72.244898 77.5510204 77.5510204 80.4081633 84.0816327 85.3061224 89.7959184 92.244898 101.22449 94.6938776 99.5918367',
      ]},
      { key: 'thigh-right', pts: [
        '34.6938776 98.7755102 37.1428571 108.163265 37.1428571 127.755102 34.2857143 137.142857 31.0204082 132.653061 29.3877551 120 28.1632653 111.428571 29.3877551 100.816327 32.244898 94.6938776',
        '38.7755102 129.387755 38.3673469 112.244898 41.2244898 118.367347 44.4897959 129.387755 42.8571429 135.102041 40 146.122449 36.3265306 146.530612 35.5102041 140',
        '32.6530612 138.367347 26.5306122 145.714286 25.7142857 136.734694 25.7142857 127.346939 26.9387755 114.285714 29.3877551 133.469388',
      ]},
      { key: 'thigh-left', pts: [
        '63.2653061 105.714286 64.4897959 100 66.9387755 94.6938776 70.2040816 101.22449 71.0204082 111.836735 68.1632653 133.061224 65.3061224 137.55102 62.4489796 128.571429 62.0408163 111.428571',
        '59.5918367 145.714286 55.5102041 128.979592 60.8163265 113.877551 61.2244898 130.204082 64.0816327 139.591837 62.8571429 146.530612',
        '71.8367347 113.061224 73.877551 124.081633 73.877551 140.408163 72.6530612 145.714286 66.5306122 138.367347 70.2040816 133.469388',
      ]},
      { key: 'calf-right', pts: [
        '24.8979592 194.693878 27.755102 164.897959 28.1632653 160.408163 26.122449 154.285714 24.8979592 157.55102 22.4489796 161.632653 20.8163265 167.755102 22.0408163 188.163265 20.8163265 195.510204',
        '35.5102041 158.367347 35.9183673 162.44898 35.9183673 166.938776 35.1020408 172.244898 35.1020408 176.734694 32.244898 182.040816 30.6122449 187.346939 26.9387755 194.693878 27.3469388 187.755102 28.1632653 180.408163 28.5714286 175.510204 28.9795918 169.795918 29.7959184 164.081633 30.2040816 158.77551',
      ]},
      { key: 'calf-left', pts: [
        '71.4285714 160.408163 73.4693878 153.469388 76.7346939 161.22449 79.5918367 167.755102 78.3673469 187.755102 79.5918367 195.510204 74.6938776 195.510204',
        '72.6530612 195.102041 69.7959184 159.183673 65.3061224 158.367347 64.0816327 162.44898 64.0816327 165.306122 65.7142857 177.142857',
      ]},
    ]

    // Which keys have data
    const dataMap: Record<string, number | null | undefined> = {
      'chest': m.chest, 'core': m.waist ?? m.abdomen, 'gluteal': m.hip,
      'arm-right': m.armRight, 'arm-left': m.armLeft,
      'forearm-right': m.forearmRight, 'forearm-left': m.forearmLeft,
      'thigh-right': m.thighRight, 'thigh-left': m.thighLeft,
      'calf-right': m.calfRight, 'calf-left': m.calfLeft,
    }

    const getPheno = () => {
      if (!bf) return 'Normal'
      if (g === 'F') return bf < 20 ? 'Definida' : bf < 24 ? 'Magra' : bf < 30 ? 'Normal' : bf < 35 ? 'Sobrepeso' : 'Obesa'
      return bf < 12 ? 'Definido' : bf < 15 ? 'Magro' : bf < 20 ? 'Normal' : bf < 25 ? 'Sobrepeso' : 'Obeso'
    }

    const polygonsHtml = anteriorPolygons.map(region => {
      const hasVal = dataMap[region.key] != null && Number(dataMap[region.key]) > 0
      return region.pts.map(pts => {
        const morphed = morphPts(pts, bf, g)
        if (hasVal) {
          return `<polygon points="${morphed}" fill="#3b82f6" fill-opacity="0.5" stroke="#1d4ed8" stroke-width="0.3"/>`
        }
        return `<polygon points="${morphed}" fill="#e5e7eb" fill-opacity="0.7" stroke="#d1d5db" stroke-width="0.2"/>`
      }).join('')
    }).join('')

    // Head shape same as screen
    const headPts = morphPts('42.4489796 2.85714286 40 11.8367347 42.0408163 19.5918367 46.122449 23.2653061 49.7959184 25.3061224 54.6938776 22.4489796 57.5510204 19.1836735 59.1836735 10.2040816 57.1428571 2.44897959 49.7959184 0', bf, g)
    // Neck
    const neckRPts = morphPts('55.5102041 23.6734694 50.6122449 33.4693878 50.6122449 39.1836735 61.6326531 40 70.6122449 44.8979592 69.3877551 36.7346939 63.2653061 35.1020408 58.3673469 30.6122449', bf, g)
    const neckLPts = morphPts('28.9795918 44.8979592 30.2040816 37.1428571 36.3265306 35.1020408 41.2244898 30.2040816 44.4897959 24.4897959 48.9795918 33.877551 48.5714286 39.1836735 37.9591837 39.5918367', bf, g)
    // Front deltoids
    const dR = morphPts('78.3673469 53.0612245 79.5918367 47.755102 79.1836735 41.2244898 75.9183673 37.9591837 71.0204082 36.3265306 72.244898 42.8571429 71.4285714 47.3469388', bf, g)
    const dL = morphPts('28.1632653 47.3469388 21.2244898 53.0612245 20 47.755102 20.4081633 40.8163265 24.4897959 37.1428571 28.5714286 37.1428571 26.9387755 43.2653061', bf, g)
    // Knees
    const kR = morphPts('33.877551 140 34.6938776 143.265306 35.5102041 147.346939 36.3265306 151.020408 35.1020408 156.734694 29.7959184 156.734694 27.3469388 152.653061 27.3469388 147.346939 30.2040816 144.081633', bf, g)
    const kL = morphPts('65.7142857 140 72.244898 147.755102 72.244898 152.244898 69.7959184 157.142857 64.8979592 156.734694 62.8571429 151.020408', bf, g)
    // Abductors
    const abR = morphPts('52.6530612 110.204082 54.2857143 124.897959 60 110.204082 62.0408163 100 64.8979592 94.2857143 60 92.6530612 56.7346939 104.489796', bf, g)
    const abL = morphPts('47.755102 110.612245 44.8979592 125.306122 42.0408163 115.918367 40.4081633 113.061224 39.5918367 107.346939 37.9591837 102.44898 34.6938776 93.877551 39.5918367 92.244898 41.6326531 99.1836735 43.6734694 105.306122', bf, g)

    const h = Math.round(width * 2.2)
    return `<svg viewBox="0 0 100 220" width="${width}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <!-- Base body shapes -->
      <polygon points="${headPts}" fill="#f3f4f6" stroke="#d1d5db" stroke-width="0.5"/>
      <polygon points="${neckRPts}" fill="#f3f4f6" stroke="#d1d5db" stroke-width="0.3"/>
      <polygon points="${neckLPts}" fill="#f3f4f6" stroke="#d1d5db" stroke-width="0.3"/>
      <polygon points="${dR}" fill="#e5e7eb" stroke="#d1d5db" stroke-width="0.3"/>
      <polygon points="${dL}" fill="#e5e7eb" stroke="#d1d5db" stroke-width="0.3"/>
      <polygon points="${kR}" fill="#e5e7eb" stroke="#d1d5db" stroke-width="0.3"/>
      <polygon points="${kL}" fill="#e5e7eb" stroke="#d1d5db" stroke-width="0.3"/>
      <polygon points="${abR}" fill="#e5e7eb" stroke="#d1d5db" stroke-width="0.3"/>
      <polygon points="${abL}" fill="#e5e7eb" stroke="#d1d5db" stroke-width="0.3"/>
      <!-- Muscle regions -->
      ${polygonsHtml}
      <!-- Biotype -->
      ${bf ? `<text x="50" y="213" font-size="4" fill="#6b7280" text-anchor="middle" font-family="Arial,sans-serif">${getPheno()} • ${bf.toFixed(1)}%G</text>` : ''}
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
      <div style="page-break-before:always;border:1px solid #c4b5fd;border-radius:2mm;overflow:hidden">
        <div style="background:#ede9fe;padding:2mm 3mm;border-bottom:0.5px solid #c4b5fd">
          <span style="font-size:8pt;font-weight:700;color:#5b21b6">📊 Comparação: ${comparison.labelA} → ${comparison.labelB}</span>
        </div>
        <!-- 2 SVGs side by side — page-break-inside:avoid keeps them on same page -->
        <div style="page-break-inside:avoid;display:grid;grid-template-columns:1fr 1fr;gap:3mm;padding:3mm;background:#f8fafc;border-bottom:0.5px solid #e5e7eb">
          <div style="display:flex;flex-direction:column;align-items:center;gap:1mm">
            <div style="font-size:7pt;font-weight:700;color:#1d4ed8;text-align:center">${comparison.labelA}</div>
            ${svgA}
            ${dA.bodyFat != null ? `<div style="font-size:6pt;color:#3b82f6;text-align:center">${dA.bodyFat.toFixed(1)}% Gordura</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:1mm">
            <div style="font-size:7pt;font-weight:700;color:#b45309;text-align:center">${comparison.labelB}</div>
            ${svgB}
            ${dB.bodyFat != null ? `<div style="font-size:6pt;color:#d97706;text-align:center">${dB.bodyFat.toFixed(1)}% Gordura</div>` : ''}
          </div>
        </div>
        <!-- Metrics table -->
        <div style="padding:2mm 3mm">
          <table style="width:100%;border-collapse:collapse;font-size:7.5pt">
            <tr style="background:#f8fafc">
              <th style="padding:1.2mm 2mm;text-align:left;border-bottom:1px solid #e5e5e5;font-weight:600;color:#666">Medida</th>
              <th style="padding:1.2mm 2mm;text-align:right;border-bottom:1px solid #e5e5e5;font-weight:600;color:#1d4ed8">${comparison.labelA}</th>
              <th style="padding:1.2mm 2mm;text-align:right;border-bottom:1px solid #e5e5e5;font-weight:600;color:#b45309">${comparison.labelB}</th>
              <th style="padding:1.2mm 2mm;text-align:right;border-bottom:1px solid #e5e5e5;font-weight:600;color:#666">Δ</th>
            </tr>
            ${active.map(m => {
              const vA = dA[m.key]
              const vB = dB[m.key]
              const delta = (vB ?? 0) - (vA ?? 0)
              const isGood = m.lowerBetter ? delta <= 0 : delta >= 0
              const deltaColor = vA != null && vB != null && delta !== 0 ? (isGood ? '#22c55e' : '#ef4444') : '#888'
              return `<tr>
                <td style="padding:1mm 2mm;border-bottom:0.3px solid #f3f4f6;color:#555">${m.label}</td>
                <td style="padding:1mm 2mm;text-align:right;border-bottom:0.3px solid #f3f4f6;font-weight:600">${vA != null ? vA.toFixed(1) : '—'} <span style="color:#999;font-weight:400">${m.unit}</span></td>
                <td style="padding:1mm 2mm;text-align:right;border-bottom:0.3px solid #f3f4f6;font-weight:600">${vB != null ? vB.toFixed(1) : '—'} <span style="color:#999;font-weight:400">${m.unit}</span></td>
                <td style="padding:1mm 2mm;text-align:right;border-bottom:0.3px solid #f3f4f6;font-weight:700;color:${deltaColor}">${vA != null && vB != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}` : '—'}</td>
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
