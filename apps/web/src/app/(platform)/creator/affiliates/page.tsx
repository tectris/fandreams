'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import {
  Share2, Users, Coins,
  TrendingUp, Loader2, Gift, Settings, BarChart3,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'

export default function CreatorAffiliatesPage() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'program' | 'stats' | 'bonus'>('program')
  const [isActive, setIsActive] = useState(false)
  const [commissionPercent, setCommissionPercent] = useState(10)

  const isCreator = user?.role === 'creator' || user?.role === 'admin'

  // ── Data Fetching ──

  const { data: program, isLoading: loadingProgram } = useQuery({
    queryKey: ['affiliate-program'],
    queryFn: async () => {
      const res = await api.get<any>('/affiliates/program')
      return res.data
    },
    enabled: isCreator,
  })

  const { data: creatorStats, isLoading: loadingStats } = useQuery({
    queryKey: ['affiliate-creator-stats'],
    queryFn: async () => {
      const res = await api.get<any>('/affiliates/creator-stats')
      return res.data
    },
    enabled: isCreator && activeTab === 'stats',
  })

  const { data: bonus, isLoading: loadingBonus } = useQuery({
    queryKey: ['creator-bonus'],
    queryFn: async () => {
      const res = await api.get<any>('/affiliates/bonus')
      return res.data
    },
    enabled: isCreator && activeTab === 'bonus',
  })

  // Sync form state with fetched data
  const programLoaded = !!program
  if (programLoaded && isActive === false && program.isActive) {
    setIsActive(program.isActive)
    const l1 = program.levels?.find((l: any) => l.level === 1)
    if (l1) setCommissionPercent(Number(l1.commissionPercent))
  }

  // ── Mutations ──

  const saveProgramMutation = useMutation({
    mutationFn: async (data: { isActive: boolean; levels: Array<{ level: number; commissionPercent: number }> }) => {
      return api.patch('/affiliates/program', data)
    },
    mutationKey: ['save-affiliate-program'],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-program'] })
      toast.success('Programa de afiliados salvo!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const claimBonusMutation = useMutation({
    mutationFn: () => api.post('/affiliates/bonus/claim'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-bonus'] })
      toast.success('Bonus resgatado com sucesso!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  // ── Helpers ──

  function handleSaveProgram() {
    if (commissionPercent < 1 || commissionPercent > 50) {
      toast.error('Comissao deve ser entre 1% e 50%')
      return
    }
    saveProgramMutation.mutate({
      isActive,
      levels: [{ level: 1, commissionPercent }],
    })
  }

  if (!isCreator) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 text-center text-muted">
        Disponivel apenas para criadores.
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Share2 className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Programa de Afiliados</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button variant={activeTab === 'program' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('program')}>
          <Settings className="w-4 h-4 mr-1" /> Configurar
        </Button>
        <Button variant={activeTab === 'stats' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('stats')}>
          <BarChart3 className="w-4 h-4 mr-1" /> Estatisticas
        </Button>
        <Button variant={activeTab === 'bonus' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('bonus')}>
          <Gift className="w-4 h-4 mr-1" /> Bonus
        </Button>
      </div>

      {/* Program Configuration Tab */}
      {activeTab === 'program' && (
        <div className="space-y-6">
          {loadingProgram ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Toggle */}
              <Card>
                <CardHeader>
                  <h2 className="font-bold flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-primary" /> Ativar Programa
                  </h2>
                  <p className="text-xs text-muted mt-1">Permita que outros usuarios promovam seu perfil e ganhem comissoes por cada assinante trazido</p>
                </CardHeader>
                <CardContent>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isActive}
                      onClick={() => setIsActive(!isActive)}
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-surface-light'}`}
                    >
                      <span className={`inline-block h-5 w-5 rounded-full bg-white transform transition-transform mt-0.5 ${isActive ? 'translate-x-5.5 ml-0.5' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-sm font-medium">{isActive ? 'Programa ativo' : 'Programa inativo'}</span>
                  </label>
                </CardContent>
              </Card>

              {/* Commission */}
              <Card>
                <CardHeader>
                  <h2 className="font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" /> Comissao do Afiliado
                  </h2>
                  <p className="text-xs text-muted mt-1">
                    Percentual que o afiliado recebe por cada novo assinante trazido. A comissao e descontada da sua parte (apos a taxa da plataforma de 8%). Maximo 50%.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-end gap-3 p-3 border border-border rounded-md">
                      <div className="flex-1">
                        <label className="text-xs text-muted block mb-1">
                          Comissao por assinante referido
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            max="50"
                            step="0.5"
                            value={commissionPercent}
                            onChange={(e) => setCommissionPercent(Number(e.target.value))}
                            className="w-24"
                          />
                          <span className="text-sm text-muted">%</span>
                        </div>
                      </div>
                    </div>

                    {/* Simulation */}
                    <div className="p-3 bg-surface-light rounded-md text-xs text-muted space-y-1">
                      <p className="font-medium text-foreground">Exemplo: Assinatura de R$30,00</p>
                      <p>Taxa plataforma (8%): <span className="text-foreground">R${(30 * 0.08).toFixed(2)}</span></p>
                      <p>Sua parte bruta: <span className="text-foreground">R${(30 * 0.92).toFixed(2)}</span></p>
                      <p>Comissao afiliado ({commissionPercent}%): <span className="text-warning">-R${((30 * 0.92) * (commissionPercent / 100)).toFixed(2)}</span></p>
                      <p className="font-medium text-success">
                        Voce recebe: R${((30 * 0.92) * (1 - commissionPercent / 100)).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button
                      onClick={handleSaveProgram}
                      loading={saveProgramMutation.isPending}
                      disabled={commissionPercent < 1 || commissionPercent > 50}
                    >
                      Salvar Programa
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* How it works */}
              <Card>
                <CardHeader>
                  <h2 className="font-bold">Como funciona?</h2>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm text-muted">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">1</div>
                      <p>Ative o programa e defina a comissao.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">2</div>
                      <p>Usuarios visitam seu perfil e clicam em &quot;Tornar-se afiliado&quot; para gerar um link exclusivo.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">3</div>
                      <p>O afiliado compartilha o link. Quando alguem assina pelo link, o afiliado ganha comissao automatica em FanCoins.</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">4</div>
                      <p>A plataforma sempre retem 8%. A comissao do afiliado e descontada da sua parte.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {loadingStats ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="py-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted uppercase">Referidos</span>
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-2xl font-bold">{creatorStats?.totalReferrals || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted uppercase">Comissoes Pagas</span>
                      <Coins className="w-5 h-5 text-warning" />
                    </div>
                    <div className="text-2xl font-bold">{formatCurrency(creatorStats?.totalCommissionsPaid || 0)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted uppercase">Status</span>
                      <Share2 className="w-5 h-5 text-success" />
                    </div>
                    <div className="text-lg font-bold">
                      {creatorStats?.program?.isActive ? (
                        <Badge variant="success">Ativo</Badge>
                      ) : (
                        <Badge variant="default">Inativo</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Commissions */}
              <Card>
                <CardHeader>
                  <h2 className="font-bold flex items-center gap-2">
                    <Coins className="w-5 h-5 text-primary" /> Comissoes Pagas Recentes
                  </h2>
                </CardHeader>
                <CardContent>
                  {creatorStats?.recentCommissions?.length > 0 ? (
                    <div className="space-y-3">
                      {creatorStats.recentCommissions.map((c: any) => (
                        <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div>
                            <span className="text-sm font-medium">
                              {c.commissionPercent}%
                            </span>
                            <p className="text-xs text-muted">
                              {new Date(c.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-warning">
                              -{formatCurrency(Number(c.amountBrl))}
                            </span>
                            <p className="text-xs text-muted">{c.coinsCredit} FC</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted text-sm text-center py-8">Nenhuma comissao paga ainda</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Bonus Tab */}
      {activeTab === 'bonus' && (
        <div className="space-y-6">
          {loadingBonus ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : bonus ? (
            <Card>
              <CardHeader>
                <h2 className="font-bold flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary" /> Bonus de Boas-Vindas
                </h2>
                <p className="text-xs text-muted mt-1">
                  Resgate seu bonus de FanCoins ao atingir a meta de assinantes
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-surface-light rounded-md">
                    <div>
                      <p className="text-sm font-medium">Bonus</p>
                      <p className="text-2xl font-bold text-primary">{bonus.bonusCoins?.toLocaleString()} FanCoins</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">Meta</p>
                      <p className="text-lg font-bold">{bonus.currentSubscribers}/{bonus.requiredSubscribers} assinantes</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-surface-light rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (bonus.currentSubscribers / bonus.requiredSubscribers) * 100)}%` }}
                    />
                  </div>

                  {bonus.status === 'claimed' ? (
                    <div className="flex items-center gap-2 p-3 bg-success/10 rounded text-sm text-success">
                      <Check className="w-4 h-4" />
                      Bonus resgatado em {new Date(bonus.claimedAt).toLocaleDateString('pt-BR')}
                    </div>
                  ) : bonus.status === 'claimable' || bonus.currentSubscribers >= bonus.requiredSubscribers ? (
                    <Button onClick={() => claimBonusMutation.mutate()} loading={claimBonusMutation.isPending}>
                      <Gift className="w-4 h-4 mr-2" /> Resgatar Bonus
                    </Button>
                  ) : (
                    <p className="text-sm text-muted">
                      Consiga mais {bonus.requiredSubscribers - bonus.currentSubscribers} assinante(s) para desbloquear o bonus.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted">
                Nenhum bonus disponivel no momento.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
