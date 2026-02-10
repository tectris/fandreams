'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Flame, ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  const [content, setContent] = useState<{ title: string; content: string; updatedAt: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const base = API_URL.match(/^https?:\/\//) ? API_URL : `https://${API_URL}`
        const url = base.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '')
        const res = await fetch(`${url}/api/v1/platform/page/privacy_policy`)
        const json = await res.json()
        if (json.success && json.data) {
          setContent(json.data)
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-muted hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <Flame className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm text-foreground">FanDreams</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-surface-light rounded" />
            <div className="h-4 w-full bg-surface-light rounded" />
            <div className="h-4 w-3/4 bg-surface-light rounded" />
          </div>
        ) : content ? (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{content.title}</h1>
            <p className="text-xs text-muted mb-8">
              Ultima atualizacao: {new Date(content.updatedAt).toLocaleDateString('pt-BR')}
            </p>
            <div
              className="prose prose-invert prose-sm max-w-none text-muted [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-foreground [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_li]:mb-1 [&_a]:text-primary [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: content.content }}
            />
          </>
        ) : (
          <div className="text-center py-20">
            <h1 className="text-2xl font-bold text-foreground mb-3">Politica de Privacidade</h1>
            <p className="text-muted">A politica de privacidade sera publicada em breve.</p>
          </div>
        )}
      </main>
    </div>
  )
}
