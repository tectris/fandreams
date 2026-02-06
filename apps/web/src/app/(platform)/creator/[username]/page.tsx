'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PostCard } from '@/components/feed/post-card'
import { LevelBadge } from '@/components/gamification/level-badge'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { Users, MapPin, Calendar, Shield, Crown, Star } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

export default function CreatorProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { user, isAuthenticated } = useAuthStore()
  const [subscribing, setSubscribing] = useState(false)

  const { data: profile } = useQuery({
    queryKey: ['profile', username],
    queryFn: async () => {
      const res = await api.get<any>(`/users/${username}`)
      return res.data
    },
  })

  const { data: subscription } = useQuery({
    queryKey: ['subscription-check', profile?.id],
    queryFn: async () => {
      const res = await api.get<{ isSubscribed: boolean }>(`/subscriptions/check/${profile.id}`)
      return res.data
    },
    enabled: !!profile?.id && isAuthenticated && profile.id !== user?.id,
  })

  async function handleSubscribe() {
    if (!isAuthenticated) {
      window.location.href = '/login'
      return
    }
    setSubscribing(true)
    try {
      await api.post('/subscriptions', { creatorId: profile.id })
      toast.success(`Voce agora assina ${profile.displayName || profile.username}!`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSubscribing(false)
    }
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 animate-pulse">
        <div className="h-48 bg-surface rounded-md mb-6" />
        <div className="h-6 w-48 bg-surface rounded mb-2" />
        <div className="h-4 w-32 bg-surface rounded" />
      </div>
    )
  }

  const isOwner = user?.id === profile.id
  const isSubscribed = subscription?.isSubscribed

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Cover */}
      <div className="h-48 md:h-56 rounded-md overflow-hidden bg-gradient-to-br from-primary/30 to-secondary/30 relative">
        {profile.coverUrl && (
          <img src={profile.coverUrl} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Profile info */}
      <div className="relative px-4 -mt-12 mb-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <Avatar
            src={profile.avatarUrl}
            alt={profile.displayName || profile.username}
            size="xl"
            verified={profile.creator?.isVerified}
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.displayName || profile.username}</h1>
            <p className="text-muted">@{profile.username}</p>
          </div>
          <div className="flex gap-2">
            {isOwner ? (
              <Button variant="outline">Editar perfil</Button>
            ) : isSubscribed ? (
              <Button variant="outline" disabled>
                <Shield className="w-4 h-4 mr-1" /> Inscrito
              </Button>
            ) : (
              <Button onClick={handleSubscribe} loading={subscribing}>
                <Crown className="w-4 h-4 mr-1" />
                {profile.creator?.subscriptionPrice
                  ? `Assinar ${formatCurrency(profile.creator.subscriptionPrice)}/mes`
                  : 'Assinar'}
              </Button>
            )}
          </div>
        </div>

        {profile.bio && <p className="mt-4 text-sm">{profile.bio}</p>}

        <div className="flex items-center gap-4 mt-3 text-sm text-muted">
          {profile.creator?.category && <Badge variant="primary">{profile.creator.category}</Badge>}
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {formatNumber(profile.creator?.totalSubscribers || 0)} assinantes
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Desde {new Date(profile.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
          </span>
        </div>

        {profile.gamification && (
          <div className="mt-4">
            <LevelBadge
              level={profile.gamification.level}
              tier={profile.gamification.fanTier}
              xp={profile.gamification.xp}
            />
          </div>
        )}
      </div>

      {/* Subscription tiers */}
      {profile.creator?.tiers && profile.creator.tiers.length > 0 && !isOwner && !isSubscribed && (
        <div className="mb-8">
          <h2 className="font-bold text-lg mb-3">Planos de assinatura</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {profile.creator.tiers.map((tier: any) => (
              <Card key={tier.id} hover>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold">{tier.name}</h3>
                    <span className="text-primary font-bold">{formatCurrency(tier.price)}/mes</span>
                  </div>
                  {tier.description && <p className="text-sm text-muted mb-3">{tier.description}</p>}
                  {tier.benefits && (
                    <ul className="text-sm space-y-1">
                      {(tier.benefits as string[]).map((b, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Star className="w-3 h-3 text-primary" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Posts placeholder */}
      <div>
        <h2 className="font-bold text-lg mb-4">Posts</h2>
        <div className="text-center py-12 text-muted">
          <p>Os posts deste criador aparecerão aqui</p>
        </div>
      </div>
    </div>
  )
}
