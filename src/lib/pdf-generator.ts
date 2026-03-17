// ============================================================================
// PDF GENERATOR — FORCE 4 WEEKS PER A4 PAGE
// Maximum compaction: zero gaps, abbreviated text, no prep
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

  // Exercise row — absolute minimum height
  const exRow = (ex: any) => {
    const l = ex.role === 'FOCO_PRINCIPAL' ? 'F' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? 'S' : 'C'
    const bg = ex.role === 'FOCO_PRINCIPAL' ? '#ffedd5' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? '#f3e8ff' : '#dcfce7'
    const tc = ex.role === 'FOCO_PRINCIPAL' ? '#c2410c' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? '#7c3aed' : '#15803d'
    const tech = ex.technique ? ` <b style="color:#dc2626;font-size:3pt">[${ex.technique}]</b>` : ''
    return `<div style="display:flex;align-items:center;padding:0.2mm 0.3mm;font-size:4pt;line-height:1.15;border-bottom:0.1px solid #f5f5f5">
      <span style="width:2.5mm;font-size:3pt;font-weight:700;text-align:center;flex-shrink:0;color:${tc}">${l}</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ex.name}${tech}</span>
      <span style="flex-shrink:0;color:#666;font-size:3pt;margin-left:0.5mm">${ex.sets}×${ex.reps} <span style="color:#d97706">${ex.rest || ''}</span></span>
    </div>`
  }

  // Block — minimal wrapper
  const genBlock = (b: any, idx: number) => `
    <div style="border:0.2px solid #bfdbfe;border-radius:0.5mm;margin-bottom:0.5mm;overflow:hidden">
      <div style="background:#eff6ff;padding:0.3mm 0.5mm;font-size:3.5pt;font-weight:600;color:#1e40af;display:flex;justify-content:space-between">
        <span>${b.name || `Bloco ${idx + 1}`}</span><span style="color:#60a5fa;font-weight:400">${b.restAfterBlock || ''}</span>
      </div>
      ${b.exercises?.map((e: any) => exRow(e)).join('') || ''}
    </div>`

  // Protocol — abbreviated single line
  const genProt = (p: any) => {
    if (!p) return ''
    // Shorten structure text
    const s = (p.structure || '').replace('trabalho', 'trab.').replace('descanso', 'desc.').replace('recuperação', 'rec.').replace('Movimentos suaves contínuos', 'Mov. suaves').replace(' rodadas', 'r').replace(' rounds', 'r').replace('Respiração + alongamento ativo', 'Resp. + along.')
    return `<div style="background:#ecfdf5;border:0.2px solid #86efac;border-radius:0.5mm;padding:0.3mm 0.5mm;font-size:3.5pt;color:#047857;margin-top:0.3mm">
      <b>${p.name || ''}</b> ${p.totalTime || ''} ${s ? `• ${s}` : ''}
    </div>`
  }

  // Session — ultra compact
  const genSes = (s: any) => `
    <div style="border:0.2px solid #ddd;border-radius:0.8mm;overflow:hidden">
      <div style="background:${pBg(s.pillar)};padding:0.5mm 0.8mm;display:flex;align-items:center;gap:0.5mm;border-bottom:0.2px solid #ddd;font-size:4pt">
        <span style="width:3.5mm;height:3.5mm;background:#f59e0b;color:#fff;font-weight:700;font-size:4.5pt;display:inline-flex;align-items:center;justify-content:center;border-radius:0.5mm;flex-shrink:0">${s.session}</span>
        <b style="flex:1">D${s.session}</b>
        ${s.pillarLabel ? `<span style="font-weight:700;color:${pColor(s.pillar)};font-size:3pt">${s.pillarLabel}</span>` : ''}
        <span style="color:#92400e;font-size:3pt">${s.estimatedDuration || 60}'</span>
      </div>
      <div style="padding:0.5mm">${s.blocks.map((b: any, i: number) => genBlock(b, i)).join('')}${genProt(s.finalProtocol)}</div>
    </div>`

  // Week — zero margin
  const genWeek = (w: any) => {
    const n = w.sessions?.length || 3
    const c = n <= 3 ? 3 : n <= 5 ? n : 3
    return `
    <div style="margin-bottom:1.5mm">
      <div style="display:flex;align-items:center;gap:1mm;margin-bottom:1mm;border-bottom:0.2px solid #eee;padding-bottom:0.5mm">
        <span style="width:4.5mm;height:4.5mm;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-weight:700;font-size:5pt;display:inline-flex;align-items:center;justify-content:center;border-radius:0.8mm;flex-shrink:0">${w.week || '?'}</span>
        <b style="font-size:5pt">S${w.week}</b>
        ${w.phaseLabel ? `<span style="font-size:3.5pt;color:#999">• ${w.phaseLabel}</span>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:repeat(${c}, 1fr);gap:1mm">
        ${w.sessions.map((s: any) => genSes(s)).join('')}
      </div>
    </div>`
  }

  const allWeeks = schedule.weeks || []
  const pages: any[][] = []
  for (let i = 0; i < allWeeks.length; i += 4) {
    pages.push(allWeeks.slice(i, i + 4))
  }

  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Treino ${workout.client.name}</title>
<style>
@page{size:A4 portrait;margin:5mm 5mm 5mm 5mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:4pt;color:#1a1a1a;line-height:1.15;background:#fff}
.pg{page-break-after:always}
.pg:last-child{page-break-after:auto}
</style></head><body>
${pages.map((pw, pi) => `
<div class="pg">
  ${pi === 0 ? `
  <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:2mm;margin-bottom:2mm;border-bottom:1px solid #f59e0b">
    <div style="display:flex;align-items:center;gap:2mm">
      ${logoBase64 ? `<img src="${logoBase64}" style="height:8mm;max-width:20mm;object-fit:contain">` : ''}
      <div>
        <div style="font-size:7pt;font-weight:700">${studioName}</div>
        <div style="font-size:5pt;color:#666"><b>Aluno:</b> ${workout.client.name} | <b>Programa:</b> ${workout.phaseDuration} sem. • ${freq}x/sem.</div>
        ${studioPhone ? `<div style="font-size:4pt;color:#999">${studioPhone}${studioEmail ? ` • ${studioEmail}` : ''}</div>` : ''}
      </div>
    </div>
    <div style="text-align:right;font-size:5pt;color:#666">
      <b style="display:block;font-size:5.5pt;color:#333">Expert Pro Training</b>
      ${new Date().toLocaleDateString('pt-BR')}
    </div>
  </div>` : `<div style="font-size:4pt;color:#aaa;margin-bottom:1.5mm;border-bottom:0.2px solid #eee;padding-bottom:0.5mm">${studioName} — ${workout.client.name} — Sem. ${pi * 4 + 1}–${Math.min((pi + 1) * 4, allWeeks.length)}</div>`}
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
