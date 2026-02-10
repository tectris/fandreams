'use client'

import { Suspense, useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { InfoDrawer } from '@/components/ui/info-drawer'
import {
  Megaphone, Target, Users, Clock, Star, Coins, ArrowLeft, Loader2,
  Gift, MessageSquare, Send,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { timeAgo } from '@/lib/utils'

type RewardTier = { amount: number; title: string; description: string }

type Campaign = {
  id: string
  creatorId: string
  title: string
  description: string
  coverImageUrl: string | null
  category: string | null
  goalAmount: number
  raisedAmount: number
  totalContributors: number
  totalRatings: number
  averageRating: string | null
  status: string
  endsAt: string | null
  durationDays: number
  deliveryDeadlineDays: number
  rewardTiers: RewardTier[]
  createdAt: string
  creator: {
    username: string
    displayName: string | null
    avatarUrl: string | null
  }
  updates: Array<{
    id: string
    title: string
    content: string
    createdAt: string
  }>
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'primary' | 'warning' | 'error' }> = {
  active: { label: 'Ativa', variant: 'success' },
  funded: { label: 'Financiada', variant: 'primary' },
  delivered: { label: 'Entregue', variant: 'success' },
  failed: { label: 'Falhou', variant: 'error' },
}

function CampaignDetailContent() {
  const params = useParams()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [contributionAmount, setContributionAmount] = useState('')
  const [selectedTier, setSelectedTier] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'about' | 'updates' | 'rewards'>('about')

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', params.id],
    queryFn: async () => (await api.get<Campaign>(`/pitch/campaigns/${params.id}`)).data,
  })

  const contributeMutation = useMutation({
    mutationFn: (data: { amount: number; rewardTierIndex?: number }) =>
      api.post(`/pitch/campaigns/${params.id}/contribute`, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['campaign', params.id] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      setContributionAmount('')
      setSelectedTier(null)
      const data = res.data
      if (data.isFunded) {
        toast.success('Campanha financiada! Parabens!')
      } else {
        toast.success(`Contribuicao de ${data.sent.toLocaleString()} FanCoins enviada!`)
      }
    },
    onError: (e: any) => toast.error(e.message),
  })

  function handleContribute() {
    const amount = Number(contributionAmount)
    if (!amount || amount <= 0) { toast.error('Informe um valor valido'); return }
    contributeMutation.mutate({
      amount,
      rewardTierIndex: selectedTier !== null ? selectedTier : undefined,
    })
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  if (!campaign) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-muted">Campanha nao encontrada</p>
        <Link href="/pitch"><Button size="sm" variant="ghost" className="mt-4"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button></Link>
      </div>
    )
  }

  const progress = campaign.goalAmount > 0 ? Math.min(100, Math.round((campaign.raisedAmount / campaign.goalAmount) * 100)) : 0
  const statusInfo = STATUS_CONFIG[campaign.status]
  const isOwner = campaign.creatorId === user?.id
  const canContribute = campaign.status === 'active' && !isOwner && user

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link href="/pitch" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      {/* Cover Image */}
      {campaign.coverImageUrl && (
        <img src={campaign.coverImageUrl} alt="" className="w-full h-48 object-cover rounded-md mb-4" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl font-bold">{campaign.title}</h1>
        {statusInfo && <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>}
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Link href={`/creator/${campaign.creator.username}`} className="flex items-center gap-2 hover:opacity-80">
          {campaign.creator.avatarUrl ? (
            <img src={campaign.creator.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-primary/10" />
          )}
          <span className="text-sm text-muted">@{campaign.creator.username}</span>
        </Link>
        {campaign.category && <Badge variant="default">{campaign.category}</Badge>}
        <InfoDrawer title="Regras da Campanha">
          <p>Taxa da plataforma: 5% sobre cada contribuicao</p>
          <p>1% adicional vai para o fundo do ecossistema</p>
          <p className="mt-2">Se a meta nao for atingida no prazo, todos os contribuidores sao reembolsados.</p>
          <p className="mt-2">Apos a entrega, contribuidores podem avaliar de 1 a 5 estrelas.</p>
        </InfoDrawer>
      </div>

      {/* Progress Card */}
      <Card className="mb-6">
        <CardContent className="py-5">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-3xl font-bold">{campaign.raisedAmount.toLocaleString()}</p>
              <p className="text-sm text-muted">de {campaign.goalAmount.toLocaleString()} FanCoins</p>
            </div>
            <p className="text-2xl font-bold text-primary">{progress}%</p>
          </div>
          <div className="w-full bg-surface-light rounded-full h-3 mb-4">
            <div className="bg-primary h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center gap-6 text-sm text-muted">
            <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {campaign.totalContributors} apoiadores</span>
            {campaign.endsAt && (
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Termina {timeAgo(campaign.endsAt)}</span>
            )}
            {campaign.averageRating && Number(campaign.averageRating) > 0 && (
              <span className="flex items-center gap-1"><Star className="w-4 h-4 text-warning" /> {Number(campaign.averageRating).toFixed(1)} ({campaign.totalRatings})</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contribute Section */}
      {canContribute && (
        <Card className="mb-6 border-primary/30">
          <CardHeader>
            <h2 className="font-bold flex items-center gap-2"><Coins className="w-5 h-5 text-warning" /> Contribuir</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Reward Tiers Quick Select */}
            {campaign.rewardTiers && campaign.rewardTiers.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted font-medium">Selecione uma recompensa (opcional):</p>
                {campaign.rewardTiers.map((tier, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedTier(selectedTier === i ? null : i)
                      if (selectedTier !== i) setContributionAmount(String(tier.amount))
                    }}
                    className={`w-full text-left p-3 rounded-md border transition-colors ${
                      selectedTier === i ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{tier.title}</span>
                      <Badge variant="warning">{tier.amount.toLocaleString()} FC</Badge>
                    </div>
                    <p className="text-xs text-muted mt-1">{tier.description}</p>
                  </button>
                ))}
              </div>
            )}

            <Input
              label="Valor (FanCoins)"
              type="number"
              placeholder="Ex: 500"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
              min={1}
            />

            <Button className="w-full" loading={contributeMutation.isPending} onClick={handleContribute}>
              <Send className="w-4 h-4 mr-1" /> Contribuir {contributionAmount && Number(contributionAmount) > 0 ? `${Number(contributionAmount).toLocaleString()} FC` : ''}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button variant={activeTab === 'about' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('about')}>
          <Megaphone className="w-4 h-4 mr-1" /> Sobre
        </Button>
        <Button variant={activeTab === 'rewards' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('rewards')}>
          <Gift className="w-4 h-4 mr-1" /> Recompensas ({campaign.rewardTiers?.length || 0})
        </Button>
        <Button variant={activeTab === 'updates' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('updates')}>
          <MessageSquare className="w-4 h-4 mr-1" /> Updates ({campaign.updates?.length || 0})
        </Button>
      </div>

      {/* About Tab */}
      {activeTab === 'about' && (
        <Card>
          <CardContent className="py-5">
            <p className="text-sm whitespace-pre-wrap">{campaign.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Rewards Tab */}
      {activeTab === 'rewards' && (
        <div className="space-y-3">
          {campaign.rewardTiers && campaign.rewardTiers.length > 0 ? (
            campaign.rewardTiers.map((tier, i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold">{tier.title}</h3>
                    <Badge variant="warning">{tier.amount.toLocaleString()} FC minimo</Badge>
                  </div>
                  <p className="text-sm text-muted">{tier.description}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted text-sm">Nenhuma recompensa definida</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Updates Tab */}
      {activeTab === 'updates' && (
        <div className="space-y-3">
          {campaign.updates && campaign.updates.length > 0 ? (
            campaign.updates.map((update) => (
              <Card key={update.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm">{update.title}</h3>
                    <span className="text-xs text-muted">{timeAgo(update.createdAt)}</span>
                  </div>
                  <p className="text-sm text-muted whitespace-pre-wrap">{update.content}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted text-sm">Nenhum update ainda</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default function CampaignDetailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <CampaignDetailContent />
    </Suspense>
  )
}
