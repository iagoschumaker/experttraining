// ============================================================================
// EXPERT PRO TRAINING — FINANCIAL PDF GENERATORS
// ============================================================================
// 1. Comprovante de Pagamento
// 2. Boleto/Cobrança
// 3. Relatório Mensal
// ============================================================================

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('pt-BR')

interface StudioInfo {
  name: string; logoUrl?: string; phone?: string; email?: string; cnpj?: string; address?: string
}

async function logoToBase64(url?: string): Promise<string> {
  if (!url) return ''
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return await new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch { return '' }
}

async function generatePDF(html: string, filename: string) {
  const res = await fetch('/api/pdf/treino', {
    method: 'POST', body: html,
    headers: { 'Content-Type': 'text/html' },
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Erro ao gerar PDF')
  const blob = await res.blob()
  const pdfBlob = new Blob([blob], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(pdfBlob)
  const a = document.createElement('a')
  a.style.display = 'none'; a.href = url; a.download = filename; a.type = 'application/pdf'
  document.body.appendChild(a)
  try { a.click() } catch { window.open(url, '_blank') }
  setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url) }, 1000)
}

// ============================================================================
// 1. COMPROVANTE DE PAGAMENTO
// ============================================================================
interface PaymentReceiptData {
  studio: StudioInfo
  clientName: string; planName: string; amount: number
  paymentMethod: string; paymentDate: string; period: string
  receiptId: string
}

