'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { formatCurrency } from '@/lib/utils'
import {
  Share2, Users, Coins, Link as LinkIcon, Copy, Check,
  Loader2, MousePointerClick, BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function AffiliateDashboardPage() {
  const queryClient = useQueryClient()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // ── Data Fetching ──

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['affiliate-dashboard'],
    queryFn: async () => {
      const res = await api.get<any>('/affiliates/dashboard')
      return res.data
    },
  })

  // ── Helpers ──

  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''

  function copyToClipboard(text: string, code: string) {
    navigator.clipboard.writeText(text)
    setCopiedCode(code)
    toast.success('Link copiado!')
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  const stats = dashboard?.stats || {}
  const links = dashboard?.links || []
  const commissions = dashboard?.commissions || []

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Share2 className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Meus Afiliados</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted uppercase">Ganhos Totais</span>
              <Coins className="w-5 h-5 text-success" />
            </div>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalEarned || 0)}</div>
            <p className="text-xs text-muted mt-1">{(stats.totalCoins || 0).toLocaleString()} FanCoins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted uppercase">Links</span>
              <LinkIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="text-2xl font-bold">{stats.totalLinks || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted uppercase">Cliques</span>
              <MousePointerClick className="w-5 h-5 text-warning" />
            </div>
            <div className="text-2xl font-bold">{stats.totalClicks || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted uppercase">Conversoes</span>
              <Users className="w-5 h-5 text-secondary" />
            </div>
            <div className="text-2xl font-bold">{stats.totalConversions || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* My Links */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" /> Meus Links
          </h2>
          <p className="text-xs text-muted mt-1">
            Para criar um link, visite o perfil de um criador com programa de afiliados ativo e clique em &quot;Tornar-se afiliado&quot;.
          </p>
        </CardHeader>
        <CardContent>
          {links.length > 0 ? (
            <div className="space-y-3">
              {links.map((link: any) => {
                const creatorUsername = link.creatorUsername || link.creatorId
                const creatorName = link.creatorDisplayName || link.creatorUsername || link.creatorId.slice(0, 8)
                const fullUrl = `${appUrl}/creator/${creatorUsername}?ref=${link.code}`
                return (
                  <div key={link.id} className="p-3 border border-border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <Link href={`/creator/${creatorUsername}`} className="flex items-center gap-2 min-w-0">
                        <Avatar
                          src={link.creatorAvatarUrl}
                          alt={creatorName}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{creatorName}</p>
                          <p className="text-xs text-muted">@{creatorUsername}</p>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="default">{link.code}</Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(fullUrl, link.code)}
                        >
                          {copiedCode === link.code ? (
                            <Check className="w-4 h-4 text-success" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <MousePointerClick className="w-3 h-3" /> {link.clicks} cliques
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {link.conversions} conversoes
                      </span>
                      <span className="flex items-center gap-1">
                        <Coins className="w-3 h-3" /> {formatCurrency(Number(link.totalEarned))}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1 font-mono truncate">{fullUrl}</p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Share2 className="w-10 h-10 mx-auto mb-3 text-muted opacity-50" />
              <p className="text-muted text-sm mb-2">Nenhum link criado ainda</p>
              <p className="text-xs text-muted">
                Explore criadores no <Link href="/explore" className="text-primary hover:underline">Explorar</Link> e torne-se afiliado dos que possuem o programa ativo.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Commissions */}
      <Card>
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Comissoes Recentes
          </h2>
        </CardHeader>
        <CardContent>
          {commissions.length > 0 ? (
            <div className="space-y-3">
              {commissions.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <span className="text-sm font-medium">
                      {c.commissionPercent}% comissao
                    </span>
                    <p className="text-xs text-muted">
                      {new Date(c.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-success">
                      +{formatCurrency(Number(c.amountBrl))}
                    </span>
                    <p className="text-xs text-muted">{c.coinsCredit} FC</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm text-center py-8">Nenhuma comissao recebida ainda</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
