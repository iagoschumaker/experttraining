// ============================================================================
// PDF GENERATOR — 4 WEEKS PER A4 PAGE, MODERN DESIGN
// Standalone module used by the workouts list page
// ============================================================================

export async function generateWorkoutPDF(workout: any, schedule: any) {
  const freq = workout.weeklyFrequency || 3
  const studioName = workout.studio?.name || 'Studio'
  const studioLogo = workout.studio?.logoUrl || ''
  const studioPhone = workout.studio?.phone || ''
  const studioEmail = workout.studio?.email || ''

  // Convert logo to base64 (needed for Puppeteer)
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

  // Helper: pillar colors
  const pillarColor = (p: string) => p === 'LOWER' ? '#b45309' : p === 'PUSH' ? '#1d4ed8' : '#7c3aed'
  const pillarBg = (p: string) => p === 'LOWER' ? '#fef3c7' : p === 'PUSH' ? '#dbeafe' : '#ede9fe'

  // Exercise row — two-line layout (name, then sets/reps)
  const exRow = (ex: any) => {
    const label = ex.role === 'FOCO_PRINCIPAL' ? 'F' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? 'S' : 'C'
    const bgColor = ex.role === 'FOCO_PRINCIPAL' ? '#ffedd5' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? '#f3e8ff' : '#dcfce7'
    const textColor = ex.role === 'FOCO_PRINCIPAL' ? '#c2410c' : (ex.role === 'SECUNDARIO' || ex.role === 'PUSH_PULL_INTEGRADO') ? '#7c3aed' : '#15803d'
    const techniqueBadge = ex.technique ? `<span style="font-size:4.5pt;background:#fee2e2;color:#dc2626;padding:0.2mm 0.8mm;border-radius:0.4mm;margin-left:0.5mm;font-weight:600">${ex.technique}</span>` : ''
    return `<div style="display:flex;align-items:flex-start;padding:0.8mm 1mm;border-bottom:0.3px solid #f0f0f0;gap:1mm">
      <span style="width:3.5mm;height:3.5mm;font-size:4.5pt;font-weight:700;display:flex;align-items:center;justify-content:center;border-radius:0.5mm;flex-shrink:0;background:${bgColor};color:${textColor}">${label}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:5.5pt;font-weight:500;line-height:1.3">${ex.name}${techniqueBadge}</div>
        <div style="font-size:4.5pt;color:#888;margin-top:0.2mm">${ex.sets}×${ex.reps} <span style="color:#d97706">${ex.rest || ''}</span></div>
      </div>
    </div>`
  }

  // Preparation block
  const genPrep = (prep: any) => {
    if (!prep?.exercises || prep.exercises.length === 0) return ''
    return `<div style="background:#fffbeb;border:0.5px solid #fcd34d;border-radius:1mm;padding:1.5mm;margin-bottom:1.5mm">
      <div style="display:flex;justify-content:space-between;font-size:5.5pt;font-weight:600;color:#b45309;margin-bottom:0.5mm">
        <span>Preparação</span><span style="font-weight:400">${prep.totalTime || ''}</span>
      </div>
      <div style="font-size:4.5pt;color:#78716c">
        ${prep.exercises.slice(0, 4).map((ex: any) =>
          `<div style="display:flex;justify-content:space-between;padding:0.3mm 0"><span>${ex.name}</span><span>${ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.duration || ''}</span></div>`
        ).join('')}
      </div>
    </div>`
  }

  // Block card
  const genBlock = (b: any, idx: number) => `
    <div style="background:#eff6ff;border:0.5px solid #93c5fd;border-radius:1mm;padding:1.5mm;margin-bottom:1.5mm">
      <div style="display:flex;justify-content:space-between;font-size:5.5pt;font-weight:600;color:#1e40af;margin-bottom:0.5mm">
        <span>${b.name || `Bloco ${idx + 1}`}</span><span style="font-weight:400;color:#3b82f6">${b.restAfterBlock || ''}</span>
      </div>
      ${b.exercises?.map((e: any) => exRow(e)).join('') || ''}
    </div>`

  // Protocol card
  const genProtocol = (protocol: any) => {
    if (!protocol) return ''
    return `<div style="background:#ecfdf5;border:0.5px solid #6ee7b7;border-radius:1mm;padding:1.5mm;margin-top:1mm">
      <div style="display:flex;justify-content:space-between;font-size:5.5pt;font-weight:600;color:#047857">
        <span>${protocol.name || 'Protocolo'}</span><span style="font-weight:400">${protocol.totalTime || ''}</span>
      </div>
      ${protocol.structure ? `<div style="font-size:4.5pt;color:#6b7280;margin-top:0.3mm">${protocol.structure}</div>` : ''}
    </div>`
  }

  // Session card
  const genSession = (s: any) => `
    <div style="border:0.5px solid #e5e5e5;border-radius:1.5mm;overflow:hidden;break-inside:avoid;display:flex;flex-direction:column">
      <div style="background:${pillarBg(s.pillar)};padding:1.5mm 2mm;display:flex;align-items:center;gap:1.5mm;border-bottom:0.5px solid #e5e5e5">
        <span style="width:5mm;height:5mm;background:#f59e0b;color:#fff;font-weight:700;font-size:6pt;display:flex;align-items:center;justify-content:center;border-radius:0.8mm;flex-shrink:0">${s.session}</span>
        <span style="font-weight:600;font-size:6pt;flex:1">Dia ${s.session}</span>
        ${s.pillarLabel ? `<span style="font-size:5pt;font-weight:700;color:${pillarColor(s.pillar)}">${s.pillarLabel}</span>` : ''}
        <span style="font-size:5pt;color:#92400e;font-family:monospace">${s.estimatedDuration || 60}min</span>
      </div>
      <div style="padding:1.5mm;flex:1">${genPrep(s.preparation)}<div style="font-size:5pt;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.3px;margin:1mm 0 0.5mm">Blocos</div>${s.blocks.map((b: any, i: number) => genBlock(b, i)).join('')}${genProtocol(s.finalProtocol)}</div>
    </div>`

  // Week section — compact for 4-per-page
  const genWeek = (w: any) => {
    const numDays = w.sessions?.length || 3
    return `
    <div style="margin-bottom:4mm;break-inside:avoid;page-break-inside:avoid">
      <div style="display:flex;align-items:center;gap:2mm;padding-bottom:1.5mm;margin-bottom:2mm;border-bottom:0.5px solid #e5e5e5">
        <span style="width:7mm;height:7mm;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-weight:700;font-size:8pt;display:flex;align-items:center;justify-content:center;border-radius:1.5mm;flex-shrink:0">${w.week || '?'}</span>
        <div>
          <span style="font-size:8pt;font-weight:600;color:#1a1a1a">Semana ${w.week || '?'}</span>
          ${w.phaseLabel ? `<span style="font-size:6pt;color:#888;margin-left:2mm">Fase: ${w.phaseLabel}</span>` : ''}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(${Math.min(numDays, numDays <= 3 ? 3 : numDays <= 5 ? numDays : 3)}, 1fr);gap:2mm">
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

  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Treino ${workout.client.name}</title>
<style>
@page{size:A4 portrait;margin:8mm 8mm 10mm 8mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:6pt;color:#1a1a1a;line-height:1.25;background:#fff}
.pdf-header{position:fixed;top:0;left:0;right:0;height:22mm;padding:4mm 8mm;border-bottom:1.5px solid #f59e0b;background:#fff;z-index:100}
.header-content{display:flex;justify-content:space-between;align-items:center}
.header-left{display:flex;align-items:center;gap:3mm}
.header-left img{height:12mm;max-width:30mm;object-fit:contain}
.header-info h1{font-size:10pt;font-weight:700;color:#1a1a1a;margin-bottom:0.5mm}
.header-info p{font-size:7pt;color:#666;margin:0.3mm 0;line-height:1.2}
.header-right{text-align:right;font-size:7pt;color:#666}
.header-right strong{color:#1a1a1a;display:block;margin-bottom:0.5mm;font-size:7.5pt}
.pdf-footer{position:fixed;bottom:3mm;left:0;right:0;font-size:5.5pt;text-align:center;color:#bbb}
.pdf-content{margin-top:24mm;margin-bottom:10mm}
.page-section{page-break-after:always;break-after:page}
.page-section:last-child{page-break-after:auto;break-after:auto}
</style></head><body>
<header class="pdf-header">
  <div class="header-content">
  <div class="header-left">
    ${logoBase64 ? `<img src="${logoBase64}" alt="Logo">` : ''}
    <div class="header-info">
      <h1>${studioName}</h1>
      <p><strong>Aluno:</strong> ${workout.client.name}</p>
      <p><strong>Programa:</strong> ${workout.phaseDuration} semanas • ${freq}x/semana</p>
      ${studioPhone ? `<p>${studioPhone}${studioEmail ? ` • ${studioEmail}` : ''}</p>` : ''}
    </div>
  </div>
  <div class="header-right">
    <strong>Método Expert Pro Training</strong>
    <p>Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
  </div>
  </div>
</header>
<main class="pdf-content">
${pages.map((pageWeeks) => `
  <div class="page-section">
    ${pageWeeks.map(w => genWeek(w)).join('')}
  </div>
`).join('')}
</main>
<footer class="pdf-footer">
  <p>METODOLOGIA Expert Pro Training</p>
</footer>
</body></html>`

  // Generate PDF via backend API (Puppeteer)
  const res = await fetch('/api/pdf/treino', {
    method: 'POST',
    body: htmlContent,
    headers: { 'Content-Type': 'text/html' },
    credentials: 'include',
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('Erro ao gerar PDF:', errorText)
    throw new Error('Erro ao gerar PDF. Verifique se o servidor está configurado corretamente.')
  }

  // Download PDF
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

  try {
    a.click()
  } catch {
    window.open(url, '_blank')
  }

  setTimeout(() => {
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }, 1000)
}
