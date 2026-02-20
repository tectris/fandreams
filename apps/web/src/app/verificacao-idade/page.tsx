'use client'

import { LegalPage } from '@/components/legal-page'

export default function AgeVerificationPage() {
  return (
    <LegalPage
      pageKey="age_verification"
      fallbackTitle="Verificacao de Idade e USC 2257"
      fallbackMessage="A declaracao de verificacao de idade sera publicada em breve."
    />
  )
}
