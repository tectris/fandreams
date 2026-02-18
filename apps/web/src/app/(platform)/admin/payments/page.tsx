'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import {
  Settings, Shield, AlertTriangle, CheckCircle2, XCircle,
  Clock, ArrowDownToLine, DollarSign, Loader2, Gift, Coins,
} from 'lucide-react'
import { toast } from 'sonner'

const KNOWN_GATEWAYS = [
  { id: 'openpix', label: 'Woovi (OpenPix)', description: 'PIX a vista e Assinaturas recorrentes via PIX', envVars: 'OPENPIX_APP_ID, OPENPIX_WEBHOOK_SECRET, OPENPIX_SANDBOX' },
  { id: 'mercadopago', label: 'MercadoPago', description: 'Cartao de Credito e Assinaturas via cartao', envVars: 'MERCADOPAGO_ACCESS_TOKEN, MERCADOPAGO_SANDBOX' },
  { id: 'nowpayments', label: 'NOWPayments', description: 'Bitcoin, USDT, ETH e outras criptos', envVars: 'NOWPAYMENTS_API_KEY, NOWPAYMENTS_IPN_SECRET, NOWPAYMENTS_SANDBOX' },
  { id: 'paypal', label: 'PayPal', description: 'Pagamentos via PayPal', envVars: 'PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_SANDBOX' },
]

const DEFAULT_SETTINGS = {
  manual_approval_threshold: 500,
  max_daily_withdrawals: 3,
  max_daily_amount: 10000,
  cooldown_hours: 24,
  min_payout: 50,
  fancoin_to_brl: 0.01,
  platform_fee_percent: 8,
  creator_bonus_enabled: false,
  creator_bonus_coins: 1000,
  creator_bonus_required_subs: 1,
}

