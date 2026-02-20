'use client'

import { LegalPage } from '@/components/legal-page'

export default function TermsPage() {
  return (
    <LegalPage
      pageKey="terms_and_conditions"
      fallbackTitle="Termos de Uso"
      fallbackMessage="Os termos de uso serao publicados em breve."
    />
  )
}
