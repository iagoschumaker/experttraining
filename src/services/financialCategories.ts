// ============================================================================
// EXPERT PRO TRAINING — PLANO DE CONTAS PADRÃO (DRE)
// ============================================================================
// Seed das categorias financeiras padrão baseadas no plano de contas
// simplificado para DRE fornecido pelo cliente.
// ============================================================================

import prisma from '@/lib/prisma'

interface CategorySeed {
  code: string
  name: string
  type: 'RECEITA' | 'CUSTO' | 'DESPESA'
  children?: CategorySeed[]
}

// ============================================================================
// PLANO DE CONTAS COMPLETO (baseado na planilha Excel do método)
// ============================================================================
const DEFAULT_CATEGORIES: CategorySeed[] = [
  // ─── CUSTOS DIRETOS ───
  {
    code: '01', name: 'Custos Diretos', type: 'CUSTO', children: [
      { code: '01.01', name: 'Fornecedores', type: 'CUSTO' },
      { code: '01.02', name: 'Prestadoras', type: 'CUSTO' },
      { code: '01.03', name: 'Impostos Diretos', type: 'CUSTO' },
    ]
  },
  // ─── IMPOSTOS ───
  {
    code: '02', name: 'Impostos', type: 'CUSTO', children: [
      { code: '02.01', name: 'Simples', type: 'CUSTO' },
      { code: '02.02', name: 'MEI', type: 'CUSTO' },
      { code: '02.03', name: 'IRPF', type: 'CUSTO' },
      { code: '02.04', name: 'ICMS', type: 'CUSTO' },
      { code: '02.05', name: 'ISS', type: 'CUSTO' },
    ]
  },
  // ─── DEDUÇÕES ───
  {
    code: '03', name: 'Deduções', type: 'CUSTO', children: [
      { code: '03.01', name: 'Deduções Prestadoras Variáveis', type: 'CUSTO' },
    ]
  },
  // ─── DESPESAS ADMINISTRATIVAS ───
  {
    code: '04', name: 'Despesas Administrativas', type: 'DESPESA', children: [
      { code: '04.01', name: 'Aluguel', type: 'DESPESA' },
      {
        code: '04.02', name: 'Custos de Cartório', type: 'DESPESA', children: [
          { code: '04.02.01', name: 'Manutenção da Certidão', type: 'DESPESA' },
          { code: '04.02.02', name: 'Tarifa MEI / DAS', type: 'DESPESA' },
          { code: '04.02.03', name: 'Abertura do Salão', type: 'DESPESA' },
        ]
      },
      {
        code: '04.03', name: 'Despesas Financeiras', type: 'DESPESA', children: [
          { code: '04.03.01', name: 'Juros', type: 'DESPESA' },
          { code: '04.03.02', name: 'Custos de Cartório', type: 'DESPESA' },
          { code: '04.03.03', name: 'Administradora de Cartão', type: 'DESPESA' },
        ]
      },
      { code: '04.04', name: 'Aluguel RGI', type: 'DESPESA' },
      { code: '04.05', name: 'Taxa de Administração', type: 'DESPESA' },
      { code: '04.06', name: 'Taxa do Administrador', type: 'DESPESA' },
      { code: '04.07', name: 'Despesas Gerais Variáveis', type: 'DESPESA' },
    ]
  },
  // ─── DESPESAS OPERACIONAIS DETALHADAS ───
  {
    code: '05', name: 'Despesas Operacionais', type: 'DESPESA', children: [
      { code: '05.01', name: 'Utilidades', type: 'DESPESA' },
      { code: '05.02', name: 'Postos e Correios', type: 'DESPESA' },
      { code: '05.03', name: 'Taxas Diversas', type: 'DESPESA' },
      { code: '05.04', name: 'Serviços de Terceiros PJ', type: 'DESPESA' },
      { code: '05.05', name: 'Material de Limpeza e Higiene', type: 'DESPESA' },
      { code: '05.06', name: 'Material de Construção', type: 'DESPESA' },
      { code: '05.07', name: 'Material de Escritório', type: 'DESPESA' },
      { code: '05.08', name: 'Xerox e Impressora', type: 'DESPESA' },
      { code: '05.09', name: 'Refeições e Recargas', type: 'DESPESA' },
      { code: '05.10', name: 'Combustível e Veículos', type: 'DESPESA' },
      { code: '05.11', name: 'Transferências', type: 'DESPESA' },
      { code: '05.12', name: 'Manutenção', type: 'DESPESA' },
    ]
  },
  // ─── EQUIPAMENTOS E INVESTIMENTOS ───
  {
    code: '06', name: 'Equipamentos e Investimentos', type: 'DESPESA', children: [
      { code: '06.01', name: 'Equipamentos de Informática', type: 'DESPESA' },
      { code: '06.02', name: 'Equipamentos de Escritório', type: 'DESPESA' },
      { code: '06.03', name: 'Equipamentos de Segurança', type: 'DESPESA' },
      { code: '06.04', name: 'Imóvel', type: 'DESPESA' },
      { code: '06.05', name: 'Móveis e Utensílios', type: 'DESPESA' },
      { code: '06.06', name: 'Bens e Utensílios', type: 'DESPESA' },
      { code: '06.07', name: 'Veículos', type: 'DESPESA' },
    ]
  },
  // ─── MARKETING E VENDAS ───
  {
    code: '07', name: 'Marketing e Vendas', type: 'DESPESA', children: [
      { code: '07.01', name: 'Anúncios e Marketing Digital', type: 'DESPESA' },
      { code: '07.02', name: 'Assessoria de Imprensa', type: 'DESPESA' },
      { code: '07.03', name: 'Doações e Materiais', type: 'DESPESA' },
      { code: '07.04', name: 'Feiras e Eventos', type: 'DESPESA' },
      { code: '07.05', name: 'Empresas e Folhetos', type: 'DESPESA' },
    ]
  },
  // ─── PESSOAL ───
  {
    code: '08', name: 'Pessoal', type: 'DESPESA', children: [
      { code: '08.01', name: 'Remuneração', type: 'DESPESA' },
      { code: '08.02', name: 'Salário', type: 'DESPESA' },
      { code: '08.03', name: 'Horas Extras', type: 'DESPESA' },
      { code: '08.04', name: 'Adiantamento Salarial', type: 'DESPESA' },
      { code: '08.05', name: '13º Salário', type: 'DESPESA' },
      { code: '08.06', name: 'Férias', type: 'DESPESA' },
      { code: '08.07', name: 'Pró-Labore', type: 'DESPESA' },
      { code: '08.08', name: 'Comissões', type: 'DESPESA' },
      { code: '08.09', name: 'Gratificações', type: 'DESPESA' },
      {
        code: '08.10', name: 'Encargos Sociais', type: 'DESPESA', children: [
          { code: '08.10.01', name: 'INSS', type: 'DESPESA' },
          { code: '08.10.02', name: 'INSS GPS Sindical', type: 'DESPESA' },
          { code: '08.10.03', name: 'JAM 6%', type: 'DESPESA' },
        ]
      },
      {
        code: '08.11', name: 'Benefícios', type: 'DESPESA', children: [
          { code: '08.11.01', name: 'Alimentação', type: 'DESPESA' },
          { code: '08.11.02', name: 'Assistência Médica', type: 'DESPESA' },
          { code: '08.11.03', name: 'Vale Transporte', type: 'DESPESA' },
          { code: '08.11.04', name: 'Cartão Convênio / Vale', type: 'DESPESA' },
        ]
      },
      { code: '08.12', name: 'Rescisão Contratual', type: 'DESPESA' },
      { code: '08.13', name: 'Verbas Rescisórias', type: 'DESPESA' },
      { code: '08.14', name: 'Processos Trabalhistas', type: 'DESPESA' },
    ]
  },
  // ─── INFRAESTRUTURA ───
  {
    code: '09', name: 'Infraestrutura', type: 'DESPESA', children: [
      { code: '09.01', name: 'Equipamento de Informática', type: 'DESPESA' },
      { code: '09.02', name: 'Equipamento de Escritório', type: 'DESPESA' },
      { code: '09.03', name: 'Equipamento de Segurança', type: 'DESPESA' },
      { code: '09.04', name: 'Equipamento Bancário', type: 'DESPESA' },
      { code: '09.05', name: 'Cartão BNDES', type: 'DESPESA' },
      { code: '09.06', name: 'Móveis e Utensílios', type: 'DESPESA' },
      { code: '09.07', name: 'Licenças e Software', type: 'DESPESA' },
      { code: '09.08', name: 'Publicidade e Propaganda', type: 'DESPESA' },
      { code: '09.09', name: 'Licenciados', type: 'DESPESA' },
      { code: '09.10', name: 'Taxa de Licenciamento', type: 'DESPESA' },
    ]
  },
  // ─── OUTRAS DESPESAS ───
  {
    code: '10', name: 'Outras Despesas', type: 'DESPESA', children: [
      { code: '10.01', name: 'Despesas Não Operacionais', type: 'DESPESA' },
      { code: '10.02', name: 'Empréstimos a Funcionários e Licenciados', type: 'DESPESA' },
      { code: '10.03', name: 'Aumento da Cartão Capital', type: 'DESPESA' },
      { code: '10.04', name: 'Debêntures', type: 'DESPESA' },
      { code: '10.05', name: 'Emprestáveis', type: 'DESPESA' },
      { code: '10.06', name: 'Outras Despesas não promocionais', type: 'DESPESA' },
    ]
  },
  // ─── DESPESAS FIXAS OPERACIONAIS ───
  {
    code: '11', name: 'Despesas Fixas Operacionais', type: 'DESPESA', children: [
      { code: '11.01', name: 'Água', type: 'DESPESA' },
      { code: '11.02', name: 'Energia', type: 'DESPESA' },
      { code: '11.03', name: 'Gás', type: 'DESPESA' },
      { code: '11.04', name: 'TV a Cabo', type: 'DESPESA' },
      { code: '11.05', name: 'Internet e Telefone', type: 'DESPESA' },
      { code: '11.06', name: 'Condomínio', type: 'DESPESA' },
      { code: '11.07', name: 'Seguro de Imóvel', type: 'DESPESA' },
      { code: '11.08', name: 'IPTU', type: 'DESPESA' },
      { code: '11.09', name: 'Aluguel', type: 'DESPESA' },
      { code: '11.10', name: 'Condomínio', type: 'DESPESA' },
      { code: '11.11', name: 'Sistema e Licenças', type: 'DESPESA' },
      { code: '11.12', name: 'Consultoria Jurídica', type: 'DESPESA' },
      { code: '11.13', name: 'Contabilidade', type: 'DESPESA' },
    ]
  },
  // ═══════════════════════════════════════════════════════════
  // RECEITAS
  // ═══════════════════════════════════════════════════════════
  {
    code: 'R.01', name: 'Vendas Diretas', type: 'RECEITA', children: [
      { code: 'R.01.01', name: 'Dinheiro', type: 'RECEITA' },
      { code: 'R.01.02', name: 'Cheque', type: 'RECEITA' },
      { code: 'R.01.03', name: 'Cartão Débito', type: 'RECEITA' },
      { code: 'R.01.04', name: 'Cartão Crédito', type: 'RECEITA' },
      { code: 'R.01.05', name: 'PIX', type: 'RECEITA' },
      { code: 'R.01.06', name: 'Parcelado', type: 'RECEITA' },
    ]
  },
  {
    code: 'R.02', name: 'Financeiro', type: 'RECEITA', children: [
      { code: 'R.02.01', name: 'Empréstimos Bancários', type: 'RECEITA' },
      { code: 'R.02.02', name: 'Rendimento sobre Aplicações', type: 'RECEITA' },
      { code: 'R.02.03', name: 'Rendimento de Poupança', type: 'RECEITA' },
    ]
  },
  {
    code: 'R.03', name: 'Receitas Não Operacionais', type: 'RECEITA', children: [
      { code: 'R.03.01', name: 'Venda de Ativo Imobilizado', type: 'RECEITA' },
      { code: 'R.03.02', name: 'Fundos Perdidos', type: 'RECEITA' },
      { code: 'R.03.03', name: 'Venda Intangível', type: 'RECEITA' },
    ]
  },
]

