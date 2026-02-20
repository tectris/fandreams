'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  X, Coins, ShoppingCart, ArrowRightLeft, ArrowDownToLine,
  QrCode, CreditCard, Loader2, CheckCircle2, ExternalLink, Copy, ArrowLeftRight,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'

type Wallet = {
  balance: string
  totalEarned: string
  totalSpent: string
  fancoinToBrl?: number
}

type Transaction = {
  id: string
  type: string
  amount: string
  description: string | null
  createdAt: string
}

type Package = {
  id: string
  name: string
  coins: number
  price: string
  bonusPercent: number
}

type PixData = {
  qrCodeBase64: string
  qrCode: string
  ticketUrl: string
  expiresAt: string
}

interface FancoinDrawerProps {
  open: boolean
  onClose: () => void
}

export function FancoinDrawer({ open, onClose }: FancoinDrawerProps) {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [tab, setTab] = useState<'wallet' | 'buy' | 'history'>('wallet')
  const [buyState, setBuyState] = useState<'choose' | 'processing' | 'pix' | 'waiting' | 'success'>('choose')
  const [customMode, setCustomMode] = useState<'coins' | 'brl'>('brl')
  const [customValue, setCustomValue] = useState('')
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null)
  const [pixData, setPixData] = useState<PixData | null>(null)
  const popupRef = useRef<Window | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isCreator = user?.role === 'creator' || user?.role === 'admin'

  const { data: walletData } = useQuery({
    queryKey: ['fancoin-wallet'],
    queryFn: () => api.get<Wallet>('/fancoins/wallet'),
    enabled: open,
  })

  const { data: transactionsData } = useQuery({
    queryKey: ['fancoin-transactions'],
    queryFn: () => api.get<Transaction[]>('/fancoins/transactions?limit=20'),
    enabled: open && tab === 'history',
  })

  const { data: packagesData } = useQuery({
    queryKey: ['fancoin-packages'],
    queryFn: () => api.get<Package[]>('/fancoins/packages'),
    enabled: open && tab === 'buy',
  })

  const checkoutMutation = useMutation({
    mutationFn: async (params: { packageId: string; paymentMethod: string; provider: string }) => {
      const res = await api.post<any>('/payments/checkout/fancoins', params)
      return res.data
    },
    onSuccess: (data) => {
      setPendingPaymentId(data.paymentId)

      if (data.pixData) {
        // PIX Transparent Checkout: show QR code inline
        setPixData(data.pixData)
        setBuyState('pix')
      } else if (data.checkoutUrl) {
        // Card Checkout Pro: open popup
        setBuyState('waiting')
        popupRef.current = window.open(data.checkoutUrl, 'mp_checkout', 'width=600,height=700,scrollbars=yes')
      }
    },
    onError: (e: any) => {
      setBuyState('choose')
      toast.error(e.message || 'Erro ao iniciar pagamento')
    },
  })

  const customCheckoutMutation = useMutation({
    mutationFn: async (params: { amountBrl: number; paymentMethod: string; provider: string }) => {
      const res = await api.post<any>('/payments/checkout/fancoins/custom', params)
      return res.data
    },
    onSuccess: (data) => {
      setPendingPaymentId(data.paymentId)
      if (data.pixData) {
        setPixData(data.pixData)
        setBuyState('pix')
      } else if (data.checkoutUrl) {
        setBuyState('waiting')
        popupRef.current = window.open(data.checkoutUrl, 'mp_checkout', 'width=600,height=700,scrollbars=yes')
      }
    },
    onError: (e: any) => {
      setBuyState('choose')
      toast.error(e.message || 'Erro ao iniciar pagamento personalizado')
    },
  })

  // Poll for payment completion
  useEffect(() => {
    if ((buyState !== 'waiting' && buyState !== 'pix') || !pendingPaymentId) return

    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get<any>(`/payments/status/${pendingPaymentId}`)
        if (res.data?.status === 'completed') {
          clearInterval(pollRef.current!)
          pollRef.current = null
          setBuyState('success')
          setPixData(null)
          queryClient.invalidateQueries({ queryKey: ['fancoin-wallet'] })
          queryClient.invalidateQueries({ queryKey: ['fancoin-transactions'] })
          if (popupRef.current && !popupRef.current.closed) {
            popupRef.current.close()
          }
        } else if (res.data?.status === 'failed') {
          clearInterval(pollRef.current!)
          pollRef.current = null
          setBuyState('choose')
          setPixData(null)
          toast.error('Pagamento nao aprovado. Tente novamente.')
        }
      } catch {
        // Keep polling
      }
    }, 3000)

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [buyState, pendingPaymentId, queryClient])

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setBuyState('choose')
      setPendingPaymentId(null)
      setPixData(null)
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [open])

  function handleBuy(packageId: string, method: 'pix' | 'credit_card') {
    setBuyState('processing')
    checkoutMutation.mutate({ packageId, paymentMethod: method, provider: 'mercadopago' })
  }

  function handleCustomBuy(method: 'pix' | 'credit_card') {
    const RATE = 0.01
    let amountBrl: number
    if (customMode === 'brl') {
      amountBrl = Number(customValue)
    } else {
      amountBrl = Number(customValue) * RATE
    }
    if (!amountBrl || amountBrl < 1) {
      toast.error('Valor minimo de R$ 1,00')
      return
    }
    if (amountBrl > 10000) {
      toast.error('Valor maximo de R$ 10.000,00')
      return
    }
    setBuyState('processing')
    customCheckoutMutation.mutate({ amountBrl, paymentMethod: method, provider: 'mercadopago' })
  }

  function copyPixCode() {
    if (pixData?.qrCode) {
      navigator.clipboard.writeText(pixData.qrCode)
      toast.success('Codigo PIX copiado!')
    }
  }

  const wallet = walletData?.data
  const transactions = transactionsData?.data ?? []
  const packages = packagesData?.data ?? []
  const fancoinToBrl = wallet?.fancoinToBrl || 0.01
  const balanceBrl = Number(wallet?.balance || 0) * fancoinToBrl

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-surface border-l border-border z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-bold flex items-center gap-2">
            <Coins className="w-5 h-5 text-warning" />
            Carteira
          </h2>
          <button onClick={onClose} className="p-1 rounded-sm hover:bg-surface-light">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance */}
        <div className="px-4 py-5 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-border">
          <p className="text-sm text-muted mb-1">Saldo disponivel</p>
          <p className="text-3xl font-bold flex items-center gap-2">
            <Coins className="w-7 h-7 text-warning" />
            {wallet ? Number(wallet.balance).toLocaleString() : '0'}
          </p>
          <p className="text-xs text-muted mt-0.5">
            {formatCurrency(balanceBrl)}
          </p>
          <div className="flex gap-4 mt-2 text-xs text-muted">
            <span>Ganhos: {wallet ? Number(wallet.totalEarned).toLocaleString() : '0'}</span>
            <span>Gastos: {wallet ? Number(wallet.totalSpent).toLocaleString() : '0'}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {[
            { id: 'wallet' as const, icon: Coins, label: 'Carteira' },
            { id: 'buy' as const, icon: ShoppingCart, label: 'Comprar' },
            { id: 'history' as const, icon: ArrowRightLeft, label: 'Historico' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'wallet' && (
            <div className="space-y-3">
              <button
                onClick={() => setTab('buy')}
                className="w-full flex items-center gap-3 p-4 rounded-sm border border-border hover:border-primary/50 transition-colors"
              >
                <div className="p-2 bg-primary/10 rounded-sm">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Comprar FanCoins</p>
                  <p className="text-xs text-muted">PIX ou Cartao de Credito</p>
                </div>
              </button>

              {isCreator && (
                <Link
                  href="/wallet"
                  onClick={onClose}
                  className="w-full flex items-center gap-3 p-4 rounded-sm border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="p-2 bg-success/10 rounded-sm">
                    <ArrowDownToLine className="w-5 h-5 text-success" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Sacar</p>
                    <p className="text-xs text-muted">PIX ou Crypto (USDT)</p>
                  </div>
                </Link>
              )}

              <button
                onClick={() => setTab('history')}
                className="w-full flex items-center gap-3 p-4 rounded-sm border border-border hover:border-primary/50 transition-colors"
              >
                <div className="p-2 bg-secondary/10 rounded-sm">
                  <ArrowRightLeft className="w-5 h-5 text-secondary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Historico</p>
                  <p className="text-xs text-muted">Ver transacoes anteriores</p>
                </div>
              </button>

              <Link
                href="/wallet"
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 p-3 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir carteira completa
              </Link>
            </div>
          )}

          {tab === 'buy' && (
            <div className="space-y-3">
              {/* PIX QR Code State */}
              {buyState === 'pix' && pixData && (
                <div className="text-center space-y-4">
                  <div className="bg-white rounded-lg p-4 inline-block mx-auto">
                    <img
                      src={pixData.qrCodeBase64.startsWith('http') ? pixData.qrCodeBase64 : pixData.qrCodeBase64.startsWith('data:') ? pixData.qrCodeBase64 : `data:image/png;base64,${pixData.qrCodeBase64}`}
                      alt="QR Code PIX"
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Escaneie o QR Code ou copie o codigo</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={pixData.qrCode}
                        className="flex-1 text-xs bg-surface-light border border-border rounded px-2 py-2 font-mono truncate"
                      />
                      <Button size="sm" variant="outline" onClick={copyPixCode}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <p className="text-xs text-muted">Aguardando pagamento...</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setBuyState('choose')
                      setPendingPaymentId(null)
                      setPixData(null)
                      if (pollRef.current) {
                        clearInterval(pollRef.current)
                        pollRef.current = null
                      }
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              )}

              {/* Card Waiting State (popup) */}
              {buyState === 'waiting' && (
                <div className="text-center py-6 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm font-medium">Aguardando pagamento...</p>
                  <p className="text-xs text-muted">
                    Complete o pagamento na janela do Mercado Pago.
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setBuyState('choose')
                      setPendingPaymentId(null)
                      if (pollRef.current) {
                        clearInterval(pollRef.current)
                        pollRef.current = null
                      }
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              )}

              {buyState === 'success' && (
                <div className="text-center py-6 space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
                  <p className="text-sm font-medium">FanCoins creditados!</p>
                  <Button size="sm" onClick={() => setBuyState('choose')}>
                    Comprar mais
                  </Button>
                </div>
              )}

              {buyState === 'processing' && (
                <div className="text-center py-6">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted mt-2">Criando checkout...</p>
                </div>
              )}

              {buyState === 'choose' && (
                <>
                  {packages.length > 0 ? (
                    packages.map((pkg) => (
                      <div
                        key={pkg.id}
                        className="p-4 rounded-sm border border-border"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="font-bold">{pkg.coins.toLocaleString()}</span>
                            <span className="text-sm text-muted ml-1">FanCoins</span>
                            {pkg.bonusPercent > 0 && (
                              <Badge variant="success" className="ml-2">+{pkg.bonusPercent}%</Badge>
                            )}
                          </div>
                          <span className="text-lg font-bold text-primary">
                            R$ {Number(pkg.price).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            className="flex-1"
                            onClick={() => handleBuy(pkg.id, 'pix')}
                          >
                            <QrCode className="w-4 h-4 mr-1" /> PIX
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleBuy(pkg.id, 'credit_card')}
                          >
                            <CreditCard className="w-4 h-4 mr-1" /> Cartao
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted text-center py-8">
                      Nenhum pacote disponivel no momento
                    </p>
                  )}

                  {/* Custom Purchase */}
                  <div className="p-4 rounded-sm border border-primary/30 bg-primary/5">
                    <h4 className="font-bold text-sm flex items-center gap-2 mb-3">
                      <ArrowLeftRight className="w-4 h-4 text-primary" />
                      Compra personalizada
                    </h4>
                    <div className="flex gap-1.5 mb-2">
                      <button
                        onClick={() => { setCustomMode('brl'); setCustomValue('') }}
                        className={`text-xs px-2 py-1 rounded ${customMode === 'brl' ? 'bg-primary text-white' : 'bg-surface text-muted'}`}
                      >
                        R$ → Coins
                      </button>
                      <button
                        onClick={() => { setCustomMode('coins'); setCustomValue('') }}
                        className={`text-xs px-2 py-1 rounded ${customMode === 'coins' ? 'bg-primary text-white' : 'bg-surface text-muted'}`}
                      >
                        Coins → R$
                      </button>
                    </div>
                    <Input
                      type="number"
                      placeholder={customMode === 'brl' ? 'Valor em R$' : 'Qtd FanCoins'}
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                      min={customMode === 'brl' ? 1 : 100}
                      step={customMode === 'brl' ? '0.01' : '1'}
                    />
                    {customValue && Number(customValue) > 0 && (
                      <p className="text-xs text-muted mt-1.5">
                        {customMode === 'brl'
                          ? `= ${Math.floor(Number(customValue) / 0.01).toLocaleString()} FanCoins`
                          : `= R$ ${(Number(customValue) * 0.01).toFixed(2)}`
                        }
                        <span className="ml-1">(sem bonus)</span>
                      </p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="primary"
                        className="flex-1"
                        disabled={!customValue || Number(customValue) <= 0}
                        onClick={() => handleCustomBuy('pix')}
                      >
                        <QrCode className="w-4 h-4 mr-1" /> PIX
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        disabled={!customValue || Number(customValue) <= 0}
                        onClick={() => handleCustomBuy('credit_card')}
                      >
                        <CreditCard className="w-4 h-4 mr-1" /> Cartao
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-2">
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-3 border-b border-border/50"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        <TransactionDescription text={tx.description || tx.type} />
                      </p>
                      <p className="text-xs text-muted">
                        {new Date(tx.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        Number(tx.amount) >= 0 ? 'text-success' : 'text-error'
                      }`}
                    >
                      {Number(tx.amount) >= 0 ? '+' : ''}
                      {Number(tx.amount).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted text-center py-8">Nenhuma transacao ainda</p>
              )}
              <Link
                href="/wallet"
                onClick={onClose}
                className="block text-center text-sm text-primary hover:underline pt-2"
              >
                Ver historico completo
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function TransactionDescription({ text }: { text: string }) {
  const parts = text.split(/(@\w+)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const username = part.slice(1)
          return (
            <Link
              key={i}
              href={`/creator/${username}`}
              className="text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}
