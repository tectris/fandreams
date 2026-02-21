'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { Crown, Tag, Trash2, Plus, Save, ToggleLeft, ToggleRight, AlertCircle, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Promo {
  id: string
  durationDays: number
  price: string
  isActive: boolean
  createdAt: string
}

interface CreatorProfile {
  subscriptionPrice: string | null
  messagesSetting: 'all' | 'subscribers' | 'disabled'
  promos: Promo[]
}

const DURATION_OPTIONS = [
  { days: 90, label: '3 meses' },
  { days: 180, label: '6 meses' },
  { days: 360, label: '12 meses' },
]

function getDurationLabel(days: number) {
  if (days === 90) return '3 meses'
  if (days === 180) return '6 meses'
  if (days === 360) return '12 meses'
  return `${days} dias`
}

function getMonthlyEquivalent(price: string, days: number) {
  const months = days / 30
  return (Number(price) / months).toFixed(2)
}

function getDiscount(monthlyPrice: string, promoPrice: string, days: number) {
  const normalTotal = Number(monthlyPrice) * (days / 30)
  if (normalTotal <= 0) return 0
  const discount = ((normalTotal - Number(promoPrice)) / normalTotal) * 100
  return Math.round(discount)
}

export default function CreatorSubscriptionPage() {
  const queryClient = useQueryClient()
  const [priceInput, setPriceInput] = useState('')
  const [priceEditing, setPriceEditing] = useState(false)
  const [newPromo, setNewPromo] = useState<{ durationDays: number; price: string } | null>(null)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['creator-profile'],
    queryFn: async () => {
      const res = await api.get<CreatorProfile>('/creators/me')
      return res.data
    },
  })

  const currentPrice = profile?.subscriptionPrice || '0'
  const hasPrice = Number(currentPrice) > 0

  // Update subscription price
  const priceMutation = useMutation({
    mutationFn: (subscriptionPrice: number) =>
      api.patch('/creators/me', { subscriptionPrice }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-profile'] })
      toast.success('Preco da assinatura atualizado!')
      setPriceEditing(false)
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao atualizar preco'),
  })

  // Create promo
  const createPromoMutation = useMutation({
    mutationFn: (data: { durationDays: number; price: number }) =>
      api.post('/creators/me/promos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-profile'] })
      toast.success('Promocao criada!')
      setNewPromo(null)
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao criar promocao'),
  })

  // Toggle promo active/inactive
  const togglePromoMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/creators/me/promos/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-profile'] })
      toast.success('Promocao atualizada!')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao atualizar promocao'),
  })

  // Update messages setting
  const messagesMutation = useMutation({
    mutationFn: (messagesSetting: string) =>
      api.patch('/creators/me', { messagesSetting }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-profile'] })
      toast.success('Configuracao de mensagens atualizada!')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao atualizar'),
  })

  // Delete promo
  const deletePromoMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/creators/me/promos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-profile'] })
      toast.success('Promocao removida!')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao remover promocao'),
  })

  function handleSavePrice() {
    const value = Number(priceInput)
    if (isNaN(value) || value < 5 || value > 5000) {
      toast.error('O preco deve ser entre R$ 5,00 e R$ 5.000,00')
      return
    }
    priceMutation.mutate(value)
  }

  function handleCreatePromo() {
    if (!newPromo) return
    const price = Number(newPromo.price)
    if (isNaN(price) || price < 5 || price > 50000) {
      toast.error('O preco deve ser entre R$ 5,00 e R$ 50.000,00')
      return
    }
    createPromoMutation.mutate({ durationDays: newPromo.durationDays, price })
  }

  function startEditPrice() {
    setPriceInput(Number(currentPrice) > 0 ? currentPrice : '')
    setPriceEditing(true)
  }

  // Find which durations are already used
  const usedDurations = new Set((profile?.promos || []).map((p) => p.durationDays))
  const availableDurations = DURATION_OPTIONS.filter((d) => !usedDurations.has(d.days))

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-surface-light rounded w-1/3" />
          <div className="h-48 bg-surface-light rounded" />
          <div className="h-48 bg-surface-light rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Crown className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Planos de assinatura</h1>
      </div>

      {/* Monthly subscription price */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Preco mensal da assinatura
          </h2>
        </CardHeader>
        <CardContent>
          {!priceEditing ? (
            <div className="flex items-center justify-between">
              <div>
                {hasPrice ? (
                  <>
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(currentPrice)}
                    </span>
                    <span className="text-muted text-sm ml-1">/mes</span>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-warning">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Nenhum preco definido - assinatura gratuita</span>
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={startEditPrice}>
                {hasPrice ? 'Alterar' : 'Definir preco'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                id="subscriptionPrice"
                label="Preco mensal (R$)"
                type="number"
                min={5}
                max={5000}
                step={0.01}
                placeholder="Ex: 29.90"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
              />
              <p className="text-xs text-muted">
                Valor entre R$ 5,00 e R$ 5.000,00. Esse sera o valor cobrado mensalmente dos seus assinantes.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSavePrice}
                  loading={priceMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-1" />
                  Salvar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPriceEditing(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Promotional plans */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Promocoes
            </h2>
            {hasPrice && availableDurations.length > 0 && !newPromo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setNewPromo({ durationDays: availableDurations[0].days, price: '' })
                }
              >
                <Plus className="w-4 h-4 mr-1" />
                Nova promocao
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!hasPrice ? (
            <div className="flex items-center gap-3 p-4 rounded-sm bg-warning/5 border border-warning/20">
              <AlertCircle className="w-5 h-5 text-warning shrink-0" />
              <p className="text-sm text-muted">
                Defina o preco mensal da assinatura antes de criar promocoes.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Existing promos */}
              {(profile?.promos || []).map((promo) => {
                const discount = getDiscount(currentPrice, promo.price, promo.durationDays)
                const monthlyEq = getMonthlyEquivalent(promo.price, promo.durationDays)
                return (
                  <div
                    key={promo.id}
                    className={`flex items-center justify-between p-4 rounded-sm border ${
                      promo.isActive ? 'border-border' : 'border-border opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {getDurationLabel(promo.durationDays)}
                        </span>
                        {promo.isActive ? (
                          <Badge variant="success">Ativa</Badge>
                        ) : (
                          <Badge>Inativa</Badge>
                        )}
                        {discount > 0 && (
                          <Badge variant="primary">-{discount}%</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted">
                        {formatCurrency(promo.price)} total &middot;{' '}
                        {formatCurrency(monthlyEq)}/mes equivalente
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          togglePromoMutation.mutate({
                            id: promo.id,
                            isActive: !promo.isActive,
                          })
                        }
                        className="p-2 rounded-sm hover:bg-surface-light transition-colors"
                        title={promo.isActive ? 'Desativar' : 'Ativar'}
                      >
                        {promo.isActive ? (
                          <ToggleRight className="w-5 h-5 text-success" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-muted" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Tem certeza que deseja remover esta promocao?')) {
                            deletePromoMutation.mutate(promo.id)
                          }
                        }}
                        className="p-2 rounded-sm hover:bg-error/10 transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4 text-error" />
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* New promo form */}
              {newPromo && (
                <div className="p-4 rounded-sm border border-primary/30 bg-primary/5 space-y-3">
                  <h4 className="font-medium text-sm">Nova promocao</h4>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Periodo
                    </label>
                    <div className="flex gap-2">
                      {availableDurations.map((d) => (
                        <button
                          key={d.days}
                          onClick={() =>
                            setNewPromo({ ...newPromo, durationDays: d.days })
                          }
                          className={`px-4 py-2 rounded-sm border text-sm font-medium transition-colors ${
                            newPromo.durationDays === d.days
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Input
                    id="promoPrice"
                    label={`Preco total para ${getDurationLabel(newPromo.durationDays)} (R$)`}
                    type="number"
                    min={5}
                    max={50000}
                    step={0.01}
                    placeholder="Ex: 79.90"
                    value={newPromo.price}
                    onChange={(e) =>
                      setNewPromo({ ...newPromo, price: e.target.value })
                    }
                  />
                  {newPromo.price && Number(newPromo.price) > 0 && (
                    <div className="text-sm text-muted space-y-1">
                      <p>
                        Equivalente a{' '}
                        <span className="font-medium text-foreground">
                          {formatCurrency(
                            getMonthlyEquivalent(newPromo.price, newPromo.durationDays),
                          )}
                          /mes
                        </span>
                      </p>
                      {getDiscount(currentPrice, newPromo.price, newPromo.durationDays) > 0 && (
                        <p>
                          Desconto de{' '}
                          <span className="font-medium text-success">
                            {getDiscount(currentPrice, newPromo.price, newPromo.durationDays)}%
                          </span>{' '}
                          em relacao ao plano mensal
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleCreatePromo}
                      loading={createPromoMutation.isPending}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Criar promocao
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewPromo(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Empty state */}
              {(profile?.promos || []).length === 0 && !newPromo && (
                <div className="text-center py-8">
                  <Tag className="w-10 h-10 text-muted mx-auto mb-3" />
                  <p className="text-sm text-muted mb-1">
                    Nenhuma promocao criada
                  </p>
                  <p className="text-xs text-muted">
                    Crie promocoes para oferecer descontos em periodos mais longos de assinatura.
                  </p>
                </div>
              )}

              {/* All durations used */}
              {availableDurations.length === 0 && (profile?.promos || []).length > 0 && (
                <p className="text-xs text-muted text-center">
                  Todas as opcoes de periodo ja estao sendo utilizadas.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages settings */}
      <Card className="mt-6">
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Mensagens
          </h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted mb-4">
            Escolha quem pode te enviar mensagens pelo seu perfil.
          </p>
          <div className="space-y-2">
            {([
              { value: 'all', label: 'Todos', description: 'Qualquer usuario pode te enviar mensagens' },
              { value: 'subscribers', label: 'Somente assinantes', description: 'Apenas assinantes ativos podem te enviar mensagens' },
              { value: 'disabled', label: 'Desabilitado', description: 'Ninguem pode te enviar mensagens' },
            ] as const).map((option) => {
              const current = profile?.messagesSetting || 'all'
              const isSelected = current === option.value
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    if (!isSelected) messagesMutation.mutate(option.value)
                  }}
                  disabled={messagesMutation.isPending}
                  className={`w-full flex items-center gap-3 p-3 rounded-sm border text-left transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-primary' : 'border-muted'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{option.label}</p>
                    <p className="text-xs text-muted">{option.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
