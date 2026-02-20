'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FANCOIN_PACKAGES } from '@fandreams/shared'
import { formatCurrency } from '@/lib/utils'
import {
  Coins, TrendingUp, TrendingDown, ShoppingBag, Gift, CreditCard,
  QrCode, CheckCircle2, XCircle, Clock, Loader2, Bitcoin, Wallet,
  ArrowDownToLine, Shield, AlertTriangle, ArrowLeftRight, ChevronDown,
  Send, Search, X, MessageSquare,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar } from '@/components/ui/avatar'
import { toast } from 'sonner'
import Link from 'next/link'

type Provider = { id: string; label: string; methods: string[]; sandbox: boolean }

type SearchUser = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

function groupTransactionsByMonth(transactions: any[]) {
  const groups: Record<string, any[]> = {}
  for (const tx of transactions) {
    const date = new Date(tx.createdAt)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, txs]) => {
      const [year, month] = key.split('-')
      const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      return { key, label: label.charAt(0).toUpperCase() + label.slice(1), transactions: txs }
    })
}

function WalletContent() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const paymentStatus = searchParams.get('payment')
  const user = useAuthStore((s) => s.user)
  const [activeTab, setActiveTab] = useState<'buy' | 'send' | 'withdraw' | 'history'>('buy')
  const [withdrawMethod, setWithdrawMethod] = useState<'pix' | 'crypto'>('pix')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [cryptoAddress, setCryptoAddress] = useState('')
  const [cryptoNetwork, setCryptoNetwork] = useState('TRC20')
  const [customMode, setCustomMode] = useState<'coins' | 'brl'>('brl')
  const [customValue, setCustomValue] = useState('')
  const [otpStep, setOtpStep] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpSending, setOtpSending] = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())

  // P2P Transfer state
  const [sendQuery, setSendQuery] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [sendMessage, setSendMessage] = useState('')
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null)
  const [sendState, setSendState] = useState<'search' | 'confirm' | 'sending' | 'success'>('search')

  useEffect(() => {
    if (paymentStatus === 'success') {
      toast.success('Pagamento aprovado! Seus FanCoins serao creditados em instantes.')
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['fancoin-transactions'] })
    } else if (paymentStatus === 'failure') {
      toast.error('Pagamento nao aprovado. Tente novamente.')
    } else if (paymentStatus === 'pending') {
      toast.info('Pagamento pendente. Voce sera notificado quando for confirmado.')
    }
  }, [paymentStatus, queryClient])

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => (await api.get<any>('/fancoins/wallet')).data,
  })

  const { data: transactions } = useQuery({
    queryKey: ['fancoin-transactions'],
    queryFn: async () => (await api.get<any[]>('/fancoins/transactions')).data,
  })

  const { data: providers } = useQuery({
    queryKey: ['payment-providers'],
    queryFn: async () => (await api.get<Provider[]>('/payments/providers')).data,
  })

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ['fancoin-search-user', sendQuery],
    queryFn: async () => (await api.get<SearchUser[]>(`/fancoins/search-user?q=${encodeURIComponent(sendQuery)}`)).data,
    enabled: activeTab === 'send' && sendQuery.length >= 2 && !selectedUser,
  })

  const debouncedSendAmount = useMemo(() => {
    const n = Number(sendAmount)
    return n > 0 && Number.isInteger(n) ? n : 0
  }, [sendAmount])

  const { data: transferPreview, isFetching: isLoadingPreview } = useQuery({
    queryKey: ['transfer-preview', debouncedSendAmount],
    queryFn: async () => (await api.get<any>(`/fancoins/transfer-preview?amount=${debouncedSendAmount}`)).data,
    enabled: activeTab === 'send' && debouncedSendAmount > 0 && !!selectedUser,
  })

  const [feeAccepted, setFeeAccepted] = useState(false)

  const transferMutation = useMutation({
    mutationFn: async (params: { toUsername: string; amount: number; message?: string }) => {
      const res = await api.post<any>('/fancoins/transfer', params)
      return res.data
    },
    onSuccess: (data) => {
      setSendState('success')
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['fancoin-transactions'] })
      toast.success(`${data.sent?.toLocaleString() || sendAmount} FanCoins enviados!`)
    },
    onError: (e: any) => {
      setSendState('confirm')
      toast.error(e.message || 'Erro ao enviar FanCoins')
    },
  })

  const { data: earnings } = useQuery({
    queryKey: ['earnings'],
    queryFn: async () => (await api.get<any>('/withdrawals/earnings')).data,
    enabled: user?.role === 'creator' || user?.role === 'admin',
  })

  const checkoutMutation = useMutation({
    mutationFn: async (params: { packageId: string; paymentMethod: string; provider: string }) => {
      const res = await api.post<any>('/payments/checkout/fancoins', params)
      return res.data
    },
    onSuccess: (data) => { window.location.href = data.checkoutUrl },
    onError: (e: any) => {
      if (e.code === 'PAYMENT_UNAVAILABLE') {
        toast.info('Provedor nao configurado. Tente outro metodo.')
        return
      }
      toast.error(e.message || 'Erro ao iniciar pagamento')
    },
  })

  const customCheckoutMutation = useMutation({
    mutationFn: async (params: { amountBrl: number; paymentMethod: string; provider: string }) => {
      const res = await api.post<any>('/payments/checkout/fancoins/custom', params)
      return res.data
    },
    onSuccess: (data) => { window.location.href = data.checkoutUrl },
    onError: (e: any) => {
      toast.error(e.message || 'Erro ao iniciar pagamento personalizado')
    },
  })

  const directPurchaseMutation = useMutation({
    mutationFn: (packageId: string) => api.post('/fancoins/purchase', { packageId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['fancoin-transactions'] })
      toast.success('FanCoins adicionados (modo teste)!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const withdrawMutation = useMutation({
    mutationFn: async (params: any) => (await api.post<any>('/withdrawals/request', params)).data,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['earnings'] })
      queryClient.invalidateQueries({ queryKey: ['fancoin-transactions'] })
      setWithdrawAmount('')
      if (data.needsApproval) {
        toast.info('Saque solicitado! Aguardando aprovacao da plataforma (ate 24h).')
      } else {
        toast.success('Saque solicitado com sucesso!')
      }
    },
    onError: (e: any) => toast.error(e.message),
  })

  function handleCustomPurchase(method: string, provider: string) {
    const RATE = 0.01 // 1 FanCoin = R$0.01
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

    customCheckoutMutation.mutate({ amountBrl, paymentMethod: method, provider })
  }

  function handlePurchase(packageId: string, method: string, provider: string) {
    checkoutMutation.mutate(
      { packageId, paymentMethod: method, provider },
      {
        onError: (e: any) => {
          if (e.code === 'PAYMENT_UNAVAILABLE') {
            directPurchaseMutation.mutate(packageId)
          }
        },
      },
    )
  }

  async function handleRequestOtp() {
    const amount = Number(withdrawAmount)
    if (!amount || amount <= 0) { toast.error('Informe o valor em FanCoins'); return }
    if (withdrawMethod === 'pix' && !pixKey) { toast.error('Informe a chave PIX'); return }
    if (withdrawMethod === 'crypto' && !cryptoAddress) { toast.error('Informe o endereco crypto'); return }

    setOtpSending(true)
    try {
      await api.post('/platform/otp/request', { purpose: 'withdrawal' })
      setOtpStep(true)
      toast.success('Codigo de verificacao enviado para seu email!')
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar codigo')
    } finally {
      setOtpSending(false)
    }
  }

  async function handleVerifyAndWithdraw() {
    if (!otpCode || otpCode.length !== 6) { toast.error('Informe o codigo de 6 digitos'); return }

    setOtpVerifying(true)
    try {
      await api.post('/platform/otp/verify', { code: otpCode, purpose: 'withdrawal' })

      // OTP verified, proceed with withdrawal
      const amount = Number(withdrawAmount)
      withdrawMutation.mutate({
        method: withdrawMethod,
        fancoinAmount: amount,
        pixKey: withdrawMethod === 'pix' ? pixKey : undefined,
        cryptoAddress: withdrawMethod === 'crypto' ? cryptoAddress : undefined,
        cryptoNetwork: withdrawMethod === 'crypto' ? cryptoNetwork : undefined,
      })
      setOtpStep(false)
      setOtpCode('')
    } catch (e: any) {
      toast.error(e.message || 'Codigo invalido')
    } finally {
      setOtpVerifying(false)
    }
  }

  function handleSendTransfer() {
    if (!selectedUser) return
    const amount = Number(sendAmount)
    if (!amount || amount <= 0) {
      toast.error('Informe o valor em FanCoins')
      return
    }
    if (amount > Number(wallet?.balance || 0)) {
      toast.error('Saldo insuficiente')
      return
    }
    setSendState('sending')
    transferMutation.mutate({
      toUsername: selectedUser.username,
      amount,
      message: sendMessage || undefined,
    })
  }

  function resetSendState() {
    setSendQuery('')
    setSendAmount('')
    setSendMessage('')
    setSelectedUser(null)
    setSendState('search')
    setFeeAccepted(false)
  }

  const isPurchasing = checkoutMutation.isPending || directPurchaseMutation.isPending || customCheckoutMutation.isPending
  const isCreator = user?.role === 'creator' || user?.role === 'admin'
  const fancoinToBrl = earnings?.fancoinToBrl || 0.01

  const groupedTransactions = useMemo(() => {
    if (!transactions) return []
    return groupTransactionsByMonth(transactions)
  }, [transactions])

  useEffect(() => {
    if (groupedTransactions.length > 0 && expandedMonths.size === 0) {
      setExpandedMonths(new Set([groupedTransactions[0].key]))
    }
  }, [groupedTransactions])

  function toggleMonth(key: string) {
    setExpandedMonths((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Coins className="w-6 h-6 text-warning" />
        <h1 className="text-xl font-bold">Meus FanCoins</h1>
      </div>

      {paymentStatus && (
        <div className={`flex items-center gap-3 p-4 rounded-md mb-6 ${
          paymentStatus === 'success' ? 'bg-success/10 border border-success/20'
            : paymentStatus === 'failure' ? 'bg-error/10 border border-error/20'
              : 'bg-warning/10 border border-warning/20'
        }`}>
          {paymentStatus === 'success' ? <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
            : paymentStatus === 'failure' ? <XCircle className="w-5 h-5 text-error shrink-0" />
              : <Clock className="w-5 h-5 text-warning shrink-0" />}
          <p className="text-sm">
            {paymentStatus === 'success' ? 'Pagamento aprovado! Seus FanCoins foram creditados.'
              : paymentStatus === 'failure' ? 'Pagamento nao aprovado. Tente novamente.'
                : 'Pagamento pendente. Aguardando confirmacao.'}
          </p>
        </div>
      )}

      {/* Balance Card */}
      <Card className="mb-6 bg-gradient-to-br from-primary/10 via-surface to-secondary/10">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted mb-1">Saldo atual</p>
          <div className="text-5xl font-bold text-foreground flex items-center justify-center gap-3">
            <Coins className="w-10 h-10 text-warning" />
            {(wallet?.balance || 0).toLocaleString()}
          </div>
          <p className="text-xs text-muted mt-1">FanCoins{isCreator && ` ≈ ${formatCurrency(Number(wallet?.balance || 0) * fancoinToBrl)}`}</p>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <span className="flex items-center gap-1 text-success">
              <TrendingUp className="w-4 h-4" />
              {(wallet?.totalEarned || 0).toLocaleString()} ganhos
            </span>
            <span className="flex items-center gap-1 text-error">
              <TrendingDown className="w-4 h-4" />
              {(wallet?.totalSpent || 0).toLocaleString()} gastos
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button variant={activeTab === 'buy' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('buy')}>
          <ShoppingBag className="w-4 h-4 mr-1" /> Comprar
        </Button>
        <Button variant={activeTab === 'send' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('send')}>
          <Send className="w-4 h-4 mr-1" /> Enviar
        </Button>
        {isCreator && (
          <Button variant={activeTab === 'withdraw' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('withdraw')}>
            <ArrowDownToLine className="w-4 h-4 mr-1" /> Sacar
          </Button>
        )}
        <Button variant={activeTab === 'history' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('history')}>
          <Gift className="w-4 h-4 mr-1" /> Historico
        </Button>
      </div>

      {/* Buy Tab */}
      {activeTab === 'buy' && (
        <>
          {providers && providers.length > 0 && (
            <div className="flex items-center gap-2 mb-4 text-xs text-muted">
              <Shield className="w-3 h-3" />
              Metodos: {providers.map((p) => (
                <Badge key={p.id} variant="default" className="text-xs">
                  {p.label}{p.sandbox ? ' (sandbox)' : ''}
                </Badge>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {FANCOIN_PACKAGES.map((pkg) => (
              <Card key={pkg.id}>
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-bold text-lg">{pkg.coins.toLocaleString()}</span>
                      <span className="text-sm text-muted ml-1">FanCoins</span>
                      {pkg.bonus > 0 && <Badge variant="success" className="ml-2">+{pkg.bonus} bonus</Badge>}
                    </div>
                    <span className="text-lg font-bold text-primary">{formatCurrency(pkg.price)}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {providers?.some((p) => p.methods.includes('pix')) && (
                      <Button size="sm" variant="primary" className="flex-1 min-w-[80px]" loading={isPurchasing}
                        onClick={() => handlePurchase(pkg.id, 'pix', 'mercadopago')}>
                        <QrCode className="w-4 h-4 mr-1" /> PIX
                      </Button>
                    )}
                    {providers?.some((p) => p.methods.includes('credit_card')) && (
                      <Button size="sm" variant="outline" className="flex-1 min-w-[80px]" loading={isPurchasing}
                        onClick={() => handlePurchase(pkg.id, 'credit_card', 'mercadopago')}>
                        <CreditCard className="w-4 h-4 mr-1" /> Cartao
                      </Button>
                    )}
                    {providers?.some((p) => p.methods.includes('crypto')) && (
                      <Button size="sm" variant="outline" className="flex-1 min-w-[80px]" loading={isPurchasing}
                        onClick={() => handlePurchase(pkg.id, 'crypto', 'nowpayments')}>
                        <Bitcoin className="w-4 h-4 mr-1" /> Crypto
                      </Button>
                    )}
                    {providers?.some((p) => p.methods.includes('paypal')) && (
                      <Button size="sm" variant="outline" className="flex-1 min-w-[80px]" loading={isPurchasing}
                        onClick={() => handlePurchase(pkg.id, 'paypal', 'paypal')}>
                        <Wallet className="w-4 h-4 mr-1" /> PayPal
                      </Button>
                    )}
                    {(!providers || providers.length === 0) && (
                      <>
                        <Button size="sm" variant="primary" className="flex-1" loading={isPurchasing}
                          onClick={() => handlePurchase(pkg.id, 'pix', 'mercadopago')}>
                          <QrCode className="w-4 h-4 mr-1" /> PIX
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" loading={isPurchasing}
                          onClick={() => handlePurchase(pkg.id, 'credit_card', 'mercadopago')}>
                          <CreditCard className="w-4 h-4 mr-1" /> Cartao
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Custom Purchase */}
          <Card className="mb-8">
            <CardContent className="pt-5">
              <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
                <ArrowLeftRight className="w-4 h-4 text-primary" />
                Compra personalizada
              </h3>
              <div className="flex gap-2 mb-3">
                <Button size="sm" variant={customMode === 'brl' ? 'primary' : 'outline'} onClick={() => { setCustomMode('brl'); setCustomValue('') }}>
                  R$ → FanCoins
                </Button>
                <Button size="sm" variant={customMode === 'coins' ? 'primary' : 'outline'} onClick={() => { setCustomMode('coins'); setCustomValue('') }}>
                  FanCoins → R$
                </Button>
              </div>
              <Input
                label={customMode === 'brl' ? 'Valor em Reais (R$)' : 'Quantidade de FanCoins'}
                type="number"
                placeholder={customMode === 'brl' ? 'Ex: 25.00' : 'Ex: 2500'}
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                min={customMode === 'brl' ? 1 : 100}
                step={customMode === 'brl' ? '0.01' : '1'}
              />
              {customValue && Number(customValue) > 0 && (
                <div className="mt-2 p-3 bg-surface rounded-md text-sm">
                  {customMode === 'brl' ? (
                    <p>
                      Voce recebera: <span className="font-bold text-foreground">{Math.floor(Number(customValue) / 0.01).toLocaleString()} FanCoins</span>
                      <span className="text-xs text-muted ml-1">(sem bonus)</span>
                    </p>
                  ) : (
                    <p>
                      Valor a pagar: <span className="font-bold text-foreground">{formatCurrency(Number(customValue) * 0.01)}</span>
                      <span className="text-xs text-muted ml-1">(sem bonus)</span>
                    </p>
                  )}
                </div>
              )}
              <div className="flex gap-2 flex-wrap mt-3">
                {providers?.some((p) => p.methods.includes('pix')) && (
                  <Button size="sm" variant="primary" className="flex-1 min-w-[80px]" loading={isPurchasing}
                    disabled={!customValue || Number(customValue) <= 0}
                    onClick={() => handleCustomPurchase('pix', 'mercadopago')}>
                    <QrCode className="w-4 h-4 mr-1" /> PIX
                  </Button>
                )}
                {providers?.some((p) => p.methods.includes('credit_card')) && (
                  <Button size="sm" variant="outline" className="flex-1 min-w-[80px]" loading={isPurchasing}
                    disabled={!customValue || Number(customValue) <= 0}
                    onClick={() => handleCustomPurchase('credit_card', 'mercadopago')}>
                    <CreditCard className="w-4 h-4 mr-1" /> Cartao
                  </Button>
                )}
                {providers?.some((p) => p.methods.includes('crypto')) && (
                  <Button size="sm" variant="outline" className="flex-1 min-w-[80px]" loading={isPurchasing}
                    disabled={!customValue || Number(customValue) <= 0}
                    onClick={() => handleCustomPurchase('crypto', 'nowpayments')}>
                    <Bitcoin className="w-4 h-4 mr-1" /> Crypto
                  </Button>
                )}
                {providers?.some((p) => p.methods.includes('paypal')) && (
                  <Button size="sm" variant="outline" className="flex-1 min-w-[80px]" loading={isPurchasing}
                    disabled={!customValue || Number(customValue) <= 0}
                    onClick={() => handleCustomPurchase('paypal', 'paypal')}>
                    <Wallet className="w-4 h-4 mr-1" /> PayPal
                  </Button>
                )}
                {(!providers || providers.length === 0) && (
                  <>
                    <Button size="sm" variant="primary" className="flex-1" loading={isPurchasing}
                      disabled={!customValue || Number(customValue) <= 0}
                      onClick={() => handleCustomPurchase('pix', 'mercadopago')}>
                      <QrCode className="w-4 h-4 mr-1" /> PIX
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" loading={isPurchasing}
                      disabled={!customValue || Number(customValue) <= 0}
                      onClick={() => handleCustomPurchase('credit_card', 'mercadopago')}>
                      <CreditCard className="w-4 h-4 mr-1" /> Cartao
                    </Button>
                  </>
                )}
              </div>
              <p className="text-xs text-muted mt-2">
                Taxa base: 100 FanCoins = R$ 1,00. Pacotes acima oferecem bonus.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Send Tab */}
      {activeTab === 'send' && (
        <Card className="mb-8">
          <CardHeader>
            <h2 className="font-bold flex items-center gap-2">
              <Send className="w-5 h-5 text-warning" />
              Enviar FanCoins
            </h2>
            <p className="text-sm text-muted">Transfira FanCoins para outro usuario da plataforma</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {sendState === 'success' && (
              <div className="text-center py-8 space-y-4">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
                <div>
                  <p className="text-lg font-medium">FanCoins enviados com sucesso!</p>
                  <p className="text-sm text-muted mt-1">
                    {selectedUser && `Transferencia para @${selectedUser.username} concluida.`}
                  </p>
                </div>
                <Button size="sm" onClick={resetSendState}>
                  Enviar para outra pessoa
                </Button>
              </div>
            )}

            {sendState === 'sending' && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted mt-3">Enviando FanCoins...</p>
              </div>
            )}

            {(sendState === 'search' || sendState === 'confirm') && (
              <>
                {/* Recipient */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Destinatario</label>
                  {selectedUser ? (
                    <div className="flex items-center gap-3 p-4 rounded-md border border-primary/30 bg-primary/5">
                      <Avatar src={selectedUser.avatarUrl} alt={selectedUser.displayName || selectedUser.username} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{selectedUser.displayName || selectedUser.username}</p>
                        <p className="text-sm text-muted">@{selectedUser.username}</p>
                      </div>
                      <button
                        onClick={() => { setSelectedUser(null); setSendQuery(''); setSendState('search') }}
                        className="p-1.5 rounded-md hover:bg-surface-light"
                      >
                        <X className="w-4 h-4 text-muted" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <input
                          type="text"
                          placeholder="Buscar por @usuario..."
                          value={sendQuery}
                          onChange={(e) => setSendQuery(e.target.value.replace(/^@/, ''))}
                          className="w-full pl-10 pr-10 py-3 rounded-md border border-border bg-surface text-sm focus:outline-none focus:border-primary"
                        />
                        {isSearching && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted" />
                        )}
                      </div>

                      {/* Search results */}
                      {searchResults && searchResults.length > 0 && !selectedUser && (
                        <div className="mt-2 border border-border rounded-md overflow-hidden">
                          {searchResults.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => {
                                setSelectedUser(u)
                                setSendQuery('')
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-surface-light transition-colors border-b border-border/50 last:border-b-0"
                            >
                              <Avatar src={u.avatarUrl} alt={u.displayName || u.username} size="sm" />
                              <div className="text-left min-w-0">
                                <p className="text-sm font-medium truncate">{u.displayName || u.username}</p>
                                <p className="text-xs text-muted">@{u.username}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {sendQuery.length >= 2 && !isSearching && searchResults?.length === 0 && (
                        <p className="text-sm text-muted mt-3 text-center py-3">Nenhum usuario encontrado</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Amount and message */}
                {selectedUser && (
                  <>
                    <div>
                      <Input
                        label="Quantidade de FanCoins"
                        type="number"
                        placeholder="Ex: 500"
                        value={sendAmount}
                        onChange={(e) => { setSendAmount(e.target.value); setFeeAccepted(false) }}
                        min={1}
                        step="1"
                      />
                    </div>

                    {/* Fee preview */}
                    {transferPreview && debouncedSendAmount > 0 && (
                      <div className="p-4 bg-surface border border-border rounded-md space-y-2">
                        <p className="text-sm font-medium text-foreground">Resumo da transferencia</p>
                        <div className="text-sm space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-muted">Voce envia</span>
                            <span className="font-medium">{transferPreview.amount.toLocaleString()} FanCoins</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted">Taxa P2P ({transferPreview.platformFeePercent}%)</span>
                            <span className="text-error">-{transferPreview.platformFee.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted">Fundo ecossistema ({transferPreview.ecosystemFundPercent}%)</span>
                            <span className="text-error">-{transferPreview.ecosystemFund.toLocaleString()}</span>
                          </div>
                          <div className="border-t border-border pt-1.5 flex justify-between">
                            <span className="font-medium text-foreground">Destinatario recebe</span>
                            <span className="font-bold text-success">{transferPreview.receiverGets.toLocaleString()} FanCoins</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted text-xs">Valor estimado</span>
                            <span className="text-xs text-muted">{formatCurrency(transferPreview.receiverGetsBrl)}</span>
                          </div>
                        </div>
                        {transferPreview.tierMultiplier > 1 && (
                          <p className="text-xs text-primary">Seu tier reduziu a taxa efetiva (multiplicador {transferPreview.tierMultiplier}x)</p>
                        )}
                      </div>
                    )}

                    {isLoadingPreview && debouncedSendAmount > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted py-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Calculando taxas...
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Mensagem <span className="text-muted font-normal">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Parabens pelo conteudo!"
                        value={sendMessage}
                        onChange={(e) => setSendMessage(e.target.value.slice(0, 200))}
                        maxLength={200}
                        className="w-full px-3 py-3 rounded-md border border-border bg-surface text-sm focus:outline-none focus:border-primary"
                      />
                      <p className="text-xs text-muted mt-1 text-right">{sendMessage.length}/200</p>
                    </div>

                    {/* Fee acceptance checkbox */}
                    {transferPreview && debouncedSendAmount > 0 && (
                      <label className="flex items-start gap-3 cursor-pointer p-3 rounded-md border border-border hover:border-primary/30 transition-colors">
                        <input
                          type="checkbox"
                          checked={feeAccepted}
                          onChange={(e) => setFeeAccepted(e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded border-border text-primary"
                        />
                        <span className="text-sm text-muted">
                          Concordo com a taxa de <span className="font-medium text-foreground">{transferPreview.totalFeesPercent}%</span> ({transferPreview.totalFees.toLocaleString()} FanCoins). O destinatario recebera <span className="font-medium text-success">{transferPreview.receiverGets.toLocaleString()} FanCoins</span>.
                        </span>
                      </label>
                    )}

                    <Button
                      className="w-full"
                      disabled={!sendAmount || Number(sendAmount) <= 0 || !feeAccepted}
                      loading={transferMutation.isPending}
                      onClick={handleSendTransfer}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Confirmar envio de {sendAmount ? Number(sendAmount).toLocaleString() : ''} FanCoins
                    </Button>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Withdraw Tab */}
      {activeTab === 'withdraw' && isCreator && (
        <Card className="mb-8">
          <CardHeader>
            <h2 className="font-bold flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-primary" />
              Solicitar Saque
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {earnings && (
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="bg-surface p-3 rounded-md">
                  <p className="text-muted text-xs">Disponivel para saque</p>
                  <p className="font-bold text-lg">{formatCurrency(earnings.balanceBrl)}</p>
                  <p className="text-xs text-muted">{Number(wallet?.balance || 0).toLocaleString()} FanCoins</p>
                </div>
                <div className="bg-surface p-3 rounded-md">
                  <p className="text-muted text-xs">Total sacado</p>
                  <p className="font-bold text-lg">{formatCurrency(earnings.totalWithdrawnBrl)}</p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" variant={withdrawMethod === 'pix' ? 'primary' : 'outline'} onClick={() => setWithdrawMethod('pix')}>
                <QrCode className="w-4 h-4 mr-1" /> PIX
              </Button>
              <Button size="sm" variant={withdrawMethod === 'crypto' ? 'primary' : 'outline'} onClick={() => setWithdrawMethod('crypto')}>
                <Bitcoin className="w-4 h-4 mr-1" /> Crypto
              </Button>
            </div>

            <Input
              label="Quantidade de FanCoins"
              type="number"
              placeholder="Ex: 10000"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
            {withdrawAmount && Number(withdrawAmount) > 0 && (
              <p className="text-sm text-muted">
                Valor estimado: <span className="font-bold text-foreground">{formatCurrency(Number(withdrawAmount) * fancoinToBrl)}</span>
              </p>
            )}

            {withdrawMethod === 'pix' && (
              <Input label="Chave PIX" placeholder="CPF, email, telefone ou chave aleatoria" value={pixKey} onChange={(e) => setPixKey(e.target.value)} />
            )}

            {withdrawMethod === 'crypto' && (
              <>
                <div className="flex gap-2 mb-2">
                  {['TRC20', 'ERC20', 'BEP20'].map((net) => (
                    <Button key={net} size="sm" variant={cryptoNetwork === net ? 'primary' : 'outline'} onClick={() => setCryptoNetwork(net)}>
                      {net}
                    </Button>
                  ))}
                </div>
                <Input label={`Endereco USDT (${cryptoNetwork})`} placeholder="Endereco da carteira" value={cryptoAddress} onChange={(e) => setCryptoAddress(e.target.value)} />
              </>
            )}

            <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md text-xs text-muted">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p>Saques acima de R$ 500 requerem aprovacao manual (ate 24h).</p>
                <p>Limite: 3 saques/dia, maximo R$ 10.000/dia.</p>
              </div>
            </div>

            {otpStep ? (
              <div className="space-y-3 p-4 bg-surface border border-primary/20 rounded-md">
                <p className="text-sm font-medium text-foreground">Verificacao por email</p>
                <p className="text-xs text-muted">Enviamos um codigo de 6 digitos para seu email. Informe abaixo para confirmar o saque.</p>
                <Input
                  label="Codigo OTP"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-lg tracking-widest font-mono"
                />
                <div className="flex gap-2">
                  <Button className="flex-1" loading={otpVerifying || withdrawMutation.isPending} onClick={handleVerifyAndWithdraw}>
                    Confirmar Saque
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setOtpStep(false); setOtpCode('') }}>
                    Cancelar
                  </Button>
                </div>
                <button
                  onClick={handleRequestOtp}
                  disabled={otpSending}
                  className="text-xs text-primary hover:underline disabled:opacity-50"
                >
                  {otpSending ? 'Enviando...' : 'Reenviar codigo'}
                </button>
              </div>
            ) : (
              <Button className="w-full" loading={otpSending} onClick={handleRequestOtp}>
                Solicitar Saque
              </Button>
            )}

            {/* Payout History */}
            {earnings?.payouts?.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold text-sm mb-3">Historico de saques</h3>
                <div className="space-y-2">
                  {earnings.payouts.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <span className="text-sm font-medium">{p.method.toUpperCase()} - {formatCurrency(Number(p.amount))}</span>
                        <p className="text-xs text-muted">
                          {new Date(p.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <Badge variant={p.status === 'completed' ? 'success' : p.status === 'rejected' ? 'error' : 'warning'}>
                        {p.status === 'completed' ? 'Pago' : p.status === 'pending_approval' ? 'Aprovacao' : p.status === 'pending' ? 'Processando' : p.status === 'rejected' ? 'Rejeitado' : p.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <h2 className="font-bold flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              Historico
            </h2>
          </CardHeader>
          <CardContent>
            {groupedTransactions.length > 0 ? (
              <div className="space-y-3">
                {groupedTransactions.map((group) => {
                  const isOpen = expandedMonths.has(group.key)
                  const total = group.transactions.reduce((sum: number, tx: any) => sum + Number(tx.amount), 0)
                  return (
                    <div key={group.key} className="border border-border rounded-md overflow-hidden">
                      <button
                        onClick={() => toggleMonth(group.key)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-light transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={`w-4 h-4 text-muted transition-transform ${isOpen ? '' : '-rotate-90'}`}
                          />
                          <span className="text-sm font-medium">{group.label}</span>
                          <span className="text-xs text-muted">({group.transactions.length})</span>
                        </div>
                        <span className={`text-xs font-bold ${total >= 0 ? 'text-success' : 'text-error'}`}>
                          {total >= 0 ? '+' : ''}{total.toLocaleString()}
                        </span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-border">
                              {group.transactions.map((tx: any) => (
                                <div key={tx.id} className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 last:border-0">
                                  <div>
                                    <span className="text-sm font-medium">
                                      <TransactionDescription text={tx.description || tx.type} />
                                    </span>
                                    <p className="text-xs text-muted">
                                      {new Date(tx.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                  <span className={`font-bold text-sm ${tx.amount > 0 ? 'text-success' : 'text-error'}`}>
                                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-muted text-sm text-center py-6">Nenhuma transacao ainda</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TransactionDescription({ text }: { text: string }) {
  const parts = text.split(/(@\w+)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const username = part.slice(1)
          return <Link key={i} href={`/creator/${username}`} className="text-primary hover:underline">{part}</Link>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <WalletContent />
    </Suspense>
  )
}
