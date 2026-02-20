'use client'

import { LegalPage } from '@/components/legal-page'

export default function ComplaintsPage() {
  return (
    <LegalPage
      pageKey="complaints"
      fallbackTitle="Processo de Reclamacoes e Denuncias"
      fallbackMessage="O processo de reclamacoes e denuncias sera publicado em breve."
    />
  )
}
