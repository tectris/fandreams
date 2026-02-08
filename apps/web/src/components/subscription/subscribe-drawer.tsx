'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Crown, CreditCard, QrCode, Loader2, CheckCircle, ExternalLink } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

interface Promo {
  id: string
  durationDays: number
  price: string
  isActive: boolean
}

interface SubscribeDrawerProps {
  open: boolean
  onClose: () => void
  creator: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    subscriptionPrice?: string | null
  }
  tier?: {
    id: string
    name: string
    price: string
    description?: string | null
    benefits?: string[]
  } | null
}

type DrawerState = 'choose' | 'processing' | 'waiting' | 'success' | 'error'

function getDurationLabel(days: number) {
  if (days === 90) return '3 meses'
  if (days === 180) return '6 meses'
  if (days === 360) return '12 meses'
  return `${days} dias`
}

function getMonthlyEquivalent(price: string, days: number) {
  const months = days / 30
  return (Number(price) / months).toFixed(2)
}

function getDiscount(monthlyPrice: string, promoPrice: string, days: number) {
  const normalTotal = Number(monthlyPrice) * (days / 30)
  if (normalTotal <= 0) return 0
  const discount = ((normalTotal - Number(promoPrice)) / normalTotal) * 100
  return Math.round(discount)
}

export function SubscribeDrawer({ open, onClose, creator, tier }: SubscribeDrawerProps) {
  const queryClient = useQueryClient()
  const [state, setState] = useState<DrawerState>('choose')
  const [error, setError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('credit_card')
  const [selectedPromo, setSelectedPromo] = useState<Promo | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const popupRef = useRef<Window | null>(null)
  const paymentIdRef = useRef<string | null>(null)

  const price = tier ? tier.price : creator.subscriptionPrice || '0'
  const amount = Number(price)
  const isFree = amount <= 0
  const displayName = creator.displayName || creator.username

  // Fetch promos for this creator
  const { data: promos } = useQuery({
    queryKey: ['creator-promos', creator.id],
    queryFn: async () => {
      const res = await api.get<Promo[]>(`/creators/${creator.id}/promos`)
      return res.data || []
    },
    enabled: open && !isFree,
  })

  useEffect(() => {
    if (!open) {
      setState('choose')
      setError('')
      setSelectedPromo(null)
      paymentIdRef.current = null
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [open])

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        // For promo subscriptions, poll payment status
        if (paymentIdRef.current) {
          const res = await api.get<{ status: string }>(`/payments/status/${paymentIdRef.current}`)
          if (res.data?.status === 'completed') {
            setState('success')
            if (pollRef.current) clearInterval(pollRef.current)
            queryClient.invalidateQueries({ queryKey: ['subscription-status', creator.id] })
            queryClient.invalidateQueries({ queryKey: ['profile'] })
            toast.success('Assinatura ativada!')
            return
          }
        }
        // Also check subscription status
        const res = await api.get<{ isSubscribed: boolean }>(`/subscriptions/check/${creator.id}`)
        if (res.data?.isSubscribed) {
          setState('success')
          if (pollRef.current) clearInterval(pollRef.current)
          queryClient.invalidateQueries({ queryKey: ['subscription-status', creator.id] })
          queryClient.invalidateQueries({ queryKey: ['profile'] })
          toast.success('Assinatura ativada!')
        }
      } catch {
        // ignore polling errors
      }
    }, 3000)
  }

  async function handleSubscribe() {
    setState('processing')
    setError('')
    try {
      const res = await api.post<any>('/subscriptions', {
        creatorId: creator.id,
        tierId: tier?.id,
        promoId: selectedPromo?.id,
        paymentMethod,
      })
      const data = res.data

      if (data.checkoutUrl) {
        if (data.paymentId) {
          paymentIdRef.current = data.paymentId
        }
        const popup = window.open(data.checkoutUrl, 'mp_checkout', 'width=600,height=700,scrollbars=yes')
        popupRef.current = popup
        setState('waiting')
        startPolling()
      } else {
        // Free subscription
        setState('success')
        queryClient.invalidateQueries({ queryKey: ['subscription-check', creator.id] })
        toast.success(`Voce agora assina ${displayName}!`)
      }
    } catch (e: any) {
      setState('error')
      setError(e.message || 'Erro ao criar assinatura')
    }
  }

  async function handleFreeSubscribe() {
    setState('processing')
    try {
      await api.post('/subscriptions', { creatorId: creator.id, tierId: tier?.id })
      setState('success')
      queryClient.invalidateQueries({ queryKey: ['subscription-check', creator.id] })
      toast.success(`Voce agora assina ${displayName}!`)
    } catch (e: any) {
      setState('error')
      setError(e.message || 'Erro ao criar assinatura')
    }
  }

  const activePrice = selectedPromo ? selectedPromo.price : price
  const activeAmount = Number(activePrice)
  const activeLabel = selectedPromo
    ? `${formatCurrency(activePrice)} por ${getDurationLabel(selectedPromo.durationDays)}`
    : `${formatCurrency(price)}/mes`

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-surface border-l border-border z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-bold flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Assinar {displayName}
          </h2>
          <button onClick={onClose} className="p-1 rounded-sm hover:bg-surface-light">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Plan details */}
          <div className="bg-gradient-to-br from-primary/10 to-purple-600/5 rounded-sm p-5 mb-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg">{tier?.name || 'Assinatura'}</h3>
              {amount > 0 ? (
                <span className="text-primary font-bold text-xl">{formatCurrency(price)}/mes</span>
              ) : (
                <Badge variant="success">Gratis</Badge>
              )}
            </div>
            {tier?.description && <p className="text-sm text-muted mb-3">{tier.description}</p>}
            {tier?.benefits && tier.benefits.length > 0 && (
              <ul className="text-sm space-y-1.5">
                {tier.benefits.map((b, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
            {!tier && (
              <ul className="text-sm space-y-1.5 text-muted">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                  Acesso a conteudo exclusivo
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                  Interacao direta com o criador
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                  Renovacao mensal automatica
                </li>
              </ul>
            )}
          </div>

          {/* State: Choose payment (paid) */}
          {state === 'choose' && !isFree && (
            <>
              {/* Subscription plan selection (monthly + promos) */}
              {promos && promos.length > 0 && (
                <>
                  <h4 className="font-semibold text-sm mb-3">Escolha o periodo</h4>
                  <div className="space-y-2 mb-5">
                    {/* Monthly option */}
                    <button
                      onClick={() => setSelectedPromo(null)}
                      className={`w-full flex items-center justify-between p-4 rounded-sm border transition-colors ${
                        !selectedPromo
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="text-left">
                        <p className="font-medium text-sm">Mensal</p>
                        <p className="text-xs text-muted">Renovacao automatica</p>
                      </div>
                      <span className="font-bold text-sm">{formatCurrency(price)}/mes</span>
                    </button>

                    {/* Promo options */}
                    {promos.map((promo) => {
                      const discount = getDiscount(price, promo.price, promo.durationDays)
                      const monthlyEq = getMonthlyEquivalent(promo.price, promo.durationDays)
                      return (
                        <button
                          key={promo.id}
                          onClick={() => setSelectedPromo(promo)}
                          className={`w-full flex items-center justify-between p-4 rounded-sm border transition-colors ${
                            selectedPromo?.id === promo.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{getDurationLabel(promo.durationDays)}</p>
                              {discount > 0 && (
                                <Badge variant="success" className="text-xs">-{discount}%</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted">
                              {formatCurrency(monthlyEq)}/mes
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-sm">{formatCurrency(promo.price)}</span>
                            <p className="text-xs text-muted">pagamento unico</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              <h4 className="font-semibold text-sm mb-3">Forma de pagamento</h4>
              <div className="space-y-2 mb-5">
                <button
                  onClick={() => setPaymentMethod('credit_card')}
                  className={`w-full flex items-center gap-3 p-4 rounded-sm border transition-colors ${
                    paymentMethod === 'credit_card'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <CreditCard className={`w-5 h-5 ${paymentMethod === 'credit_card' ? 'text-primary' : 'text-muted'}`} />
                  <div className="text-left">
                    <p className="font-medium text-sm">Cartao de Credito</p>
                    <p className="text-xs text-muted">Parcele em ate 12x</p>
                  </div>
                </button>
                <button
                  onClick={() => setPaymentMethod('pix')}
                  className={`w-full flex items-center gap-3 p-4 rounded-sm border transition-colors ${
                    paymentMethod === 'pix'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <QrCode className={`w-5 h-5 ${paymentMethod === 'pix' ? 'text-primary' : 'text-muted'}`} />
                  <div className="text-left">
                    <p className="font-medium text-sm">PIX</p>
                    <p className="text-xs text-muted">Aprovacao instantanea</p>
                  </div>
                </button>
              </div>
              <Button className="w-full" onClick={handleSubscribe}>
                <Crown className="w-4 h-4 mr-2" />
                Assinar por {activeLabel}
              </Button>
              <p className="text-xs text-muted text-center mt-3">
                {selectedPromo
                  ? `Pagamento unico de ${formatCurrency(activePrice)} por ${getDurationLabel(selectedPromo.durationDays)} de acesso.`
                  : 'Voce sera redirecionado ao Mercado Pago para autorizar a assinatura recorrente. Cancele quando quiser.'}
              </p>
            </>
          )}

          {/* State: Free */}
          {state === 'choose' && isFree && (
            <Button className="w-full" onClick={handleFreeSubscribe}>
              <Crown className="w-4 h-4 mr-2" />
              Assinar gratuitamente
            </Button>
          )}

          {/* State: Processing */}
          {state === 'processing' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-sm text-muted">Preparando pagamento...</p>
            </div>
          )}

          {/* State: Waiting for payment */}
          {state === 'waiting' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <ExternalLink className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-semibold mb-1">Finalize o pagamento</p>
                <p className="text-sm text-muted mb-4">
                  Uma janela do Mercado Pago foi aberta. Complete o pagamento por la.
                </p>
                <Loader2 className="w-5 h-5 text-primary animate-spin mx-auto mb-3" />
                <p className="text-xs text-muted">Aguardando confirmacao...</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (popupRef.current && !popupRef.current.closed) {
                    popupRef.current.focus()
                  } else {
                    handleSubscribe()
                  }
                }}
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Reabrir janela de pagamento
              </Button>
            </div>
          )}

          {/* State: Success */}
          {state === 'success' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">Assinatura ativada!</p>
                <p className="text-sm text-muted mt-1">
                  Voce agora tem acesso ao conteudo exclusivo de {displayName}.
                </p>
              </div>
              <Button onClick={onClose} className="mt-2">
                Fechar
              </Button>
            </div>
          )}

          {/* State: Error */}
          {state === 'error' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
                <X className="w-8 h-8 text-error" />
              </div>
              <div className="text-center">
                <p className="font-bold">Erro na assinatura</p>
                <p className="text-sm text-muted mt-1">{error}</p>
              </div>
              <Button variant="outline" onClick={() => setState('choose')}>
                Tentar novamente
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
