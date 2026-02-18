'use client'

import { LegalPage } from '@/components/legal-page'

export default function SubscriptionTermsPage() {
  return (
    <LegalPage
      pageKey="subscription_terms"
      fallbackTitle="Termos de Assinatura do Fa"
      fallbackMessage="Os termos de assinatura serao publicados em breve."
    />
  )
}
