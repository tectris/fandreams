'use client'

import { Suspense, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { InfoDrawer } from '@/components/ui/info-drawer'
import {
  Lock, Unlock, Loader2, Clock, Coins, Gift, AlertTriangle,
  ArrowLeft, CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { timeAgo } from '@/lib/utils'

type Commitment = {
  commitment: {
    id: string
    fanId: string
    creatorId: string
    amount: number
    durationDays: number
    status: string
    startedAt: string
    endsAt: string
    bonusGranted: number | null
    withdrawnAt: string | null
    createdAt: string
  }
  creatorUsername: string
  creatorDisplayName: string | null
  creatorAvatarUrl: string | null
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'primary' | 'warning' | 'error' }> = {
  active: { label: 'Ativo', variant: 'success' },
  completed: { label: 'Concluido', variant: 'primary' },
  withdrawn_early: { label: 'Retirado', variant: 'warning' },
}

function CommitmentsContent() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isCreator = user?.role === 'creator' || user?.role === 'admin'
  const [activeTab, setActiveTab] = useState<'my' | 'create' | 'received'>('my')
  const [creatorId, setCreatorId] = useState('')
  const [amount, setAmount] = useState('')
  const [durationDays, setDurationDays] = useState('30')

  const { data: commitments, isLoading } = useQuery({
    queryKey: ['my-commitments'],
    queryFn: async () => (await api.get<Commitment[]>('/commitments/my')).data,
  })

  const { data: receivedCommitments } = useQuery({
    queryKey: ['received-commitments'],
    queryFn: async () => (await api.get<any[]>('/commitments/creator')).data,
    enabled: isCreator && activeTab === 'received',
  })

  const createMutation = useMutation({
    mutationFn: (data: { creatorId: string; amount: number; durationDays: number }) =>
      api.post('/commitments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-commitments'] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      setCreatorId('')
      setAmount('')
      toast.success('Compromisso criado! Seus FanCoins foram bloqueados.')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const withdrawMutation = useMutation({
    mutationFn: (commitmentId: string) => api.post(`/commitments/${commitmentId}/withdraw`),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['my-commitments'] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      const data = res.data
      toast.success(`Retirado: ${data.refunded?.toLocaleString()} FanCoins (penalidade: ${data.penalty?.toLocaleString()})`)
    },
    onError: (e: any) => toast.error(e.message),
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!creatorId) { toast.error('Informe o ID do criador'); return }
    if (!amount || Number(amount) < 100) { toast.error('Minimo: 100 FanCoins'); return }
    createMutation.mutate({
      creatorId,
      amount: Number(amount),
      durationDays: Number(durationDays),
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Lock className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Compromissos</h1>
        <InfoDrawer title="Regras dos Compromissos">
          <p className="font-medium text-foreground">O que sao Compromissos?</p>
          <p>Voce bloqueia FanCoins por um periodo (30, 60 ou 90 dias) em apoio a um criador. Ao concluir, recebe um bonus de 5%.</p>
          <p className="font-medium text-foreground mt-4">Regras:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Minimo: 100 FanCoins</li>
            <li>Maximo: 1.000.000 FanCoins</li>
            <li>Duracoes: 30, 60 ou 90 dias</li>
            <li>Bonus de conclusao: 5% (nao sacavel)</li>
            <li>Penalidade por retirada antecipada: 10%</li>
            <li>Apenas um compromisso ativo por criador</li>
          </ul>
          <p className="font-medium text-foreground mt-4">Bonus:</p>
          <p>O bonus de 5% e adicionado como FanCoins bonus (nao sacavel). Pode ser usado para compras e tips na plataforma.</p>
        </InfoDrawer>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button variant={activeTab === 'my' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('my')}>
          <Lock className="w-4 h-4 mr-1" /> Meus Compromissos
        </Button>
        <Button variant={activeTab === 'create' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('create')}>
          <Coins className="w-4 h-4 mr-1" /> Novo
        </Button>
        {isCreator && (
          <Button variant={activeTab === 'received' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('received')}>
            <Gift className="w-4 h-4 mr-1" /> Recebidos
          </Button>
        )}
      </div>

      {/* My Commitments */}
      {activeTab === 'my' && (
        <>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : commitments && commitments.length > 0 ? (
            <div className="space-y-3">
              {commitments.map((item) => {
                const c = item.commitment
                const statusInfo = STATUS_CONFIG[c.status]
                const isActive = c.status === 'active'
                const endsAt = new Date(c.endsAt)
                const now = new Date()
                const daysLeft = isActive ? Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0
                const progressPct = isActive
                  ? Math.min(100, Math.round(((c.durationDays - daysLeft) / c.durationDays) * 100))
                  : 100

                return (
                  <Card key={c.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Link href={`/creator/${item.creatorUsername}`} className="font-bold text-sm hover:text-primary">
                            {item.creatorDisplayName || item.creatorUsername}
                          </Link>
                          <p className="text-xs text-muted">@{item.creatorUsername}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {statusInfo && <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>}
                          <Badge variant="warning">{c.amount.toLocaleString()} FC</Badge>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="w-full bg-surface-light rounded-full h-2 mb-2">
                        <div
                          className={`h-2 rounded-full transition-all ${c.status === 'completed' ? 'bg-success' : 'bg-primary'}`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {isActive ? `${daysLeft} dias restantes` : c.status === 'completed' ? 'Concluido' : 'Retirado'}
                        </span>
                        <span>{c.durationDays} dias</span>
                      </div>

                      {c.status === 'completed' && c.bonusGranted && c.bonusGranted > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-success">
                          <CheckCircle2 className="w-3 h-3" />
                          Bonus recebido: {c.bonusGranted.toLocaleString()} FanCoins
                        </div>
                      )}

                      {isActive && (
                        <div className="mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            loading={withdrawMutation.isPending}
                            onClick={() => {
                              if (confirm('Retirada antecipada: voce perdera 10% do valor. Continuar?')) {
                                withdrawMutation.mutate(c.id)
                              }
                            }}
                          >
                            <Unlock className="w-4 h-4 mr-1" /> Retirar (penalidade 10%)
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Lock className="w-12 h-12 text-muted mx-auto mb-3" />
                <p className="text-muted">Nenhum compromisso ainda</p>
                <Button size="sm" variant="ghost" className="mt-3" onClick={() => setActiveTab('create')}>
                  Criar primeiro compromisso
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Create Tab */}
      {activeTab === 'create' && (
        <Card>
          <CardHeader>
            <h2 className="font-bold flex items-center gap-2">
              <Coins className="w-5 h-5 text-warning" /> Novo Compromisso
            </h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="ID do Criador"
                placeholder="UUID do criador"
                value={creatorId}
                onChange={(e) => setCreatorId(e.target.value)}
                required
              />

              <Input
                label="Quantidade de FanCoins"
                type="number"
                placeholder="Min: 100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min={100}
                max={1000000}
              />

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Duracao</label>
                <div className="flex gap-2">
                  {['30', '60', '90'].map((d) => (
                    <Button
                      key={d}
                      type="button"
                      size="sm"
                      variant={durationDays === d ? 'primary' : 'outline'}
                      onClick={() => setDurationDays(d)}
                    >
                      {d} dias
                    </Button>
                  ))}
                </div>
              </div>

              {amount && Number(amount) >= 100 && (
                <div className="bg-surface-light p-3 rounded-md text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted">Bloqueado:</span>
                    <span className="font-bold">{Number(amount).toLocaleString()} FC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Bonus ao concluir (5%):</span>
                    <span className="font-bold text-success">+{Math.floor(Number(amount) * 0.05).toLocaleString()} FC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Penalidade se retirar antes (10%):</span>
                    <span className="font-bold text-error">-{Math.floor(Number(amount) * 0.10).toLocaleString()} FC</span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md text-xs text-muted">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p>Seus FanCoins ficarao bloqueados por {durationDays} dias. Retirada antecipada tem penalidade de 10%.</p>
              </div>

              <Button type="submit" className="w-full" loading={createMutation.isPending}>
                <Lock className="w-4 h-4 mr-1" /> Bloquear FanCoins
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Received (Creator) */}
      {activeTab === 'received' && isCreator && (
        <>
          {receivedCommitments && receivedCommitments.length > 0 ? (
            <div className="space-y-3">
              {receivedCommitments.map((item: any) => (
                <Card key={item.commitment.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm">{item.fanDisplayName || item.fanUsername}</p>
                        <p className="text-xs text-muted">@{item.fanUsername}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="warning">{item.commitment.amount.toLocaleString()} FC</Badge>
                        <p className="text-xs text-muted mt-1">{item.commitment.durationDays} dias</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Gift className="w-12 h-12 text-muted mx-auto mb-3" />
                <p className="text-muted">Nenhum compromisso recebido ainda</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

export default function CommitmentsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <CommitmentsContent />
    </Suspense>
  )
}
