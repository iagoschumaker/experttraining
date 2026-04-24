// ============================================================================
// EXPERT PRO TRAINING — MERCADO PAGO INTEGRATION SERVICE
// ============================================================================
// Preparação para integração com Mercado Pago (PIX, boleto, cartão)
// Este serviço encapsula as chamadas à API do MP para facilitar a integração.
//
// PARA ATIVAR:
// 1. Adicionar MERCADOPAGO_ACCESS_TOKEN no .env
// 2. Adicionar MERCADOPAGO_WEBHOOK_SECRET no .env  
// 3. Configurar webhook no painel do MP: /api/webhooks/mercadopago
// ============================================================================

export interface MercadoPagoConfig {
  accessToken: string
  webhookSecret?: string
  notificationUrl?: string
}

export interface CreatePaymentInput {
  /** Valor em reais */
  amount: number
  /** Descrição do pagamento */
  description: string
  /** Email do pagador */
  payerEmail: string
  /** Nome do pagador */
  payerName: string
  /** CPF do pagador */
  payerCpf?: string
  /** Referência externa (ex: studioId, subscriptionId) */
  externalReference: string
  /** Métodos aceitos: pix, boleto, credit_card, debit_card */
  paymentMethods?: string[]
  /** Data de expiração (para PIX/boleto) */
  expirationDate?: Date
  /** Parcelas máximas (cartão crédito) */
  maxInstallments?: number
  /** URL de notificação do webhook */
  notificationUrl?: string
}

export interface MercadoPagoPayment {
  id: number
  status: 'pending' | 'approved' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back'
  statusDetail: string
  externalReference: string
  amount: number
  paymentMethod: string
  paymentType: string
  pixQrCode?: string
  pixQrCodeBase64?: string
  boletoUrl?: string
  dateCreated: string
  dateApproved?: string
}

// ============================================================================
// MERCADO PAGO SERVICE CLASS
// ============================================================================
export class MercadoPagoService {
  private accessToken: string
  private baseUrl = 'https://api.mercadopago.com'

  constructor(config?: MercadoPagoConfig) {
    this.accessToken = config?.accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN || ''
  }

  /** Verifica se o Mercado Pago está configurado */
  isConfigured(): boolean {
    return this.accessToken.length > 0
  }

  /** Cria um pagamento via API do Mercado Pago */
  async createPayment(input: CreatePaymentInput): Promise<MercadoPagoPayment> {
    if (!this.isConfigured()) {
      throw new Error('Mercado Pago não configurado. Adicione MERCADOPAGO_ACCESS_TOKEN no .env')
    }

    const body: any = {
      transaction_amount: input.amount,
      description: input.description,
      payment_method_id: 'pix', // default PIX
      payer: {
        email: input.payerEmail,
        first_name: input.payerName.split(' ')[0],
        last_name: input.payerName.split(' ').slice(1).join(' ') || input.payerName,
      },
      external_reference: input.externalReference,
    }

    if (input.payerCpf) {
      body.payer.identification = {
        type: 'CPF',
        number: input.payerCpf.replace(/\D/g, ''),
      }
    }

    if (input.expirationDate) {
      body.date_of_expiration = input.expirationDate.toISOString()
    }

    if (input.notificationUrl) {
      body.notification_url = input.notificationUrl
    }

    const res = await fetch(`${this.baseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${input.externalReference}-${Date.now()}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(`Mercado Pago error: ${JSON.stringify(error)}`)
    }

    const data = await res.json()

    return {
      id: data.id,
      status: data.status,
      statusDetail: data.status_detail,
      externalReference: data.external_reference,
      amount: data.transaction_amount,
      paymentMethod: data.payment_method_id,
      paymentType: data.payment_type_id,
      pixQrCode: data.point_of_interaction?.transaction_data?.qr_code,
      pixQrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64,
      boletoUrl: data.transaction_details?.external_resource_url,
      dateCreated: data.date_created,
      dateApproved: data.date_approved,
    }
  }

  /** Cria uma preferência de pagamento (checkout Mercado Pago) */
  async createPreference(input: CreatePaymentInput): Promise<{ preferenceId: string; initPoint: string; sandboxInitPoint: string }> {
    if (!this.isConfigured()) {
      throw new Error('Mercado Pago não configurado')
    }

    const body: any = {
      items: [{
        title: input.description,
        quantity: 1,
        unit_price: input.amount,
        currency_id: 'BRL',
      }],
      payer: {
        email: input.payerEmail,
        name: input.payerName,
      },
      external_reference: input.externalReference,
      payment_methods: {
        installments: input.maxInstallments || 12,
      },
      auto_return: 'approved',
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL || ''}/pagamento/sucesso`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL || ''}/pagamento/falha`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL || ''}/pagamento/pendente`,
      },
    }

    if (input.expirationDate) {
      body.expires = true
      body.expiration_date_to = input.expirationDate.toISOString()
    }

    const res = await fetch(`${this.baseUrl}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(`Mercado Pago preference error: ${JSON.stringify(error)}`)
    }

    const data = await res.json()
    return {
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
    }
  }

  /** Busca um pagamento pelo ID */
  async getPayment(paymentId: number): Promise<MercadoPagoPayment> {
    if (!this.isConfigured()) {
      throw new Error('Mercado Pago não configurado')
    }

    const res = await fetch(`${this.baseUrl}/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${this.accessToken}` },
    })

    if (!res.ok) throw new Error(`Payment not found: ${paymentId}`)

    const data = await res.json()
    return {
      id: data.id,
      status: data.status,
      statusDetail: data.status_detail,
      externalReference: data.external_reference,
      amount: data.transaction_amount,
      paymentMethod: data.payment_method_id,
      paymentType: data.payment_type_id,
      pixQrCode: data.point_of_interaction?.transaction_data?.qr_code,
      pixQrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64,
      boletoUrl: data.transaction_details?.external_resource_url,
      dateCreated: data.date_created,
      dateApproved: data.date_approved,
    }
  }

  /** Verifica assinatura do webhook */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
    if (!secret) return true // Sem secret, aceitar tudo (dev)
    
    // Para produção, implementar HMAC verification
    // const crypto = require('crypto')
    // const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    // return hash === signature
    
    return true
  }
}

// Instância singleton
let _mpService: MercadoPagoService | null = null

export function getMercadoPagoService(): MercadoPagoService {
  if (!_mpService) _mpService = new MercadoPagoService()
  return _mpService
}

// ============================================================================
// MAPEAMENTO MP STATUS → SISTEMA
// ============================================================================
export function mapMPStatusToEntryStatus(mpStatus: string): 'PAID' | 'PENDING' | 'CANCELED' {
  switch (mpStatus) {
    case 'approved': return 'PAID'
    case 'cancelled':
    case 'rejected':
    case 'refunded':
    case 'charged_back': return 'CANCELED'
    default: return 'PENDING'
  }
}

export function mapMPPaymentMethod(mpMethod: string): string {
  const map: Record<string, string> = {
    pix: 'PIX',
    bolbradesco: 'BOLETO',
    credit_card: 'CARTAO_CREDITO',
    debit_card: 'CARTAO_DEBITO',
    account_money: 'TRANSFERENCIA',
  }
  return map[mpMethod] || 'OUTRO'
}
