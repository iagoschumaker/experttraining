// ============================================================================
// PDF GENERATOR — 4 WEEKS PER A4 PAGE
// Ultra-compact: header only on page 1, no preparation, minimal spacing
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

  const pillarColor = (p: string) => p === 'LOWER' ? '#b45309' : p === 'PUSH' ? '#1d4ed8' : '#7c3aed'
  const pillarBg = (p: string) => p === 'LOWER' ? '#fef3c7' : p === 'PUSH' ? '#dbeafe' : '#ede9fe'

  // Exercise row — single compact line
  const exRow = (ex: any) => {
    const label = ex.role === 'FOCO_PRINCIPAL' ? 'F' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? 'S' : 'C'
    const bgColor = ex.role === 'FOCO_PRINCIPAL' ? '#ffedd5' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? '#f3e8ff' : '#dcfce7'
    const textColor = ex.role === 'FOCO_PRINCIPAL' ? '#c2410c' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? '#7c3aed' : '#15803d'
    const tech = ex.technique ? ` <span style="font-size:3.5pt;background:#fee2e2;color:#dc2626;padding:0 0.5mm;border-radius:0.3mm;font-weight:600">${ex.technique}</span>` : ''
    return `<div style="display:flex;align-items:center;padding:0.4mm 0.5mm;border-bottom:0.2px solid #f0f0f0;gap:0.5mm;font-size:4.5pt;line-height:1.2">
      <span style="width:3mm;height:3mm;font-size:3.5pt;font-weight:700;display:inline-flex;align-items:center;justify-content:center;border-radius:0.4mm;flex-shrink:0;background:${bgColor};color:${textColor}">${label}</span>
      <span style="flex:1;font-weight:500;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ex.name}${tech}</span>
      <span style="flex-shrink:0;color:#666;font-size:3.5pt">${ex.sets}×${ex.reps}</span>
      <span style="flex-shrink:0;color:#d97706;font-size:3.5pt">${ex.rest || ''}</span>
    </div>`
  }

  // Block card
  const genBlock = (b: any, idx: number) => `
    <div style="background:#eff6ff;border:0.3px solid #93c5fd;border-radius:0.8mm;padding:0.8mm;margin-bottom:0.8mm">
      <div style="display:flex;justify-content:space-between;font-size:4.5pt;font-weight:600;color:#1e40af;margin-bottom:0.3mm">
        <span>${b.name || `Bloco ${idx + 1}`}</span><span style="font-weight:400;color:#3b82f6;font-size:3.5pt">${b.restAfterBlock || ''}</span>
      </div>
      ${b.exercises?.map((e: any) => exRow(e)).join('') || ''}
    </div>`

  // Protocol — single line
  const genProtocol = (protocol: any) => {
    if (!protocol) return ''
    return `<div style="background:#ecfdf5;border:0.3px solid #6ee7b7;border-radius:0.8mm;padding:0.8mm;margin-top:0.5mm;font-size:4pt;color:#047857">
      <strong>${protocol.name || 'Protocolo'}</strong> — ${protocol.totalTime || ''} ${protocol.structure ? `<span style="color:#6b7280">• ${protocol.structure}</span>` : ''}
    </div>`
  }

  // Session card — no preparation
  const genSession = (s: any) => `
    <div style="border:0.3px solid #ddd;border-radius:1mm;overflow:hidden;display:flex;flex-direction:column">
      <div style="background:${pillarBg(s.pillar)};padding:0.8mm 1mm;display:flex;align-items:center;gap:1mm;border-bottom:0.3px solid #ddd;font-size:4.5pt">
        <span style="width:4mm;height:4mm;background:#f59e0b;color:#fff;font-weight:700;font-size:5pt;display:inline-flex;align-items:center;justify-content:center;border-radius:0.6mm;flex-shrink:0">${s.session}</span>
        <span style="font-weight:600;flex:1">D${s.session}</span>
        ${s.pillarLabel ? `<span style="font-weight:700;color:${pillarColor(s.pillar)};font-size:3.5pt">${s.pillarLabel}</span>` : ''}
        <span style="color:#92400e;font-family:monospace;font-size:3.5pt">${s.estimatedDuration || 60}'</span>
      </div>
      <div style="padding:0.8mm">${s.blocks.map((b: any, i: number) => genBlock(b, i)).join('')}${genProtocol(s.finalProtocol)}</div>
    </div>`

  // Week section
  const genWeek = (w: any) => {
    const numDays = w.sessions?.length || 3
    const cols = numDays <= 3 ? 3 : numDays <= 5 ? numDays : 3
    return `
    <div style="margin-bottom:2.5mm">
      <div style="display:flex;align-items:center;gap:1.5mm;padding-bottom:1mm;margin-bottom:1.5mm;border-bottom:0.3px solid #e5e5e5">
        <span style="width:5.5mm;height:5.5mm;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-weight:700;font-size:6pt;display:inline-flex;align-items:center;justify-content:center;border-radius:1mm;flex-shrink:0">${w.week || '?'}</span>
        <span style="font-size:6pt;font-weight:600;color:#1a1a1a">Sem. ${w.week || '?'}</span>
        ${w.phaseLabel ? `<span style="font-size:4.5pt;color:#888">• ${w.phaseLabel}</span>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:repeat(${cols}, 1fr);gap:1.5mm">
        ${w.sessions.map((s: any) => genSession(s)).join('')}
      </div>
    </div>`
  }

  // Group weeks in batches of 4 for page breaks
  const allWeeks = schedule.weeks || []
  const pages: any[][] = []
  for (let i = 0; i < allWeeks.length; i += 4) {
    pages.push(allWeeks.slice(i, i + 4))
  }

  // Build pages — header only on first page, subsequent pages start at top
  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Treino ${workout.client.name}</title>
<style>
@page{size:A4 portrait;margin:6mm 6mm 8mm 6mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:5pt;color:#1a1a1a;line-height:1.2;background:#fff}
.hdr{padding:3mm 0 2mm;border-bottom:1px solid #f59e0b;margin-bottom:3mm;display:flex;justify-content:space-between;align-items:center}
.hdr img{height:10mm;max-width:25mm;object-fit:contain}
.hdr-l{display:flex;align-items:center;gap:2mm}
.hdr h1{font-size:8pt;font-weight:700;margin-bottom:0.3mm}
.hdr p{font-size:5.5pt;color:#666;margin:0.2mm 0}
.hdr-r{text-align:right;font-size:5.5pt;color:#666}
.hdr-r strong{color:#1a1a1a;display:block;font-size:6pt;margin-bottom:0.3mm}
.pg{page-break-after:always}
.pg:last-child{page-break-after:auto}
.pg-hdr{font-size:5pt;color:#999;border-bottom:0.3px solid #e5e5e5;padding-bottom:1mm;margin-bottom:2mm}
</style></head><body>
${pages.map((pw, pageIdx) => `
<div class="pg">
  ${pageIdx === 0 ? `
  <div class="hdr">
    <div class="hdr-l">
      ${logoBase64 ? `<img src="${logoBase64}" alt="">` : ''}
      <div>
        <h1>${studioName}</h1>
        <p><b>Aluno:</b> ${workout.client.name}</p>
        <p><b>Programa:</b> ${workout.phaseDuration} sem. • ${freq}x/sem.</p>
        ${studioPhone ? `<p>${studioPhone}${studioEmail ? ` • ${studioEmail}` : ''}</p>` : ''}
      </div>
    </div>
    <div class="hdr-r">
      <strong>Expert Pro Training</strong>
      <p>${new Date().toLocaleDateString('pt-BR')}</p>
    </div>
  </div>
  ` : `
  <div class="pg-hdr">${studioName} — ${workout.client.name} — Semanas ${pageIdx * 4 + 1}-${Math.min((pageIdx + 1) * 4, allWeeks.length)}</div>
  `}
  ${pw.map(w => genWeek(w)).join('')}
</div>
`).join('')}
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
