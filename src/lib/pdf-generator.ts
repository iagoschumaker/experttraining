// ============================================================================
// PDF GENERATOR - Standalone PDF generation logic
// ============================================================================

export async function generateWorkoutPDF(workout: any, schedule: any) {
  const freq = workout.weeklyFrequency || 3
  const totalDays = schedule.weeks?.[0]?.sessions?.length || freq
  const studioName = workout.studio?.name || 'Studio'
  const studioLogo = workout.studio?.logoUrl || ''
  const studioPhone = workout.studio?.phone || ''
  const studioEmail = workout.studio?.email || ''

  // Converter logo para base64 (necessário para Puppeteer)
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

  // Gerar linha de exercício
  const exRow = (ex: any) => {
    const label = ex.role === 'FOCO_PRINCIPAL' ? 'F' : ex.role === 'PUSH_PULL_INTEGRADO' ? 'P' : 'C'
    const cls = ex.role === 'FOCO_PRINCIPAL' ? 'ex-f' : ex.role === 'PUSH_PULL_INTEGRADO' ? 'ex-p' : 'ex-c'
    return `<div class="ex-row">
      <span class="ex-badge ${cls}">${label}</span>
      <span class="ex-name">${ex.name}</span>
      <span class="ex-info">${ex.sets}×${ex.reps} <em>${ex.rest || ''}</em></span>
    </div>`
  }

  // Gerar preparação
  const genPrep = (prep: any) => {
    if (!prep?.exercises || prep.exercises.length === 0) return ''
    return `
      <div class="prep-card">
        <div class="prep-header">
          <span>Preparação</span>
          <span class="time">${prep.totalTime || '12 min'}</span>
        </div>
        <div class="prep-content">
          ${prep.exercises.slice(0, 4).map((ex: any) => 
            `<div class="prep-item">
              <span>${ex.name}</span>
              <span>${ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : ex.duration || ''}</span>
            </div>`
          ).join('')}
        </div>
      </div>
    `
  }

  // Gerar bloco
  const genBlock = (b: any, idx: number) => `
    <div class="block-card">
      <div class="block-header">
        <span>${b.name || `Bloco ${idx + 1}`}</span>
        <span class="time">${b.restAfterBlock || ''}</span>
      </div>
      <div class="block-content">
        ${b.exercises?.map((e: any) => exRow(e)).join('') || ''}
      </div>
    </div>
  `

  // Gerar protocolo
  const genProtocol = (protocol: any) => {
    if (!protocol) return ''
    return `
      <div class="prot-card">
        <div class="prot-header">
          <span>${protocol.name || 'Protocolo'}</span>
          <span class="time">${protocol.totalTime || '6 min'}</span>
        </div>
        ${protocol.structure ? `<div class="prot-structure">${protocol.structure}</div>` : ''}
      </div>
    `
  }

  // Gerar sessão/dia
  const genSession = (s: any) => `
    <div class="day-card">
      <div class="day-header">
        <div class="day-badge">${s.session}</div>
        <span class="day-title">Dia ${s.session}</span>
        <span class="day-duration">${s.estimatedDuration || 60} min</span>
      </div>
      <div class="day-content">
        ${genPrep(s.preparation)}
        <div class="blocks-label">Blocos</div>
        ${s.blocks.map((b: any, i: number) => genBlock(b, i)).join('')}
        ${genProtocol(s.finalProtocol)}
      </div>
    </div>
  `

  // Gerar semana
  const genWeek = (w: any, isLast: boolean) => `
    <section class="week-section${isLast ? ' last-week' : ''}">
      <div class="week-header">
        <div class="week-badge">${w.week || '?'}</div>
        <div class="week-info">
          <h2>Semana ${w.week || '?'}</h2>
          ${w.phaseLabel ? `<span class="phase-label">Fase: ${w.phaseLabel}</span>` : ''}
        </div>
      </div>
      <div class="days-grid">
        ${w.sessions.map((s: any) => genSession(s)).join('')}
      </div>
    </section>
  `

  // Layout inteligente baseado no número de dias
  const getLayout = (days: number) => {
    if (days <= 3) return { cols: 3, scale: 1 }
    if (days === 4) return { cols: 2, scale: 0.95 }
    if (days === 5) return { cols: 2, scale: 0.9 }
    if (days === 6) return { cols: 2, scale: 0.85 }
    return { cols: 1, scale: 0.8 }
  }

  const layout = getLayout(totalDays)

  const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Treino ${workout.client.name}</title>
<style>
@page{size:A4 portrait;margin:10mm 10mm 12mm 10mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:8pt;color:#1a1a1a;line-height:1.3;background:#fff}

/* HEADER FIXO E DOMINANTE */
.pdf-header{position:fixed;top:0;left:0;right:0;height:26mm;padding:6mm 8mm;border-bottom:2px solid #f59e0b;background:#fff;z-index:100}
.header-content{display:flex;justify-content:space-between;align-items:center}
.header-left{display:flex;align-items:center;gap:4mm}
.header-left img{height:14mm;max-width:35mm;object-fit:contain}
.header-info h1{font-size:12pt;font-weight:700;color:#1a1a1a;margin-bottom:1mm}
.header-info p{font-size:8.5pt;color:#666;margin:0.4mm 0;line-height:1.3}
.header-right{text-align:right;font-size:8.5pt;color:#666}
.header-right strong{color:#1a1a1a;display:block;margin-bottom:1mm;font-size:9pt}

/* FOOTER FIXO */
.pdf-footer{position:fixed;bottom:4mm;left:0;right:0;font-size:7pt;text-align:center;color:#999}

/* ÁREA DE CONTEÚDO */
.pdf-content{margin-top:28mm;margin-bottom:12mm;transform-origin:top center;transform:scale(${layout.scale})}

/* WEEK SECTION - 1 página por semana */
.week-section{page-break-after:always;break-after:page;page-break-inside:avoid;break-inside:avoid;min-height:calc(100vh - 40mm);page-break-before:auto}
.week-section:not(:first-child){margin-top:30mm}
.week-section.last-week{page-break-after:auto;break-after:auto}
.week-header{display:flex;align-items:center;gap:2mm;padding-bottom:2mm;margin-bottom:4mm;border-bottom:1px solid #e5e5e5;page-break-inside:avoid;break-inside:avoid;page-break-after:avoid;break-after:avoid}
.week-badge{width:9mm;height:9mm;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-weight:700;font-size:10pt;display:flex;align-items:center;justify-content:center;border-radius:2mm;flex-shrink:0}
.week-info{flex:1;min-width:0}
.week-info h2{font-size:11pt;font-weight:600;color:#1a1a1a;margin:0;page-break-before:avoid;break-before:avoid}
.phase-label{font-size:7.5pt;color:#888;margin-left:2mm}

/* DAYS GRID - Dinâmico com CSS variables */
.days-grid{display:grid;grid-template-columns:repeat(${layout.cols}, 1fr);gap:4mm;align-items:stretch}

/* DAY CARD - Cresce para preencher espaço */
.day-card{border:1px solid #e5e5e5;border-radius:2mm;overflow:hidden;break-inside:avoid;page-break-inside:avoid;display:flex;flex-direction:column;height:100%}
.day-header{background:linear-gradient(135deg,#fef3c7,#fef9c3);padding:2.5mm;display:flex;align-items:center;gap:2mm;border-bottom:1px solid #fcd34d}
.day-badge{width:7mm;height:7mm;background:#f59e0b;color:#fff;font-weight:700;font-size:8.5pt;display:flex;align-items:center;justify-content:center;border-radius:1mm}
.day-title{font-weight:600;font-size:8.5pt;flex:1}
.day-duration{font-size:7.5pt;color:#92400e;font-family:monospace}
.day-content{padding:2.5mm;flex:1;display:flex;flex-direction:column;gap:2mm}

/* PREP CARD */
.prep-card{background:#fffbeb;border:1px solid #fcd34d;border-radius:1.5mm;padding:2.5mm;margin-bottom:2mm;break-inside:avoid;page-break-inside:avoid}
.prep-header{display:flex;justify-content:space-between;font-size:8pt;font-weight:600;color:#b45309;margin-bottom:1mm}
.prep-header .time{font-family:monospace;font-weight:400}
.prep-content{font-size:7.5pt;color:#78716c}
.prep-item{display:flex;justify-content:space-between;padding:0.6mm 0}

/* BLOCKS */
.blocks-label{font-size:7.5pt;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.3px;margin:2mm 0 1.5mm}
.block-card{background:#eff6ff;border:1px solid #93c5fd;border-radius:1.5mm;padding:2.5mm;margin-bottom:2mm;break-inside:avoid;page-break-inside:avoid}
.block-header{display:flex;justify-content:space-between;font-size:8pt;font-weight:600;color:#1e40af;margin-bottom:1mm}
.block-header .time{font-family:monospace;font-weight:400;color:#3b82f6}
.block-content{background:#fff;border-radius:1mm;overflow:hidden}

/* EXERCISE ROW */
.ex-row{display:flex;align-items:center;padding:1.5mm;border-bottom:1px solid #e0f2fe;font-size:6pt}
.ex-row:last-child{border-bottom:none}
.ex-badge{width:5mm;height:5mm;font-size:6pt;font-weight:700;display:flex;align-items:center;justify-content:center;border-radius:0.8mm;margin-right:1.5mm;flex-shrink:0}
.ex-f{background:#ffedd5;color:#c2410c}
.ex-p{background:#f3e8ff;color:#7c3aed}
.ex-c{background:#dcfce7;color:#15803d}
.ex-name{flex:1;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:6pt}
.ex-info{font-size:5.5pt;color:#6b7280;margin-left:1mm;white-space:nowrap;flex-shrink:0}
.ex-info em{color:#f59e0b;font-style:normal;margin-left:0.4mm;font-size:5pt}

/* PROTOCOL CARD */
.prot-card{background:#ecfdf5;border:1px solid #6ee7b7;border-radius:1.5mm;padding:2.5mm;margin-top:2mm;break-inside:avoid;page-break-inside:avoid}
.prot-header{display:flex;justify-content:space-between;font-size:8pt;font-weight:600;color:#047857}
.prot-header .time{font-family:monospace;font-weight:400}
.prot-structure{font-size:7.5pt;color:#6b7280;margin-top:1mm}
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
${schedule.weeks?.map((w: any, idx: number) => genWeek(w, idx === schedule.weeks.length - 1)).join('') || ''}
</main>
<footer class="pdf-footer">
  <p>METODOLOGIA Expert Pro Training</p>
</footer>
</body></html>`

  // Gerar PDF via API backend (Puppeteer)
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

  // Download do PDF
  const blob = await res.blob()
  
  // Criar link de download com tipo MIME correto
  const pdfBlob = new Blob([blob], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(pdfBlob)
  
  // Nome do arquivo sanitizado
  const fileName = `Treino_${workout.client.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`

  // Usar window.open como fallback para evitar bloqueio de download
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = fileName
  a.type = 'application/pdf'
  document.body.appendChild(a)
  
  // Tentar click, se falhar, abrir em nova aba
  try {
    a.click()
  } catch {
    window.open(url, '_blank')
  }
  
  // Cleanup após delay
  setTimeout(() => {
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }, 1000)
}
