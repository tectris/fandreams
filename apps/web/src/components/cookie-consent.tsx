'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Cookie, X } from 'lucide-react'

const COOKIE_CONSENT_KEY = 'cookie_consent'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      // Small delay for better UX - don't show immediately on page load
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  async function handleConsent(accepted: boolean) {
    localStorage.setItem(COOKIE_CONSENT_KEY, accepted ? 'accepted' : 'rejected')
    setVisible(false)

    // Record consent on backend (fire and forget)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const base = API_URL.match(/^https?:\/\//) ? API_URL : `https://${API_URL}`
      const url = base.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '')
      fetch(`${url}/api/v1/platform/cookie-consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted }),
      }).catch(() => {})
    } catch {}
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[100] animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="bg-surface border border-border rounded-lg shadow-2xl shadow-black/40 p-5">
        <div className="flex items-start gap-3">
          <Cookie className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground mb-1">Cookies</p>
            <p className="text-xs text-muted leading-relaxed">
              Utilizamos cookies para melhorar sua experiencia. Ao continuar, voce concorda com nossa{' '}
              <Link href="/privacidade" className="text-primary hover:underline">
                Politica de Privacidade
              </Link>
              .
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleConsent(true)}
                className="flex-1 px-3 py-1.5 text-xs font-semibold bg-primary hover:bg-primary-light text-white rounded-sm transition-colors"
              >
                Aceitar
              </button>
              <button
                onClick={() => handleConsent(false)}
                className="px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground border border-border hover:bg-surface-light rounded-sm transition-colors"
              >
                Recusar
              </button>
            </div>
          </div>
          <button
            onClick={() => handleConsent(false)}
            className="text-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
