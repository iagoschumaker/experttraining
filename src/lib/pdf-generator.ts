// ============================================================================
// PDF GENERATOR — SMART LAYOUT
// Page 1: Full exercises by pillar (shown ONCE)
// Page 2: Progression table (sets/reps/rest per week)
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

  // ===== PAGE 1: Full exercise layout (from week 1) =====

  const exRow = (ex: any) => {
    const l = ex.role === 'FOCO_PRINCIPAL' ? 'F' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? 'S' : 'C'
    const bg = ex.role === 'FOCO_PRINCIPAL' ? '#ffedd5' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? '#f3e8ff' : '#dcfce7'
    const tc = ex.role === 'FOCO_PRINCIPAL' ? '#c2410c' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? '#7c3aed' : '#15803d'
    const tech = ex.technique ? ` <span style="font-size:5pt;background:#fee2e2;color:#dc2626;padding:0.2mm 1mm;border-radius:0.4mm;font-weight:600">${ex.technique}</span>` : ''
    return `<div style="display:flex;align-items:center;padding:0.8mm 1mm;border-bottom:0.3px solid #f0f0f0;gap:1mm;font-size:6pt;line-height:1.3">
      <span style="width:4mm;height:4mm;font-size:5pt;font-weight:700;display:inline-flex;align-items:center;justify-content:center;border-radius:0.5mm;flex-shrink:0;background:${bg};color:${tc}">${l}</span>
      <span style="flex:1;font-weight:500">${ex.name}${tech}</span>
      <span style="flex-shrink:0;color:#555;font-size:5pt">${ex.sets}×${ex.reps}</span>
      <span style="flex-shrink:0;color:#d97706;font-size:5pt">${ex.rest || ''}</span>
    </div>`
  }

  const genPrep = (prep: any) => {
    if (!prep?.exercises || prep.exercises.length === 0) return ''
    return `<div style="background:#fffbeb;border:0.5px solid #fcd34d;border-radius:1mm;padding:1.2mm;margin-bottom:1.5mm">
      <div style="display:flex;justify-content:space-between;font-size:6pt;font-weight:600;color:#b45309;margin-bottom:0.5mm">
        <span>Preparação</span><span style="font-weight:400">${prep.totalTime || ''}</span>
      </div>
      <div style="font-size:5pt;color:#78716c">
        ${prep.exercises.map((ex: any) =>
          `<div style="display:flex;justify-content:space-between;padding:0.3mm 0"><span>${ex.name}</span><span>${ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.duration || ''}</span></div>`
        ).join('')}
      </div>
    </div>`
  }

  const genBlock = (b: any, idx: number) => `
    <div style="border:0.5px solid #93c5fd;border-radius:1mm;margin-bottom:1mm;overflow:hidden">
      <div style="background:#eff6ff;padding:0.8mm 1mm;font-size:6pt;font-weight:600;color:#1e40af;display:flex;justify-content:space-between">
        <span>${b.name || `Bloco ${idx + 1}`}</span><span style="color:#3b82f6;font-weight:400;font-size:5pt">${b.restAfterBlock || ''}</span>
      </div>
      ${b.exercises?.map((e: any) => exRow(e)).join('') || ''}
    </div>`

  const genProt = (p: any) => {
    if (!p) return ''
    return `<div style="background:#ecfdf5;border:0.5px solid #6ee7b7;border-radius:1mm;padding:0.8mm 1mm;font-size:6pt;color:#047857;margin-top:0.5mm">
      <b>${p.name || ''}</b> <span style="font-weight:400">${p.totalTime || ''}</span>
      ${p.structure ? `<div style="font-size:5pt;color:#6b7280;margin-top:0.3mm">${p.structure}</div>` : ''}
    </div>`
  }

  // Get unique pillars from week 1
  const week1 = schedule.weeks?.[0]
  if (!week1) return

  // Group sessions by pillar (unique)
  const pillarSessions: Record<string, any> = {}
  week1.sessions?.forEach((s: any) => {
    const key = s.pillar || 'UNKNOWN'
    if (!pillarSessions[key]) {
      pillarSessions[key] = s
    }
  })

  // Generate pillar cards for page 1
  const numPillars = Object.keys(pillarSessions).length
  const pillarCards = `<div style="display:grid;grid-template-columns:repeat(${numPillars}, 1fr);gap:3mm">${Object.entries(pillarSessions).map(([pillar, session]: [string, any]) => `
    <div style="border:1px solid ${pBorder(pillar)};border-radius:2mm;overflow:hidden">
      <div style="background:${pBg(pillar)};padding:2mm 3mm;border-bottom:0.5px solid ${pBorder(pillar)};display:flex;align-items:center;justify-content:between;gap:2mm">
        <span style="font-size:9pt;font-weight:700;color:${pColor(pillar)}">${session.pillarLabel || pillar}</span>
        <span style="font-size:6pt;color:#666;margin-left:auto">${session.estimatedDuration || 60} min</span>
      </div>
      <div style="padding:2mm">
        ${genPrep(session.preparation)}
        ${session.blocks.map((b: any, i: number) => genBlock(b, i)).join('')}
        ${genProt(session.finalProtocol)}
      </div>
    </div>
  `).join('')}</div>`

  // ===== PAGE 2+: Progression table =====

  // Build progression data
  const allWeeks = schedule.weeks || []
  const phases: { label: string; weeks: string; reps: string; rest: string; protocol: string }[] = []

  // Group weeks by phase
  let currentPhase = ''
  let phaseStart = 0
  allWeeks.forEach((w: any, idx: number) => {
    const phase = w.phaseLabel || w.phase || ''
    if (phase !== currentPhase) {
      if (currentPhase) {
        const refWeek = allWeeks[phaseStart]
        const refEx = refWeek?.sessions?.[0]?.blocks?.[0]?.exercises?.[0]
        const refProt = refWeek?.sessions?.[0]?.finalProtocol
        phases.push({
          label: currentPhase,
          weeks: `${phaseStart + 1}–${idx}`,
          reps: refEx ? `${refEx.sets}×${refEx.reps}` : '',
          rest: refEx?.rest || '',
          protocol: refProt?.name || '',
        })
      }
      currentPhase = phase
      phaseStart = idx
    }
    if (idx === allWeeks.length - 1) {
      const refWeek = allWeeks[phaseStart]
      const refEx = refWeek?.sessions?.[0]?.blocks?.[0]?.exercises?.[0]
      const refProt = refWeek?.sessions?.[0]?.finalProtocol
      phases.push({
        label: currentPhase,
        weeks: `${phaseStart + 1}–${idx + 1}`,
        reps: refEx ? `${refEx.sets}×${refEx.reps}` : '',
        rest: refEx?.rest || '',
        protocol: refProt?.name || '',
      })
    }
  })

  // Build weekly detail rows for progression
  const weekRows = allWeeks.map((w: any) => {
    const s = w.sessions?.[0]
    const focoEx = s?.blocks?.[0]?.exercises?.[0]
    const secEx = s?.blocks?.[0]?.exercises?.find((e: any) => e.role === 'SECUNDARIO' || e.role === 'PUSH_PULL_INTEGRADO')
    const coreEx = s?.blocks?.[0]?.exercises?.find((e: any) => e.role === 'CORE_STABILITY')
    return `<tr>
      <td style="padding:1.5mm 2mm;font-weight:600;border-bottom:0.5px solid #eee">Sem ${w.week}</td>
      <td style="padding:1.5mm 2mm;border-bottom:0.5px solid #eee;color:#666">${w.phaseLabel || ''}</td>
      <td style="padding:1.5mm 2mm;border-bottom:0.5px solid #eee"><b style="color:#c2410c">${focoEx ? `${focoEx.sets}×${focoEx.reps}` : ''}</b></td>
      <td style="padding:1.5mm 2mm;border-bottom:0.5px solid #eee;color:#7c3aed">${secEx ? `${secEx.sets}×${secEx.reps}` : ''}</td>
      <td style="padding:1.5mm 2mm;border-bottom:0.5px solid #eee;color:#15803d">${coreEx ? `${coreEx.sets}×${coreEx.reps}` : ''}</td>
      <td style="padding:1.5mm 2mm;border-bottom:0.5px solid #eee;color:#d97706">${focoEx?.rest || ''}</td>
      <td style="padding:1.5mm 2mm;border-bottom:0.5px solid #eee;color:#047857">${s?.finalProtocol?.name || ''}</td>
    </tr>`
  }).join('')

  const progressionTable = `
    <div style="margin-top:4mm">
      <h2 style="font-size:10pt;font-weight:700;margin-bottom:3mm;color:#1a1a1a">📊 Progressão Semanal</h2>
      <table style="width:100%;border-collapse:collapse;font-size:6.5pt">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:2mm;text-align:left;border-bottom:1px solid #e5e5e5;font-weight:700">Semana</th>
            <th style="padding:2mm;text-align:left;border-bottom:1px solid #e5e5e5;font-weight:700">Fase</th>
            <th style="padding:2mm;text-align:left;border-bottom:1px solid #e5e5e5;font-weight:700;color:#c2410c">Foco (F)</th>
            <th style="padding:2mm;text-align:left;border-bottom:1px solid #e5e5e5;font-weight:700;color:#7c3aed">Sec. (S)</th>
            <th style="padding:2mm;text-align:left;border-bottom:1px solid #e5e5e5;font-weight:700;color:#15803d">Core (C)</th>
            <th style="padding:2mm;text-align:left;border-bottom:1px solid #e5e5e5;font-weight:700;color:#d97706">Descanso</th>
            <th style="padding:2mm;text-align:left;border-bottom:1px solid #e5e5e5;font-weight:700;color:#047857">Protocolo Final</th>
          </tr>
        </thead>
        <tbody>${weekRows}</tbody>
      </table>
    </div>
  `

  // Pillar rotation schedule
  const rotationRows = allWeeks.map((w: any) => {
    return `<tr>
      <td style="padding:1mm 2mm;font-weight:600;border-bottom:0.3px solid #eee">Sem ${w.week}</td>
      ${w.sessions.map((s: any) => `
        <td style="padding:1mm 2mm;border-bottom:0.3px solid #eee;text-align:center">
          <span style="background:${pBg(s.pillar)};color:${pColor(s.pillar)};padding:0.5mm 1.5mm;border-radius:0.5mm;font-weight:600;font-size:5.5pt">${s.pillarLabel || ''}</span>
        </td>
      `).join('')}
    </tr>`
  }).join('')

  const rotationTable = `
    <div style="margin-top:4mm">
      <h2 style="font-size:10pt;font-weight:700;margin-bottom:3mm;color:#1a1a1a">🔄 Rotação Semanal dos Pilares</h2>
      <table style="width:100%;border-collapse:collapse;font-size:6.5pt">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:1.5mm 2mm;text-align:left;border-bottom:1px solid #e5e5e5">Semana</th>
            ${week1.sessions.map((_: any, i: number) => `<th style="padding:1.5mm 2mm;text-align:center;border-bottom:1px solid #e5e5e5">Dia ${i + 1}</th>`).join('')}
          </tr>
        </thead>
        <tbody>${rotationRows}</tbody>
      </table>
    </div>
  `

  // ===== BUILD HTML =====
  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Treino ${workout.client.name}</title>