export async function generatePaymentReceiptPDF(data: PaymentReceiptData) {
  const logo = await logoToBase64(data.studio.logoUrl)
  const authCode = `AUTH-${Date.now().toString(36).toUpperCase()}`

  const METHODS: Record<string, string> = {
    PIX: 'PIX', DINHEIRO: 'Dinheiro', CARTAO_DEBITO: 'Cartão Débito',
    CARTAO_CREDITO: 'Cartão Crédito', TRANSFERENCIA: 'Transferência', BOLETO: 'Boleto',
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Comprovante</title>
<style>
@page{size:A4 portrait;margin:15mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;background:#fff}
</style></head><body>

<div style="border:2px solid #10b981;border-radius:8px;padding:30px;max-width:600px;margin:0 auto">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #10b981;padding-bottom:15px;margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:12px">
      ${logo ? `<img src="${logo}" style="height:40px;max-width:100px;object-fit:contain">` : ''}
      <div>
        <div style="font-size:16pt;font-weight:700">${data.studio.name}</div>
        ${data.studio.cnpj ? `<div style="font-size:8pt;color:#666">CNPJ: ${data.studio.cnpj}</div>` : ''}
        ${data.studio.phone ? `<div style="font-size:8pt;color:#666">${data.studio.phone}</div>` : ''}
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:14pt;font-weight:700;color:#10b981">COMPROVANTE</div>
      <div style="font-size:8pt;color:#666">DE PAGAMENTO</div>
    </div>
  </div>

  <!-- Info -->
  <table style="width:100%;font-size:11pt;margin-bottom:20px">
    <tr><td style="padding:6px 0;color:#666;width:140px">Aluno:</td><td style="font-weight:600">${data.clientName}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Plano:</td><td style="font-weight:600">${data.planName}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Período:</td><td>${data.period}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Data Pagamento:</td><td>${fmtDate(data.paymentDate)}</td></tr>
    <tr><td style="padding:6px 0;color:#666">Forma:</td><td>${METHODS[data.paymentMethod] || data.paymentMethod}</td></tr>
  </table>

  <!-- Amount -->
  <div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;padding:20px;text-align:center;margin-bottom:20px">
    <div style="font-size:10pt;color:#047857;margin-bottom:5px">VALOR PAGO</div>
    <div style="font-size:28pt;font-weight:800;color:#059669">${fmt(data.amount)}</div>
  </div>

  <!-- Auth -->
  <div style="text-align:center;padding:15px 0;border-top:1px dashed #ccc">
    <div style="font-size:8pt;color:#999">Código de Autenticação</div>
    <div style="font-size:11pt;font-weight:600;letter-spacing:2px;color:#333">${authCode}</div>
    <div style="font-size:7pt;color:#999;margin-top:8px">Documento gerado em ${new Date().toLocaleString('pt-BR')}</div>
  </div>
</div>

</body></html>`

  await generatePDF(html, `Comprovante_${data.clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ============================================================================
// 2. COBRANÇA
// ============================================================================
interface InvoiceData {
  studio: StudioInfo
  clientName: string; clientEmail?: string; planName: string
  amount: number; dueDate: string; period: string; invoiceNumber: string
  pixKey?: string; bankInfo?: string
}

export async function generateInvoicePDF(data: InvoiceData) {
  const logo = await logoToBase64(data.studio.logoUrl)

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Cobrança</title>
<style>
@page{size:A4 portrait;margin:15mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;background:#fff}
</style></head><body>

<div style="max-width:650px;margin:0 auto">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #f59e0b;padding-bottom:15px;margin-bottom:25px">
    <div style="display:flex;align-items:center;gap:12px">
      ${logo ? `<img src="${logo}" style="height:40px;max-width:100px;object-fit:contain">` : ''}
      <div>
        <div style="font-size:16pt;font-weight:700">${data.studio.name}</div>
        ${data.studio.cnpj ? `<div style="font-size:8pt;color:#666">CNPJ: ${data.studio.cnpj}</div>` : ''}
        ${data.studio.address ? `<div style="font-size:8pt;color:#666">${data.studio.address}</div>` : ''}
        ${data.studio.phone ? `<div style="font-size:8pt;color:#666">${data.studio.phone} ${data.studio.email ? `· ${data.studio.email}` : ''}</div>` : ''}
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:14pt;font-weight:700;color:#d97706">COBRANÇA</div>
      <div style="font-size:8pt;color:#666">Nº ${data.invoiceNumber}</div>
    </div>
  </div>

  <!-- Client -->
  <div style="background:#f9fafb;border-radius:8px;padding:15px;margin-bottom:20px">
    <div style="font-size:9pt;color:#666;margin-bottom:5px">COBRAR DE:</div>
    <div style="font-size:13pt;font-weight:700">${data.clientName}</div>
    ${data.clientEmail ? `<div style="font-size:9pt;color:#666">${data.clientEmail}</div>` : ''}
  </div>

  <!-- Details -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr style="background:#f9fafb">
      <th style="padding:10px;text-align:left;font-size:9pt;color:#666;border-bottom:1px solid #e5e7eb">DESCRIÇÃO</th>
      <th style="padding:10px;text-align:center;font-size:9pt;color:#666;border-bottom:1px solid #e5e7eb">PERÍODO</th>
      <th style="padding:10px;text-align:right;font-size:9pt;color:#666;border-bottom:1px solid #e5e7eb">VALOR</th>
    </tr>
    <tr>
      <td style="padding:12px 10px;font-size:11pt;border-bottom:1px solid #f3f4f6">${data.planName}</td>
      <td style="padding:12px 10px;text-align:center;font-size:10pt;color:#666;border-bottom:1px solid #f3f4f6">${data.period}</td>
      <td style="padding:12px 10px;text-align:right;font-size:11pt;font-weight:700;border-bottom:1px solid #f3f4f6">${fmt(data.amount)}</td>
    </tr>
    <tr>
      <td colspan="2" style="padding:12px 10px;text-align:right;font-size:12pt;font-weight:700">TOTAL:</td>
      <td style="padding:12px 10px;text-align:right;font-size:14pt;font-weight:800;color:#059669">${fmt(data.amount)}</td>
    </tr>
  </table>

  <!-- Due Date -->
  <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:15px;text-align:center;margin-bottom:20px">
    <div style="font-size:10pt;color:#92400e">VENCIMENTO</div>
    <div style="font-size:20pt;font-weight:800;color:#d97706">${fmtDate(data.dueDate)}</div>
  </div>

  <!-- Payment Instructions -->
  <div style="border:1px solid #e5e7eb;border-radius:8px;padding:15px">
    <div style="font-size:10pt;font-weight:700;margin-bottom:10px">Instruções de Pagamento</div>
    ${data.pixKey ? `<div style="font-size:9pt;margin-bottom:5px"><b>PIX:</b> ${data.pixKey}</div>` : ''}
    ${data.bankInfo ? `<div style="font-size:9pt;margin-bottom:5px"><b>Dados Bancários:</b> ${data.bankInfo}</div>` : ''}
    <div style="font-size:8pt;color:#999;margin-top:10px">Após o pagamento, solicite seu comprovante ao studio.</div>
  </div>

  <div style="text-align:center;margin-top:20px;font-size:7pt;color:#999">
    Documento gerado em ${new Date().toLocaleString('pt-BR')}
  </div>
</div>

</body></html>`

  await generatePDF(html, `Cobranca_${data.clientName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

// ============================================================================
// 3. RELATÓRIO MENSAL
// ============================================================================
interface MonthlyReportData {
  studio: StudioInfo; month: number; year: number
  totalReceita: number; totalDespesa: number; totalCusto: number
  lucroBruto: number; lucroLiquido: number
  entries: { description: string; type: string; amount: number; date: string; status: string; category: string }[]
  topCategories: { name: string; total: number; type: string }[]
}

export async function generateMonthlyReportPDF(data: MonthlyReportData) {
  const logo = await logoToBase64(data.studio.logoUrl)
  const MONTHS = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const monthLabel = `${MONTHS[data.month]} ${data.year}`
  const maxBar = Math.max(data.totalReceita, data.totalDespesa + data.totalCusto, 1)

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Relatório ${monthLabel}</title>
<style>
@page{size:A4 portrait;margin:10mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;background:#fff;font-size:8pt}
</style></head><body>

<!-- Header -->
<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #3b82f6;padding-bottom:10px;margin-bottom:15px">
  <div style="display:flex;align-items:center;gap:10px">
    ${logo ? `<img src="${logo}" style="height:30px;max-width:80px;object-fit:contain">` : ''}
    <div>
      <div style="font-size:12pt;font-weight:700">${data.studio.name}</div>
      <div style="font-size:8pt;color:#666">Relatório Financeiro — ${monthLabel}</div>
    </div>
  </div>
  <div style="text-align:right;font-size:7pt;color:#666">${new Date().toLocaleDateString('pt-BR')}</div>
</div>

<!-- Summary Cards -->
<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:15px">
  <div style="border:1px solid #6ee7b7;border-radius:6px;padding:10px;text-align:center;background:#ecfdf5">
    <div style="font-size:7pt;color:#047857">RECEITAS</div>
    <div style="font-size:14pt;font-weight:800;color:#059669">${fmt(data.totalReceita)}</div>
  </div>
  <div style="border:1px solid #fca5a5;border-radius:6px;padding:10px;text-align:center;background:#fef2f2">
    <div style="font-size:7pt;color:#dc2626">DESPESAS</div>
    <div style="font-size:14pt;font-weight:800;color:#ef4444">${fmt(data.totalDespesa)}</div>
  </div>
  <div style="border:1px solid #fcd34d;border-radius:6px;padding:10px;text-align:center;background:#fffbeb">
    <div style="font-size:7pt;color:#92400e">CUSTOS</div>
    <div style="font-size:14pt;font-weight:800;color:#d97706">${fmt(data.totalCusto)}</div>
  </div>
  <div style="border:1px solid #93c5fd;border-radius:6px;padding:10px;text-align:center;background:#eff6ff">
    <div style="font-size:7pt;color:#1d4ed8">LUCRO BRUTO</div>
    <div style="font-size:14pt;font-weight:800;color:#3b82f6">${fmt(data.lucroBruto)}</div>
  </div>
  <div style="border:1px solid ${data.lucroLiquido >= 0 ? '#6ee7b7' : '#fca5a5'};border-radius:6px;padding:10px;text-align:center;background:${data.lucroLiquido >= 0 ? '#ecfdf5' : '#fef2f2'}">
    <div style="font-size:7pt;color:${data.lucroLiquido >= 0 ? '#047857' : '#dc2626'}">LUCRO LÍQUIDO</div>
    <div style="font-size:14pt;font-weight:800;color:${data.lucroLiquido >= 0 ? '#059669' : '#ef4444'}">${fmt(data.lucroLiquido)}</div>
  </div>
</div>

<!-- Chart -->
<div style="margin-bottom:15px">
  <div style="font-size:9pt;font-weight:700;margin-bottom:8px">📊 Visão Geral</div>
  <div style="display:flex;gap:8px;align-items:end;height:40px">
    <div style="flex:1;display:flex;flex-direction:column;align-items:center">
      <div style="width:100%;background:#10b981;border-radius:3px 3px 0 0;height:${Math.round((data.totalReceita / maxBar) * 40)}px"></div>
      <span style="font-size:6pt;color:#666;margin-top:2px">Receitas</span>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center">
      <div style="width:100%;background:#ef4444;border-radius:3px 3px 0 0;height:${Math.round((data.totalDespesa / maxBar) * 40)}px"></div>
      <span style="font-size:6pt;color:#666;margin-top:2px">Despesas</span>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center">
      <div style="width:100%;background:#d97706;border-radius:3px 3px 0 0;height:${Math.round((data.totalCusto / maxBar) * 40)}px"></div>
      <span style="font-size:6pt;color:#666;margin-top:2px">Custos</span>
    </div>
  </div>
</div>

<!-- Top Categories -->
${data.topCategories.length > 0 ? `
<div style="margin-bottom:15px">
  <div style="font-size:9pt;font-weight:700;margin-bottom:5px">🏷️ Top Categorias</div>
  <table style="width:100%;border-collapse:collapse;font-size:8pt">
    <tr style="background:#f8fafc"><th style="padding:5px;text-align:left;border-bottom:1px solid #e5e7eb">Categoria</th><th style="padding:5px;text-align:center;border-bottom:1px solid #e5e7eb">Tipo</th><th style="padding:5px;text-align:right;border-bottom:1px solid #e5e7eb">Total</th></tr>
    ${data.topCategories.map(c => `<tr><td style="padding:4px 5px;border-bottom:0.5px solid #f3f4f6">${c.name}</td><td style="padding:4px;text-align:center;border-bottom:0.5px solid #f3f4f6"><span style="font-size:7pt;padding:1px 5px;border-radius:3px;background:${c.type === 'RECEITA' ? '#ecfdf5' : '#fef2f2'};color:${c.type === 'RECEITA' ? '#059669' : '#ef4444'}">${c.type === 'RECEITA' ? 'Receita' : 'Despesa'}</span></td><td style="padding:4px 5px;text-align:right;font-weight:600;border-bottom:0.5px solid #f3f4f6">${fmt(c.total)}</td></tr>`).join('')}
  </table>
</div>` : ''}

<!-- Entries -->
<div>
  <div style="font-size:9pt;font-weight:700;margin-bottom:5px">📋 Lançamentos (${data.entries.length})</div>
  <table style="width:100%;border-collapse:collapse;font-size:7pt">
    <tr style="background:#f8fafc">
      <th style="padding:4px;text-align:left;border-bottom:1px solid #e5e7eb">Data</th>
      <th style="padding:4px;text-align:left;border-bottom:1px solid #e5e7eb">Descrição</th>
      <th style="padding:4px;text-align:left;border-bottom:1px solid #e5e7eb">Categoria</th>
      <th style="padding:4px;text-align:center;border-bottom:1px solid #e5e7eb">Status</th>
      <th style="padding:4px;text-align:right;border-bottom:1px solid #e5e7eb">Valor</th>
    </tr>
    ${data.entries.map(e => `<tr>
      <td style="padding:3px 4px;border-bottom:0.3px solid #f3f4f6">${fmtDate(e.date)}</td>
      <td style="padding:3px 4px;border-bottom:0.3px solid #f3f4f6;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.description}</td>
      <td style="padding:3px 4px;border-bottom:0.3px solid #f3f4f6;color:#666">${e.category}</td>
      <td style="padding:3px 4px;text-align:center;border-bottom:0.3px solid #f3f4f6"><span style="font-size:6pt;padding:1px 4px;border-radius:3px;background:${e.status === 'PAID' ? '#ecfdf5' : e.status === 'PENDING' ? '#fffbeb' : '#fef2f2'};color:${e.status === 'PAID' ? '#059669' : e.status === 'PENDING' ? '#d97706' : '#ef4444'}">${e.status === 'PAID' ? 'Pago' : e.status === 'PENDING' ? 'Pend.' : 'Canc.'}</span></td>
      <td style="padding:3px 4px;text-align:right;font-weight:600;border-bottom:0.3px solid #f3f4f6;color:${e.type === 'RECEITA' ? '#059669' : '#ef4444'}">${e.type === 'DESPESA' ? '-' : '+'}${fmt(e.amount)}</td>
    </tr>`).join('')}
  </table>
</div>

<div style="text-align:center;margin-top:15px;font-size:6pt;color:#999;border-top:1px solid #e5e7eb;padding-top:8px">
  ${data.studio.name} — Relatório gerado em ${new Date().toLocaleString('pt-BR')} — Expert Pro Training
</div>

</body></html>`

  await generatePDF(html, `Relatorio_${MONTHS[data.month]}_${data.year}.pdf`)
}
