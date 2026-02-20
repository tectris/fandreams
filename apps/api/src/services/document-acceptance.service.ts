import { eq, and, desc } from 'drizzle-orm'
import { documentAcceptances } from '@fandreams/database'
import { db } from '../config/database'
import { AppError } from './auth.service'
import { getPageContent } from './platform.service'
import crypto from 'crypto'

// All legal document keys and their metadata
export const LEGAL_DOCUMENTS = [
  // Essenciais
  { key: 'terms_and_conditions', label: 'Termos de Uso', route: '/termos', category: 'essential', required: true },
  { key: 'privacy_policy', label: 'Politica de Privacidade', route: '/privacidade', category: 'essential', required: true },
  { key: 'cookie_policy', label: 'Politica de Cookies', route: '/cookies', category: 'essential', required: true },
  { key: 'subscription_terms', label: 'Termos de Assinatura', route: '/termos-assinatura', category: 'essential', required: true },
  // Politicas da Plataforma
  { key: 'community_guidelines', label: 'Diretrizes da Comunidade', route: '/diretrizes-comunidade', category: 'policies', required: true },
  { key: 'acceptable_use_policy', label: 'Politica de Uso Aceitavel', route: '/uso-aceitavel', category: 'policies', required: true },
  { key: 'dmca', label: 'DMCA', route: '/dmca', category: 'policies', required: false },
  { key: 'anti_trafficking', label: 'Anti-Trafico', route: '/anti-trafico', category: 'policies', required: true },
  { key: 'age_verification', label: 'Verificacao de Idade', route: '/verificacao-idade', category: 'policies', required: true },
  // Compliance & Seguranca
  { key: 'compliance', label: 'Compliance', route: '/compliance', category: 'compliance', required: false },
  { key: 'safety_center', label: 'Seguranca', route: '/seguranca', category: 'compliance', required: false },
  { key: 'transparency_report', label: 'Transparencia', route: '/transparencia', category: 'compliance', required: false },
  { key: 'accessibility', label: 'Acessibilidade', route: '/acessibilidade', category: 'compliance', required: false },
  // Financeiro & Contratos
  { key: 'creator_contract', label: 'Contrato do Criador', route: '/contrato-criador', category: 'financial', required: false },
  { key: 'tax_guide', label: 'Guia Tributario', route: '/guia-tributario', category: 'financial', required: false },
  { key: 'refund_policy', label: 'Politica de Reembolsos', route: '/reembolsos', category: 'financial', required: false },
  { key: 'complaints', label: 'Reclamacoes', route: '/reclamacoes', category: 'financial', required: false },
] as const

export type LegalDocumentKey = (typeof LEGAL_DOCUMENTS)[number]['key']

// Get all required document keys
export function getRequiredDocumentKeys(): string[] {
  return LEGAL_DOCUMENTS.filter((d) => d.required).map((d) => d.key)
}

// Get user's document acceptances
export async function getUserAcceptances(userId: string) {
  const acceptances = await db
    .select()
    .from(documentAcceptances)
    .where(eq(documentAcceptances.userId, userId))
    .orderBy(desc(documentAcceptances.acceptedAt))

  // For each document key, keep only the latest acceptance
  const latestByKey = new Map<string, typeof acceptances[0]>()
  for (const acc of acceptances) {
    if (!latestByKey.has(acc.documentKey)) {
      latestByKey.set(acc.documentKey, acc)
    }
  }

  return LEGAL_DOCUMENTS.map((doc) => {
    const acceptance = latestByKey.get(doc.key)
    return {
      ...doc,
      accepted: !!acceptance,
      acceptedAt: acceptance?.acceptedAt?.toISOString() || null,
      documentVersion: acceptance?.documentVersion || null,
    }
  })
}

// Accept multiple documents at once
export async function acceptDocuments(
  userId: string,
  documentKeys: string[],
  ipAddress: string,
  userAgent: string,
) {
  const validKeys = LEGAL_DOCUMENTS.map((d) => d.key)
  const invalidKeys = documentKeys.filter((k) => !validKeys.includes(k as any))
  if (invalidKeys.length > 0) {
    throw new AppError('INVALID_DOCUMENT_KEY', `Chaves invalidas: ${invalidKeys.join(', ')}`, 400)
  }

  const results = []
  for (const key of documentKeys) {
    // Get current document version (hash of content)
    const content = await getPageContent(key)
    const version = content
      ? crypto.createHash('sha256').update(content.content).digest('hex').substring(0, 12)
      : 'v1'

    const [acceptance] = await db
      .insert(documentAcceptances)
      .values({
        userId,
        documentKey: key,
        documentVersion: version,
        ipAddress,
        userAgent: userAgent || '',
      })
      .returning()

    results.push(acceptance)
  }

  return results
}

// Check if user has accepted all required documents
export async function hasAcceptedAllRequired(userId: string): Promise<boolean> {
  const requiredKeys = getRequiredDocumentKeys()
  const acceptances = await getUserAcceptances(userId)

  return requiredKeys.every((key) => {
    const doc = acceptances.find((a) => a.key === key)
    return doc?.accepted
  })
}

// Generate verification hash for PDF footer
export function generateVerificationHash(
  userId: string,
  documentKey: string,
  acceptedAt: string,
  ipAddress: string,
): string {
  const data = `${userId}:${documentKey}:${acceptedAt}:${ipAddress}`
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16)
}
