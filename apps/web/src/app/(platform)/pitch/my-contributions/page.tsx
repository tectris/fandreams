'use client'

import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Coins, ArrowLeft, Loader2, Target } from 'lucide-react'
import Link from 'next/link'
import { timeAgo } from '@/lib/utils'

const STATUS_LABELS: Record<string, { label: string; variant: 'success' | 'primary' | 'warning' | 'error' }> = {
  active: { label: 'Ativa', variant: 'success' },
  refunded: { label: 'Reembolsada', variant: 'warning' },
}

function MyContributionsContent() {
  const { data: contributions, isLoading } = useQuery({
    queryKey: ['my-contributions'],
    queryFn: async () => (await api.get<any[]>('/pitch/my/contributions')).data,
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link href="/pitch" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Coins className="w-6 h-6 text-warning" />
        <h1 className="text-xl font-bold">Minhas Contribuicoes</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : contributions && contributions.length > 0 ? (
        <div className="space-y-3">
          {contributions.map((item: any) => {
            const progress = item.campaignGoal > 0 ? Math.min(100, Math.round((item.campaignRaised / item.campaignGoal) * 100)) : 0
            const statusInfo = STATUS_LABELS[item.contribution.status]
            return (
              <Link key={item.contribution.id} href={`/pitch/${item.contribution.campaignId}`}>
                <Card hover>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-sm truncate">{item.campaignTitle}</h3>
                      <div className="flex items-center gap-2">
                        {statusInfo && <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>}
                        <Badge variant="warning">{item.contribution.amount.toLocaleString()} FC</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted mb-2">por @{item.creatorUsername} · {timeAgo(item.contribution.createdAt)}</p>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <Target className="w-3 h-3" />
                      <span>{progress}% financiado</span>
                      <div className="flex-1 bg-surface-light rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progress}%` }} />
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
            <Coins className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-muted">Voce ainda nao contribuiu para nenhuma campanha</p>
            <Link href="/pitch"><p className="text-primary text-sm mt-2 hover:underline">Explorar campanhas</p></Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function MyContributionsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <MyContributionsContent />
    </Suspense>
  )
}
