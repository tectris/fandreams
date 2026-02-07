'use client'

import Link from 'next/link'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { Users } from 'lucide-react'

interface CreatorCardProps {
  creator: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    coverUrl?: string | null
    bio?: string | null
    category?: string | null
    subscriptionPrice?: string | null
    isVerified?: boolean | null
    totalSubscribers?: number | null
  }
}

export function CreatorCard({ creator }: CreatorCardProps) {
  return (
    <Card hover>
      <Link href={`/creator/${creator.username}`} className="block">
        <div className="h-24 bg-gradient-to-br from-primary/30 to-secondary/30 relative">
          {creator.coverUrl && (
            <img src={creator.coverUrl} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="px-4 pb-4 -mt-6 relative">
          <Avatar
            src={creator.avatarUrl}
            alt={creator.displayName || creator.username}
            size="lg"
            verified={!!creator.isVerified}
          />
          <div className="mt-2">
            <h3 className="font-semibold text-sm truncate">{creator.displayName || creator.username}</h3>
            <p className="text-xs text-muted">@{creator.username}</p>
          </div>
          {creator.bio && (
            <p className="text-xs text-muted mt-1.5 line-clamp-2">{creator.bio}</p>
          )}
          <div className="flex items-center gap-3 mt-3">
            {creator.category && <Badge variant="primary">{creator.category}</Badge>}
            <span className="flex items-center gap-1 text-xs text-muted">
              <Users className="w-3 h-3" />
              {formatNumber(creator.totalSubscribers || 0)}
            </span>
          </div>
          <div className="mt-3">
            <Button size="sm" className="w-full">
              {creator.subscriptionPrice
                ? `Assinar ${formatCurrency(creator.subscriptionPrice)}/mes`
                : 'Ver perfil'}
            </Button>
          </div>
        </div>
      </Link>
    </Card>
  )
}
