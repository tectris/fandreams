'use client'

import { Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InfoDrawer } from '@/components/ui/info-drawer'
import {
  TrendingUp, RefreshCw, Loader2, Heart, Clock, Users,
  DollarSign, MessageCircle, Shield,
} from 'lucide-react'
import { toast } from 'sonner'

type ScoreData = {
  score: number
  breakdown?: {
    engagement: number
    consistency: number
    retention: number
    monetization: number
    responsiveness: number
    quality: number
  }
  updatedAt?: string
}

const METRICS = [
  { key: 'engagement', label: 'Engajamento', weight: '25%', icon: Heart, color: 'text-error', description: 'Likes, comentarios e tips por post' },
  { key: 'consistency', label: 'Consistencia', weight: '20%', icon: Clock, color: 'text-primary', description: 'Frequencia de publicacao' },
  { key: 'retention', label: 'Retencao', weight: '20%', icon: Users, color: 'text-success', description: 'Taxa de retencao de assinantes' },
  { key: 'monetization', label: 'Monetizacao', weight: '15%', icon: DollarSign, color: 'text-warning', description: 'Crescimento de ganhos' },
  { key: 'responsiveness', label: 'Responsividade', weight: '10%', icon: MessageCircle, color: 'text-secondary', description: 'Taxa e velocidade de resposta' },
  { key: 'quality', label: 'Qualidade', weight: '10%', icon: Shield, color: 'text-diamond', description: 'Qualidade do conteudo, ausencia de reports' },
] as const

function getScoreColor(score: number) {
  if (score >= 80) return 'text-success'
  if (score >= 60) return 'text-primary'
  if (score >= 40) return 'text-warning'
  return 'text-error'
}

function getScoreLabel(score: number) {
  if (score >= 90) return 'Excelente'
  if (score >= 75) return 'Otimo'
  if (score >= 60) return 'Bom'
  if (score >= 40) return 'Regular'
  return 'Iniciante'
}

function CreatorScoreContent() {
  const queryClient = useQueryClient()

  const { data: scoreData, isLoading } = useQuery({
    queryKey: ['creator-score'],
    queryFn: async () => (await api.get<ScoreData>('/creator-score/me/score')).data,
  })

  const recalcMutation = useMutation({
    mutationFn: () => api.post('/creator-score/me/recalculate'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-score'] })
      toast.success('Score recalculado!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const score = scoreData?.score ?? 0
  const breakdown = scoreData?.breakdown

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Creator Score</h1>
          <InfoDrawer title="Como funciona o Creator Score">
            <p className="font-medium text-foreground">O que e?</p>
            <p>O Creator Score e uma nota de 0 a 100 que reflete seu desempenho como criador na plataforma.</p>
            <p className="font-medium text-foreground mt-4">Metricas:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><span className="font-medium">Engajamento (25%):</span> Likes, comentarios e tips por post</li>
              <li><span className="font-medium">Consistencia (20%):</span> Frequencia de publicacao</li>
              <li><span className="font-medium">Retencao (20%):</span> Taxa de retencao de assinantes</li>
              <li><span className="font-medium">Monetizacao (15%):</span> Crescimento de ganhos</li>
              <li><span className="font-medium">Responsividade (10%):</span> Velocidade de resposta a mensagens</li>
              <li><span className="font-medium">Qualidade (10%):</span> Qualidade do conteudo e ausencia de reports</li>
            </ul>
            <p className="font-medium text-foreground mt-4">Impacto:</p>
            <p>Seu score influencia: requisitos para guildas, visibilidade no discover, e confianca dos fas.</p>
            <p className="mt-2">O score e recalculado automaticamente a cada 24h.</p>
          </InfoDrawer>
        </div>
        <Button size="sm" variant="outline" loading={recalcMutation.isPending} onClick={() => recalcMutation.mutate()}>
          <RefreshCw className="w-4 h-4 mr-1" /> Recalcular
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Main Score */}
          <Card className="mb-6 bg-gradient-to-br from-primary/10 via-surface to-secondary/10">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted mb-2">Seu Creator Score</p>
              <div className={`text-6xl font-bold ${getScoreColor(score)}`}>
                {score.toFixed(0)}
              </div>
              <p className={`text-sm font-medium mt-1 ${getScoreColor(score)}`}>{getScoreLabel(score)}</p>
              {scoreData?.updatedAt && (
                <p className="text-xs text-muted mt-3">
                  Atualizado: {new Date(scoreData.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Breakdown */}
          <Card>
            <CardHeader>
              <h2 className="font-bold">Detalhamento</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              {METRICS.map((metric) => {
                const value = breakdown?.[metric.key as keyof typeof breakdown] ?? 0
                const normalizedValue = Math.min(100, Math.max(0, Number(value)))
                return (
                  <div key={metric.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <metric.icon className={`w-4 h-4 ${metric.color}`} />
                        <span className="text-sm font-medium">{metric.label}</span>
                        <span className="text-xs text-muted">({metric.weight})</span>
                      </div>
                      <span className={`text-sm font-bold ${getScoreColor(normalizedValue)}`}>
                        {normalizedValue.toFixed(0)}
                      </span>
                    </div>
                    <div className="w-full bg-surface-light rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          normalizedValue >= 80 ? 'bg-success' :
                          normalizedValue >= 60 ? 'bg-primary' :
                          normalizedValue >= 40 ? 'bg-warning' : 'bg-error'
                        }`}
                        style={{ width: `${normalizedValue}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted mt-0.5">{metric.description}</p>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export default function CreatorScorePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <CreatorScoreContent />
    </Suspense>
  )
}
