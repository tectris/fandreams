'use client'

import { Suspense, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InfoDrawer } from '@/components/ui/info-drawer'
import { Megaphone, Plus, Loader2, Target, Users, Clock, Star } from 'lucide-react'
import Link from 'next/link'
import { timeAgo } from '@/lib/utils'

type Campaign = {
  id: string
  title: string
  description: string
  coverImageUrl: string | null
  category: string | null
  goalAmount: number
  raisedAmount: number
  totalContributors: number
  status: string
  endsAt: string | null
  averageRating: string | null
  createdAt: string
  creatorUsername: string
  creatorDisplayName: string | null
  creatorAvatarUrl: string | null
}

const STATUS_LABELS: Record<string, { label: string; variant: 'success' | 'primary' | 'warning' | 'error' }> = {
  active: { label: 'Ativa', variant: 'success' },
  funded: { label: 'Financiada', variant: 'primary' },
  delivered: { label: 'Entregue', variant: 'success' },
  failed: { label: 'Falhou', variant: 'error' },
}

function PitchContent() {
  const user = useAuthStore((s) => s.user)
  const isCreator = user?.role === 'creator' || user?.role === 'admin'
  const [statusFilter, setStatusFilter] = useState('active')

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', statusFilter],
    queryFn: async () => {
      const res = await api.get<Campaign[]>(`/pitch/campaigns?status=${statusFilter}&limit=50`)
      return res.data
    },
  })

  const { data: myContributions } = useQuery({
    queryKey: ['my-contributions'],
    queryFn: async () => (await api.get<any[]>('/pitch/my/contributions')).data,
    enabled: !!user,
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">FanDreamsPitch</h1>
          <InfoDrawer title="Regras do Pitch">
            <p className="font-medium text-foreground">O que e o FanDreamsPitch?</p>
            <p>Crowdfunding coletivo para criadores. Crie campanhas para financiar projetos e recompense seus apoiadores.</p>
            <p className="font-medium text-foreground mt-4">Regras:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Meta minima: 1.000 FanCoins</li>
              <li>Meta maxima: 10.000.000 FanCoins</li>
              <li>Duracao: 7 a 90 dias</li>
              <li>Taxa da plataforma: 5% sobre contribuicoes</li>
              <li>1% adicional vai para o fundo do ecossistema</li>
              <li>Ate 10 tiers de recompensa por campanha</li>
            </ul>
            <p className="font-medium text-foreground mt-4">Se a campanha falhar:</p>
            <p>Se a meta nao for atingida ate o fim do prazo, todos os contribuidores sao reembolsados automaticamente.</p>
            <p className="font-medium text-foreground mt-4">Avaliacoes:</p>
            <p>Apos a entrega, contribuidores podem avaliar a campanha (1-5 estrelas).</p>
          </InfoDrawer>
        </div>
        {isCreator && (
          <Link href="/pitch/create">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" /> Criar Campanha
            </Button>
          </Link>
        )}
      </div>

      {/* My Contributions Banner */}
      {myContributions && myContributions.length > 0 && (
        <Card className="mb-6 bg-gradient-to-r from-secondary/10 to-primary/10">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm">
                <span className="font-bold">{myContributions.length}</span> contribuicoes ativas
              </p>
              <Link href="/pitch/my-contributions">
                <Button size="sm" variant="ghost">Ver minhas contribuicoes</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {['active', 'funded', 'delivered', 'failed'].map((status) => (
          <Button
            key={status}
            size="sm"
            variant={statusFilter === status ? 'primary' : 'ghost'}
            onClick={() => setStatusFilter(status)}
          >
            {STATUS_LABELS[status]?.label || status}
          </Button>
        ))}
      </div>

      {/* Campaign List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-4">
          {data.map((campaign) => {
            const progress = campaign.goalAmount > 0 ? Math.min(100, Math.round((campaign.raisedAmount / campaign.goalAmount) * 100)) : 0
            const statusInfo = STATUS_LABELS[campaign.status]
            return (
              <Link key={campaign.id} href={`/pitch/${campaign.id}`}>
                <Card hover>
                  <CardContent className="py-4">
                    <div className="flex gap-4">
                      {campaign.coverImageUrl && (
                        <img src={campaign.coverImageUrl} alt="" className="w-20 h-20 rounded-md object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-bold truncate">{campaign.title}</h3>
                          {statusInfo && <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>}
                        </div>
                        <p className="text-xs text-muted mb-2">
                          por @{campaign.creatorUsername}
                          {campaign.category && <> · {campaign.category}</>}
                        </p>

                        {/* Progress bar */}
                        <div className="w-full bg-surface-light rounded-full h-2 mb-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted">
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {campaign.raisedAmount.toLocaleString()} / {campaign.goalAmount.toLocaleString()} FC ({progress}%)
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {campaign.totalContributors}
                          </span>
                          {campaign.endsAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {timeAgo(campaign.endsAt)}
                            </span>
                          )}
                          {campaign.averageRating && Number(campaign.averageRating) > 0 && (
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-warning" /> {Number(campaign.averageRating).toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Megaphone className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-muted">Nenhuma campanha encontrada</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function PitchPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <PitchContent />
    </Suspense>
  )
}
