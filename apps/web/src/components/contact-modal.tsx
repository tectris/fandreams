'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Send, Mail, Phone, Loader2, CheckCircle2 } from 'lucide-react'
import { API_BASE_URL } from '@/lib/api'

type ContactModalProps = {
  open: boolean
  onClose: () => void
}

export function ContactModal({ open, onClose }: ContactModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [formTimestamp] = useState(() => Date.now())
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const backdropRef = useRef<HTMLDivElement>(null)

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name || name.length < 2) { setError('Informe seu nome'); return }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Informe um email valido'); return }
    if (!message || message.length < 10) { setError('Mensagem deve ter pelo menos 10 caracteres'); return }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/platform/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, whatsapp: whatsapp || undefined, message, honeypot, timestamp: formTimestamp }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error?.message || 'Erro ao enviar mensagem')
        return
      }
      setSent(true)
    } catch {
      setError('Erro de conexao. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    onClose()
    // Reset after animation
    setTimeout(() => {
      setName('')
      setEmail('')
      setWhatsapp('')
      setMessage('')
      setHoneypot('')
      setSent(false)
      setError('')
    }, 300)
  }

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-in fade-in duration-200"
    >
      <div className="bg-surface border border-border rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Fale conosco</h2>
          </div>
          <button onClick={handleClose} className="p-1 text-muted hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
            <h3 className="text-lg font-bold text-foreground mb-2">Mensagem enviada!</h3>
            <p className="text-sm text-muted mb-6">Recebemos sua mensagem e retornaremos o mais breve possivel.</p>
            <button
              onClick={handleClose}
              className="px-6 py-2 text-sm font-semibold bg-primary hover:bg-primary-light text-white rounded-sm transition-colors"
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Official channels info */}
            <div className="bg-surface-light border border-border rounded-sm p-3">
              <p className="text-xs font-medium text-foreground mb-1.5">Canais oficiais de contato:</p>
              <div className="flex flex-col gap-1 text-xs text-muted">
                <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> invest@fandream.app</span>
                <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> contato@fandream.app</span>
                <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> dpo@fandream.app</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Nome *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                maxLength={100}
                className="w-full px-4 py-2.5 rounded-sm bg-surface-light border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">E-mail *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                maxLength={255}
                className="w-full px-4 py-2.5 rounded-sm bg-surface-light border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">
                WhatsApp <span className="text-muted font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="(11) 99999-9999"
                  maxLength={20}
                  className="w-full pl-10 pr-4 py-2.5 rounded-sm bg-surface-light border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Mensagem *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Como podemos ajudar?"
                rows={4}
                maxLength={2000}
                className="w-full px-4 py-2.5 rounded-sm bg-surface-light border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors resize-none"
              />
              <p className="text-xs text-muted text-right">{message.length}/2000</p>
            </div>

            {/* Honeypot field - hidden from users, bots will fill it */}
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }}
            />

            {error && (
              <p className="text-sm text-error">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold bg-primary hover:bg-primary-light text-white rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {loading ? 'Enviando...' : 'Enviar mensagem'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