<style>
@page{size:A4 portrait;margin:8mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:7pt;color:#1a1a1a;line-height:1.3;background:#fff}
.pg{page-break-after:always}
.pg:last-child{page-break-after:auto}
h2{page-break-after:avoid}
</style></head><body>

<!-- PAGE 1: Header + Exercises by Pillar -->
<div class="pg">
  <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:3mm;margin-bottom:4mm;border-bottom:2px solid #f59e0b">
    <div style="display:flex;align-items:center;gap:3mm">
      ${logoBase64 ? `<img src="${logoBase64}" style="height:12mm;max-width:30mm;object-fit:contain">` : ''}
      <div>
        <div style="font-size:12pt;font-weight:700">${studioName}</div>
        <div style="font-size:7pt;color:#666"><b>Aluno:</b> ${workout.client.name}</div>
        <div style="font-size:7pt;color:#666"><b>Programa:</b> ${workout.phaseDuration} semanas • ${freq}x/semana</div>
        ${studioPhone ? `<div style="font-size:6pt;color:#999">${studioPhone}${studioEmail ? ` • ${studioEmail}` : ''}</div>` : ''}
      </div>
    </div>
    <div style="text-align:right;font-size:7pt;color:#666">
      <b style="display:block;font-size:8pt;color:#333">Expert Pro Training</b>
      ${new Date().toLocaleDateString('pt-BR')}
    </div>
  </div>

  <h2 style="font-size:11pt;font-weight:700;margin-bottom:4mm;color:#1a1a1a">📋 Exercícios por Pilar</h2>
  ${pillarCards}
</div>

<!-- PAGE 2: Progression + Rotation -->
<div>
  <div style="font-size:6pt;color:#888;margin-bottom:3mm;border-bottom:0.5px solid #eee;padding-bottom:1mm"><b>${studioName}</b> — ${workout.client.name}</div>
  ${rotationTable}
  ${progressionTable}
</div>

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
