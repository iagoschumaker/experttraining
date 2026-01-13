// ============================================================================
// EXPERT TRAINING - PDF HELPER
// ============================================================================
// Helper global para gerar cabeçalho de PDFs com informações do studio
// ============================================================================

import { prisma } from '@/lib/prisma'

export interface StudioPdfHeader {
  studioName: string
  logoUrl: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  website: string | null
  primaryColor: string
  secondaryColor: string
}

/**
 * Busca informações do studio para usar em cabeçalhos de PDF
 * @param studioId - ID do studio
 * @returns Dados formatados para cabeçalho de PDF
 */
export async function getStudioPdfHeader(studioId: string): Promise<StudioPdfHeader | null> {
  try {
    const studio = await prisma.studio.findUnique({
      where: { id: studioId },
      select: {
        name: true,
        logoUrl: true,
        settings: true,
      },
    })

    if (!studio) {
      return null
    }

    const settings = (studio.settings as any) || {}

    return {
      studioName: studio.name,
      logoUrl: studio.logoUrl,
      phone: settings.phone || null,
      email: settings.email || null,
      address: settings.address || null,
      city: settings.city || null,
      state: settings.state || null,
      zipCode: settings.zipCode || null,
      website: settings.website || null,
      primaryColor: settings.primaryColor || '#F2B705',
      secondaryColor: settings.secondaryColor || '#00C2D1',
    }
  } catch (error) {
    console.error('Error fetching studio PDF header:', error)
    return null
  }
}

/**
 * Formata endereço completo do studio
 * @param header - Dados do cabeçalho
 * @returns Endereço formatado
 */
export function formatStudioAddress(header: StudioPdfHeader): string {
  const parts: string[] = []

  if (header.address) parts.push(header.address)
  if (header.city) parts.push(header.city)
  if (header.state) parts.push(header.state)
  if (header.zipCode) parts.push(`CEP: ${header.zipCode}`)

  return parts.join(', ')
}

/**
 * Formata contatos do studio
 * @param header - Dados do cabeçalho
 * @returns Array de contatos formatados
 */
export function formatStudioContacts(header: StudioPdfHeader): string[] {
  const contacts: string[] = []

  if (header.phone) contacts.push(`Tel: ${header.phone}`)
  if (header.email) contacts.push(`Email: ${header.email}`)
  if (header.website) contacts.push(`Site: ${header.website}`)

  return contacts
}
