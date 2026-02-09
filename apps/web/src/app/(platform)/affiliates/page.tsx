'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import {
  Share2, Users, Coins, Link as LinkIcon, Copy, Check,
  TrendingUp, Loader2, MousePointerClick, BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'

export default function AffiliateDashboardPage() {
  const queryClient = useQueryClient()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [newCreatorId, setNewCreatorId] = useState('')

  // ── Data Fetching ──

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['affiliate-dashboard'],
    queryFn: async () => {
      const res = await api.get<any>('/affiliates/dashboard')
      return res.data
    },
  })

  // ── Mutations ──

  const createLinkMutation = useMutation({
    mutationFn: (creatorId: string) => api.post('/affiliates/links', { creatorId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-dashboard'] })
      setNewCreatorId('')
      toast.success('Link de afiliado criado!')
    },
    onError: (e: any) => toast.error(e.message),
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

      {/* Create New Link */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" /> Criar Link de Afiliado
          </h2>
          <p className="text-xs text-muted mt-1">Gere um link para promover um criador e ganhar comissoes</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="ID do criador"
              value={newCreatorId}
              onChange={(e) => setNewCreatorId(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => createLinkMutation.mutate(newCreatorId)}
              loading={createLinkMutation.isPending}
              disabled={!newCreatorId}
            >
              Gerar Link
            </Button>
          </div>
          <p className="text-xs text-muted mt-2">
            Cole o ID do criador que tem programa de afiliados ativo. O link sera gerado automaticamente.
          </p>
        </CardContent>
      </Card>

      {/* My Links */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" /> Meus Links
          </h2>
        </CardHeader>
        <CardContent>
          {links.length > 0 ? (
            <div className="space-y-3">
              {links.map((link: any) => {
                const fullUrl = `${appUrl}/creator/${link.creatorId}?ref=${link.code}`
                return (
                  <div key={link.id} className="p-3 border border-border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">{link.code}</Badge>
                        <span className="text-xs text-muted">Criador: {link.creatorId.slice(0, 8)}...</span>
                      </div>
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
            <p className="text-muted text-sm text-center py-6">Nenhum link criado ainda. Gere um link acima.</p>
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
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Badge variant={c.level === 1 ? 'success' : 'warning'} className="text-xs">
                        N{c.level}
                      </Badge>
                      {c.commissionPercent}%
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
