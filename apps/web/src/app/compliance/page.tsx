'use client'

import { LegalPage } from '@/components/legal-page'

export default function CompliancePage() {
  return (
    <LegalPage
      pageKey="compliance"
      fallbackTitle="Compliance"
      fallbackMessage="As informacoes de compliance serao publicadas em breve."
    />
  )
}
