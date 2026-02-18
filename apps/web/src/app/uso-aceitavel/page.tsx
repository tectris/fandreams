'use client'

import { LegalPage } from '@/components/legal-page'

export default function AcceptableUsePage() {
  return (
    <LegalPage
      pageKey="acceptable_use_policy"
      fallbackTitle="Politica de Uso Aceitavel"
      fallbackMessage="A politica de uso aceitavel sera publicada em breve."
    />
  )
}
