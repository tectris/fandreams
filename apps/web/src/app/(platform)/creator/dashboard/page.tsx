'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { BarChart3, Users, Coins, TrendingUp, DollarSign, Eye } from 'lucide-react'

export default function CreatorDashboardPage() {
  const { data: earnings } = useQuery({
    queryKey: ['creator-earnings'],
    queryFn: async () => {
      const res = await api.get<any>('/creators/me/earnings')
      return res.data
    },
  })

  const { data: profile } = useQuery({
    queryKey: ['creator-profile'],
    queryFn: async () => {
      const res = await api.get<any>('/creators/me')
      return res.data
    },
  })

  const stats = [
    {
      label: 'Ganhos totais',
      value: formatCurrency(earnings?.totalEarnings || 0),
      icon: DollarSign,
      color: 'text-success',
    },
    {
      label: 'Assinantes ativos',
      value: formatNumber(earnings?.activeSubscribers || 0),
      icon: Users,
      color: 'text-primary',
    },
    {
      label: 'Creator Score',
      value: profile?.creatorScore || '0',
      icon: TrendingUp,
      color: 'text-secondary',
    },
    {
      label: 'Total assinantes',
      value: formatNumber(earnings?.totalSubscribers || 0),
      icon: Eye,
      color: 'text-warning',
    },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Dashboard do criador</h1>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="py-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted uppercase tracking-wider">{stat.label}</span>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent payments */}
      <Card>
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            Pagamentos recentes
          </h2>
        </CardHeader>
        <CardContent>
          {earnings?.recentPayments && earnings.recentPayments.length > 0 ? (
            <div className="space-y-3">
              {earnings.recentPayments.slice(0, 10).map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <span className="text-sm font-medium capitalize">{payment.type}</span>
                    <p className="text-xs text-muted">
                      {new Date(payment.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-success">
                      +{formatCurrency(payment.creatorAmount || payment.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm text-center py-8">Nenhum pagamento recebido ainda</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