function SettingsTab({ providers, loadingProviders, settings, loadingSettings, settingsMutation }: {
  providers: any
  loadingProviders: boolean
  settings: any
  loadingSettings: boolean
  settingsMutation: any
}) {
  const activeProviderIds = new Set((providers || []).map((p: any) => p.id))
  const effectiveSettings = settings || DEFAULT_SETTINGS

  return (
    <div className="space-y-6">
      {/* Payment Gateways Status */}
      <Card>
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" /> Payment Gateways
          </h2>
          <p className="text-xs text-muted mt-1">Status dos gateways de pagamento configurados no servidor</p>
        </CardHeader>
        <CardContent>
          {loadingProviders ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-3">
              {KNOWN_GATEWAYS.map((gw) => {
                const active = activeProviderIds.has(gw.id)
                const providerData = (providers || []).find((p: any) => p.id === gw.id)
                return (
                  <div key={gw.id} className={`flex items-center justify-between p-3 border rounded-md ${active ? 'border-border' : 'border-border/50 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${active ? (providerData?.sandbox ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-500'}`} />
                      <div>
                        <p className="font-medium">{gw.label}</p>
                        <p className="text-xs text-muted">{gw.description}</p>
                        {!active && (
                          <p className="text-xs text-muted mt-1 font-mono">{gw.envVars}</p>
                        )}
                        {active && providerData?.methods && (
                          <p className="text-xs text-muted mt-1">Metodos: {providerData.methods.join(', ')}</p>
                        )}
                      </div>
                    </div>
                    {active ? (
                      <Badge variant={providerData?.sandbox ? 'warning' : 'success'}>
                        {providerData?.sandbox ? 'Sandbox' : 'Producao'}
                      </Badge>
                    ) : (
                      <Badge variant="default">Nao configurado</Badge>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Platform Fee */}
      <Card>
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" /> Taxa da Plataforma
          </h2>
          <p className="text-xs text-muted mt-1">Percentual retido pela FanDreams em todas as transacoes (assinaturas, tips, PPV, compra de FanCoins)</p>
        </CardHeader>
        <CardContent>
          {loadingSettings ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : (
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              const fee = Number(form.get('platform_fee_percent'))
              if (fee < 0 || fee > 50) {
                return
              }
              settingsMutation.mutate({ platform_fee_percent: fee })
            }}>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    label="Taxa da plataforma (%)"
                    name="platform_fee_percent"
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    defaultValue={effectiveSettings.platform_fee_percent}
                  />
                </div>
                <div className="pt-5">
                  <Button type="submit" loading={settingsMutation.isPending}>
                    Salvar
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted">
                Atual: <span className="font-bold text-foreground">{effectiveSettings.platform_fee_percent}%</span> — Criador recebe <span className="font-bold text-success">{100 - effectiveSettings.platform_fee_percent}%</span> de cada transacao
              </p>
            </form>
          )}
        </CardContent>
      </Card>

      {/* FanCoin Value */}
      <Card>
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" /> Valor do FanCoin
          </h2>
          <p className="text-xs text-muted mt-1">Quanto vale 1 FanCoin em Reais. Afeta todas as conversoes (compras, ganhos, saques)</p>
        </CardHeader>
        <CardContent>
          {loadingSettings ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : (
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              const val = Number(form.get('fancoin_to_brl'))
              if (val <= 0 || val > 1) return
              settingsMutation.mutate({ fancoin_to_brl: val })
            }}>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    label="Valor de 1 FanCoin (R$)"
                    name="fancoin_to_brl"
                    type="number"
                    step="0.001"
                    min="0.001"
                    max="1"
                    defaultValue={effectiveSettings.fancoin_to_brl}
                  />
                </div>
                <div className="pt-5">
                  <Button type="submit" loading={settingsMutation.isPending}>
                    Salvar
                  </Button>
                </div>
              </div>
              <div className="p-3 bg-surface-light rounded-md text-xs text-muted space-y-1">
                <p>1 FanCoin = <span className="font-bold text-foreground">R${effectiveSettings.fancoin_to_brl}</span></p>
                <p>R$1,00 = <span className="font-bold text-foreground">{Math.round(1 / (effectiveSettings.fancoin_to_brl || 0.01)).toLocaleString()} FanCoins</span></p>
                <p>R$100,00 = <span className="font-bold text-foreground">{Math.round(100 / (effectiveSettings.fancoin_to_brl || 0.01)).toLocaleString()} FanCoins</span></p>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Creator Bonus Configuration */}
      <Card>
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" /> Bonus de Criador
          </h2>
          <p className="text-xs text-muted mt-1">Configure o bonus de boas-vindas em FanCoins para novos criadores</p>
        </CardHeader>
        <CardContent>
          {loadingSettings ? (
            <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : (
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              settingsMutation.mutate({
                creator_bonus_enabled: form.get('creator_bonus_enabled') === 'on',
                creator_bonus_coins: Number(form.get('creator_bonus_coins')),
                creator_bonus_required_subs: Number(form.get('creator_bonus_required_subs')),
              })
            }}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="creator_bonus_enabled"
                  defaultChecked={effectiveSettings.creator_bonus_enabled}
                  className="w-4 h-4 rounded border-border text-primary"
                />
                <span className="text-sm font-medium">Ativar bonus de boas-vindas</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Quantidade de FanCoins"
                  name="creator_bonus_coins"
                  type="number"
                  min="100"
                  max="100000"
                  defaultValue={effectiveSettings.creator_bonus_coins}
                />
                <Input
                  label="Assinantes necessarios para resgatar"
                  name="creator_bonus_required_subs"
                  type="number"
                  min="1"
                  max="100"
                  defaultValue={effectiveSettings.creator_bonus_required_subs}
                />
              </div>
              <p className="text-xs text-muted">
                Bonus: <span className="font-bold text-foreground">{effectiveSettings.creator_bonus_coins?.toLocaleString() || '1.000'} FanCoins</span> (R${((effectiveSettings.creator_bonus_coins || 1000) * (effectiveSettings.fancoin_to_brl || 0.01)).toFixed(2)}) — Resgatavel apos <span className="font-bold text-foreground">{effectiveSettings.creator_bonus_required_subs || 1}</span> assinante(s)
              </p>
              <Button type="submit" loading={settingsMutation.isPending}>
                Salvar Bonus
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Anti-fraud & Withdrawal Settings */}
      <Card>
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" /> Configuracoes de Anti-Fraude e Saques
          </h2>
          <p className="text-xs text-muted mt-1">Controles de seguranca e limites para saques de criadores</p>
        </CardHeader>
        <CardContent>
          {loadingSettings ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <form className="space-y-4" onSubmit={(e) => {
              e.preventDefault()
              const form = new FormData(e.currentTarget)
              settingsMutation.mutate({
                manual_approval_threshold: Number(form.get('manual_approval_threshold')),
                max_daily_withdrawals: Number(form.get('max_daily_withdrawals')),
                max_daily_amount: Number(form.get('max_daily_amount')),
                cooldown_hours: Number(form.get('cooldown_hours')),
                min_payout: Number(form.get('min_payout')),
              })
            }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Aprovacao manual a partir de (R$)" name="manual_approval_threshold" type="number" step="0.01" defaultValue={effectiveSettings.manual_approval_threshold} />
                <Input label="Saque minimo (R$)" name="min_payout" type="number" step="0.01" defaultValue={effectiveSettings.min_payout} />
                <Input label="Max saques por dia" name="max_daily_withdrawals" type="number" defaultValue={effectiveSettings.max_daily_withdrawals} />
                <Input label="Max valor diario (R$)" name="max_daily_amount" type="number" step="0.01" defaultValue={effectiveSettings.max_daily_amount} />
                <Input label="Cooldown entre saques (horas)" name="cooldown_hours" type="number" defaultValue={effectiveSettings.cooldown_hours} />
              </div>
              {!settings && (
                <div className="flex items-center gap-2 p-3 bg-warning/10 rounded text-xs text-warning">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Usando valores padrao. Execute <code className="font-mono bg-surface-light px-1 rounded">db:push</code> para criar a tabela platform_settings.
                </div>
              )}
              <Button type="submit" loading={settingsMutation.isPending}>
                Salvar Configuracoes
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminPaymentsPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'settings'>('pending')
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (user && !isAdmin) {
      router.push('/feed')
    }
  }, [user, isAdmin, router])

  if (!isAdmin) {
    return null
  }

  const { data: pendingPayouts, isLoading: loadingPending } = useQuery({
    queryKey: ['admin-payouts-pending'],
    queryFn: async () => (await api.get<any>('/withdrawals/admin/pending')).data,
    enabled: activeTab === 'pending',
    retry: false,
  })

  const { data: allPayouts, isLoading: loadingAll } = useQuery({
    queryKey: ['admin-payouts-all', statusFilter],
    queryFn: async () => (await api.get<any>(`/withdrawals/admin/all${statusFilter ? `?status=${statusFilter}` : ''}`)).data,
    enabled: activeTab === 'all',
    retry: false,
  })

  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ['admin-payment-settings'],
    queryFn: async () => (await api.get<any>('/withdrawals/admin/settings')).data,
    enabled: activeTab === 'settings',
    retry: false,
  })

  const { data: providers, isLoading: loadingProviders } = useQuery({
    queryKey: ['payment-providers'],
    queryFn: async () => {
      try {
        return (await api.get<any>('/payments/providers')).data
      } catch {
        return []
      }
    },
    enabled: activeTab === 'settings',
    retry: false,
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/withdrawals/admin/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payouts-pending'] })
      queryClient.invalidateQueries({ queryKey: ['admin-payouts-all'] })
      toast.success('Saque aprovado!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/withdrawals/admin/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payouts-pending'] })
      queryClient.invalidateQueries({ queryKey: ['admin-payouts-all'] })
      setRejectId(null)
      setRejectReason('')
      toast.success('Saque rejeitado e FanCoins devolvidos.')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const settingsMutation = useMutation({
    mutationFn: (updates: any) => api.patch('/withdrawals/admin/settings', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-settings'] })
      toast.success('Configuracoes salvas!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  function PayoutRow({ payout }: { payout: any }) {
    return (
      <div className="border border-border rounded-md p-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="font-bold">{formatCurrency(Number(payout.amount))}</span>
            <Badge variant="default">{payout.method?.toUpperCase()}</Badge>
            <Badge variant={
              payout.status === 'completed' ? 'success'
                : payout.status === 'rejected' ? 'error'
                  : payout.status === 'pending_approval' ? 'warning' : 'secondary'
            }>
              {payout.status === 'pending_approval' ? 'Aguardando Aprovacao'
                : payout.status === 'pending' ? 'Processando'
                  : payout.status === 'completed' ? 'Pago'
                    : payout.status === 'rejected' ? 'Rejeitado' : payout.status}
            </Badge>
          </div>
          <span className="text-xs text-muted">
            {new Date(payout.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="text-sm text-muted space-y-1">
          <p>Creator: <span className="text-foreground">{payout.creatorId}</span></p>
          <p>FanCoins: <span className="text-foreground">{payout.fancoinAmount?.toLocaleString()}</span></p>
          {payout.pixKey && <p>PIX: <span className="text-foreground">{payout.pixKey}</span></p>}
          {payout.cryptoAddress && <p>Crypto: <span className="text-foreground font-mono text-xs">{payout.cryptoAddress} ({payout.cryptoNetwork})</span></p>}
        </div>

        {payout.riskScore > 0 && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-warning/10 rounded text-xs">
            <AlertTriangle className="w-3 h-3 text-warning" />
            Risk Score: {payout.riskScore} | Flags: {(payout.riskFlags as string[])?.join(', ')}
          </div>
        )}

        {payout.rejectedReason && (
          <div className="mt-2 p-2 bg-error/10 rounded text-xs text-error">
            Motivo: {payout.rejectedReason}
          </div>
        )}

        {payout.status === 'pending_approval' && (
          <div className="flex gap-2 mt-3">
            {rejectId === payout.id ? (
              <div className="flex-1 space-y-2">
                <Input placeholder="Motivo da rejeicao" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                <div className="flex gap-2">
                  <Button size="sm" variant="danger" loading={rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate({ id: payout.id, reason: rejectReason })}>
                    Confirmar Rejeicao
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setRejectId(null); setRejectReason('') }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button size="sm" variant="primary" loading={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(payout.id)}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar
                </Button>
                <Button size="sm" variant="danger" onClick={() => setRejectId(payout.id)}>
                  <XCircle className="w-4 h-4 mr-1" /> Rejeitar
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Gestao de Pagamentos</h1>
      </div>

      <div className="flex gap-2 mb-6">
        <Button variant={activeTab === 'pending' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('pending')}>
          <Clock className="w-4 h-4 mr-1" /> Pendentes{pendingPayouts?.total > 0 ? ` (${pendingPayouts.total})` : ''}
        </Button>
        <Button variant={activeTab === 'all' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('all')}>
          <ArrowDownToLine className="w-4 h-4 mr-1" /> Todos os Saques
        </Button>
        <Button variant={activeTab === 'settings' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('settings')}>
          <Settings className="w-4 h-4 mr-1" /> Configuracoes
        </Button>
      </div>

      {activeTab === 'pending' && (
        <div>
          {loadingPending ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : pendingPayouts?.items?.length > 0 ? (
            pendingPayouts.items.map((p: any) => <PayoutRow key={p.id} payout={p} />)
          ) : (
            <Card><CardContent className="py-8 text-center text-muted">Nenhum saque pendente de aprovacao</CardContent></Card>
          )}
        </div>
      )}

      {activeTab === 'all' && (
        <div>
          <div className="flex gap-2 mb-4">
            {['', 'pending_approval', 'pending', 'completed', 'rejected'].map((s) => (
              <Button key={s} size="sm" variant={statusFilter === s ? 'primary' : 'outline'}
                onClick={() => setStatusFilter(s)}>
                {s === '' ? 'Todos' : s === 'pending_approval' ? 'Aprovacao' : s === 'pending' ? 'Processando' : s === 'completed' ? 'Pagos' : 'Rejeitados'}
              </Button>
            ))}
          </div>
          {loadingAll ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : allPayouts?.items?.length > 0 ? (
            allPayouts.items.map((p: any) => <PayoutRow key={p.id} payout={p} />)
          ) : (
            <Card><CardContent className="py-8 text-center text-muted">Nenhum saque encontrado</CardContent></Card>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <SettingsTab
          providers={providers}
          loadingProviders={loadingProviders}
          settings={settings}
          loadingSettings={loadingSettings}
          settingsMutation={settingsMutation}
        />
      )}
    </div>
  )
}
