'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Loader2 } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api'

type PageContentModalProps = {
  open: boolean
  onClose: () => void
  pageKey: string
  fallbackTitle: string
}

export function PageContentModal({ open, onClose, pageKey, fallbackTitle }: PageContentModalProps) {
  const [content, setContent] = useState<{ title: string; content: string; updatedAt: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(false)

    fetch(`${API_BASE_URL}/api/v1/platform/page/${pageKey}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setContent(json.data)
        } else {
          setContent(null)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [open, pageKey])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose()
  }

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200"
    >
      <div className="bg-surface border border-border rounded-t-xl sm:rounded-xl w-full sm:max-w-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <h2 className="text-lg font-bold text-foreground">
            {content?.title || fallbackTitle}
          </h2>
          <button onClick={onClose} className="p-1 text-muted hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-muted animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted">Erro ao carregar conteudo. Tente novamente.</p>
            </div>
          ) : content ? (
            <>
              <p className="text-xs text-muted mb-6">
                Ultima atualizacao: {new Date(content.updatedAt).toLocaleDateString('pt-BR')}
              </p>
              <div
                className="prose prose-invert prose-sm max-w-none text-muted [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-foreground [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_li]:mb-1 [&_a]:text-primary [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: content.content }}
              />
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-muted">Este conteudo sera publicado em breve.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
