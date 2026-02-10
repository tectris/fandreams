'use client'

import { Suspense, useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InfoDrawer } from '@/components/ui/info-drawer'
import {
  Users, Shield, Crown, Coins, LogIn, LogOut, Loader2, ArrowLeft,
  Settings, Star, Clock,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

type Member = {
  id: string
  userId: string
  role: string
  totalContributed: number
  joinedAt: string
  username: string
  displayName: string | null
  avatarUrl: string | null
}

type Guild = {
  id: string
  name: string
  slug: string
  description: string | null
  category: string | null
  leaderId: string
  coLeaderId: string | null
  totalMembers: number
  maxMembers: number
  isRecruiting: boolean
  minCreatorScore: number
  treasuryBalance: number
  treasuryContributionPercent: string
  comboSubscriptionPrice: string | null
  totalSubscribers: number
  totalEarnings: string
  warsWon: number
  members: Member[]
}

function GuildDetailContent() {
  const params = useParams()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isCreator = user?.role === 'creator' || user?.role === 'admin'
  const [activeTab, setActiveTab] = useState<'members' | 'treasury'>('members')

  const { data: guild, isLoading } = useQuery({
    queryKey: ['guild', params.id],
    queryFn: async () => (await api.get<Guild>(`/guilds/${params.id}`)).data,
  })

  const { data: treasury } = useQuery({
    queryKey: ['guild-treasury', params.id],
    queryFn: async () => (await api.get<any[]>(`/guilds/${params.id}/treasury`)).data,
    enabled: activeTab === 'treasury',
  })

  const joinMutation = useMutation({
    mutationFn: () => api.post(`/guilds/${params.id}/join`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guild', params.id] })
      queryClient.invalidateQueries({ queryKey: ['my-guild'] })
      toast.success('Voce entrou na guilda!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const leaveMutation = useMutation({
    mutationFn: () => api.post(`/guilds/${params.id}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guild', params.id] })
      queryClient.invalidateQueries({ queryKey: ['my-guild'] })
      toast.success('Voce saiu da guilda')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const subscribeMutation = useMutation({
    mutationFn: () => api.post(`/guilds/${params.id}/subscribe`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guild', params.id] })
      toast.success('Assinatura combo ativada!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  if (!guild) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="text-muted">Guilda nao encontrada</p>
        <Link href="/guilds"><Button size="sm" variant="ghost" className="mt-4"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button></Link>
      </div>
    )
  }

  const isMember = guild.members?.some((m) => m.userId === user?.id)
  const isLeader = guild.leaderId === user?.id || guild.coLeaderId === user?.id
  const myMember = guild.members?.find((m) => m.userId === user?.id)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link href="/guilds" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      {/* Header */}
      <Card className="mb-6 bg-gradient-to-br from-primary/10 via-surface to-secondary/10">
        <CardContent className="py-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">{guild.name}</h1>
                {guild.category && <Badge variant="default">{guild.category}</Badge>}
              </div>
              {guild.description && <p className="text-sm text-muted mb-3">{guild.description}</p>}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {guild.totalMembers}/{guild.maxMembers} membros</span>
                <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Score min: {guild.minCreatorScore}</span>
                <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> Treasury: {Number(guild.treasuryBalance).toLocaleString()} FC</span>
                {guild.warsWon > 0 && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-warning" /> {guild.warsWon} vitorias</span>}
              </div>
            </div>
            <InfoDrawer title="Regras da Guilda">
              <p className="font-medium text-foreground">Contribuicao Treasury</p>
              <p>{Number(guild.treasuryContributionPercent).toFixed(1)}% dos ganhos de cada membro vao automaticamente para o treasury da guilda.</p>
              <p className="font-medium text-foreground mt-3">Assinatura Combo</p>
              {guild.comboSubscriptionPrice ? (
                <p>Fas podem assinar todos os membros por R$ {Number(guild.comboSubscriptionPrice).toFixed(2)}/mes. O valor e dividido igualmente entre os membros.</p>
              ) : (
                <p>Esta guilda nao oferece assinatura combo.</p>
              )}
              <p className="font-medium text-foreground mt-3">Requisitos</p>
              <p>Creator Score minimo: {guild.minCreatorScore}</p>
              <p>Status: {guild.isRecruiting ? 'Recrutando novos membros' : 'Fechada para novos membros'}</p>
            </InfoDrawer>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            {isMember && !isLeader && (
              <Button size="sm" variant="outline" loading={leaveMutation.isPending} onClick={() => leaveMutation.mutate()}>
                <LogOut className="w-4 h-4 mr-1" /> Sair
              </Button>
            )}
            {!isMember && isCreator && guild.isRecruiting && (
              <Button size="sm" loading={joinMutation.isPending} onClick={() => joinMutation.mutate()}>
                <LogIn className="w-4 h-4 mr-1" /> Entrar na Guilda
              </Button>
            )}
            {!isMember && guild.comboSubscriptionPrice && (
              <Button size="sm" variant="secondary" loading={subscribeMutation.isPending} onClick={() => subscribeMutation.mutate()}>
                <Crown className="w-4 h-4 mr-1" /> Assinar Combo (R$ {Number(guild.comboSubscriptionPrice).toFixed(2)})
              </Button>
            )}
            {isLeader && (
              <Badge variant="warning"><Settings className="w-3 h-3 mr-1" /> Lider</Badge>
            )}
          </div>

          {isMember && myMember && (
            <div className="mt-3 text-xs text-muted">
              Contribuicao total: <span className="font-bold text-foreground">{Number(myMember.totalContributed).toLocaleString()} FanCoins</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button variant={activeTab === 'members' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('members')}>
          <Users className="w-4 h-4 mr-1" /> Membros ({guild.totalMembers})
        </Button>
        <Button variant={activeTab === 'treasury' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('treasury')}>
          <Coins className="w-4 h-4 mr-1" /> Treasury
        </Button>
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-2">
          {guild.members?.map((member) => (
            <Card key={member.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <Link href={`/creator/${member.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{member.displayName || member.username}</p>
                      <p className="text-xs text-muted">@{member.username}</p>
                    </div>
                  </Link>
                  <div className="text-right">
                    <Badge variant={member.role === 'leader' ? 'warning' : member.role === 'co_leader' ? 'primary' : 'default'}>
                      {member.role === 'leader' ? 'Lider' : member.role === 'co_leader' ? 'Co-lider' : 'Membro'}
                    </Badge>
                    <p className="text-xs text-muted mt-1">{Number(member.totalContributed).toLocaleString()} FC contribuidos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Treasury Tab */}
      {activeTab === 'treasury' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-bold flex items-center gap-2">
                <Coins className="w-5 h-5 text-warning" /> Treasury
              </h2>
              <span className="text-lg font-bold text-warning">{Number(guild.treasuryBalance).toLocaleString()} FC</span>
            </div>
          </CardHeader>
          <CardContent>
            {treasury && treasury.length > 0 ? (
              <div className="space-y-2">
                {treasury.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{tx.description || tx.type}</p>
                      <p className="text-xs text-muted">
                        {new Date(tx.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`font-bold text-sm ${tx.amount > 0 ? 'text-success' : 'text-error'}`}>
                      {tx.amount > 0 ? '+' : ''}{Number(tx.amount).toLocaleString()} FC
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm text-center py-6">Nenhuma transacao no treasury ainda</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function GuildDetailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <GuildDetailContent />
    </Suspense>
  )
}
