'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FANCOIN_PACKAGES } from '@myfans/shared'
import { formatCurrency } from '@/lib/utils'
import { Coins, TrendingUp, TrendingDown, ShoppingBag, Gift } from 'lucide-react'
import { toast } from 'sonner'

export default function WalletPage() {
  const queryClient = useQueryClient()

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: async () => {
      const res = await api.get<any>('/fancoins/wallet')
      return res.data
    },
  })

  const { data: transactions } = useQuery({
    queryKey: ['fancoin-transactions'],
    queryFn: async () => {
      const res = await api.get<any[]>('/fancoins/transactions')
      return res.data
    },
  })

  const purchaseMutation = useMutation({
    mutationFn: (packageId: string) => api.post('/fancoins/purchase', { packageId, paymentMethod: 'pix' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      queryClient.invalidateQueries({ queryKey: ['fancoin-transactions'] })
      toast.success('FanCoins comprados com sucesso!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Coins className="w-6 h-6 text-warning" />
        <h1 className="text-xl font-bold">Meus FanCoins</h1>
      </div>

      {/* Balance */}
      <Card className="mb-8 bg-gradient-to-br from-primary/10 via-surface to-secondary/10">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted mb-1">Saldo atual</p>
          <div className="text-5xl font-bold text-foreground flex items-center justify-center gap-3">
            <Coins className="w-10 h-10 text-warning" />
            {(wallet?.balance || 0).toLocaleString()}
          </div>
          <p className="text-xs text-muted mt-2">FanCoins</p>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <span className="flex items-center gap-1 text-success">
              <TrendingUp className="w-4 h-4" />
              {(wallet?.totalEarned || 0).toLocaleString()} ganhos
            </span>
            <span className="flex items-center gap-1 text-error">
              <TrendingDown className="w-4 h-4" />
              {(wallet?.totalSpent || 0).toLocaleString()} gastos
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Packages */}
      <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
        <ShoppingBag className="w-5 h-5 text-primary" />
        Comprar FanCoins
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {FANCOIN_PACKAGES.map((pkg) => (
          <Card key={pkg.id} hover onClick={() => purchaseMutation.mutate(pkg.id)}>
            <CardContent className="flex items-center justify-between">
              <div>
                <span className="font-bold text-lg">{pkg.coins.toLocaleString()}</span>
                <span className="text-sm text-muted ml-1">FanCoins</span>
                {pkg.bonus > 0 && (
                  <Badge variant="success" className="ml-2">
                    +{pkg.bonus} bonus
                  </Badge>
                )}
              </div>
              <Button size="sm" loading={purchaseMutation.isPending}>
                {formatCurrency(pkg.price)}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Historico
          </h2>
        </CardHeader>
        <CardContent>
          {transactions && transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <span className="text-sm font-medium">{tx.description || tx.type}</span>
                    <p className="text-xs text-muted">
                      {new Date(tx.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className={`font-bold text-sm ${tx.amount > 0 ? 'text-success' : 'text-error'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm text-center py-6">Nenhuma transacao ainda</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
