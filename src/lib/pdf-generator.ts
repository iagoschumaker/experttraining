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

  // Exercise row — single line, ultra compact
  const exRow = (ex: any) => {
    const l = ex.role === 'FOCO_PRINCIPAL' ? 'F' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? 'S' : 'C'
    const bg = ex.role === 'FOCO_PRINCIPAL' ? '#ffedd5' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? '#f3e8ff' : '#dcfce7'
    const tc = ex.role === 'FOCO_PRINCIPAL' ? '#c2410c' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? '#7c3aed' : '#15803d'
    const tech = ex.technique ? ` <span style="font-size:4pt;background:#fee2e2;color:#dc2626;padding:0 0.5mm;border-radius:0.3mm;font-weight:600">${ex.technique}</span>` : ''
    return `<div style="display:flex;align-items:center;padding:0.4mm 0.5mm;border-bottom:0.2px solid #f0f0f0;gap:0.5mm;font-size:5pt;line-height:1.2">
      <span style="width:3mm;font-size:3.5pt;font-weight:700;text-align:center;flex-shrink:0;color:${tc}">${l}</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ex.name}${tech}</span>
      <span style="flex-shrink:0;color:#555;font-size:4pt">${ex.sets}×${ex.reps}</span>
      <span style="flex-shrink:0;color:#d97706;font-size:3.5pt;margin-left:0.3mm">${ex.rest || ''}</span>
    </div>`
  }

  // Preparation — compact
  const genPrep = (prep: any) => {
    if (!prep?.exercises || prep.exercises.length === 0) return ''
    return `<div style="background:#fffbeb;border:0.3px solid #fcd34d;border-radius:0.5mm;padding:0.6mm;margin-bottom:0.8mm">
      <div style="font-size:4.5pt;font-weight:600;color:#b45309;margin-bottom:0.3mm">Preparação <span style="font-weight:400">${prep.totalTime || ''}</span></div>
      <div style="font-size:4pt;color:#78716c">
        ${prep.exercises.map((ex: any) =>
          `<div style="display:flex;justify-content:space-between;padding:0.15mm 0"><span>${ex.name}</span><span>${ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.duration || ''}</span></div>`
        ).join('')}
      </div>
    </div>`
  }

  // Block
  const genBlock = (b: any, idx: number) => `
    <div style="border:0.3px solid #93c5fd;border-radius:0.5mm;margin-bottom:0.6mm;overflow:hidden">
      <div style="background:#eff6ff;padding:0.3mm 0.5mm;font-size:4.5pt;font-weight:600;color:#1e40af;display:flex;justify-content:space-between">
        <span>${b.name || `Bloco ${idx + 1}`}</span><span style="color:#3b82f6;font-weight:400;font-size:3.5pt">${b.restAfterBlock || ''}</span>
      </div>
      ${b.exercises?.map((e: any) => exRow(e)).join('') || ''}
    </div>`

  // Protocol
  const genProt = (p: any) => {
    if (!p) return ''
    return `<div style="background:#ecfdf5;border:0.3px solid #6ee7b7;border-radius:0.5mm;padding:0.4mm 0.5mm;font-size:4pt;color:#047857;margin-top:0.4mm">
      <b>${p.name || ''}</b> ${p.totalTime || ''} ${p.structure ? `<span style="color:#6b7280">• ${p.structure}</span>` : ''}
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

  // Pillar cards in grid
  const pillarGrid = `<div style="display:grid;grid-template-columns:repeat(${numPillars}, 1fr);gap:2mm;margin-bottom:3mm">
    ${Object.entries(pillarSessions).map(([pillar, session]: [string, any]) => `
    <div style="border:0.5px solid ${pBorder(pillar)};border-radius:1.5mm;overflow:hidden">
      <div style="background:${pBg(pillar)};padding:1mm 2mm;border-bottom:0.5px solid ${pBorder(pillar)};display:flex;align-items:center;gap:1mm">
        <span style="font-size:7pt;font-weight:700;color:${pColor(pillar)}">${session.pillarLabel || pillar}</span>
        <span style="font-size:5pt;color:#666;margin-left:auto">${session.estimatedDuration || 60}min</span>
      </div>
      <div style="padding:1mm">
        ${genPrep(session.preparation)}
        ${session.blocks.map((b: any, i: number) => genBlock(b, i)).join('')}
        ${genProt(session.finalProtocol)}
      </div>
    </div>`).join('')}
  </div>`

  // Rotation table — compact
  const allWeeks = schedule.weeks || []
  const rotTable = `<div style="margin-bottom:2mm">
    <div style="font-size:7pt;font-weight:700;margin-bottom:1.5mm">🔄 Rotação Semanal</div>
    <table style="width:100%;border-collapse:collapse;font-size:5.5pt">
      <tr style="background:#f8fafc">
        <th style="padding:0.8mm 1.5mm;text-align:left;border-bottom:0.5px solid #e5e5e5;font-weight:700">Sem</th>
        ${week1.sessions.map((_: any, i: number) => `<th style="padding:0.8mm;text-align:center;border-bottom:0.5px solid #e5e5e5">Dia ${i + 1}</th>`).join('')}
      </tr>
      ${allWeeks.map((w: any) => `<tr>
        <td style="padding:0.5mm 1.5mm;font-weight:600;border-bottom:0.3px solid #eee">${w.week}</td>
        ${w.sessions.map((s: any) => `<td style="padding:0.5mm;text-align:center;border-bottom:0.3px solid #eee">
          <span style="background:${pBg(s.pillar)};color:${pColor(s.pillar)};padding:0.3mm 1mm;border-radius:0.4mm;font-weight:600;font-size:4.5pt">${s.pillarLabel || ''}</span>
        </td>`).join('')}
      </tr>`).join('')}
    </table>
  </div>`

  // Progression table — compact
  const progTable = `<div>
    <div style="font-size:7pt;font-weight:700;margin-bottom:1.5mm">📊 Progressão Semanal</div>
    <table style="width:100%;border-collapse:collapse;font-size:5.5pt">
      <tr style="background:#f8fafc">
        <th style="padding:0.8mm 1.5mm;text-align:left;border-bottom:0.5px solid #e5e5e5">Sem</th>
        <th style="padding:0.8mm;text-align:left;border-bottom:0.5px solid #e5e5e5">Fase</th>
        <th style="padding:0.8mm;text-align:left;border-bottom:0.5px solid #e5e5e5;color:#c2410c">Foco(F)</th>
        <th style="padding:0.8mm;text-align:left;border-bottom:0.5px solid #e5e5e5;color:#7c3aed">Sec(S)</th>
        <th style="padding:0.8mm;text-align:left;border-bottom:0.5px solid #e5e5e5;color:#15803d">Core(C)</th>
        <th style="padding:0.8mm;text-align:left;border-bottom:0.5px solid #e5e5e5;color:#d97706">Desc.</th>
        <th style="padding:0.8mm;text-align:left;border-bottom:0.5px solid #e5e5e5;color:#047857">Protocolo</th>
      </tr>
      ${allWeeks.map((w: any) => {
        const s = w.sessions?.[0]
        const fEx = s?.blocks?.[0]?.exercises?.[0]
        const sEx = s?.blocks?.[0]?.exercises?.find((e: any) => e.role === 'SECUNDARIO' || e.role === 'PUSH_PULL_INTEGRADO')
        const cEx = s?.blocks?.[0]?.exercises?.find((e: any) => e.role === 'CORE_STABILITY')
        return `<tr>
          <td style="padding:0.5mm 1.5mm;font-weight:600;border-bottom:0.3px solid #eee">${w.week}</td>
          <td style="padding:0.5mm;border-bottom:0.3px solid #eee;color:#666">${w.phaseLabel || ''}</td>
          <td style="padding:0.5mm;border-bottom:0.3px solid #eee"><b style="color:#c2410c">${fEx ? `${fEx.sets}×${fEx.reps}` : ''}</b></td>
          <td style="padding:0.5mm;border-bottom:0.3px solid #eee;color:#7c3aed">${sEx ? `${sEx.sets}×${sEx.reps}` : ''}</td>
          <td style="padding:0.5mm;border-bottom:0.3px solid #eee;color:#15803d">${cEx ? `${cEx.sets}×${cEx.reps}` : ''}</td>
          <td style="padding:0.5mm;border-bottom:0.3px solid #eee;color:#d97706">${fEx?.rest || ''}</td>
          <td style="padding:0.5mm;border-bottom:0.3px solid #eee;color:#047857">${s?.finalProtocol?.name || ''}</td>
        </tr>`
      }).join('')}
    </table>
  </div>`

  // Put rotation + progression side by side
  const bottomGrid = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm">${rotTable}${progTable}</div>`

  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Treino ${workout.client.name}</title>
<style>
@page{size:A4 portrait;margin:5mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:5pt;color:#1a1a1a;line-height:1.2;background:#fff}
</style></head><body>

<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:2mm;margin-bottom:2mm;border-bottom:1.5px solid #f59e0b">
  <div style="display:flex;align-items:center;gap:2mm">
    ${logoBase64 ? `<img src="${logoBase64}" style="height:9mm;max-width:22mm;object-fit:contain">` : ''}
    <div>
      <div style="font-size:9pt;font-weight:700">${studioName}</div>
      <div style="font-size:5.5pt;color:#666"><b>Aluno:</b> ${workout.client.name} | <b>Programa:</b> ${workout.phaseDuration} sem. • ${freq}x/sem.</div>
      ${studioPhone ? `<div style="font-size:4.5pt;color:#999">${studioPhone}${studioEmail ? ` • ${studioEmail}` : ''}</div>` : ''}
    </div>
  </div>
  <div style="text-align:right;font-size:5.5pt;color:#666">
    <b style="display:block;font-size:6pt;color:#333">Expert Pro Training</b>
    ${new Date().toLocaleDateString('pt-BR')}
  </div>
</div>

<div style="font-size:8pt;font-weight:700;margin-bottom:2mm">📋 Exercícios por Pilar</div>
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
