// ============================================================================
// PDF GENERATOR — ADAPTIVE LAYOUT
// 1-3 days/week: 4 weeks/page | 4-5 days: 2 weeks/page | 6-7: 1 week/page
// Readable fonts + preparation included
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

  // Determine weeks per page based on days count
  const numDays = schedule.weeks?.[0]?.sessions?.length || freq
  const weeksPerPage = numDays <= 3 ? 4 : numDays <= 5 ? 2 : 1

  // Exercise row
  const exRow = (ex: any) => {
    const l = ex.role === 'FOCO_PRINCIPAL' ? 'F' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? 'S' : 'C'
    const bg = ex.role === 'FOCO_PRINCIPAL' ? '#ffedd5' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? '#f3e8ff' : '#dcfce7'
    const tc = ex.role === 'FOCO_PRINCIPAL' ? '#c2410c' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? '#7c3aed' : '#15803d'
    const tech = ex.technique ? ` <span style="font-size:4pt;background:#fee2e2;color:#dc2626;padding:0.1mm 0.6mm;border-radius:0.3mm;font-weight:600">${ex.technique}</span>` : ''
    return `<div style="display:flex;align-items:center;padding:0.5mm 0.8mm;border-bottom:0.2px solid #f0f0f0;gap:0.8mm;font-size:5pt;line-height:1.2">
      <span style="width:3mm;height:3mm;font-size:4pt;font-weight:700;display:inline-flex;align-items:center;justify-content:center;border-radius:0.4mm;flex-shrink:0;background:${bg};color:${tc}">${l}</span>
      <span style="flex:1;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ex.name}${tech}</span>
      <span style="flex-shrink:0;color:#555;font-size:4pt">${ex.sets}×${ex.reps}</span>
      <span style="flex-shrink:0;color:#d97706;font-size:4pt">${ex.rest || ''}</span>
    </div>`
  }

  // Preparation — compact list
  const genPrep = (prep: any) => {
    if (!prep?.exercises || prep.exercises.length === 0) return ''
    return `<div style="background:#fffbeb;border:0.3px solid #fcd34d;border-radius:0.8mm;padding:0.8mm;margin-bottom:1mm">
      <div style="display:flex;justify-content:space-between;font-size:4.5pt;font-weight:600;color:#b45309;margin-bottom:0.3mm">
        <span>Preparação</span><span style="font-weight:400">${prep.totalTime || ''}</span>
      </div>
      <div style="font-size:4pt;color:#78716c">
        ${prep.exercises.slice(0, 6).map((ex: any) =>
          `<div style="display:flex;justify-content:space-between;padding:0.2mm 0"><span>${ex.name}</span><span>${ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.duration || ''}</span></div>`
        ).join('')}
      </div>
    </div>`
  }

  // Block
  const genBlock = (b: any, idx: number) => `
    <div style="border:0.3px solid #93c5fd;border-radius:0.8mm;margin-bottom:0.8mm;overflow:hidden">
      <div style="background:#eff6ff;padding:0.5mm 0.8mm;font-size:4.5pt;font-weight:600;color:#1e40af;display:flex;justify-content:space-between">
        <span>${b.name || `Bloco ${idx + 1}`}</span><span style="color:#3b82f6;font-weight:400;font-size:4pt">${b.restAfterBlock || ''}</span>
      </div>
      ${b.exercises?.map((e: any) => exRow(e)).join('') || ''}
    </div>`

  // Protocol
  const genProt = (p: any) => {
    if (!p) return ''
    return `<div style="background:#ecfdf5;border:0.3px solid #6ee7b7;border-radius:0.8mm;padding:0.5mm 0.8mm;font-size:4.5pt;color:#047857;margin-top:0.5mm">
      <b>${p.name || ''}</b> <span style="font-weight:400">${p.totalTime || ''}</span>
      ${p.structure ? `<div style="font-size:3.5pt;color:#6b7280;margin-top:0.2mm">${p.structure}</div>` : ''}
    </div>`
  }

  // Session card
  const genSes = (s: any) => `
    <div style="border:0.3px solid #ddd;border-radius:1mm;overflow:hidden">
      <div style="background:${pBg(s.pillar)};padding:0.8mm 1mm;display:flex;align-items:center;gap:1mm;border-bottom:0.3px solid #ddd;font-size:5pt">
        <span style="width:4mm;height:4mm;background:#f59e0b;color:#fff;font-weight:700;font-size:5pt;display:inline-flex;align-items:center;justify-content:center;border-radius:0.5mm;flex-shrink:0">${s.session}</span>
        <b style="flex:1">Dia ${s.session}</b>
        ${s.pillarLabel ? `<span style="font-weight:700;color:${pColor(s.pillar)};font-size:4pt">${s.pillarLabel}</span>` : ''}
        <span style="color:#92400e;font-size:4pt;font-family:monospace">${s.estimatedDuration || 60}'</span>
      </div>
      <div style="padding:0.8mm">
        ${genPrep(s.preparation)}
        ${s.blocks.map((b: any, i: number) => genBlock(b, i)).join('')}
        ${genProt(s.finalProtocol)}
      </div>
    </div>`

  // Week
  const genWeek = (w: any) => {
    const n = w.sessions?.length || 3
    const c = n <= 3 ? 3 : n <= 5 ? n : 3
    return `
    <div style="margin-bottom:2mm">
      <div style="display:flex;align-items:center;gap:1.5mm;margin-bottom:1.5mm;border-bottom:0.3px solid #eee;padding-bottom:0.8mm">
        <span style="width:6mm;height:6mm;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-weight:700;font-size:6pt;display:inline-flex;align-items:center;justify-content:center;border-radius:1mm;flex-shrink:0">${w.week || '?'}</span>
        <b style="font-size:6.5pt">Semana ${w.week}</b>
        ${w.phaseLabel ? `<span style="font-size:4.5pt;color:#888">Fase: ${w.phaseLabel}</span>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:repeat(${c}, 1fr);gap:1.5mm">
        ${w.sessions.map((s: any) => genSes(s)).join('')}
      </div>
    </div>`
  }

  // Group weeks
  const allWeeks = schedule.weeks || []
  const pages: any[][] = []
  for (let i = 0; i < allWeeks.length; i += weeksPerPage) {
    pages.push(allWeeks.slice(i, i + weeksPerPage))
  }

  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Treino ${workout.client.name}</title>
<style>
@page{size:A4 portrait;margin:5mm 5mm 6mm 5mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:5pt;color:#1a1a1a;line-height:1.2;background:#fff}
.pg{page-break-after:always}
.pg:last-child{page-break-after:auto}
</style></head><body>
${pages.map((pw, pi) => `
<div class="pg">
  ${pi === 0 ? `
  <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:2mm;margin-bottom:2.5mm;border-bottom:1.5px solid #f59e0b">
    <div style="display:flex;align-items:center;gap:3mm">
      ${logoBase64 ? `<img src="${logoBase64}" style="height:10mm;max-width:25mm;object-fit:contain">` : ''}
      <div>
        <div style="font-size:9pt;font-weight:700">${studioName}</div>
        <div style="font-size:6pt;color:#666"><b>Aluno:</b> ${workout.client.name}</div>
        <div style="font-size:6pt;color:#666"><b>Programa:</b> ${workout.phaseDuration} semanas • ${freq}x/semana</div>
        ${studioPhone ? `<div style="font-size:5pt;color:#999">${studioPhone}${studioEmail ? ` • ${studioEmail}` : ''}</div>` : ''}
      </div>
    </div>
    <div style="text-align:right;font-size:6pt;color:#666">
      <b style="display:block;font-size:7pt;color:#333">Expert Pro Training</b>
      ${new Date().toLocaleDateString('pt-BR')}
    </div>
  </div>` : `<div style="font-size:5pt;color:#888;margin-bottom:2mm;border-bottom:0.5px solid #eee;padding-bottom:1mm"><b>${studioName}</b> — ${workout.client.name} — Semanas ${pi * weeksPerPage + 1}–${Math.min((pi + 1) * weeksPerPage, allWeeks.length)}</div>`}
  ${pw.map(w => genWeek(w)).join('')}
</div>`).join('')}
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
