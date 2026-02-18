'use client'

import { LegalPage } from '@/components/legal-page'

export default function CookiePolicyPage() {
  return (
    <LegalPage
      pageKey="cookie_policy"
      fallbackTitle="Politica de Cookies"
      fallbackMessage="A politica de cookies sera publicada em breve."
    />
  )
}
