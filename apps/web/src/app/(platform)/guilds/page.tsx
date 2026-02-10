'use client'

import { Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InfoDrawer } from '@/components/ui/info-drawer'
import { Users, Shield, Crown, Plus, Loader2, Coins } from 'lucide-react'
import Link from 'next/link'

type Guild = {
  id: string
  name: string
  slug: string
  description: string | null
  category: string | null
  totalMembers: number
  maxMembers: number
  isRecruiting: boolean
  comboSubscriptionPrice: string | null
  treasuryBalance: number
  minCreatorScore: number
}

function GuildsContent() {
  const user = useAuthStore((s) => s.user)
  const isCreator = user?.role === 'creator' || user?.role === 'admin'

  const { data: guilds, isLoading } = useQuery({
    queryKey: ['guilds'],
    queryFn: async () => (await api.get<Guild[]>('/guilds')).data,
  })

  const { data: myGuild } = useQuery({
    queryKey: ['my-guild'],
    queryFn: async () => (await api.get<any>('/guilds/me/guild')).data,
    enabled: isCreator,
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Guildas</h1>
          <InfoDrawer title="Regras das Guildas">
            <p className="font-medium text-foreground">O que sao Guildas?</p>
            <p>Guildas sao grupos de criadores que se unem para oferecer assinaturas combo e compartilhar um fundo coletivo (treasury).</p>
            <p className="font-medium text-foreground mt-4">Regras:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Apenas criadores podem criar ou entrar em guildas</li>
              <li>Cada criador so pode pertencer a uma guilda por vez</li>
              <li>Maximo de 20 membros por guilda (padrao)</li>
              <li>Creator Score minimo de 50 para entrar (configuravel pelo lider)</li>
              <li>3% dos ganhos de cada membro vao automaticamente para o treasury</li>
              <li>O lider nao pode sair — deve transferir a lideranca primeiro</li>
            </ul>
            <p className="font-medium text-foreground mt-4">Assinatura Combo:</p>
            <p>Fas podem assinar a guilda inteira por um preco unico, ganhando acesso a todos os membros. O valor e dividido igualmente.</p>
          </InfoDrawer>
        </div>
        {isCreator && !myGuild && (
          <Link href="/guilds/create">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" /> Criar Guilda
            </Button>
          </Link>
        )}
      </div>

      {/* My Guild Banner */}
      {myGuild && (
        <Link href={`/guilds/${myGuild.id}`}>
          <Card hover className="mb-6 bg-gradient-to-r from-primary/10 to-secondary/10">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted mb-1">Minha guilda</p>
                  <p className="font-bold text-lg">{myGuild.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {myGuild.totalMembers}/{myGuild.maxMembers}
                    </span>
                    <span className="flex items-center gap-1">
                      <Coins className="w-3 h-3" /> Treasury: {Number(myGuild.treasuryBalance || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <Badge variant={myGuild.myRole === 'leader' ? 'warning' : 'primary'}>
                  {myGuild.myRole === 'leader' ? 'Lider' : myGuild.myRole === 'co_leader' ? 'Co-lider' : 'Membro'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Guild List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : guilds && guilds.length > 0 ? (
        <div className="space-y-3">
          {guilds.map((guild) => (
            <Link key={guild.id} href={`/guilds/${guild.id}`}>
              <Card hover>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold truncate">{guild.name}</p>
                        {guild.category && <Badge variant="default">{guild.category}</Badge>}
                      </div>
                      {guild.description && (
                        <p className="text-sm text-muted line-clamp-1">{guild.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {guild.totalMembers}/{guild.maxMembers}
                        </span>
                        <span className="flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Score min: {guild.minCreatorScore}
                        </span>
                        {guild.comboSubscriptionPrice && (
                          <span className="flex items-center gap-1">
                            <Crown className="w-3 h-3" /> Combo: R$ {Number(guild.comboSubscriptionPrice).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant={guild.isRecruiting ? 'success' : 'error'}>
                      {guild.isRecruiting ? 'Recrutando' : 'Fechada'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-muted">Nenhuma guilda encontrada</p>
            {isCreator && (
              <Link href="/guilds/create">
                <Button size="sm" className="mt-4">
                  <Plus className="w-4 h-4 mr-1" /> Criar primeira guilda
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function GuildsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <GuildsContent />
    </Suspense>
  )
}