// ============================================================================
// FUNÇÃO DE SEED — Cria categorias recursivamente
// ============================================================================
async function seedCategory(
  cat: CategorySeed,
  studioId: string | null,
  parentId: string | null
): Promise<void> {
  const created = await prisma.financialCategory.upsert({
    where: {
      studioId_code: {
        studioId: studioId ?? '',  // '' for system categories
        code: cat.code,
      }
    },
    update: { name: cat.name, type: cat.type, isSystem: !studioId },
    create: {
      studioId,
      parentId,
      code: cat.code,
      name: cat.name,
      type: cat.type,
      isSystem: !studioId,
      isActive: true,
    },
  })

  if (cat.children) {
    for (const child of cat.children) {
      await seedCategory(child, studioId, created.id)
    }
  }
}

/**
 * Semeia o plano de contas padrão para um studio específico.
 * Se studioId for null, cria como categorias do sistema (template).
 */
export async function seedDefaultCategories(studioId: string): Promise<void> {
  for (const cat of DEFAULT_CATEGORIES) {
    await seedCategory(cat, studioId, null)
  }
}

/**
 * Retorna a árvore de categorias flat (útil para APIs).
 */
export function getDefaultCategoryTree(): CategorySeed[] {
  return DEFAULT_CATEGORIES
}
