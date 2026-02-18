'use client'

import { LegalPage } from '@/components/legal-page'

export default function PrivacyPage() {
  return (
    <LegalPage
      pageKey="privacy_policy"
      fallbackTitle="Politica de Privacidade"
      fallbackMessage="A politica de privacidade sera publicada em breve."
    />
  )
}
